import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import {
  StockTake,
  StockTakeItem,
  StockTakeStatus,
  CreateStockTakeDto,
  UpdateStockTakeItemDto,
  StockTakeStats,
  VarianceReport,
} from '../interfaces/stock-take.interface';
import { environment } from '../../environments/environment';

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
  providedIn: 'root',
})
export class StockTakeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/stock-take`;

  private stockTakesSignal = signal<StockTake[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  stockTakes = computed(() => this.stockTakesSignal());

  stats = computed<StockTakeStats>(() => {
    const all = this.stockTakesSignal();
    return {
      total: all.length,
      inProgress: all.filter((s) => s.status === StockTakeStatus.IN_PROGRESS).length,
      completed: all.filter((s) => s.status === StockTakeStatus.COMPLETED).length,
      cancelled: all.filter((s) => s.status === StockTakeStatus.CANCELLED).length,
    };
  });

  loadStockTakes(status?: StockTakeStatus): void {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('limit', '200');
    if (status) {
      params = params.set('status', status);
    }

    this.http
      .get<PaginatedResponse<any>>(this.apiUrl, { params })
      .pipe(map((response) => response.data.map((raw: any) => this.mapStockTake(raw))))
      .subscribe({
        next: (stockTakes) => {
          this.stockTakesSignal.set(stockTakes);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  create(dto: CreateStockTakeDto): Observable<StockTake> {
    this.loading.set(true);
    return this.http.post<any>(this.apiUrl, dto).pipe(
      map((raw) => this.mapStockTake(raw)),
      tap({
        next: (newSt) => {
          this.stockTakesSignal.update((list) => [newSt, ...list]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getById(id: string): Observable<StockTake> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((raw) => this.mapStockTake(raw)),
    );
  }

  updateItem(stockTakeId: string, dto: UpdateStockTakeItemDto): Observable<StockTakeItem> {
    return this.http.patch<any>(`${this.apiUrl}/${stockTakeId}/items`, dto).pipe(
      map((raw) => this.mapStockTakeItem(raw)),
    );
  }

  complete(id: string, applyToInventory: boolean): Observable<StockTake> {
    const params = new HttpParams().set('applyChanges', applyToInventory.toString());
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/complete`, {}, { params })
      .pipe(
        map((raw) => this.mapStockTake(raw)),
        tap({
          next: (updated) => {
            this.stockTakesSignal.update((list) =>
              list.map((s) => (s.id === updated.id ? updated : s)),
            );
          },
        }),
      );
  }

  cancel(id: string): Observable<StockTake> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map((raw) => this.mapStockTake(raw)),
      tap({
        next: (updated) => {
          this.stockTakesSignal.update((list) =>
            list.map((s) => (s.id === updated.id ? updated : s)),
          );
        },
      }),
    );
  }

  getVarianceReport(id: string): Observable<VarianceReport> {
    return this.http.get<VarianceReport>(`${this.apiUrl}/${id}/variance-report`);
  }

  // Map backend response to frontend model
  private mapStockTake(raw: any): StockTake {
    const items = (raw.items || []).map((item: any) => this.mapStockTakeItem(item));
    const countedItems = items.filter((i: StockTakeItem) => i.countedQty !== null).length;
    return {
      id: raw.id,
      warehouseId: raw.warehouseId,
      warehouseName: raw.warehouse?.name || '',
      status: raw.status,
      notes: raw.notes,
      startedByName: raw.startedBy?.name || raw.startedBy?.email || '',
      items,
      totalItems: raw._count?.items ?? items.length,
      countedItems,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
    };
  }

  private mapStockTakeItem(raw: any): StockTakeItem {
    return {
      id: raw.id,
      stockTakeId: raw.stockTakeId,
      itemId: raw.itemId,
      itemName: raw.item?.name || '',
      expectedQty: raw.expectedQty,
      countedQty: raw.countedQty ?? null,
      variance: raw.variance ?? null,
      notes: raw.notes,
      warehouseName: raw.item?.warehouse?.name,
    };
  }
}
