import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { downloadStyledXLSX } from '../utils/xlsx.utils';
import { Observable, tap, map, catchError, of, finalize, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TransferRequest,
  TransferRequestStatus,
  CreateTransferRequestDto,
  TransferRequestStats,
  TransferRequestWithQr,
  RawTransferRequest,
} from '../interfaces/transfer-request.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { LoggerService } from './logger.service';

const MAX_REQUESTS_LIMIT = 200;

@Injectable({
  providedIn: 'root'
})
export class TransferRequestService implements OnDestroy {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private apiUrl = `${environment.apiUrl}/transfer-requests`;
  private loadRequestsSubscription?: Subscription;

  private requestsSignal = signal<TransferRequest[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  requests = computed(() => this.requestsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  // Computed stats
  stats = computed<TransferRequestStats>(() => {
    const requests = this.requestsSignal();
    return {
      total: requests.length,
      byStatus: {
        pending: requests.filter(r => r.status === TransferRequestStatus.PENDING).length,
        approved: requests.filter(r => r.status === TransferRequestStatus.APPROVED).length,
        sent: requests.filter(r => r.status === TransferRequestStatus.SENT).length,
        completed: requests.filter(r => r.status === TransferRequestStatus.COMPLETED).length,
        rejected: requests.filter(r => r.status === TransferRequestStatus.REJECTED).length,
        cancelled: requests.filter(r => r.status === TransferRequestStatus.CANCELLED).length
      }
    };
  });

  // Pending requests
  pendingRequests = computed(() =>
    this.requestsSignal().filter(r => r.status === TransferRequestStatus.PENDING)
  );

  // Active requests (not completed, rejected, or cancelled)
  activeRequests = computed(() =>
    this.requestsSignal().filter(r =>
      [TransferRequestStatus.PENDING, TransferRequestStatus.APPROVED, TransferRequestStatus.SENT]
        .includes(r.status)
    )
  );

  constructor() {
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.loadRequestsSubscription?.unsubscribe();
  }

  /**
   * Load transfer requests from backend
   */
  loadRequests(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', String(MAX_REQUESTS_LIMIT));

    this.loadRequestsSubscription = this.http.get<PaginatedResponse<RawTransferRequest>>(this.apiUrl, { params }).pipe(
      map(response => response.data.map(req => this.transformRequest(req))),
      catchError(err => {
        this.logger.error('Error loading transfer requests', err);
        this.errorSignal.set(err.message || this.translate.instant('TRANSFERS.REQUEST_ERROR'));
        return of([]);
      }),
      finalize(() => this.loadingSignal.set(false))
    ).subscribe(requests => {
      this.requestsSignal.set(requests);
    });
  }

  /**
   * Transform backend request to frontend format
   */
  private transformRequest(req: RawTransferRequest): TransferRequest {
    return {
      id: req.id,
      status: req.status as TransferRequestStatus,
      sourceWarehouseId: req.sourceWarehouseId,
      sourceWarehouseName: req.sourceWarehouse?.name || '',
      destinationWarehouseId: req.destinationWarehouseId,
      destinationWarehouseName: req.destinationWarehouse?.name || '',
      requestedById: req.requestedById,
      requestedByName: req.requestedBy?.name || req.requestedBy?.email || '',
      approvedById: req.approvedById,
      approvedByName: req.approvedBy?.name || req.approvedBy?.email,
      approvedAt: req.approvedAt ? new Date(req.approvedAt) : undefined,
      rejectedAt: req.rejectedAt ? new Date(req.rejectedAt) : undefined,
      rejectedReason: req.rejectedReason,
      sendQrCode: req.sendQrCode,
      receivedAt: req.receivedAt ? new Date(req.receivedAt) : undefined,
      receivedById: req.receivedById,
      receivedByName: req.receivedBy?.name || req.receivedBy?.email,
      items: (req.items || []).map(item => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItem?.name || '',
        inventoryItemServiceTag: item.inventoryItem?.serviceTag,
        quantity: item.quantity
      })),
      notes: req.notes,
      createdAt: new Date(req.createdAt),
      updatedAt: new Date(req.updatedAt)
    };
  }

