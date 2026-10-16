import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, catchError, finalize, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CancelSaleDto,
  CreateSaleDto,
  Sale,
  SaleStats,
  UpdateSaleDto,
} from '../interfaces/sale.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { triggerBlobDownload } from '../utils/download.utils';
import { RequestTracker, trackRequest } from '../utils/track-request';
import { fetchAllPages } from '../utils/fetch-all-pages';


@Injectable({ providedIn: 'root' })
export class SaleService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/sales`;

  private salesSignal = signal<Sale[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private tracker: RequestTracker = {
    loading: this.loadingSignal,
    error: this.errorSignal,
    logger: this.logger,
    translate: this.translate
  };

  sales = computed(() => this.salesSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  // Counted by the API over every sale the user can see, not over the
  // rows loaded here
  private statsSignal = signal<SaleStats>({ total: 0, active: 0, draft: 0, cancelled: 0, byCustomerType: {}, revenueByCurrency: {} });
  stats = computed(() => this.statsSignal());
  private onlyWithBalance = false;

  constructor() {
    // A failed call resolves with null and only fills `error`, so tell the user here
    this.notifications.reportErrors(this.error);
  }

  /** onlyWithBalance: just the ones with something left to pay (accounts receivable/payable). */
  loadSales(onlyWithBalance = false): void {
    this.onlyWithBalance = onlyWithBalance;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const params = onlyWithBalance ? new HttpParams().set('onlyWithBalance', 'true') : undefined;
    fetchAllPages<Sale>(this.http, this.apiUrl, params)
      .pipe(
        catchError((err) => {
          this.logger.error('Error loading sales', err);
          this.errorSignal.set(
            err.error?.message ||
              err.message ||
              this.translate.instant('SALES.LOADING_ERROR'),
          );
          return of<Sale[]>([]);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((data) => this.salesSignal.set(data));
    this.loadStats();
  }

  loadStats(): void {
    this.http
      .get<SaleStats>(`${this.apiUrl}/stats`)
      .pipe(
        catchError((err) => {
          this.logger.error('Error loading sale stats', err);
          return EMPTY;
        }),
      )
      .subscribe((stats) => this.statsSignal.set(stats));
  }

  create(dto: CreateSaleDto): Observable<Sale | null> {
    return trackRequest(
      this.http.post<Sale>(this.apiUrl, dto).pipe(
        tap((created) => {
          this.salesSignal.update((list) => [created, ...list]);
          this.loadStats();
        })
      ),
      this.tracker, 'Error creating sale', 'SALES.CREATE_ERROR'
    );
  }

  update(id: string, dto: UpdateSaleDto): Observable<Sale | null> {
    return trackRequest(
      this.http.patch<Sale>(`${this.apiUrl}/${id}`, dto).pipe(
        tap((updated) => {
          this.salesSignal.update((list) => list.map((s) => (s.id === id ? updated : s)));
          this.loadStats();
        })
      ),
      this.tracker, 'Error updating sale', 'SALES.UPDATE_ERROR'
    );
  }

  confirm(id: string): Observable<Sale | null> {
    return trackRequest(
      this.http.patch<Sale>(`${this.apiUrl}/${id}/confirm`, {}).pipe(
        tap((updated) => {
          this.salesSignal.update((list) => list.map((s) => (s.id === id ? updated : s)));
          this.loadStats();
        })
      ),
      this.tracker, 'Error confirming sale', 'SALES.CONFIRM_ERROR'
    );
  }

  cancel(id: string, dto: CancelSaleDto = {}): Observable<Sale | null> {
    return trackRequest(
      this.http.patch<Sale>(`${this.apiUrl}/${id}/cancel`, dto).pipe(
        tap((updated) => {
          this.salesSignal.update((list) => list.map((s) => (s.id === id ? updated : s)));
          this.loadStats();
        })
      ),
      this.tracker, 'Error cancelling sale', 'SALES.CANCEL_ERROR'
    );
  }

  downloadPdf(id: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.http
      .get(`${this.apiUrl}/${id}/pdf?locale=${locale}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => triggerBlobDownload(blob, `venta_${id}.pdf`),
        error: (err) => {
          this.logger.error('Error downloading sale PDF', err);
          this.errorSignal.set(this.translate.instant('SALES.PDF_ERROR'));
        },
      });
  }

  refresh(): void {
    this.loadSales(this.onlyWithBalance);
  }
}
