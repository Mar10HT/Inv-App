import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, RegisterRequest, AuthResponse, AuthUser, UpdateProfileResponse, ChangePasswordResponse } from '../interfaces/auth.interface';
import { PermissionsService } from './permissions.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private permissionsService = inject(PermissionsService);

  private readonly USER_KEY = 'auth_user';

  // Current user signal
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());
  isAuthenticated = signal<boolean>(this.currentUser() !== null);

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
    // Initialize authentication state from localStorage
    this.checkAuth();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, { withCredentials: true }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): Observable<any> {
    // Call backend logout endpoint to clear HttpOnly cookie
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        localStorage.removeItem(this.USER_KEY);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);

        // Clear all permissions
        this.permissionsService.clearPermissions();

        this.router.navigate(['/login']);
      })
    );
  }

  updateProfile(data: { name?: string; email: string }): Observable<UpdateProfileResponse> {
    return this.http.post<UpdateProfileResponse>(`${this.apiUrl}/profile`, data, { withCredentials: true }).pipe(
      tap(response => {
        // Update current user in storage and signal
        const updatedUser = { ...this.currentUser(), ...response.user };
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);
      })
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data, { withCredentials: true });
  }

  private handleAuthResponse(response: AuthResponse): void {
    // No need to store token - it's in HttpOnly cookie
    // Only store user data for UI purposes
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);

    // Load permissions based on user role
    this.permissionsService.loadPermissions(response.user.role);
  }

  private loadUserFromStorage(): AuthUser | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private checkAuth(): void {
    const user = this.loadUserFromStorage();

    if (user) {
      this.currentUser.set(user);
      this.isAuthenticated.set(true);

      // Load permissions on app init if user is logged in
      this.permissionsService.loadPermissions(user.role);
    } else {
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
    }
  }
}
