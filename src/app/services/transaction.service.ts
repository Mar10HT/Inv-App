import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Transaction, CreateTransactionDto } from '../interfaces/transaction.interface';
import { environment } from '../../environments/environment';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  private transactionsSignal = signal<Transaction[]>([]);
  private totalSignal = signal<number>(0);
  private pageSignal = signal<number>(1);

  transactions = computed(() => this.transactionsSignal());
  total = computed(() => this.totalSignal());
  currentPage = computed(() => this.pageSignal());

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(page: number = 1, limit: number = 50): Observable<Transaction[]> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<Transaction>>(this.apiUrl, { params }).pipe(
      map(response => response.data),
      tap({
        next: (transactions) => {
          this.transactionsSignal.set(transactions);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getRecent(limit: number = 10): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/recent?limit=${limit}`);
  }

  getById(id: string): Observable<Transaction> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Transaction>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  create(transaction: CreateTransactionDto): Observable<Transaction> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<Transaction>(this.apiUrl, transaction).pipe(
      tap({
        next: (newTransaction) => {
          this.transactionsSignal.update(txs => [newTransaction, ...txs]);
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
          this.transactionsSignal.update(txs =>
            txs.filter(t => t.id !== id)
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

  getStats(): Observable<{ totalIn: number; totalOut: number; totalTransfer: number; total: number }> {
    return this.http.get<{ totalIn: number; totalOut: number; totalTransfer: number; total: number }>(`${this.apiUrl}/stats`);
  }
}
