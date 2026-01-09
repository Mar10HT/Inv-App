import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { 
  InventoryItemInterface, 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto, 
  InventoryStatus,
  PaginatedResponse,
  StatsResponse,
  Warehouse,
  Supplier
} from '../../interfaces/inventory-item.interface';
import { environment } from '../../../environments/environment';

export interface FilterParams {
  search?: string;
  category?: string;
  status?: InventoryStatus;
  warehouseId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  
  private itemsSignal = signal<InventoryItemInterface[]>([]);
  private totalSignal = signal<number>(0);
  private warehousesSignal = signal<Warehouse[]>([]);
  private suppliersSignal = signal<Supplier[]>([]);
  
  items = computed(() => this.itemsSignal());
  total = computed(() => this.totalSignal());
  warehouses = computed(() => this.warehousesSignal());
  suppliers = computed(() => this.suppliersSignal());
  
  categories = computed(() => {
    const uniqueCategories = [...new Set(this.items().map(item => item.category))];
    return uniqueCategories.sort();
  });
  
  locations = computed(() => {
    return this.warehouses().map(w => w.name).sort();
  });

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadWarehouses();
    this.loadSuppliers();
    this.loadItems();
  }

  loadWarehouses(): void {
    this.http.get<Warehouse[]>(this.apiUrl + '/warehouses').pipe(
      catchError(err => {
        console.error('Error loading warehouses:', err);
        return of([]);
      })
    ).subscribe(warehouses => {
      this.warehousesSignal.set(warehouses);
    });
  }

  loadSuppliers(): void {
    this.http.get<Supplier[]>(this.apiUrl + '/suppliers').pipe(
      catchError(err => {
        console.error('Error loading suppliers:', err);
        return of([]);
      })
    ).subscribe(suppliers => {
      this.suppliersSignal.set(suppliers);
    });
  }

  loadItems(filters?: FilterParams): void {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.warehouseId) params = params.set('warehouseId', filters.warehouseId);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    } else {
      params = params.set('limit', '1000');
    }

    this.http.get<PaginatedResponse<InventoryItemInterface>>(this.apiUrl + '/inventory', { params }).pipe(
      map(response => ({
        items: response.data.map(item => this.transformItem(item)),
        total: response.meta.total
      })),
      catchError(err => {
        this.error.set(err.message || 'Error loading items');
        return of({ items: [], total: 0 });
      })
    ).subscribe(({ items, total }) => {
      this.itemsSignal.set(items);
      this.totalSignal.set(total);
      this.loading.set(false);
    });
  }

  private transformItem(item: any): InventoryItemInterface {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      assignedAt: item.assignedAt ? new Date(item.assignedAt) : undefined
    };
  }

  getStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(this.apiUrl + '/inventory/stats');
  }

  getItemById(id: string): Observable<InventoryItemInterface> {
    return this.http.get<InventoryItemInterface>(this.apiUrl + '/inventory/' + id).pipe(
      map(item => this.transformItem(item))
    );
  }

  createItem(item: CreateInventoryItemDto): Observable<InventoryItemInterface> {
    this.loading.set(true);
    return this.http.post<InventoryItemInterface>(this.apiUrl + '/inventory', item).pipe(
      map(newItem => this.transformItem(newItem)),
      tap({
        next: (newItem) => {
          this.itemsSignal.update(items => [...items, newItem]);
          this.totalSignal.update(t => t + 1);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  updateItem(id: string, updates: UpdateInventoryItemDto): Observable<InventoryItemInterface> {
    this.loading.set(true);
    return this.http.patch<InventoryItemInterface>(this.apiUrl + '/inventory/' + id, updates).pipe(
      map(updatedItem => this.transformItem(updatedItem)),
      tap({
        next: (updatedItem) => {
          this.itemsSignal.update(items =>
            items.map(item => item.id === id ? updatedItem : item)
          );
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  deleteItem(id: string): Observable<void> {
    this.loading.set(true);
    return this.http.delete<void>(this.apiUrl + '/inventory/' + id).pipe(
      tap({
        next: () => {
          this.itemsSignal.update(items => items.filter(item => item.id !== id));
          this.totalSignal.update(t => t - 1);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getFilteredItems(filters: {
    search?: string;
    category?: string;
    warehouseId?: string;
    status?: string;
  }): InventoryItemInterface[] {
    let filtered = this.items();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.description?.toLowerCase().includes(searchLower)) ||
        (item.sku?.toLowerCase().includes(searchLower))
      );
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.warehouseId && filters.warehouseId !== 'all') {
      filtered = filtered.filter(item => item.warehouseId === filters.warehouseId);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    return filtered;
  }

  getTotalItems(): number {
    return this.items().length;
  }

  getItemsByStatus(status: InventoryStatus): InventoryItemInterface[] {
    return this.items().filter(item => item.status === status);
  }

  getLowStockItems(): InventoryItemInterface[] {
    return this.items().filter(item => 
      item.status === InventoryStatus.LOW_STOCK || 
      item.status === InventoryStatus.OUT_OF_STOCK
    );
  }

  refresh(): void {
    this.loadInitialData();
  }
}
