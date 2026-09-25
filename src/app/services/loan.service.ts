import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { downloadStyledXLSX } from '../utils/xlsx.utils';
import { Observable, tap, map, catchError, of, Subject, Subscription, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Loan,
  LoanStatus,
  CreateLoanDto,
  LoanStats,
  LoanWithQr,
  RawLoan,
} from '../interfaces/loan.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { WebSocketService } from './websocket.service';
import { transformLoan } from '../utils/loan.utils';
import { triggerBlobDownload } from '../utils/download.utils';

const MAX_LOANS_LIMIT = 200;

@Injectable({
  providedIn: 'root'
})
export class LoanService implements OnDestroy {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private wsService = inject(WebSocketService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private destroy$ = new Subject<void>();
  private loadLoansSubscription?: Subscription;
  private apiUrl = `${environment.apiUrl}/loans`;

  private loansSignal = signal<Loan[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  loans = computed(() => this.loansSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  // Computed stats
  stats = computed<LoanStats>(() => {
    const loans = this.loansSignal();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalPending = loans.filter(l => l.status === LoanStatus.PENDING).length;
    const totalSent = loans.filter(l => l.status === LoanStatus.SENT).length;
    const totalReceived = loans.filter(l => l.status === LoanStatus.RECEIVED).length;
    const totalReturnPending = loans.filter(l => l.status === LoanStatus.RETURN_PENDING).length;
    const totalOverdue = loans.filter(l => l.status === LoanStatus.OVERDUE).length;

    // Active statuses for due soon calculation
    const activeStatuses = [LoanStatus.SENT, LoanStatus.RECEIVED, LoanStatus.PENDING];

    return {
      totalPending,
      totalSent,
      totalReceived,
      totalReturnPending,
      totalReturned: loans.filter(l => l.status === LoanStatus.RETURNED).length,
      totalOverdue,
      dueSoon: loans.filter(l =>
        activeStatuses.includes(l.status) &&
        new Date(l.dueDate) <= sevenDaysFromNow &&
        new Date(l.dueDate) > now
      ).length,
      totalActive: totalPending + totalSent + totalReceived + totalReturnPending + totalOverdue
    };
  });

  // Active loans only (not returned or cancelled)
  activeLoans = computed(() =>
    this.loansSignal().filter(l =>
      [LoanStatus.PENDING, LoanStatus.SENT, LoanStatus.RECEIVED, LoanStatus.RETURN_PENDING, LoanStatus.OVERDUE].includes(l.status)
    )
  );

  constructor() {
    // A failed call resolves with null and only fills `error`, so tell the user here
    this.notifications.reportErrors(this.error);
    this.wsService.connect();
    this.wsService.onLoanChange().pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadLoans());
    this.loadLoans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load loans from backend - optimized with smaller limit
   */
  loadLoans(): void {
    this.loadLoansSubscription?.unsubscribe();

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', String(MAX_LOANS_LIMIT));

    this.loadLoansSubscription = this.http.get<PaginatedResponse<RawLoan>>(this.apiUrl, { params }).pipe(
      map(response => response.data.map((loan) => transformLoan(loan))),
      catchError(err => {
        this.logger.error('Error loading loans', err);
        this.errorSignal.set(err.message || this.translate.instant('LOANS.LOADING_ERROR'));
        return of([]);
      }),
      finalize(() => this.loadingSignal.set(false))
    ).subscribe(loans => {
      this.loansSignal.set(loans);
    });
  }

  /**
   * Create a new loan
   */
  createLoan(dto: CreateLoanDto): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<RawLoan>(this.apiUrl, dto).pipe(
      map(loan => transformLoan(loan)),
      tap(newLoan => {
        this.loansSignal.update(loans => [newLoan, ...loans]);
      }),
      catchError(err => {
        this.logger.error('Error creating loan', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.LOAN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  // ==================== Manual Confirmation (No QR) ====================

  /**
   * Manually confirm receipt of a loan without QR code.
   * Accepts SENT or OVERDUE loans.
   */
  manualConfirmReceipt(loanId: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawLoan>(`${this.apiUrl}/${loanId}/manual-confirm-receipt`, {}).pipe(
      map(loan => transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error manually confirming receipt', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.MANUAL_CONFIRM_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Manually confirm return of a loan without QR code.
   * Accepts RETURN_PENDING or OVERDUE loans.
   */
  manualConfirmReturn(loanId: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawLoan>(`${this.apiUrl}/${loanId}/manual-confirm-return`, {}).pipe(
      map(loan => transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error manually confirming return', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.MANUAL_CONFIRM_RETURN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  // ==================== QR-Based Operations ====================

  /**
   * Send loan - generates QR code for receipt confirmation
   */
  sendLoan(loanId: string): Observable<LoanWithQr | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawLoan>(`${this.apiUrl}/${loanId}/send`, {}).pipe(
      map(response => ({
        ...transformLoan(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error sending loan', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.SEND_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Initiate return - generates QR code for return confirmation
   */
  initiateReturn(loanId: string): Observable<LoanWithQr | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawLoan>(`${this.apiUrl}/${loanId}/initiate-return`, {}).pipe(
      map(response => ({
        ...transformLoan(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error initiating return', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.INITIATE_RETURN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Process scanned QR code (auto-detect type)
   */
  scanQr(scannedData: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<RawLoan>(`${this.apiUrl}/scan-qr`, { scannedData }).pipe(
      map(loan => transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === updatedLoan.id ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error processing QR code', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.QR.SCAN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get QR code image for a loan
   */
  getQrCode(loanId: string, type: 'send' | 'return'): Observable<string> {
    // A failure is left to the caller (the QR dialog closes): the interceptor already logs it
    return this.http.get<{ qrDataUrl: string }>(`${this.apiUrl}/${loanId}/qr/${type}`).pipe(
      map(response => response.qrDataUrl)
    );
  }

  /**
   * Cancel a loan
   */
  cancelLoan(loanId: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawLoan>(`${this.apiUrl}/${loanId}/cancel`, {}).pipe(
      map(loan => transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error canceling loan', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('LOANS.CANCEL_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Export loans to XLSX
   */
  async exportToXLSX(loans?: Loan[]): Promise<void> {
    const data = loans || this.loansSignal();

    const rows = data.map(loan => ({
      Items: loan.items.map(i => (i.quantity > 1 ? `${i.inventoryItemName} ×${i.quantity}` : i.inventoryItemName)).join('; '),
      'Total Qty': loan.items.reduce((s, i) => s + i.quantity, 0),
      Origin: loan.sourceWarehouseName,
      Destination: loan.destinationWarehouseName,
      'Loan Date': loan.loanDate.toLocaleDateString(),
      'Due Date': loan.dueDate.toLocaleDateString(),
      'Return Date': loan.returnDate?.toLocaleDateString() || '',
      Status: loan.status,
      Notes: loan.notes || '',
    }));

    await downloadStyledXLSX(rows, {
      sheetName:      'Loans',
      filename:       `loans-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:    '6B7BB5',
      colWidths:      [40, 10, 22, 22, 14, 14, 14, 16, 30],
      statusColIndex: 7,
    });
  }

  /**
   * Download a PDF receipt for a loan
   */
  downloadPdf(loanId: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.http
      .get(`${this.apiUrl}/${loanId}/pdf?locale=${locale}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => triggerBlobDownload(blob, `prestamo_${loanId}.pdf`),
        error: (err) => {
          this.logger.error('Error downloading loan PDF', err);
          this.errorSignal.set(this.translate.instant('LOANS.PDF_ERROR'));
        },
      });
  }
}
