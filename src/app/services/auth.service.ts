import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, Subscription, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LoginRequest, RegisterRequest, AuthResponse, AuthUser,
  UpdateProfileResponse, ChangePasswordResponse, ForgotPasswordResponse,
  ResetPasswordResponse, PendingReset, GeneratedResetLink, MeResponse
} from '../interfaces/auth.interface';
import { PermissionsService } from './permissions.service';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private permissionsService = inject(PermissionsService);

  private readonly USER_KEY = 'auth_user';

  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());
  isAuthenticated = signal<boolean>(this.currentUser() !== null);

  userWarehouseIds = computed(() => this.currentUser()?.warehouseIds ?? []);
  isAdmin = computed(() => this.currentUser()?.role === 'SYSTEM_ADMIN');

  /** Tracks the current permissionsVersion so polling can detect changes. */
  private permissionsVersion = signal<number>(0);

  private pollSubscription: Subscription | null = null;

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
    this.checkAuth();
  }

  ngOnDestroy(): void {
    this.stopPermissionsPolling();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap(() => this.loadMeAndPermissions())
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, { withCredentials: true }).pipe(
      tap(() => this.loadMeAndPermissions())
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.stopPermissionsPolling();
        localStorage.removeItem(this.USER_KEY);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.permissionsVersion.set(0);
        this.permissionsService.clearPermissions();
        this.router.navigate(['/login']);
      })
    );
  }

  updateProfile(data: { name?: string; email: string }): Observable<UpdateProfileResponse> {
    return this.http.post<UpdateProfileResponse>(`${this.apiUrl}/profile`, data, { withCredentials: true }).pipe(
      tap(response => {
        const updatedUser = { ...this.currentUser(), ...response.user };
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);
      })
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data, { withCredentials: true });
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/reset-password/${token}`, { newPassword });
  }

  getPendingResets(): Observable<PendingReset[]> {
    return this.http.get<PendingReset[]>(`${this.apiUrl}/pending-resets`, { withCredentials: true });
  }

  generateResetLink(userId: string): Observable<GeneratedResetLink> {
    return this.http.post<GeneratedResetLink>(`${this.apiUrl}/admin/generate-reset-link/${userId}`, {}, { withCredentials: true });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Calls GET /auth/me to retrieve the user profile + resolved permissions
   * from the server. Stores the user and loads permissions into ngx-permissions.
   * Starts polling once the first load succeeds.
   */
  private loadMeAndPermissions(): void {
    this.http.get<MeResponse>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe(response => {
      if (!response) return;

      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      this.currentUser.set(response.user);
      this.isAuthenticated.set(true);
      this.permissionsVersion.set(response.permissionsVersion);
      this.permissionsService.loadPermissions(response.permissions);

      this.startPermissionsPolling();
    });
  }

  /**
   * Polls GET /auth/me every 60 s. When permissionsVersion changes, reloads
   * the permission set so the UI reacts without requiring a page refresh.
   */
  private startPermissionsPolling(): void {
    if (this.pollSubscription) return; // already running

    this.pollSubscription = interval(POLL_INTERVAL_MS).subscribe(() => {
      this.http.get<MeResponse>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
        catchError(() => of(null))
      ).subscribe(response => {
        if (!response) return;

        if (response.permissionsVersion !== this.permissionsVersion()) {
          this.permissionsVersion.set(response.permissionsVersion);
          this.permissionsService.loadPermissions(response.permissions);
        }
      });
    });
  }

  private stopPermissionsPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
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
      // Refresh permissions from the server on app init
      this.loadMeAndPermissions();
    } else {
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
    }
  }
}
