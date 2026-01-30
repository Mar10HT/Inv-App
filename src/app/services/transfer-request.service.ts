import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TransferRequest,
  TransferRequestStatus,
  CreateTransferRequestDto,
  TransferRequestStats,
  TransferRequestWithQr
} from '../interfaces/transfer-request.interface';
import { LoggerService } from './logger.service';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransferRequestService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private apiUrl = `${environment.apiUrl}/transfer-requests`;

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

  /**
   * Load transfer requests from backend
   */
  loadRequests(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', '200');

    this.http.get<PaginatedResponse<any>>(this.apiUrl, { params }).pipe(
      map(response => response.data.map((req: any) => this.transformRequest(req))),
      catchError(err => {
        this.logger.error('Error loading transfer requests', err);
        this.errorSignal.set(err.message || 'Error loading transfer requests');
        return of([]);
      })
    ).subscribe(requests => {
      this.requestsSignal.set(requests);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Transform backend request to frontend format
   */
  private transformRequest(req: any): TransferRequest {
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
      items: (req.items || []).map((item: any) => ({
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

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (newReq) => {
          this.requestsSignal.update(requests => [newReq, ...requests]);
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error creating transfer request');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error creating transfer request', err);
        return of(null);
      })
    );
  }

  /**
   * Approve a transfer request
   */
  approveRequest(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${id}/approve`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error approving transfer request');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error approving transfer request', err);
        return of(null);
      })
    );
  }

  /**
   * Reject a transfer request
   */
  rejectRequest(id: string, reason?: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error rejecting transfer request');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error rejecting transfer request', err);
        return of(null);
      })
    );
  }

  // ==================== QR-Based Operations ====================

  /**
   * Send transfer - generates QR code for receipt confirmation
   */
  sendTransfer(id: string): Observable<TransferRequestWithQr | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${id}/send`, {}).pipe(
      map(response => ({
        ...this.transformRequest(response),
        qrCodeDataUrl: response.qrCodeDataUrl
      })),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error sending transfer');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error sending transfer', err);
        return of(null);
      })
    );
  }

  /**
   * Confirm receipt by scanning QR code
   */
  confirmReceipt(qrCode: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(`${this.apiUrl}/confirm-receipt`, { qrCode }).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === updatedReq.id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error confirming receipt');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error confirming receipt', err);
        return of(null);
      })
    );
  }

  /**
   * Process scanned QR code (auto-detect type)
   */
  scanQr(scannedData: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(`${this.apiUrl}/scan-qr`, { scannedData }).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === updatedReq.id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error processing QR code');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error processing QR code', err);
        return of(null);
      })
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
   * Complete transfer without QR (legacy method)
   */
  completeTransfer(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${id}/complete`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error completing transfer');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error completing transfer', err);
        return of(null);
      })
    );
  }

  /**
   * Cancel a transfer request
   */
  cancelRequest(id: string): Observable<TransferRequest | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map(req => this.transformRequest(req)),
      tap({
        next: (updatedReq) => {
          this.requestsSignal.update(requests =>
            requests.map(r => r.id === id ? updatedReq : r)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error cancelling transfer request');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        this.logger.error('Error cancelling transfer request', err);
        return of(null);
      })
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
   * Export to CSV
   */
  exportToCSV(requests?: TransferRequest[]): void {
    const data = requests || this.requestsSignal();
    const d = ';';

    let csv = `ID${d}Estado${d}Origen${d}Destino${d}Solicitado Por${d}Aprobado Por${d}Items${d}Fecha Creacion${d}Notas\n`;

    for (const req of data) {
      const itemsList = req.items.map(i => `${i.inventoryItemName} (${i.quantity})`).join(', ');
      csv += `"${req.id}"${d}"${req.status}"${d}"${req.sourceWarehouseName}"${d}"${req.destinationWarehouseName}"${d}"${req.requestedByName}"${d}"${req.approvedByName || ''}"${d}"${itemsList}"${d}"${req.createdAt.toLocaleDateString()}"${d}"${req.notes || ''}"\n`;
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transfer-requests-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  /**
   * Refresh from backend
   */
  refresh(): void {
    this.loadRequests();
  }
}
