import { inject, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { PaginatedResponse } from '../interfaces/common.interface';

export abstract class BaseCrudService<T extends { id: string }, CreateDto, UpdateDto = Partial<CreateDto>> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly apiUrl: string;
  protected abstract readonly items: WritableSignal<T[]>;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private start(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  private tapOps<R>(onNext?: (v: R) => void) {
    return tap<R>({
      next: (v) => {
        onNext?.(v);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  getAll(extraParams?: HttpParams): Observable<T[]> {
    this.start();
    const params = extraParams ?? new HttpParams().set('limit', '1000');
    return this.http.get<PaginatedResponse<T>>(this.apiUrl, { params }).pipe(
      map(r => r.data),
      this.tapOps<T[]>(items => this.items.set(items)),
    );
  }

  getById(id: string): Observable<T> {
    this.start();
    return this.http.get<T>(`${this.apiUrl}/${id}`).pipe(
      this.tapOps<T>(),
    );
  }

  create(dto: CreateDto): Observable<T> {
    this.start();
    return this.http.post<T>(this.apiUrl, dto).pipe(
      this.tapOps<T>(item => this.items.update(items => [...items, item])),
    );
  }

  update(id: string, dto: UpdateDto): Observable<T> {
    this.start();
    return this.http.patch<T>(`${this.apiUrl}/${id}`, dto).pipe(
      this.tapOps<T>(item => this.items.update(items => items.map(i => i.id === id ? item : i))),
    );
  }

  delete(id: string): Observable<void> {
    this.start();
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      this.tapOps<void>(() => this.items.update(items => items.filter(i => i.id !== id))),
    );
  }
}
