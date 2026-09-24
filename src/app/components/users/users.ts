import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoggerService } from '../../services/logger.service';
import { User, UserRole } from '../../interfaces/user.interface';
import { PendingReset } from '../../interfaces/auth.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { UserFormDialog } from './user-form-dialog';
import { ResetLinkDialog } from './reset-link-dialog';
import { SetPasswordDialog } from './set-password-dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    MatSnackBarModule,
    TranslateModule,
    NgxPermissionsModule
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'USER.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'USER.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['users:create']">
          <button
            (click)="addUser()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'USER.ADD' | translate }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.TOTAL' | translate }}</p>
            <p class="text-2xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="Users" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.ROLES.ADMIN' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().admins }}</p>
          </div>
          <div class="bg-[var(--color-error-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="ShieldCheck" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.ROLES.WAREHOUSE_MANAGER' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-accent-amber)]">{{ stats().managers }}</p>
          </div>
          <div class="bg-[var(--color-accent-amber-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="Settings" class="!text-[var(--color-accent-amber)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.ROLES.USER' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().users }}</p>
          </div>
          <div class="bg-[var(--color-success-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="User" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.ROLES.VIEWER' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().viewers }}</p>
          </div>
          <div class="bg-[var(--color-info-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="Eye" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-5 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-[var(--color-on-surface-variant)]">{{ 'USER.ROLES.EXTERNAL' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-warning)]">{{ stats().external }}</p>
          </div>
          <div class="bg-[var(--color-warning-bg)] p-2.5 rounded-lg flex items-center justify-center w-10 h-10 flex-shrink-0">
            <lucide-icon name="BadgeCheck" class="!text-[var(--color-status-warning)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    }

    <!-- Error State -->
    @if (error()) {
      <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-xl p-4 mb-6">
        <div class="flex items-center gap-3">
          <lucide-icon name="CircleAlert" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          <span class="text-[var(--color-status-error)]">{{ error() }}</span>
        </div>
      </div>
    }

    <!-- Users Table -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">{{ 'USER.LIST' | translate }}</h2>
      </div>

      @if (users().length === 0 && !loading()) {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-16">
          <lucide-icon name="Users" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
          <p class="text-[var(--color-on-surface-variant)] text-lg mb-2">{{ 'USER.NO_USERS' | translate }}</p>
          <p class="text-[var(--color-on-surface-muted)] text-sm mb-6">{{ 'USER.NO_USERS_DESC' | translate }}</p>
          <ng-container *ngxPermissionsOnly="['users:create']">
            <button
              (click)="addUser()"
              class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
              {{ 'USER.ADD' | translate }}
            </button>
          </ng-container>
        </div>
      } @else {
        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full" [attr.aria-label]="'USER.TITLE' | translate">
            <thead>
              <tr class="bg-[var(--color-surface)]">
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">{{ 'USER.NAME' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">{{ 'USER.EMAIL' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'USER.ROLE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (user of users(); track trackByFn($index, user)) {
                <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                  <!-- Name Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="relative w-10 h-10 bg-[var(--color-primary-container)] rounded-full flex items-center justify-center flex-shrink-0">
                        <lucide-icon name="User" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                        @if (hasPendingReset(user.id)) {
                          <span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-[var(--color-surface-variant)]" [title]="'USER.PENDING_RESET' | translate"></span>
                        }
                      </div>
                      <div>
                        <p class="font-medium text-foreground">{{ user.name || ('COMMON.NO_NAME' | translate) }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Email Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
                      <lucide-icon name="Mail" class="!w-3.5 !h-3.5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
                      <span>{{ user.email }}</span>
                    </div>
                  </td>

                  <!-- Role Column -->
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-medium border" [class]="getRoleBadgeClass(user.role)">
                      {{ 'USER.ROLES.' + user.role | translate }}
                    </span>
                  </td>

                  <!-- Actions Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1">
                      <ng-container *ngxPermissionsOnly="['users:edit']">
                        <button
                          type="button"
                          (click)="editUser(user)"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center"
                          [title]="'USER.EDIT' | translate"
                          [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + (user.name || user.email)">
                          <lucide-icon name="Pencil" class="!w-5 !h-5"></lucide-icon>
                        </button>
                        <button
                          type="button"
                          (click)="setPassword(user)"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors flex items-center justify-center"
                          [title]="'USER.SET_PASSWORD' | translate"
                          [attr.aria-label]="('USER.SET_PASSWORD' | translate) + ' ' + (user.name || user.email)">
                          <lucide-icon name="Lock" class="!w-5 !h-5"></lucide-icon>
                        </button>
                        <button
                          type="button"
                          (click)="resetPassword(user)"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-accent-amber)] hover:bg-[var(--color-accent-amber-bg)] transition-colors flex items-center justify-center"
                          [title]="'USER.RESET_PASSWORD' | translate"
                          [attr.aria-label]="('USER.RESET_PASSWORD' | translate) + ' ' + (user.name || user.email)">
                          <lucide-icon name="KeyRound" class="!w-5 !h-5"></lucide-icon>
                        </button>
                      </ng-container>
                      <ng-container *ngxPermissionsOnly="['users:delete']">
                        <button
                          type="button"
                          (click)="deleteUser(user)"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center"
                          [title]="'COMMON.DELETE' | translate"
                          [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + (user.name || user.email)">
                          <lucide-icon name="Trash2" class="!w-5 !h-5"></lucide-icon>
                        </button>
                      </ng-container>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View - GRID 2 COLUMNS -->
        <div class="lg:hidden p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (user of users(); track trackByFn($index, user)) {
              <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors">
                <!-- Avatar & Role -->
                <div class="flex justify-between items-start mb-2">
                  <div class="relative w-8 h-8 bg-[var(--color-primary-container)] rounded-full flex items-center justify-center flex-shrink-0">
                    <lucide-icon name="User" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                    @if (hasPendingReset(user.id)) {
                      <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[var(--color-surface)]"></span>
                    }
                  </div>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-medium border" [class]="getRoleBadgeClass(user.role)">
                    {{ 'USER.ROLES.' + user.role | translate }}
                  </span>
                </div>

                <!-- User Info -->
                <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ user.name || ('COMMON.NO_NAME' | translate) }}</h3>
                <div class="flex items-center gap-1 text-[var(--color-on-surface-variant)] text-xs truncate mb-2">
                  <lucide-icon name="Mail" class="!w-3 !h-3 flex-shrink-0"></lucide-icon>
                  <span class="truncate">{{ user.email }}</span>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-1 pt-2 border-t border-[var(--color-border-subtle)]">
                  <ng-container *ngxPermissionsOnly="['users:edit']">
                    <button
                      type="button"
                      (click)="editUser(user)"
                      [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + (user.name || user.email)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                      <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                    </button>
                    <button
                      type="button"
                      (click)="setPassword(user)"
                      [attr.aria-label]="('USER.SET_PASSWORD' | translate) + ' ' + (user.name || user.email)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors">
                      <lucide-icon name="Lock" class="!w-4 !h-4"></lucide-icon>
                    </button>
                    <button
                      type="button"
                      (click)="resetPassword(user)"
                      [attr.aria-label]="('USER.RESET_PASSWORD' | translate) + ' ' + (user.name || user.email)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-accent-amber)] hover:bg-[var(--color-accent-amber-bg)] transition-colors">
                      <lucide-icon name="KeyRound" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['users:delete']">
                    <button
                      type="button"
                      (click)="deleteUser(user)"
                      [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + (user.name || user.email)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  </div>
</div>
  `,
})
export class Users implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private logger = inject(LoggerService);

  users = computed(() => this.userService.users());
  loading = computed(() => this.userService.loading());
  error = computed(() => this.userService.error());

  // Pending password resets (admin only)
  pendingResets = signal<PendingReset[]>([]);
  pendingResetUserIds = computed(() => new Set(this.pendingResets().map(r => r.userId)));

  // Stats
  stats = computed(() => {
    const all = this.users();
    return {
      total: all.length,
      admins: all.filter(u => u.role === UserRole.SYSTEM_ADMIN).length,
      managers: all.filter(u => u.role === UserRole.WAREHOUSE_MANAGER).length,
      users: all.filter(u => u.role === UserRole.USER).length,
      viewers: all.filter(u => u.role === UserRole.VIEWER).length,
      external: all.filter(u => u.role === UserRole.EXTERNAL).length
    };
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingResets();
  }

  private loadUsers(): void {
    this.userService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  private loadPendingResets(): void {
    this.authService.getPendingResets().subscribe({
      next: (resets) => this.pendingResets.set(resets),
      // Silently fail for non-admins (expected 403); still logged for debugging.
      error: (err) => this.logger.debug('Failed to load pending password resets', err)
    });
  }

  hasPendingReset(userId: string): boolean {
    return this.pendingResetUserIds().has(userId);
  }

  resetPassword(user: User): void {
    this.authService.generateResetLink(user.id).subscribe({
      next: (result) => {
        this.dialog.open(ResetLinkDialog, {
          width: '500px',
          maxWidth: '95vw',
          panelClass: 'item-detail-dialog',
          data: {
            userName: user.name || user.email,
            resetUrl: result.resetUrl,
            expiresAt: result.expiresAt
          }
        });
        // Refresh pending resets
        this.loadPendingResets();
      },
      error: (err) => {
        this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.USER');
      }
    });
  }

  setPassword(user: User): void {
    // Self password changes must go through the profile change-password flow
    // (which verifies the current password); the backend rejects self via this path.
    if (user.id === this.authService.currentUser()?.id) {
      this.notifications.info('USER.SET_PASSWORD_DIALOG.SELF_NOT_ALLOWED');
      return;
    }

    const dialogRef = this.dialog.open(SetPasswordDialog, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { userId: user.id, userName: user.name || user.email }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.notifications.success('USER.SET_PASSWORD_DIALOG.SUCCESS', {
          interpolateParams: { name: user.name || user.email }
        });
      }
    });
  }

  addUser(): void {
    const dialogRef = this.dialog.open(UserFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.USER', result.name || result.email);
      }
    });
  }

  editUser(user: User): void {
    const dialogRef = this.dialog.open(UserFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'edit', user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.USER', result.name || result.email);
      }
    });
  }

  deleteUser(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('USER.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('USER.DELETE_CONFIRM.MESSAGE', { name: user.name || user.email }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.userService.delete(user.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.USER', user.name || user.email);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.USER');
          }
        });
      }
    });
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border-[var(--color-error-border)]';
      case UserRole.WAREHOUSE_MANAGER:
        return 'bg-[var(--color-accent-purple-bg)] text-[var(--color-accent-purple)] border-[var(--color-accent-purple-bg)]';
      case UserRole.USER:
        return 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border-[var(--color-success-border)]';
      case UserRole.VIEWER:
        return 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border-[var(--color-info-border)]';
      case UserRole.EXTERNAL:
        return 'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)] border-[var(--color-warning-border)]';
      default:
        return 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border-[var(--color-border)]';
    }
  }

  trackByFn(index: number, user: User): string {
    return user.id;
  }
}
