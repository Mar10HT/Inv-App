import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import {
  Transaction,
  CreateTransactionDto,
  StockMovement,
  MovementFilters,
  MovementSummary,
} from '../interfaces/transaction.interface';
import { PaginatedResponse } from '../interfaces/common.interface';
import { environment } from '../../environments/environment';
import { fetchAllPages } from '../utils/fetch-all-pages';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  private transactionsSignal = signal<Transaction[]>([]);

  transactions = computed(() => this.transactionsSignal());

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  private movementsUrl = `${environment.apiUrl}/reports/movements`;

  /**
   * One page of the stock movements across modules, newest first, plus the
   * totals of the whole period (Reports' Transactions tab). Without dates the
   * API returns the last 90 days.
   */
  getMovements(
    filters: MovementFilters,
    page: number,
    limit: number,
  ): Observable<PaginatedResponse<StockMovement> & { summary: MovementSummary }> {
    const params = movementParams(filters).set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<StockMovement> & { summary: MovementSummary }>(
      this.movementsUrl,
      { params },
    );
  }

  /** Every movement of the period, page by page (Trends and the exports). */
  getAllMovements(filters: MovementFilters): Observable<StockMovement[]> {
    return fetchAllPages<StockMovement>(this.http, this.movementsUrl, movementParams(filters));
  }

  getAll(page = 1, limit = 50): Observable<Transaction[]> {
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

  getRecent(limit = 10): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/recent?limit=${limit}`);
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
}

/** Only the filters that are set: an empty one would narrow to nothing. */
function movementParams(filters: MovementFilters): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params = params.set(key, value);
  }
  return params;
}
