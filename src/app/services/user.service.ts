import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { User, CreateUserDto, UpdateUserDto } from '../interfaces/user.interface';
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
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  users = signal<User[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<User[]> {
    this.loading.set(true);
    this.error.set(null);

    const params = new HttpParams().set('limit', '1000');

    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params }).pipe(
      map(response => response.data),
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

  create(user: CreateUserDto): Observable<User> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<User>(this.apiUrl, user).pipe(
      tap({
        next: (newUser) => {
          this.users.update(users => [...users, newUser]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  update(id: string, user: UpdateUserDto): Observable<User> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      tap({
        next: (updatedUser) => {
          this.users.update(users =>
            users.map(u => u.id === id ? updatedUser : u)
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
          this.users.update(users =>
            users.filter(u => u.id !== id)
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

  getUsersByRole(role?: string): User[] {
    if (!role) {
      return this.users();
    }
    return this.users().filter(user => user.role === role);
  }
}
