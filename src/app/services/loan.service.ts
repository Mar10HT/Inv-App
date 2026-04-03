import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { downloadStyledXLSX } from '../utils/xlsx.utils';
import { Observable, tap, map, catchError, of, Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Loan,
  LoanStatus,
  CreateLoanDto,
  ReturnLoanDto,
  LoanFilter,
  LoanStats,
  LoanWithQr
} from '../interfaces/loan.interface';
import { LoggerService } from './logger.service';
import { WebSocketService } from './websocket.service';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const MAX_LOANS_LIMIT = 200;

@Injectable({
  providedIn: 'root'
})
export class LoanService implements OnDestroy {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private wsService = inject(WebSocketService);
  private destroy$ = new Subject<void>();
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

  // Overdue loans
  overdueLoans = computed(() =>
    this.loansSignal().filter(l => l.status === LoanStatus.OVERDUE)
  );

  constructor() {
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
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', String(MAX_LOANS_LIMIT));

    this.http.get<PaginatedResponse<any>>(this.apiUrl, { params }).pipe(
      map(response => response.data.map((loan: any) => this.transformLoan(loan))),
      catchError(err => {
        this.logger.error('Error loading loans', err);
        this.errorSignal.set(err.message || 'Error loading loans');
        return of([]);
      })
    ).subscribe(loans => {
      this.loansSignal.set(loans);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Transform backend loan to frontend format
   */
  private transformLoan(loan: any): Loan {
    return {
      id: loan.id,
      inventoryItemId: loan.inventoryItemId,
      inventoryItemName: loan.inventoryItem?.name || '',
      inventoryItemServiceTag: loan.inventoryItem?.serviceTag,
      quantity: loan.quantity,
      sourceWarehouseId: loan.sourceWarehouseId,
      sourceWarehouseName: loan.sourceWarehouse?.name || '',
      destinationWarehouseId: loan.destinationWarehouseId,
      destinationWarehouseName: loan.destinationWarehouse?.name || '',
      loanDate: new Date(loan.loanDate),
      dueDate: new Date(loan.dueDate),
      returnDate: loan.returnDate ? new Date(loan.returnDate) : undefined,
      status: loan.status as LoanStatus,
      // QR fields
      sendQrCode: loan.sendQrCode,
      returnQrCode: loan.returnQrCode,
      receivedAt: loan.receivedAt && !isNaN(new Date(loan.receivedAt).getTime()) ? new Date(loan.receivedAt) : undefined,
      receivedById: loan.receivedById,
      receivedByName: loan.receivedBy?.name || loan.receivedBy?.email,
      returnConfirmedAt: loan.returnConfirmedAt ? new Date(loan.returnConfirmedAt) : undefined,
      returnConfirmedById: loan.returnConfirmedById,
      returnConfirmedByName: loan.returnConfirmedBy?.name || loan.returnConfirmedBy?.email,
      notes: loan.notes,
      createdById: loan.createdById,
      createdByName: loan.createdBy?.name || loan.createdBy?.email || '',
      createdAt: new Date(loan.createdAt),
      updatedAt: new Date(loan.updatedAt)
    };
  }

  /**
   * Create a new loan
   */
  createLoan(dto: CreateLoanDto): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(loan => this.transformLoan(loan)),
      tap(newLoan => {
        this.loansSignal.update(loans => [newLoan, ...loans]);
      }),
      catchError(err => {
        this.logger.error('Error creating loan', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error creating loan');
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Return a loan (legacy - without QR confirmation)
   */
  returnLoan(loanId: string, dto?: ReturnLoanDto): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/return`, dto || {}).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error returning loan', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error returning loan');
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

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/manual-confirm-receipt`, {}).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error manually confirming receipt', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error confirming receipt');
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

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/manual-confirm-return`, {}).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error manually confirming return', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error confirming return');
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

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/send`, {}).pipe(
      map(response => ({
        ...this.transformLoan(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error sending loan', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error sending loan');
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Confirm receipt by scanning QR code
   */
  confirmReceipt(qrCode: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(`${this.apiUrl}/confirm-receipt`, { qrCode }).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === updatedLoan.id ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error confirming receipt', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error confirming receipt');
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

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/initiate-return`, {}).pipe(
      map(response => ({
        ...this.transformLoan(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error initiating return', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error initiating return');
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Confirm return by scanning QR code
   */
  confirmReturn(qrCode: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(`${this.apiUrl}/confirm-return`, { qrCode }).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === updatedLoan.id ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error confirming return', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error confirming return');
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

    return this.http.post<any>(`${this.apiUrl}/scan-qr`, { scannedData }).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === updatedLoan.id ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error processing QR code', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error processing QR code');
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get QR code image for a loan
   */
  getQrCode(loanId: string, type: 'send' | 'return'): Observable<string | null> {
    return this.http.get<{ qrDataUrl: string }>(`${this.apiUrl}/${loanId}/qr/${type}`).pipe(
      map(response => response.qrDataUrl),
      catchError(err => {
        this.logger.error('Error getting QR code', err);
        return of(null);
      })
    );
  }

  /**
   * Cancel a loan
   */
  cancelLoan(loanId: string): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/cancel`, {}).pipe(
      map(loan => this.transformLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
      }),
      catchError(err => {
        this.logger.error('Error canceling loan', err);
        this.errorSignal.set(err.error?.message || err.message || 'Error canceling loan');
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get loan by ID
   */
  getLoanById(id: string): Loan | undefined {
    return this.loansSignal().find(l => l.id === id);
  }

  /**
   * Get loans for a specific item
   */
  getLoansForItem(inventoryItemId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.inventoryItemId === inventoryItemId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get loans from a specific warehouse
   */
  getLoansFromWarehouse(warehouseId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.sourceWarehouseId === warehouseId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get loans to a specific warehouse
   */
  getLoansToWarehouse(warehouseId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.destinationWarehouseId === warehouseId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get active loan for an item (if any)
   */
  getActiveLoanForItem(inventoryItemId: string): Loan | undefined {
    const activeStatuses = [LoanStatus.PENDING, LoanStatus.SENT, LoanStatus.RECEIVED, LoanStatus.RETURN_PENDING, LoanStatus.OVERDUE];
    return this.loansSignal().find(
      l => l.inventoryItemId === inventoryItemId && activeStatuses.includes(l.status)
    );
  }

  /**
   * Check if an item is currently on loan
   */
  isItemOnLoan(inventoryItemId: string): boolean {
    return this.getActiveLoanForItem(inventoryItemId) !== undefined;
  }

  /**
   * Get filtered loans
   */
  getFilteredLoans(filter?: LoanFilter): Loan[] {
    let loans = this.loansSignal();

    if (!filter) return loans;

    if (filter.status) {
      loans = loans.filter(l => l.status === filter.status);
    }

    if (filter.sourceWarehouseId) {
      loans = loans.filter(l => l.sourceWarehouseId === filter.sourceWarehouseId);
    }

    if (filter.destinationWarehouseId) {
      loans = loans.filter(l => l.destinationWarehouseId === filter.destinationWarehouseId);
    }

    if (filter.inventoryItemId) {
      loans = loans.filter(l => l.inventoryItemId === filter.inventoryItemId);
    }

    if (filter.overdue) {
      loans = loans.filter(l => l.status === LoanStatus.OVERDUE);
    }

    if (filter.dateFrom) {
      loans = loans.filter(l => l.loanDate >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      loans = loans.filter(l => l.loanDate <= filter.dateTo!);
    }

    return loans.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Delete a loan (admin only)
   */
  deleteLoan(loanId: string): Observable<boolean> {
    this.loadingSignal.set(true);

    return this.http.delete<void>(`${this.apiUrl}/${loanId}`).pipe(
      map(() => {
        this.loansSignal.update(loans => loans.filter(l => l.id !== loanId));
        this.loadingSignal.set(false);
        return true;
      }),
      catchError(err => {
        this.logger.error('Error deleting loan', err);
        this.errorSignal.set(err.message || 'Error deleting loan');
        this.loadingSignal.set(false);
        return of(false);
      })
    );
  }

  /**
   * Check overdue loans on backend
   */
  checkOverdueLoans(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/check-overdue`, {}).pipe(
      tap(() => this.loadLoans())
    );
  }

  /**
   * Get stats from backend
   */
  getStatsFromBackend(): Observable<LoanStats> {
    return this.http.get<LoanStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Export loans to XLSX
   */
  exportToXLSX(loans?: Loan[]): void {
    const data = loans || this.loansSignal();

    const rows = data.map(loan => ({
      Item:            loan.inventoryItemName,
      'Service Tag':   loan.inventoryItemServiceTag || '',
      Quantity:        loan.quantity,
      Origin:          loan.sourceWarehouseName,
      Destination:     loan.destinationWarehouseName,
      'Loan Date':     loan.loanDate.toLocaleDateString(),
      'Due Date':      loan.dueDate.toLocaleDateString(),
      'Return Date':   loan.returnDate?.toLocaleDateString() || '',
      Status:          loan.status,
      Notes:           loan.notes || '',
    }));

    downloadStyledXLSX(rows, {
      sheetName:      'Loans',
      filename:       `loans-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:    '6B7BB5',
      colWidths:      [30, 14, 10, 22, 22, 14, 14, 14, 16, 30],
      statusColIndex: 8, // Status column
    });
  }

  /**
   * Refresh loans from backend
   */
  refresh(): void {
    this.loadLoans();
  }
}
