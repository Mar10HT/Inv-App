import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ServiceCatalogService } from '../../services/service-catalog.service';
import { NotificationService } from '../../services/notification.service';
import { Service } from '../../interfaces/service.interface';
import { ConfirmService } from '../../services/confirm.service';
import { ServiceFormDialog, buildServiceDialogData } from './service-form-dialog';
import { SkeletonCardComponent } from '../shared/skeleton/skeleton-card';
import { EmptyState } from '../shared/empty-state/empty-state';
import { CrudDialogResult } from '../shared/crud-dialog';

@Component({
  selector: 'app-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    SkeletonCardComponent,
    EmptyState
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'SERVICE.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'SERVICE.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['services:create']">
          <button
            (click)="addService()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'SERVICE.ADD' | translate }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Stats Card -->
    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <app-skeleton-card />
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'SERVICE.TOTAL' | translate }}</p>
              <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
            </div>
            <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
              <lucide-icon name="Wrench" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
            </div>
          </div>
        </div>
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

    <!-- Services Grid -->
    @if (loading()) {
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'SERVICE.LIST' | translate }}</h2>
        </div>
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (card of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
            <app-skeleton-card />
          }
        </div>
      </div>
    } @else {
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">{{ 'SERVICE.LIST' | translate }}</h2>
      </div>

      @if (services().length === 0 && !loading()) {
        <!-- Empty State -->
        <app-empty-state icon="Wrench" [heading]="'SERVICE.NO_SERVICES' | translate" [description]="'SERVICE.NO_SERVICES_DESC' | translate">
          <ng-container *ngxPermissionsOnly="['services:create']">
            <button
              (click)="addService()"
              class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
              {{ 'SERVICE.ADD' | translate }}
            </button>
          </ng-container>
        </app-empty-state>
      } @else {
        <!-- Services Grid View -->
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (service of services(); track trackByFn($index, service)) {
            <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-4 hover:border-[var(--color-border)] transition-all group">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--color-primary-container)]">
                    <lucide-icon name="Wrench" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                  </div>
                  <div>
                    <h3 class="font-medium text-foreground">{{ service.name }}</h3>
                  </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ng-container *ngxPermissionsOnly="['services:edit']">
                    <button
                      type="button"
                      (click)="editService(service)"
                      [attr.aria-label]="'COMMON.EDIT' | translate"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center">
                      <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['services:delete']">
                    <button
                      type="button"
                      (click)="deleteService(service)"
                      [attr.aria-label]="'COMMON.DELETE' | translate"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
              @if (service.description) {
                <p class="text-[var(--color-on-surface-variant)] text-sm line-clamp-2">{{ service.description }}</p>
              }
              <p class="mt-3 text-sm font-medium text-foreground">
                @if (service.price !== null && service.price !== undefined) {
                  {{ formatPrice(service) }}
                } @else {
                  <span class="text-[var(--color-on-surface-variant)] font-normal">{{ 'SERVICE.NO_PRICE' | translate }}</span>
                }
              </p>
            </div>
          }
        </div>
      }
      </div>
    }
  </div>
</div>
  `,
})
export class Services implements OnInit {
  private serviceCatalog = inject(ServiceCatalogService);
  private dialog = inject(MatDialog);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  services = computed(() => this.serviceCatalog.services());
  loading = computed(() => this.serviceCatalog.loading());
  error = computed(() => this.serviceCatalog.error());

  // Stats
  stats = computed(() => {
    const all = this.services();
    return {
      total: all.length
    };
  });

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.serviceCatalog.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  addService(): void {
    const dialogRef: MatDialogRef<ServiceFormDialog, CrudDialogResult> = this.dialog.open(ServiceFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildServiceDialogData(
        'add',
        (data) => this.serviceCatalog.create(data),
        (id, data) => this.serviceCatalog.update(id, data),
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.SERVICE', result.name);
      }
    });
  }

  editService(service: Service): void {
    const dialogRef: MatDialogRef<ServiceFormDialog, CrudDialogResult> = this.dialog.open(ServiceFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildServiceDialogData(
        'edit',
        (data) => this.serviceCatalog.create(data),
        (id, data) => this.serviceCatalog.update(id, data),
        service,
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.SERVICE', result.name);
      }
    });
  }

  deleteService(service: Service): void {
    this.confirm.ask({
      title: this.translate.instant('SERVICE.DELETE_CONFIRM.TITLE'),
      message: this.translate.instant('SERVICE.DELETE_CONFIRM.MESSAGE', { name: service.name }),
      confirmText: this.translate.instant('COMMON.DELETE'),
      type: 'danger'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.serviceCatalog.delete(service.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.SERVICE', service.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.SERVICE');
          }
        });
      }
    });
  }

  /** "HNL 850.00", the suggested price each sale line starts from. */
  formatPrice(service: Service): string {
    return `${service.currency} ${Number(service.price).toFixed(2)}`;
  }

  trackByFn(index: number, service: Service): string {
    return service.id;
  }
}
