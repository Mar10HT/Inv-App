import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category.interface';

export interface CategoryFormDialogData {
  mode: 'add' | 'edit';
  category?: Category;
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div>
          <h2 class="text-xl font-semibold text-slate-300">
            {{ (data.mode === 'add' ? 'CATEGORY.ADD' : 'CATEGORY.EDIT') | translate }}
          </h2>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'CATEGORY.NAME' | translate }} *
          </label>
          <input
            type="text"
            formControlName="name"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [class.!border-rose-500]="form.get('name')?.invalid && form.get('name')?.touched"
            [placeholder]="'CATEGORY.NAME' | translate"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            @if (form.get('name')?.errors?.['required']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            } @else if (form.get('name')?.errors?.['minlength']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 2} }}</p>
            } @else if (form.get('name')?.errors?.['maxlength']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MAX_LENGTH' | translate: {length: 50} }}</p>
            }
          }
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'CATEGORY.DESCRIPTION' | translate }}
          </label>
          <textarea
            formControlName="description"
            rows="3"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors resize-none"
            [class.!border-rose-500]="form.get('description')?.invalid && form.get('description')?.touched"
            [placeholder]="'CATEGORY.DESCRIPTION' | translate"
          ></textarea>
          @if (form.get('description')?.invalid && form.get('description')?.touched) {
            @if (form.get('description')?.errors?.['maxlength']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MAX_LENGTH' | translate: {length: 200} }}</p>
            }
          }
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <button
            type="button"
            (click)="dialogRef.close()"
            class="px-6 py-2.5 rounded-lg bg-[#2a2a2a] text-slate-400 hover:bg-[#3a3a3a] hover:text-slate-300 transition-colors font-medium">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || saving()"
            class="px-6 py-2.5 rounded-lg bg-[#4d7c6f] text-white hover:bg-[#5d8c7f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2">
            @if (saving()) {
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            }
            {{ 'COMMON.SAVE' | translate }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class CategoryFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<CategoryFormDialog>);
  data = inject<CategoryFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);

  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(200)]]
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.category) {
      this.form.patchValue({
        name: this.data.category.name,
        description: this.data.category.description || ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;

    if (this.data.mode === 'add') {
      this.categoryService.create(formValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true, name: formValue.name });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.category) {
      this.categoryService.update(this.data.category.id, formValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true, name: formValue.name });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    }
  }
}
