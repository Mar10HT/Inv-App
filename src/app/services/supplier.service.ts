import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../interfaces/supplier.interface';
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
  providedIn: 'root'
})
export class SupplierService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/suppliers`;

  suppliers = signal<Supplier[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<Supplier[]> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('limit', '1000');

    return this.http.get<PaginatedResponse<Supplier>>(this.apiUrl, { params }).pipe(
      map(response => response.data),
      tap({
        next: (suppliers) => {
          this.suppliers.set(suppliers);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getById(id: string): Observable<Supplier> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Supplier>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  create(supplier: CreateSupplierDto): Observable<Supplier> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<Supplier>(this.apiUrl, supplier).pipe(
      tap({
        next: (newSupplier) => {
          this.suppliers.update(suppliers => [...suppliers, newSupplier]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  update(id: string, supplier: UpdateSupplierDto): Observable<Supplier> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.put<Supplier>(`${this.apiUrl}/${id}`, supplier).pipe(
      tap({
        next: (updatedSupplier) => {
          this.suppliers.update(suppliers =>
            suppliers.map(s => s.id === id ? updatedSupplier : s)
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
          this.suppliers.update(suppliers =>
            suppliers.filter(s => s.id !== id)
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
