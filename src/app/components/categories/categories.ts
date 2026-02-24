import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import { Category } from '../../interfaces/category.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { CategoryFormDialog, buildCategoryDialogData } from './category-form-dialog';
import { SkeletonCardComponent } from '../shared/skeleton/skeleton-card';

@Component({
  selector: 'app-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    NgxPermissionsModule,
    SkeletonCardComponent
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit {
  private categoryService = inject(CategoryService);
  private dialog = inject(MatDialog);
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
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('CATEGORY.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('CATEGORY.DELETE_CONFIRM.MESSAGE', { name: category.name }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
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
