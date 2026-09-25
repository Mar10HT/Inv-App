import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import { Category } from '../../interfaces/category.interface';
import { ConfirmService } from '../../services/confirm.service';
import { CategoryFormDialog, buildCategoryDialogData } from './category-form-dialog';
import { SkeletonCardComponent } from '../shared/skeleton/skeleton-card';
import { EmptyState } from '../shared/empty-state/empty-state';

@Component({
  selector: 'app-categories',
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
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'CATEGORY.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'CATEGORY.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['categories:create']">
          <button
            (click)="addCategory()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'CATEGORY.ADD' | translate }}
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
              <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'CATEGORY.TOTAL' | translate }}</p>
              <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
            </div>
            <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
              <lucide-icon name="Tag" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
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

    <!-- Categories Grid -->
    @if (loading()) {
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'CATEGORY.LIST' | translate }}</h2>
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
        <h2 class="text-xl font-semibold text-foreground">{{ 'CATEGORY.LIST' | translate }}</h2>
      </div>

      @if (categories().length === 0 && !loading()) {
        <!-- Empty State -->
        <app-empty-state icon="Tag" [heading]="'CATEGORY.NO_CATEGORIES' | translate" [description]="'CATEGORY.NO_CATEGORIES_DESC' | translate">
          <ng-container *ngxPermissionsOnly="['categories:create']">
            <button
              (click)="addCategory()"
              class="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium">
              {{ 'CATEGORY.ADD' | translate }}
            </button>
          </ng-container>
        </app-empty-state>
      } @else {
        <!-- Categories Grid View -->
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (category of categories(); track trackByFn($index, category)) {
            <div class="bg-[var(--color-surface)] border border-theme rounded-xl p-4 hover:border-[var(--color-border)] transition-all group">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    [style.backgroundColor]="category.color || '#4d7c6f'">
                    <lucide-icon name="Tag" class="!text-white !w-4 !h-4"></lucide-icon>
                  </div>
                  <div>
                    <h3 class="font-medium text-foreground">{{ category.name }}</h3>
                  </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ng-container *ngxPermissionsOnly="['categories:edit']">
                    <button
                      type="button"
                      (click)="editCategory(category)"
                      [attr.aria-label]="'COMMON.EDIT' | translate"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center">
                      <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['categories:delete']">
                    <button
                      type="button"
                      (click)="deleteCategory(category)"
                      [attr.aria-label]="'COMMON.DELETE' | translate"
                      class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center">
                      <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
              @if (category.description) {
                <p class="text-[var(--color-on-surface-variant)] text-sm line-clamp-2">{{ category.description }}</p>
              }
              @if (category.color) {
                <div class="mt-3 flex items-center gap-2">
                  <div
                    class="w-4 h-4 rounded border border-theme"
                    [style.backgroundColor]="category.color">
                  </div>
                  <span class="text-xs text-[var(--color-on-surface-variant)] uppercase">{{ category.color }}</span>
                </div>
              }
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
export class Categories implements OnInit {
  private categoryService = inject(CategoryService);
  private dialog = inject(MatDialog);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  categories = computed(() => this.categoryService.categories());
  loading = computed(() => this.categoryService.loading());
  error = computed(() => this.categoryService.error());

  // Stats
  stats = computed(() => {
    const all = this.categories();
    return {
      total: all.length
    };
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
  }

  addCategory(): void {
    const dialogRef = this.dialog.open(CategoryFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildCategoryDialogData(
        'add',
        (data) => this.categoryService.create(data),
        (id, data) => this.categoryService.update(id, data),
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.created('NOTIFICATIONS.ENTITIES.CATEGORY', result.name);
      }
    });
  }

  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CategoryFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: buildCategoryDialogData(
        'edit',
        (data) => this.categoryService.create(data),
        (id, data) => this.categoryService.update(id, data),
        category,
      )
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.notifications.updated('NOTIFICATIONS.ENTITIES.CATEGORY', result.name);
      }
    });
  }

  deleteCategory(category: Category): void {
    this.confirm.ask({
      title: this.translate.instant('CATEGORY.DELETE_CONFIRM.TITLE'),
      message: this.translate.instant('CATEGORY.DELETE_CONFIRM.MESSAGE', { name: category.name }),
      confirmText: this.translate.instant('COMMON.DELETE'),
      type: 'danger'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.categoryService.delete(category.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.CATEGORY', category.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.CATEGORY');
          }
        });
      }
    });
  }

  trackByFn(index: number, category: Category): string {
    return category.id;
  }
}
