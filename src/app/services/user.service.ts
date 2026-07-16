import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { User, CreateUserDto, UpdateUserDto } from '../interfaces/user.interface';
import { Warehouse } from '../interfaces/warehouse.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseCrudService<User, CreateUserDto, UpdateUserDto> {
  protected readonly apiUrl = `${environment.apiUrl}/users`;
  protected readonly items = signal<User[]>([]);

  readonly users = this.items;

  getUsersByRole(role?: string): User[] {
    if (!role) {
      return this.users();
    }
    return this.users().filter(user => user.role === role);
  }

  getUserWarehouses(userId: string): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.apiUrl}/${userId}/warehouses`);
  }

  /**
   * Admin: directly set another user's password (bypasses the reset-link/email flow).
   * Backed by PATCH /users/:id/password.
   */
  setPassword(userId: string, newPassword: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${userId}/password`, { newPassword });
  }

  assignWarehouses(userId: string, warehouseIds: string[]): Observable<Warehouse[]> {
    return this.http.post<Warehouse[]>(`${this.apiUrl}/${userId}/warehouses`, { warehouseIds });
  }
}
