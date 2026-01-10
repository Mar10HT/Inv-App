import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] rounded-xl overflow-hidden min-w-[320px] max-w-md">
      <!-- Header -->
      <div class="p-6 pb-4">
        <div class="flex items-start gap-4">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            [ngClass]="{
              'bg-rose-950/50': data.type === 'danger',
              'bg-orange-950/50': data.type === 'warning',
              'bg-sky-950/50': data.type === 'info' || !data.type
            }">
            <mat-icon
              [ngClass]="{
                '!text-rose-400': data.type === 'danger',
                '!text-orange-400': data.type === 'warning',
                '!text-sky-400': data.type === 'info' || !data.type
              }"
              class="!text-2xl">
              {{ data.type === 'danger' ? 'warning' : data.type === 'warning' ? 'error_outline' : 'info' }}
            </mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-slate-200 mb-1">{{ data.title }}</h2>
            <p class="text-slate-400 text-sm leading-relaxed">{{ data.message }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-6 pb-6 flex justify-end gap-3">
        <button
          (click)="onCancel()"
          class="px-4 py-2 rounded-lg bg-[#242424] text-slate-300 hover:bg-[#2a2a2a] transition-colors font-medium">
          {{ data.cancelText || ('COMMON.CANCEL' | translate) }}
        </button>
        <button
          (click)="onConfirm()"
          [ngClass]="{
            'bg-rose-600 hover:bg-rose-700': data.type === 'danger',
            'bg-orange-600 hover:bg-orange-700': data.type === 'warning',
            'bg-[#4d7c6f] hover:bg-[#5d8c7f]': data.type === 'info' || !data.type
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
