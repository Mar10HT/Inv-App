import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ClientService } from '../../services/client.service';
import { NotificationService } from '../../services/notification.service';
import { Client } from '../../interfaces/client.interface';
import { ConfirmService } from '../../services/confirm.service';
import { ClientFormDialog, buildClientDialogData } from './client-form-dialog';
import { Spinner } from '../shared/spinner/spinner';
import { EmptyState } from '../shared/empty-state/empty-state';
import { CrudDialogResult } from '../shared/crud-dialog';

@Component({
  selector: 'app-clients',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    Spinner,
    EmptyState
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'CLIENT.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'CLIENT.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['clients:create']">
          <button
            (click)="addClient()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'CLIENT.ADD' | translate }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'CLIENT.TOTAL' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Contact" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <app-spinner></app-spinner>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    }

    <!-- Error State -->
    @if (error()) {
      <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-xl p-4 mb-6">
        <div class="flex items-center gap-3">
          <lucide-icon name="Info" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          <span class="text-[var(--color-status-error)]">{{ error() }}</span>
        </div>
      </div>
    }

    <!-- Clients Table -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">{{ 'CLIENT.LIST' | translate }}</h2>
      </div>

      @if (clients().length === 0 && !loading()) {
        <!-- Empty State -->
        <app-empty-state icon="Contact" [heading]="'CLIENT.NO_CLIENTS' | translate" [description]="'CLIENT.NO_CLIENTS_DESC' | translate">
          <ng-container *ngxPermissionsOnly="['clients:create']">
            <button
              (click)="addClient()"
              class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
              {{ 'CLIENT.ADD' | translate }}
            </button>
          </ng-container>
        </app-empty-state>
      } @else {
        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full" [attr.aria-label]="'CLIENT.TITLE' | translate">
            <thead>
              <tr class="bg-[var(--color-surface)]">
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'CLIENT.CODE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider min-w-[200px]">{{ 'CLIENT.NAME' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'CLIENT.RTN' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'CLIENT.PHONE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'CLIENT.PAYMENT_CONDITION' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'CLIENT.ACTIVE' | translate }}</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (client of clients(); track trackByFn($index, client)) {
                <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                  <!-- Code Column -->
                  <td class="px-6 py-4">
                    <span class="font-mono text-sm text-[var(--color-on-surface-variant)]">{{ client.code }}</span>
                  </td>

                  <!-- Name Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <lucide-icon name="Contact" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                      </div>
                      <p class="font-medium text-foreground">{{ client.name }}</p>
                    </div>
                  </td>

                  <!-- RTN Column -->
                  <td class="px-6 py-4">
                    <span class="text-[var(--color-on-surface-variant)]">{{ client.rtn || '-' }}</span>
                  </td>

                  <!-- Phone Column -->
                  <td class="px-6 py-4">
                    <span class="text-[var(--color-on-surface-variant)]">{{ client.phone || '-' }}</span>
                  </td>

                  <!-- Payment Condition Column -->
                  <td class="px-6 py-4">
                    <span class="text-[var(--color-on-surface-variant)]">{{ ('CLIENT.PAYMENT_CONDITION_OPTIONS.' + client.paymentCondition) | translate }}</span>
                  </td>

                  <!-- Active Column -->
                  <td class="px-6 py-4">
                    @if (client.isActive) {
                      <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-status-success)]">{{ 'CLIENT.ACTIVE' | translate }}</span>
                    } @else {
                      <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--color-error-bg)] text-[var(--color-status-error)]">{{ 'CLIENT.INACTIVE' | translate }}</span>
                    }
                  </td>

                  <!-- Actions Column -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1">
                      <ng-container *ngxPermissionsOnly="['clients:edit']">
                        <button
                          type="button"
                          (click)="editClient(client)"
                          [attr.aria-label]="'COMMON.EDIT' | translate"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center">
                          <lucide-icon name="Pencil" class="!w-5 !h-5"></lucide-icon>
                        </button>
                      </ng-container>
                      <ng-container *ngxPermissionsOnly="['clients:delete']">
                        <button
                          type="button"
                          (click)="deleteClient(client)"
                          [attr.aria-label]="'COMMON.DELETE' | translate"
                          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center">
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
            @for (client of clients(); track trackByFn($index, client)) {
              <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors">
                <!-- Icon -->
                <div class="w-8 h-8 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center mb-2">
                  <lucide-icon name="Contact" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                </div>

                <!-- Client Info -->
                <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ client.name }}</h3>
                <div class="flex items-center gap-1 text-[var(--color-on-surface-variant)] text-xs truncate mb-1">
                  <span class="font-mono truncate">{{ client.code }}</span>
                </div>

                <!-- Contact Info -->
                <div class="space-y-0.5 mb-2">
                  @if (client.phone) {
                    <div class="flex items-center gap-1 text-[var(--color-on-surface-muted)] text-xs truncate">
                      <lucide-icon name="Phone" class="!w-3 !h-3 flex-shrink-0"></lucide-icon>
                      <span class="truncate">{{ client.phone }}</span>
                    </div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-1 pt-2 border-t border-[var(--color-border-subtle)]">
                  <ng-container *ngxPermissionsOnly="['clients:edit']">
                    <button
                      type="button"
                      (click)="editClient(client)"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                      <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['clients:delete']">
                    <button
                      type="button"
                      (click)="deleteClient(client)"
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
export class Clients implements OnInit {
  private clientService = inject(ClientService);
  private dialog = inject(MatDialog);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  clients = computed(() => this.clientService.clients());
  loading = computed(() => this.clientService.loading());
  error = computed(() => this.clientService.error());

  stats = computed(() => {
    const all = this.clients();
    return {
      total: all.length
    };
  });

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.clientService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  addClient(): void {
    const dialogRef: MatDialogRef<ClientFormDialog, CrudDialogResult> = this.dialog.open(ClientFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildClientDialogData(
        'add',
        (data) => this.clientService.create(data),
        (id, data) => this.clientService.update(id, data),
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.CLIENT', result.name);
      }
    });
  }

  editClient(client: Client): void {
    const dialogRef: MatDialogRef<ClientFormDialog, CrudDialogResult> = this.dialog.open(ClientFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildClientDialogData(
        // createFn is never invoked in edit mode (see CrudDialog.onSubmit); pointed at
        // update so a future reader isn't misled into thinking it creates a duplicate.
        'edit',
        (data) => this.clientService.update(client.id, data),
        (id, data) => this.clientService.update(id, data),
        client,
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.CLIENT', result.name);
      }
    });
  }

  deleteClient(client: Client): void {
    this.confirm.ask({
      title: this.translate.instant('CLIENT.DELETE_CONFIRM.TITLE'),
      message: this.translate.instant('CLIENT.DELETE_CONFIRM.MESSAGE', { name: client.name }),
      confirmText: this.translate.instant('COMMON.DELETE'),
      type: 'danger'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.clientService.delete(client.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.CLIENT', client.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.CLIENT');
          }
        });
      }
    });
  }

  trackByFn(index: number, client: Client): string {
    return client.id;
  }
}
