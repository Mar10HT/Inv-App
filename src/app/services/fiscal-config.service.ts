import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiscalConfig, UpdateFiscalConfigDto } from '../interfaces/fiscal-config.interface';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { RequestTracker, trackRequest } from '../utils/track-request';

/** Singleton settings row — same get-or-create shape as the API, no list semantics. */
@Injectable({ providedIn: 'root' })
export class FiscalConfigService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);
  private apiUrl = `${environment.apiUrl}/fiscal-config`;

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private tracker: RequestTracker = {
    loading: this.loadingSignal,
    error: this.errorSignal,
    logger: this.logger,
    translate: this.translate
  };

  config = signal<FiscalConfig | null>(null);
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  constructor() {
    this.notifications.reportErrors(this.error);
  }

  get(): Observable<FiscalConfig | null> {
    return trackRequest(
      this.http.get<FiscalConfig>(this.apiUrl).pipe(tap((data) => this.config.set(data))),
      this.tracker, 'Error loading fiscal config', 'SETTINGS.FISCAL.LOADING_ERROR'
    );
  }

  update(dto: UpdateFiscalConfigDto): Observable<FiscalConfig | null> {
    return trackRequest(
      this.http.patch<FiscalConfig>(this.apiUrl, dto).pipe(tap((data) => this.config.set(data))),
      this.tracker, 'Error updating fiscal config', 'SETTINGS.FISCAL.SAVE_ERROR'
    );
  }
}
