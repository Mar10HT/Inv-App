import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { RolesService } from '../../services/roles.service';
import { NotificationService } from '../../services/notification.service';
import { RoleSummary } from '../../interfaces/role.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { RoleFormDialog, RoleFormDialogData } from './role-form-dialog';

@Component({
  selector: 'app-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatDialogModule,
    TranslateModule,
    NgxPermissionsModule,
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1400px] mx-auto">

        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'ROLES.TITLE' | translate }}</h1>
              <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'ROLES.SUBTITLE' | translate }}</p>
            </div>
            <ng-container *ngxPermissionsOnly="['settings:edit']">
              <button
                (click)="openAdd()"
                class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
                <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
                {{ 'ROLES.ADD' | translate }}
              </button>
            </ng-container>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'ROLES.TOTAL' | translate }}</p>
                <p class="text-3xl font-bold text-foreground">{{ roles().length }}</p>
              </div>
              <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
                <lucide-icon name="ShieldCheck" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'ROLES.SYSTEM_ROLES' | translate }}</p>
                <p class="text-3xl font-bold text-foreground">{{ systemCount() }}</p>
              </div>
              <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
                <lucide-icon name="Lock" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'ROLES.CUSTOM_ROLES' | translate }}</p>
                <p class="text-3xl font-bold text-foreground">{{ customCount() }}</p>
              </div>
              <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
                <lucide-icon name="Pencil" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-xl p-4 mb-6">
            <div class="flex items-center gap-3">
              <lucide-icon name="Info" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
              <span class="text-[var(--color-status-error)]">{{ error() }}</span>
            </div>
          </div>
        }

        <!-- Table -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme flex items-center justify-between">
            <h2 class="text-xl font-semibold text-foreground">{{ 'ROLES.LIST' | translate }}</h2>
          </div>

          @if (loading()) {
            <div class="flex items-center justify-center py-16 gap-3 text-[var(--color-on-surface-variant)]">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
              {{ 'COMMON.LOADING' | translate }}...
            </div>
          } @else if (roles().length === 0) {
            <div class="flex flex-col items-center justify-center py-16">
              <lucide-icon name="ShieldOff" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
              <p class="text-[var(--color-on-surface-variant)] text-lg mb-2">{{ 'ROLES.NO_ROLES' | translate }}</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-theme text-left">
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'ROLES.NAME' | translate }}</th>
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'ROLES.DISPLAY_NAME' | translate }}</th>
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'ROLES.PERMISSIONS' | translate }}</th>
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'ROLES.USERS' | translate }}</th>
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'ROLES.TYPE' | translate }}</th>
                    <th class="px-6 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border-subtle)]">
                  @for (role of roles(); track role.id) {
                    <tr class="hover:bg-[var(--color-surface-elevated)] transition-colors group">
                      <td class="px-6 py-4">
                        <span class="font-mono text-sm text-foreground">{{ role.name }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <div>
                          <p class="text-sm font-medium text-foreground">{{ role.displayName }}</p>
                          @if (role.description) {
                            <p class="text-xs text-[var(--color-on-surface-muted)] mt-0.5 max-w-xs truncate">{{ role.description }}</p>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-[var(--color-on-surface-variant)]">{{ role.permissionCount }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm text-[var(--color-on-surface-variant)]">{{ role.userCount }}</span>
                      </td>
                      <td class="px-6 py-4">
                        @if (role.isSystem) {
                          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-primary)]">
                            <lucide-icon name="Lock" class="!w-3 !h-3"></lucide-icon>
                            {{ 'ROLES.SYSTEM' | translate }}
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)]">
                            <lucide-icon name="Pencil" class="!w-3 !h-3"></lucide-icon>
                            {{ 'ROLES.CUSTOM' | translate }}
                          </span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ng-container *ngxPermissionsOnly="['settings:edit']">
                            <button
                              type="button"
                              (click)="openEdit(role)"
                              [attr.aria-label]="'COMMON.EDIT' | translate"
                              class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                              <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                            </button>
                            @if (!role.isSystem) {
                              <button
                                type="button"
                                (click)="confirmDelete(role)"
                                [attr.aria-label]="'COMMON.DELETE' | translate"
                                class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                                <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                              </button>
                            }
                          </ng-container>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

      </div>
    </div>
  `
})
export class RolesComponent implements OnInit {
  private rolesService = inject(RolesService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  roles = signal<RoleSummary[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  systemCount = () => this.roles().filter(r => r.isSystem).length;
  customCount = () => this.roles().filter(r => !r.isSystem).length;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.rolesService.getAll().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (err) => {
        this.notifications.handleError(err);
        this.error.set(this.translate.instant('NOTIFICATIONS.ERRORS.SERVER'));
        this.loading.set(false);
      }
    });
  }

  openAdd(): void {
    const dialogRef = this.dialog.open(RoleFormDialog, {
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' } satisfies RoleFormDialogData
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) this.load();
    });
  }

  openEdit(role: RoleSummary): void {
    const dialogRef = this.dialog.open(RoleFormDialog, {
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'item-detail-dialog',
      data: { mode: 'edit', role } satisfies RoleFormDialogData
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) this.load();
    });
  }

  confirmDelete(role: RoleSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('ROLES.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('ROLES.DELETE_CONFIRM.MESSAGE', { name: role.displayName }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.rolesService.remove(role.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.ROLE', role.displayName);
            this.load();
          },
          error: (err) => this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.ROLE')
        });
      }
    });
  }
}
