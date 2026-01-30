import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { CrudDialogData, CrudFieldConfig } from './crud-dialog-config.interface';

@Component({
  selector: 'app-crud-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    LucideAngularModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div>
          <h2 class="text-xl font-semibold text-foreground">
            {{ (data.mode === 'add' ? data.config.titleAddKey : data.config.titleEditKey) | translate }}
          </h2>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-foreground hover:bg-[#2a2a2a] transition-colors">
          <lucide-icon name="X"></lucide-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6">
        @for (field of data.config.fields; track field.key) {
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ field.labelKey | translate }}{{ field.required ? ' *' : '' }}
            </label>

            @if (field.type === 'textarea') {
              <textarea
                [formControlName]="field.key"
                [rows]="field.rows || 3"
                class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors resize-none"
                [class.!border-rose-500]="form.get(field.key)?.invalid && form.get(field.key)?.touched"
                [placeholder]="(field.placeholderKey || field.labelKey) | translate"
              ></textarea>
            } @else if (field.type === 'select') {
              <select
                [formControlName]="field.key"
                class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer appearance-none"
                [class.!border-rose-500]="form.get(field.key)?.invalid && form.get(field.key)?.touched">
                <option value="">{{ (field.placeholderKey || field.labelKey) | translate }}</option>
                @for (opt of field.options; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            } @else {
              <input
                [type]="field.type"
                [formControlName]="field.key"
                class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
                [class.!border-rose-500]="form.get(field.key)?.invalid && form.get(field.key)?.touched"
                [placeholder]="(field.placeholderKey || field.labelKey) | translate"
              />
            }

            @if (form.get(field.key)?.invalid && form.get(field.key)?.touched) {
              @if (field.errorMessages) {
                @for (errorEntry of getErrorEntries(field); track errorEntry.errorKey) {
                  @if (form.get(field.key)?.errors?.[errorEntry.errorKey]) {
                    <p class="text-rose-400 text-sm mt-1">{{ errorEntry.translationKey | translate: errorEntry.params }}</p>
                  }
                }
              } @else {
                @if (form.get(field.key)?.errors?.['required']) {
                  <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
                } @else if (form.get(field.key)?.errors?.['email']) {
                  <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.EMAIL' | translate }}</p>
                } @else if (form.get(field.key)?.errors?.['minlength']) {
                  <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: { length: form.get(field.key)?.errors?.['minlength']?.requiredLength } }}</p>
                } @else if (form.get(field.key)?.errors?.['maxlength']) {
                  <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MAX_LENGTH' | translate: { length: form.get(field.key)?.errors?.['maxlength']?.requiredLength } }}</p>
                }
              }
            }
          </div>
        }

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <button
            type="button"
            (click)="dialogRef.close()"
            class="px-6 py-2.5 rounded-lg bg-[#2a2a2a] text-slate-400 hover:bg-[#3a3a3a] hover:text-foreground transition-colors font-medium">
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
export class CrudDialog implements OnInit {
  dialogRef = inject(MatDialogRef<CrudDialog>);
  data = inject<CrudDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  saving = signal(false);
  form!: FormGroup;

  ngOnInit(): void {
    const controls: Record<string, any> = {};
    for (const field of this.data.config.fields) {
      const validators = field.validators || [];
      controls[field.key] = ['', validators];
    }
    this.form = this.fb.group(controls);

    if (this.data.mode === 'edit' && this.data.entity) {
      const patchValue: Record<string, any> = {};
      for (const field of this.data.config.fields) {
        patchValue[field.key] = this.data.entity[field.key] ?? '';
      }
      this.form.patchValue(patchValue);
    }
  }

  getErrorEntries(field: CrudFieldConfig): Array<{ errorKey: string; translationKey: string; params?: Record<string, any> }> {
    if (!field.errorMessages) return [];
    return Object.entries(field.errorMessages).map(([errorKey, config]) => ({
      errorKey,
      translationKey: config.key,
      params: config.params,
    }));
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;

    // Clean empty strings to undefined
    const cleanedValue: Record<string, any> = {};
    for (const field of this.data.config.fields) {
      const val = formValue[field.key];
      cleanedValue[field.key] = (val === '' && !field.required) ? undefined : val;
    }

    const idField = this.data.entityIdField || 'id';

    if (this.data.mode === 'add') {
      this.data.createFn(cleanedValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.entity) {
      this.data.updateFn(this.data.entity[idField], cleanedValue).subscribe({
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
