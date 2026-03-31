import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WebSocketService } from './websocket.service';

export interface StockAlert {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON';
  currentQty: number;
  threshold: number;
  notified: boolean;
  createdAt: string;
  item: {
    name: string;
    sku?: string;
    warehouse?: { name: string };
  };
}

@Injectable({ providedIn: 'root' })
export class AlertsService implements OnDestroy {
  private http = inject(HttpClient);
  private wsService = inject(WebSocketService);
  private destroy$ = new Subject<void>();

  alerts = signal<StockAlert[]>([]);
  unreadCount = computed(() => this.alerts().filter(a => !a.notified).length);
  isLoading = signal(false);

  constructor() {
    this.loadActive();
    this.wsService.onAlertChange().pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadActive());
  }

  loadActive(): void {
    this.isLoading.set(true);
    this.http.get<{ data: StockAlert[] }>(`${environment.apiUrl}/alerts/active?limit=20`)
      .subscribe({
        next: (r) => {
          this.alerts.set(r.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  resolve(id: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/alerts/${id}/resolve`, {})
      .pipe(tap(() => this.loadActive()));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
