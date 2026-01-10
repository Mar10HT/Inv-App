import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../interfaces/category.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/categories`;

  categories = signal<Category[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAll(): Observable<Category[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Category[]>(this.apiUrl).pipe(
      tap({
        next: (categories) => {
          this.categories.set(categories);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  getById(id: string): Observable<Category> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Category>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  create(category: CreateCategoryDto): Observable<Category> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<Category>(this.apiUrl, category).pipe(
      tap({
        next: (newCategory) => {
          this.categories.update(categories => [...categories, newCategory]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  update(id: string, category: UpdateCategoryDto): Observable<Category> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.put<Category>(`${this.apiUrl}/${id}`, category).pipe(
      tap({
        next: (updatedCategory) => {
          this.categories.update(categories =>
            categories.map(c => c.id === id ? updatedCategory : c)
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
          this.categories.update(categories =>
            categories.filter(c => c.id !== id)
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
