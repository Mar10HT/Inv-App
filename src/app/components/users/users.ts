import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { User, UserRole } from '../../interfaces/user.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { UserFormDialog } from './user-form-dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);

  users = computed(() => this.userService.users());
  loading = computed(() => this.userService.loading());
  error = computed(() => this.userService.error());

  // Stats
  stats = computed(() => {
    const all = this.users();
    return {
      total: all.length,
      admins: all.filter(u => u.role === UserRole.SYSTEM_ADMIN || u.role === UserRole.WAREHOUSE_MANAGER).length,
      users: all.filter(u => u.role === UserRole.USER).length,
      viewers: all.filter(u => u.role === UserRole.VIEWER).length
    };
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.getAll().subscribe();
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
        title: 'Delete User',
        message: `Are you sure you want to delete "${user.name || user.email}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
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
        return 'bg-rose-950/50 text-rose-400 border-rose-900';
      case UserRole.WAREHOUSE_MANAGER:
        return 'bg-purple-950/50 text-purple-400 border-purple-900';
      case UserRole.USER:
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-900';
      case UserRole.VIEWER:
        return 'bg-blue-950/50 text-blue-400 border-blue-900';
      case UserRole.EXTERNAL:
        return 'bg-slate-800/50 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
  }

  trackByFn(index: number, user: User): string {
    return user.id;
  }
}
