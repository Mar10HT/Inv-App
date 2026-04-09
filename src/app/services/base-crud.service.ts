import { inject, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, throwError, EMPTY } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { PaginatedResponse } from '../interfaces/common.interface';

const DEFAULT_FETCH_LIMIT = 1000;

export abstract class BaseCrudService<T extends { id: string }, CreateDto, UpdateDto = Partial<CreateDto>> {
  protected readonly http = inject(HttpClient);
  protected readonly translate = inject(TranslateService);
  protected abstract readonly apiUrl: string;
  protected abstract readonly items: WritableSignal<T[]>;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private start(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return this.translate.instant('NOTIFICATIONS.ERRORS.UNKNOWN');
  }

  private tapOps<R>(onNext?: (v: R) => void) {
    return tap<R>({
      next: (v) => {
        onNext?.(v);
        this.loading.set(false);
      },
    });
  }

  private handleError<R>(rethrow: boolean) {
    return catchError<R, Observable<R>>((err: unknown) => {
      const msg = this.extractErrorMessage(err);
      this.error.set(msg);
      this.loading.set(false);
      return rethrow ? throwError(() => err) : (EMPTY as Observable<R>);
    });
  }

  getAll(extraParams?: HttpParams): Observable<T[]> {
    this.start();
    const baseParams = extraParams ?? new HttpParams();
    const params = baseParams.has('limit')
      ? baseParams
      : baseParams.set('limit', String(DEFAULT_FETCH_LIMIT));
    return this.http.get<PaginatedResponse<T>>(this.apiUrl, { params }).pipe(
      map(r => r.data),
      this.tapOps<T[]>(items => this.items.set(items)),
      this.handleError<T[]>(true),
    );
  }

  getById(id: string): Observable<T> {
    this.start();
    return this.http.get<T>(`${this.apiUrl}/${id}`).pipe(
      this.tapOps<T>(),
      this.handleError<T>(true),
    );
  }

  create(dto: CreateDto): Observable<T> {
    this.start();
    return this.http.post<T>(this.apiUrl, dto).pipe(
      this.tapOps<T>(item => this.items.update(items => [...items, item])),
      this.handleError<T>(true),
    );
  }

  update(id: string, dto: UpdateDto): Observable<T> {
    this.start();
    return this.http.patch<T>(`${this.apiUrl}/${id}`, dto).pipe(
      this.tapOps<T>(item => this.items.update(items => items.map(i => i.id === id ? item : i))),
      this.handleError<T>(true),
    );
  }

  delete(id: string): Observable<void> {
    this.start();
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      this.tapOps<void>(() => this.items.update(items => items.filter(i => i.id !== id))),
      this.handleError<void>(true),
    );
  }
}