  /**
   * Create a new transfer request
   */
  createRequest(dto: CreateTransferRequestDto): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<RawTransferRequest>(this.apiUrl, dto).pipe(
      map(req => this.transformRequest(req)),
      tap(newReq => {
        this.requestsSignal.update(requests => [newReq, ...requests]);
      }),
      catchError(err => {
        this.logger.error('Error creating transfer request', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.REQUEST_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Approve a transfer request
   */
  approveRequest(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawTransferRequest>(`${this.apiUrl}/${id}/approve`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error approving transfer request', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.APPROVE_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Reject a transfer request
   */
  rejectRequest(id: string, reason?: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawTransferRequest>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error rejecting transfer request', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.REJECT_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  // ==================== QR-Based Operations ====================

  /**
   * Send transfer - generates QR code for receipt confirmation
   */
  sendTransfer(id: string): Observable<TransferRequestWithQr | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawTransferRequest>(`${this.apiUrl}/${id}/send`, {}).pipe(
      map(response => ({
        ...this.transformRequest(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error sending transfer', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.SEND_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Confirm receipt by scanning QR code
   */
  confirmReceipt(qrCode: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<RawTransferRequest>(`${this.apiUrl}/confirm-receipt`, { qrCode }).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === updatedReq.id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error confirming receipt', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.QR.SCAN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Process scanned QR code (auto-detect type)
   */
  scanQr(scannedData: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<RawTransferRequest>(`${this.apiUrl}/scan-qr`, { scannedData }).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === updatedReq.id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error processing QR code', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.QR.SCAN_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get QR code image for a transfer
   */
  getQrCode(id: string): Observable<string | null> {
    return this.http.get<string>(`${this.apiUrl}/${id}/qr`).pipe(
      catchError(err => {
        this.logger.error('Error getting QR code', err);
        return of(null);
      })
    );
  }

  // ==================== Standard Operations ====================

  /**
   * Manually confirm receipt of a transfer without QR code.
   * Uses the same /complete endpoint as the legacy flow — both execute the same
   * inventory transaction. Explicitly named to clarify intent at the call site.
   */
  manualConfirmReceipt(id: string): Observable<TransferRequest | null> {
    return this.completeTransfer(id);
  }

  /**
   * Complete transfer without QR (legacy method)
   */
  private completeTransfer(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawTransferRequest>(`${this.apiUrl}/${id}/complete`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error completing transfer', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.MANUAL_CONFIRM_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Cancel a transfer request
   */
  cancelRequest(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<RawTransferRequest>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap(updatedReq => {
        this.requestsSignal.update(requests =>
          requests.map(r => r.id === id ? updatedReq : r)
        );
      }),
      catchError(err => {
        this.logger.error('Error cancelling transfer request', err);
        this.errorSignal.set(err.error?.message || err.message || this.translate.instant('TRANSFERS.CANCEL_ERROR'));
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Get request by ID
   */
  getRequestById(id: string): TransferRequest | undefined {
    return this.requestsSignal().find(r => r.id === id);
  }

  /**
   * Get requests from a specific warehouse
   */
  getRequestsFromWarehouse(warehouseId: string): TransferRequest[] {
    return this.requestsSignal()
      .filter(r => r.sourceWarehouseId === warehouseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get requests to a specific warehouse
   */
  getRequestsToWarehouse(warehouseId: string): TransferRequest[] {
    return this.requestsSignal()
      .filter(r => r.destinationWarehouseId === warehouseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get stats from backend
   */
  getStatsFromBackend(): Observable<TransferRequestStats> {
    return this.http.get<TransferRequestStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Export to XLSX
   */
  exportToXLSX(requests?: TransferRequest[]): void {
    const data = requests || this.requestsSignal();

    const rows = data.map(req => ({
      ID:             req.id,
      Status:         req.status,
      Origin:         req.sourceWarehouseName,
      Destination:    req.destinationWarehouseName,
      'Requested By': req.requestedByName,
      'Approved By':  req.approvedByName || '',
      Items:          req.items.map(i => `${i.inventoryItemName} (${i.quantity})`).join(', '),
      'Created At':   req.createdAt.toLocaleDateString(),
      Notes:          req.notes || '',
    }));

    downloadStyledXLSX(rows, {
      sheetName:      'Transfer Requests',
      filename:       `transfer-requests-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:    '3B82F6',
      colWidths:      [28, 14, 22, 22, 20, 20, 40, 14, 30],
      statusColIndex: 1, // Status column
    });
  }

  /**
   * Refresh from backend
   */
  refresh(): void {
    this.loadRequests();
  }
}
