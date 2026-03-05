import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface StatusStats {
  status: string;
  count: number;
}

export interface MonthlyTransactions {
  month: string;
  IN: number;
  OUT: number;
  TRANSFER: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private inventoryUrl = `${environment.apiUrl}/inventory`;
  private warehousesUrl = `${environment.apiUrl}/warehouses`;
  private suppliersUrl = `${environment.apiUrl}/suppliers`;
  private categoriesUrl = `${environment.apiUrl}/categories`;
  private usersUrl = `${environment.apiUrl}/users`;

  getStats(): Observable<any> {
    // Use inventory stats endpoint which already exists
    return this.http.get<any>(`${this.inventoryUrl}/stats`);
  }

  getRecentItems(limit: number = 5): Observable<any[]> {
    return this.http.get<any>(`${this.inventoryUrl}`).pipe(
      map(res => (res.data || []).slice(0, limit))
    );
  }

  getLowStockItems(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.inventoryUrl}/low-stock`);
  }

  getItemsByCategory(): Observable<CategoryStats[]> {
    // This data comes from the stats endpoint
    return this.http.get<any>(`${this.inventoryUrl}/stats`);
  }

  getItemsByWarehouse(): Observable<WarehouseStats[]> {
    // This data comes from the stats endpoint
    return this.http.get<any>(`${this.inventoryUrl}/stats`);
  }

  getItemsByStatus(): Observable<StatusStats[]> {
    // This data comes from the stats endpoint
    return this.http.get<any>(`${this.inventoryUrl}/stats`);
  }

  getMonthlyTransactions(): Observable<MonthlyTransactions[]> {
    // No stats endpoint yet - return empty array to avoid breaking the dashboard
    return of([]);
  }

  // Additional methods to get counts for dashboard
  getWarehousesCount(): Observable<number> {
    return this.http.get<any>(this.warehousesUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }

  getSuppliersCount(): Observable<number> {
    return this.http.get<any>(this.suppliersUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }

  getCategoriesCount(): Observable<number> {
    return this.http.get<any>(this.categoriesUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }

  getUsersCount(): Observable<number> {
    return this.http.get<any>(this.usersUrl).pipe(
      map(res => res.meta?.total ?? res.data?.length ?? 0)
    );
  }
}
