import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User, UserRole } from '../../interfaces/user.interface';
import { PendingReset } from '../../interfaces/auth.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { UserFormDialog } from './user-form-dialog';
import { ResetLinkDialog } from './reset-link-dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    NgxPermissionsModule
  ],
  templateUrl: './users.html'
})
export class Users implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

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
      error: () => {} // Silently fail for non-admins
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
