import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CancelPurchaseInvoiceDto,
  CreatePurchaseInvoiceDto,
  PurchaseInvoice,
  PurchaseInvoiceStats,
  PurchaseInvoiceStatus,
} from '../interfaces/purchase-invoice.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { triggerBlobDownload } from '../utils/download.utils';
import { RequestTracker, trackRequest } from '../utils/track-request';

const MAX_PURCHASE_INVOICES_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class PurchaseInvoiceService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/purchase-invoices`;

  private purchaseInvoicesSignal = signal<PurchaseInvoice[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private tracker: RequestTracker = {
    loading: this.loadingSignal,
    error: this.errorSignal,
    logger: this.logger,
    translate: this.translate
  };

  purchaseInvoices = computed(() => this.purchaseInvoicesSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  stats = computed<PurchaseInvoiceStats>(() => {
    const list = this.purchaseInvoicesSignal();
    const totalByCurrency: Record<string, number> = {};
    let active = 0;
    let cancelled = 0;
    for (const p of list) {
      if (p.status === PurchaseInvoiceStatus.ACTIVE) {
        active++;
        totalByCurrency[p.currency] = (totalByCurrency[p.currency] ?? 0) + p.totalAmount;
      } else {
        cancelled++;
      }
    }
    return { total: list.length, active, cancelled, totalByCurrency };
  });

  constructor() {
    // A failed call resolves with null and only fills `error`, so tell the user here
    this.notifications.reportErrors(this.error);
  }

  loadPurchaseInvoices(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const params = new HttpParams().set('limit', String(MAX_PURCHASE_INVOICES_LIMIT));
    this.http
      .get<PaginatedResponse<PurchaseInvoice>>(this.apiUrl, { params })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.logger.error('Error loading purchase invoices', err);
          this.errorSignal.set(
            err.error?.message ||
              err.message ||
              this.translate.instant('PURCHASES.LOADING_ERROR'),
          );
          return of<PurchaseInvoice[]>([]);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((data) => this.purchaseInvoicesSignal.set(data));
  }

  create(dto: CreatePurchaseInvoiceDto): Observable<PurchaseInvoice | null> {
    return trackRequest(
      this.http.post<PurchaseInvoice>(this.apiUrl, dto).pipe(
        tap((created) => this.purchaseInvoicesSignal.update((list) => [created, ...list]))
      ),
      this.tracker, 'Error creating purchase invoice', 'PURCHASES.CREATE_ERROR'
    );
  }

  cancel(id: string, dto: CancelPurchaseInvoiceDto = {}): Observable<PurchaseInvoice | null> {
    return trackRequest(
      this.http.patch<PurchaseInvoice>(`${this.apiUrl}/${id}/cancel`, dto).pipe(
        tap((updated) => this.purchaseInvoicesSignal.update((list) => list.map((p) => (p.id === id ? updated : p))))
      ),
      this.tracker, 'Error cancelling purchase invoice', 'PURCHASES.CANCEL_ERROR'
    );
  }

  downloadPdf(id: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.http
      .get(`${this.apiUrl}/${id}/pdf?locale=${locale}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => triggerBlobDownload(blob, `compra_${id}.pdf`),
        error: (err) => {
          this.logger.error('Error downloading purchase invoice PDF', err);
          this.errorSignal.set(this.translate.instant('PURCHASES.PDF_ERROR'));
        },
      });
  }

  refresh(): void {
    this.loadPurchaseInvoices();
  }
}
