import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getRecentItems(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent-items?limit=${limit}`);
  }

  getLowStockItems(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/low-stock?limit=${limit}`);
  }

  getItemsByCategory(): Observable<CategoryStats[]> {
    return this.http.get<CategoryStats[]>(`${this.apiUrl}/items-by-category`);
  }

  getItemsByWarehouse(): Observable<WarehouseStats[]> {
    return this.http.get<WarehouseStats[]>(`${this.apiUrl}/items-by-warehouse`);
  }

  getItemsByStatus(): Observable<StatusStats[]> {
    return this.http.get<StatusStats[]>(`${this.apiUrl}/items-by-status`);
  }

  getMonthlyTransactions(): Observable<MonthlyTransactions[]> {
    return this.http.get<MonthlyTransactions[]>(`${this.apiUrl}/monthly-transactions`);
  }
}
