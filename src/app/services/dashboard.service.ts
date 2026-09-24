import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { StatsResponse, InventoryItemInterface } from '../interfaces/inventory-item.interface';
import { PaginatedResponse } from '../interfaces/common.interface';

export interface DashboardStats {
  totalItems: number;
  totalUsers: number;
  totalWarehouses: number;
  totalSuppliers: number;
  totalCategories: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  inUseItems: number;
  totalValueUSD: number;
  totalValueHNL: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  totalQuantity: number;
}

export interface WarehouseStats {
  id: string;
  name: string;
  itemCount: number;
  totalQuantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private inventoryUrl = `${environment.apiUrl}/inventory`;
  private warehousesUrl = `${environment.apiUrl}/warehouses`;
  private categoriesUrl = `${environment.apiUrl}/categories`;
  private usersUrl = `${environment.apiUrl}/users`;

  getStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.inventoryUrl}/stats`);
  }

  getLowStockItems(limit = 10): Observable<InventoryItemInterface[]> {
    return this.http.get<InventoryItemInterface[]>(`${this.inventoryUrl}/low-stock`).pipe(
      map(items => (items || []).slice(0, limit))
    );
  }

  // Additional methods to get counts for dashboard
  getWarehousesCount(): Observable<number> {
    return this.http.get<PaginatedResponse<unknown>>(this.warehousesUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }

  getCategoriesCount(): Observable<number> {
    return this.http.get<PaginatedResponse<unknown>>(this.categoriesUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }

  getUsersCount(): Observable<number> {
    return this.http.get<PaginatedResponse<unknown>>(this.usersUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }
}
