import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { PaginatedResponse } from '../interfaces/common.interface';

/** The most the API hands out per page; it silently caps larger requests. */
export const API_PAGE_LIMIT = 100;

/**
 * Walks every page of a paginated list and emits all rows once, for screens
 * that filter and count client-side. Asking for one big page isn't enough:
 * the API caps `limit` at 100, so anything older would quietly go missing.
 */
export function fetchAllPages<T>(
  http: HttpClient,
  url: string,
  params: HttpParams = new HttpParams(),
): Observable<T[]> {
  const page = (n: number) =>
    http.get<PaginatedResponse<T>>(url, {
      params: params.set('limit', String(API_PAGE_LIMIT)).set('page', String(n)),
    });
  return page(1).pipe(
    expand((res) => (res.meta.page < res.meta.totalPages ? page(res.meta.page + 1) : EMPTY)),
    map((res) => res.data),
    reduce((all, rows) => all.concat(rows), [] as T[]),
  );
}
