import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  users = signal<User[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<User[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<User[]>(this.apiUrl).pipe(
      tap({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getById(id: string): Observable<User> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getUsersByRole(role?: string): User[] {
    if (!role) {
      return this.users();
    }
    return this.users().filter(user => user.role === role);
  }
}
