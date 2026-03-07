import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] rounded-xl overflow-hidden min-w-[320px] max-w-md">
      <!-- Header -->
      <div class="p-6 pb-4">
        <div class="flex items-start gap-4">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            [ngClass]="{
              'bg-[var(--color-error-bg)]': data.type === 'danger',
              'bg-[var(--color-warning-bg)]': data.type === 'warning',
              'bg-[var(--color-info-bg)]': data.type === 'info' || !data.type
            }">
            <lucide-icon
              [name]="data.type === 'danger' ? 'AlertTriangle' : data.type === 'warning' ? 'AlertCircle' : 'Info'"
              [ngClass]="{
                'text-[var(--color-status-error)]': data.type === 'danger',
                'text-[var(--color-status-warning)]': data.type === 'warning',
                'text-[var(--color-status-info)]': data.type === 'info' || !data.type
              }"
              class="!w-6 !h-6">
            </lucide-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-[var(--color-on-surface)] mb-1">{{ data.title }}</h2>
            <p class="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">{{ data.message }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-6 pb-6 flex justify-end gap-3">
        <button
          (click)="onCancel()"
          class="px-4 py-2 rounded-lg bg-[var(--color-surface-elevated)] text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors font-medium">
          {{ data.cancelText || ('COMMON.CANCEL' | translate) }}
        </button>
        <button
          (click)="onConfirm()"
          [ngClass]="{
            'bg-rose-600 hover:bg-rose-700': data.type === 'danger',
            'bg-orange-600 hover:bg-orange-700': data.type === 'warning',
            'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]': data.type === 'info' || !data.type
          }"
          class="px-4 py-2 rounded-lg text-white transition-colors font-medium">
          {{ data.confirmText || ('COMMON.CONFIRM' | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ConfirmDialog {
  protected dialogRef = inject(MatDialogRef<ConfirmDialog>);
  protected data: ConfirmDialogData = inject(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
