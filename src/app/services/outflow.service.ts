import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CancelOutflowDto,
  CreateOutflowDto,
  Outflow,
  OutflowStats,
  OutflowStatus,
} from '../interfaces/outflow.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { triggerBlobDownload } from '../utils/download.utils';
import { RequestTracker, trackRequest } from '../utils/track-request';

const MAX_OUTFLOWS_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class OutflowService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/outflows`;

  private outflowsSignal = signal<Outflow[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private tracker: RequestTracker = {
    loading: this.loadingSignal,
    error: this.errorSignal,
    logger: this.logger,
    translate: this.translate
  };

  outflows = computed(() => this.outflowsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  stats = computed<OutflowStats>(() => {
    const list = this.outflowsSignal();
    const byReason: Record<string, number> = {};
    let active = 0;
    let cancelled = 0;
    for (const o of list) {
      if (o.status === OutflowStatus.ACTIVE) {
        active++;
        byReason[o.reason] = (byReason[o.reason] ?? 0) + 1;
      } else {
        cancelled++;
      }
    }
    return { total: list.length, active, cancelled, byReason };
  });

  constructor() {
    // A failed call resolves with null and only fills `error`, so tell the user here
    this.notifications.reportErrors(this.error);
  }

  loadOutflows(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const params = new HttpParams().set('limit', String(MAX_OUTFLOWS_LIMIT));
    this.http
      .get<PaginatedResponse<Outflow>>(this.apiUrl, { params })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.logger.error('Error loading outflows', err);
          this.errorSignal.set(
            err.error?.message ||
              err.message ||
              this.translate.instant('OUTFLOWS.LOADING_ERROR'),
          );
          return of<Outflow[]>([]);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((data) => this.outflowsSignal.set(data));
  }

  create(dto: CreateOutflowDto): Observable<Outflow | null> {
    return trackRequest(
      this.http.post<Outflow>(this.apiUrl, dto).pipe(
        tap((created) => this.outflowsSignal.update((list) => [created, ...list]))
      ),
      this.tracker, 'Error creating outflow', 'OUTFLOWS.CREATE_ERROR'
    );
  }

  cancel(id: string, dto: CancelOutflowDto = {}): Observable<Outflow | null> {
    return trackRequest(
      this.http.patch<Outflow>(`${this.apiUrl}/${id}/cancel`, dto).pipe(
        tap((updated) => this.outflowsSignal.update((list) => list.map((o) => (o.id === id ? updated : o))))
      ),
      this.tracker, 'Error cancelling outflow', 'OUTFLOWS.CANCEL_ERROR'
    );
  }

  downloadPdf(id: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    this.http
      .get(`${this.apiUrl}/${id}/pdf?locale=${locale}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => triggerBlobDownload(blob, `salida_${id}.pdf`),
        error: (err) => {
          this.logger.error('Error downloading outflow PDF', err);
          this.errorSignal.set(this.translate.instant('OUTFLOWS.PDF_ERROR'));
        },
      });
  }

  refresh(): void {
    this.loadOutflows();
  }
}
