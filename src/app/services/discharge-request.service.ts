import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of, Subscription, finalize } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import {
  DischargeRequest,
  DischargeRequestStatus,
  CreateDischargeRequestDto,
  DischargeRequestStats,
  AvailableItem,
  RawDischargeRequest,
  RawCreateDischargeResponse,
} from '../interfaces/discharge-request.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class DischargeRequestService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private apiUrl = `${environment.apiUrl}/discharge-requests`;

  private requestsSignal = signal<DischargeRequest[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private loadRequestsSubscription?: Subscription;

  requests = computed(() => this.requestsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  stats = computed<DischargeRequestStats>(() => {
    const requests = this.requestsSignal();
    return {
      total: requests.length,
      byStatus: {
        pending: requests.filter((r) => r.status === DischargeRequestStatus.PENDING).length,
        completed: requests.filter((r) => r.status === DischargeRequestStatus.COMPLETED).length,
        rejected: requests.filter((r) => r.status === DischargeRequestStatus.REJECTED).length,
      },
    };
  });

  pendingRequests = computed(() =>
    this.requestsSignal().filter((r) => r.status === DischargeRequestStatus.PENDING),
  );

  // ==================== Public Endpoints (no auth) ====================

  getAvailableItems(): Observable<AvailableItem[]> {
    return this.http.get<AvailableItem[]>(`${this.apiUrl}/public/available-items`).pipe(
      map((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          itemType: item.itemType,
          serviceTag: item.serviceTag,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
        })),
      ),
      catchError((err) => {
        this.logger.error('Error loading available items', err);
        return of([]);
      }),
    );
  }

  createPublicRequest(
    dto: CreateDischargeRequestDto,
  ): Observable<RawCreateDischargeResponse | null> {
    return this.http.post<RawCreateDischargeResponse>(`${this.apiUrl}/public`, dto).pipe(
      catchError((err) => {
        this.logger.error('Error creating discharge request', err);
        return of(null);
      }),
    );
  }

  // ==================== Protected Endpoints ====================

  loadRequests(): void {
    this.loadRequestsSubscription?.unsubscribe();

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', '200');

    this.loadRequestsSubscription = this.http
      .get<PaginatedResponse<RawDischargeRequest>>(this.apiUrl, { params })
      .pipe(
        map((response) => response.data.map((req) => this.transformRequest(req))),
        catchError((err) => {
          this.logger.error('Error loading discharge requests', err);
          this.errorSignal.set(err.message || 'Error loading discharge requests');
          return of([]);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((requests) => {
        this.requestsSignal.set(requests);
      });
  }

  findOne(id: string): Observable<DischargeRequest | null> {
    return this.http.get<RawDischargeRequest>(`${this.apiUrl}/${id}`).pipe(
      map((req) => this.transformRequest(req)),
      catchError((err) => {
        this.logger.error('Error loading discharge request', err);
        return of(null);
      }),
    );
  }

  completeRequest(id: string): Observable<DischargeRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawDischargeRequest>(`${this.apiUrl}/${id}/complete`, {}).pipe(
      map((req) => this.transformRequest(req)),
      tap((updatedReq) => {
        this.requestsSignal.update((requests) =>
          requests.map((r) => (r.id === id ? updatedReq : r)),
        );
      }),
      catchError((err) => {
        this.logger.error('Error completing discharge request', err);
        this.errorSignal.set(
          err.error?.message || err.message ||
          this.translate.instant('NOTIFICATIONS.ERRORS.COMPLETE_DISCHARGE_FAILED'),
        );
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  rejectRequest(id: string, reason?: string): Observable<DischargeRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawDischargeRequest>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
      map((req) => this.transformRequest(req)),
      tap((updatedReq) => {
        this.requestsSignal.update((requests) =>
          requests.map((r) => (r.id === id ? updatedReq : r)),
        );
      }),
      catchError((err) => {
        this.logger.error('Error rejecting discharge request', err);
        this.errorSignal.set(
          err.error?.message || err.message ||
          this.translate.instant('NOTIFICATIONS.ERRORS.REJECT_DISCHARGE_FAILED'),
        );
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  getStats(): Observable<DischargeRequestStats> {
    return this.http.get<DischargeRequestStats>(`${this.apiUrl}/stats`);
  }

  getRequestFormQr(): Observable<{ url: string; qrDataUrl: string }> {
    return this.http.get<{ url: string; qrDataUrl: string }>(`${this.apiUrl}/request-form-qr`, {
      withCredentials: true,
    });
  }

  refresh(): void {
    this.loadRequests();
  }

  private transformRequest(req: RawDischargeRequest): DischargeRequest {
    return {
      id: req.id,
      requesterName: req.requesterName,
      requesterPosition: req.requesterPosition,
      requesterPhone: req.requesterPhone,
      neededByDate: req.neededByDate ? new Date(req.neededByDate) : undefined,
      justification: req.justification,
      warehouseId: req.warehouseId,
      warehouseName: req.warehouse?.name || '',
      status: req.status as DischargeRequestStatus,
      resolvedById: req.resolvedById,
      resolvedByName: req.resolvedBy?.name || req.resolvedBy?.email,
      resolvedAt: req.resolvedAt ? new Date(req.resolvedAt) : undefined,
      rejectedReason: req.rejectedReason,
      notes: req.notes,
      items: (req.items || []).map((item) => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItem?.name || '',
        inventoryItemServiceTag: item.inventoryItem?.serviceTag,
        quantity: item.quantity,
      })),
      createdAt: new Date(req.createdAt),
      updatedAt: new Date(req.updatedAt),
    };
  }
}
