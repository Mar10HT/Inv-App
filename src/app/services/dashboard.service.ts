import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    // Get all items and return the most recent ones
    return this.http.get<any[]>(`${this.inventoryUrl}`);
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
    // Return empty array for now - transactions module exists but no stats endpoint yet
    return this.http.get<MonthlyTransactions[]>(`${environment.apiUrl}/transactions`);
  }

  // Additional methods to get counts for dashboard
  getWarehousesCount(): Observable<number> {
    return this.http.get<any[]>(this.warehousesUrl).pipe(
      map(items => items.length)
    );
  }

  getSuppliersCount(): Observable<number> {
    return this.http.get<any[]>(this.suppliersUrl).pipe(
      map(items => items.length)
    );
  }

  getCategoriesCount(): Observable<number> {
    return this.http.get<any[]>(this.categoriesUrl).pipe(
      map(items => items.length)
    );
  }

  getUsersCount(): Observable<number> {
    return this.http.get<any[]>(this.usersUrl).pipe(
      map(items => items.length)
    );
  }
}
