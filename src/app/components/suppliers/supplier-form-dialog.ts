import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../interfaces/supplier.interface';

export interface SupplierFormDialogData {
  mode: 'add' | 'edit';
  supplier?: Supplier;
}

@Component({
  selector: 'app-supplier-form-dialog',
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
            {{ (data.mode === 'add' ? 'SUPPLIER.ADD' : 'SUPPLIER.EDIT') | translate }}
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
            {{ 'SUPPLIER.NAME' | translate }} *
          </label>
          <input
            type="text"
            formControlName="name"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="'SUPPLIER.NAME' | translate"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
          }
        </div>

        <!-- Location -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'SUPPLIER.LOCATION' | translate }} *
          </label>
          <input
            type="text"
            formControlName="location"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="'SUPPLIER.LOCATION' | translate"
          />
          @if (form.get('location')?.invalid && form.get('location')?.touched) {
            <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
          }
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'SUPPLIER.PHONE' | translate }}
          </label>
          <input
            type="tel"
            formControlName="phone"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="'SUPPLIER.PHONE' | translate"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'SUPPLIER.EMAIL' | translate }}
          </label>
          <input
            type="email"
            formControlName="email"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="'SUPPLIER.EMAIL' | translate"
          />
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.EMAIL' | translate }}</p>
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
export class SupplierFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<SupplierFormDialog>);
  data = inject<SupplierFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);

  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    email: ['', [Validators.email]]
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.supplier) {
      this.form.patchValue({
        name: this.data.supplier.name,
        location: this.data.supplier.location || '',
        phone: this.data.supplier.phone || '',
        email: this.data.supplier.email || ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;

    // Clean empty strings
    const cleanedValue = {
      name: formValue.name,
      location: formValue.location,
      phone: formValue.phone || undefined,
      email: formValue.email || undefined
    };

    if (this.data.mode === 'add') {
      this.supplierService.create(cleanedValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.supplier) {
      this.supplierService.update(this.data.supplier.id, cleanedValue).subscribe({
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
