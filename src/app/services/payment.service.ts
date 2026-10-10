import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, finalize, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CancelPaymentDto,
  CreatePaymentDto,
  Payment,
} from '../interfaces/payment.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { RequestTracker, trackRequest } from '../utils/track-request';

const MAX_PAYMENTS_LIMIT = 200;

/**
 * Deliberately no cached list signal (unlike OutflowService/
 * PurchaseInvoiceService): a payment is always fetched scoped to one
 * document at dialog-open time, never rendered as its own app-wide list.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/payments`;

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private tracker: RequestTracker = {
    loading: this.loadingSignal,
    error: this.errorSignal,
    logger: this.logger,
    translate: this.translate
  };

  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  constructor() {
    // A failed call resolves with null and only fills `error`, so tell the user here
    this.notifications.reportErrors(this.error);
  }

  findAll(params: { saleId?: string; purchaseInvoiceId?: string }): Observable<Payment[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    let httpParams = new HttpParams().set('limit', String(MAX_PAYMENTS_LIMIT));
    if (params.saleId) httpParams = httpParams.set('saleId', params.saleId);
    if (params.purchaseInvoiceId) httpParams = httpParams.set('purchaseInvoiceId', params.purchaseInvoiceId);

    return this.http
      .get<PaginatedResponse<Payment>>(this.apiUrl, { params: httpParams })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.logger.error('Error loading payments', err);
          this.errorSignal.set(
            err.error?.message ||
              err.message ||
              this.translate.instant('PAYMENTS.LOADING_ERROR'),
          );
          return of<Payment[]>([]);
        }),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  create(dto: CreatePaymentDto): Observable<Payment | null> {
    return trackRequest(
      this.http.post<Payment>(this.apiUrl, dto),
      this.tracker, 'Error creating payment', 'PAYMENTS.CREATE_ERROR'
    );
  }

  cancel(id: string, dto: CancelPaymentDto = {}): Observable<Payment | null> {
    return trackRequest(
      this.http.patch<Payment>(`${this.apiUrl}/${id}/cancel`, dto),
      this.tracker, 'Error cancelling payment', 'PAYMENTS.CANCEL_ERROR'
    );
  }
}
