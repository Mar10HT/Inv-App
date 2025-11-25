import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '../interfaces/warehouse.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/warehouses`;

  warehouses = signal<Warehouse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<Warehouse[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Warehouse[]>(this.apiUrl).pipe(
      tap({
        next: (warehouses) => {
          this.warehouses.set(warehouses);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getById(id: string): Observable<Warehouse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Warehouse>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  create(warehouse: CreateWarehouseDto): Observable<Warehouse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<Warehouse>(this.apiUrl, warehouse).pipe(
      tap({
        next: (newWarehouse) => {
          this.warehouses.update(warehouses => [...warehouses, newWarehouse]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  update(id: string, warehouse: UpdateWarehouseDto): Observable<Warehouse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.put<Warehouse>(`${this.apiUrl}/${id}`, warehouse).pipe(
      tap({
        next: (updatedWarehouse) => {
          this.warehouses.update(warehouses =>
            warehouses.map(w => w.id === id ? updatedWarehouse : w)
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

  delete(id: string): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.warehouses.update(warehouses =>
            warehouses.filter(w => w.id !== id)
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
}
