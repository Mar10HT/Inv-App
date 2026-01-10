import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Transaction, CreateTransactionDto } from '../interfaces/transaction.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  transactions = signal<Transaction[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<Transaction[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Transaction[]>(this.apiUrl).pipe(
      tap({
        next: (transactions) => {
          this.transactions.set(transactions);
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
          this.transactions.update(transactions => [newTransaction, ...transactions]);
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
          this.transactions.update(transactions =>
            transactions.filter(t => t.id !== id)
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
