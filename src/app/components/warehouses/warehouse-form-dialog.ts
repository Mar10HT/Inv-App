import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { WarehouseService } from '../../services/warehouse.service';
import { Warehouse } from '../../interfaces/warehouse.interface';

export interface WarehouseFormDialogData {
  mode: 'add' | 'edit';
  warehouse?: Warehouse;
}

@Component({
  selector: 'app-warehouse-form-dialog',
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
            {{ (data.mode === 'add' ? 'WAREHOUSE.ADD' : 'WAREHOUSE.EDIT') | translate }}
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
            {{ 'WAREHOUSE.NAME' | translate }} *
          </label>
          <input
            type="text"
            formControlName="name"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [class.!border-rose-500]="form.get('name')?.invalid && form.get('name')?.touched"
            [placeholder]="'WAREHOUSE.NAME' | translate"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            @if (form.get('name')?.errors?.['required']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            } @else if (form.get('name')?.errors?.['minlength']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 2} }}</p>
            }
          }
        </div>

        <!-- Location -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'WAREHOUSE.LOCATION' | translate }} *
          </label>
          <input
            type="text"
            formControlName="location"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [class.!border-rose-500]="form.get('location')?.invalid && form.get('location')?.touched"
            [placeholder]="'WAREHOUSE.LOCATION' | translate"
          />
          @if (form.get('location')?.invalid && form.get('location')?.touched) {
            @if (form.get('location')?.errors?.['required']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            } @else if (form.get('location')?.errors?.['minlength']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 2} }}</p>
            }
          }
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'WAREHOUSE.DESCRIPTION' | translate }}
          </label>
          <textarea
            formControlName="description"
            rows="3"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors resize-none"
            [placeholder]="'WAREHOUSE.DESCRIPTION' | translate"
          ></textarea>
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
export class WarehouseFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<WarehouseFormDialog>);
  data = inject<WarehouseFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private warehouseService = inject(WarehouseService);

  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.warehouse) {
      this.form.patchValue({
        name: this.data.warehouse.name,
        location: this.data.warehouse.location,
        description: this.data.warehouse.description || ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;

    if (this.data.mode === 'add') {
      this.warehouseService.create(formValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.warehouse) {
      this.warehouseService.update(this.data.warehouse.id, formValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    }
  }
}
