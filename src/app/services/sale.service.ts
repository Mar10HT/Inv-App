import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CancelSaleDto,
  CreateSaleDto,
  Sale,
  SaleStats,
  SaleStatus,
} from '../interfaces/sale.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';
import { triggerBlobDownload } from '../utils/download.utils';

const MAX_SALES_LIMIT = 200;

// Round to 2 decimals to avoid floating point noise in accumulated revenue.
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable({ providedIn: 'root' })
export class SaleService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private apiUrl = `${environment.apiUrl}/sales`;

  private salesSignal = signal<Sale[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  sales = computed(() => this.salesSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  active = computed(() =>
    this.salesSignal().filter((s) => s.status === SaleStatus.ACTIVE),
  );

  stats = computed<SaleStats>(() => {
    const list = this.salesSignal();
    const byCustomerType: Record<string, number> = {};
    const revenueByCurrency: Record<string, number> = {};
    let active = 0;
    let cancelled = 0;
    for (const s of list) {
      if (s.status === SaleStatus.ACTIVE) {
        active++;
        byCustomerType[s.customerType] =
          (byCustomerType[s.customerType] ?? 0) + 1;
        revenueByCurrency[s.currency] = round2(
          (revenueByCurrency[s.currency] ?? 0) + s.totalAmount,
        );
      } else {
        cancelled++;
      }
    }
    return { total: list.length, active, cancelled, byCustomerType, revenueByCurrency };
  });

  loadSales(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const params = new HttpParams().set('limit', String(MAX_SALES_LIMIT));
    this.http
      .get<PaginatedResponse<Sale>>(this.apiUrl, { params })
      .pipe(
        map((res) => res.data),
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
  }

  create(dto: CreateSaleDto): Observable<Sale | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.http.post<Sale>(this.apiUrl, dto).pipe(
      tap((created) => {
        this.salesSignal.update((list) => [created, ...list]);
      }),
      catchError((err) => {
        this.logger.error('Error creating sale', err);
        this.errorSignal.set(
          err.error?.message ||
            err.message ||
            this.translate.instant('SALES.CREATE_ERROR'),
        );
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  cancel(id: string, dto: CancelSaleDto = {}): Observable<Sale | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.http
      .patch<Sale>(`${this.apiUrl}/${id}/cancel`, dto)
      .pipe(
        tap((updated) => {
          this.salesSignal.update((list) =>
            list.map((s) => (s.id === id ? updated : s)),
          );
        }),
        catchError((err) => {
          this.logger.error('Error cancelling sale', err);
          this.errorSignal.set(
            err.error?.message ||
              err.message ||
              this.translate.instant('SALES.CANCEL_ERROR'),
          );
          return of(null);
        }),
        finalize(() => this.loadingSignal.set(false)),
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
    this.loadSales();
  }
}
