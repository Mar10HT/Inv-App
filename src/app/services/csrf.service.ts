import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Store CSRF token in memory (not localStorage - it's not sensitive since it requires the HttpOnly cookie to work)
  csrfToken = signal<string | null>(null);

  /**
   * Fetch CSRF token from backend
   * This should be called on app initialization
   */
  fetchCsrfToken() {
    return this.http.get<{ csrfToken: string }>(`${this.apiUrl}/csrf-token`, { withCredentials: true }).pipe(
      tap(response => {
        this.csrfToken.set(response.csrfToken);
      })
    );
  }

  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    return this.csrfToken();
  }
}
