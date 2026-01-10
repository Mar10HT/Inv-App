import { Component, OnInit, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { CategoryFormDialog } from './category-form-dialog';

@Component({
  selector: 'app-categories',
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
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit {
  private categoryService = inject(CategoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

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
    this.categoryService.getAll().subscribe();
  }

  addCategory(): void {
    const dialogRef = this.dialog.open(CategoryFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Category created successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CategoryFormDialog, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog',
      data: { mode: 'edit', category }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Category updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  deleteCategory(category: Category): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Category',
        message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.categoryService.delete(category.id).subscribe({
          next: () => {
            this.snackBar.open(`"${category.name}" has been deleted`, 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
          },
          error: (err) => {
            this.snackBar.open(`Error deleting category: ${err.message}`, 'Close', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  trackByFn(index: number, category: Category): string {
    return category.id;
  }
}
