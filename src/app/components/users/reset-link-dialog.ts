import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

export interface ResetLinkDialogData {
  userName: string;
  resetUrl: string;
  expiresAt: string;
}

@Component({
  selector: 'app-reset-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] rounded-xl overflow-hidden min-w-[320px] max-w-lg">
      <!-- Header -->
      <div class="p-6 pb-4">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center flex-shrink-0">
            <lucide-icon name="KeyRound" class="!w-6 !h-6 text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-[var(--color-on-surface)] mb-1">{{ 'USER.RESET_LINK_DIALOG.TITLE' | translate }}</h2>
            <p class="text-[var(--color-on-surface-variant)] text-sm">{{ data.userName }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 pb-4">
        <p class="text-[var(--color-on-surface-variant)] text-sm mb-3">{{ 'USER.RESET_LINK_DIALOG.DESCRIPTION' | translate }}</p>

        <!-- URL Box -->
        <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-3 mb-3">
          <p class="text-xs text-[var(--color-on-surface)] break-all font-mono select-all">{{ data.resetUrl }}</p>
        </div>

        <!-- Expiration -->
        <p class="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
          <lucide-icon name="Clock" class="!w-3.5 !h-3.5"></lucide-icon>
          {{ 'USER.RESET_LINK_DIALOG.EXPIRES_IN' | translate }}
        </p>
      </div>

      <!-- Actions -->
      <div class="px-6 pb-6 flex justify-end gap-3">
        <button
          (click)="onClose()"
          class="px-4 py-2 rounded-lg bg-[var(--color-surface-elevated)] text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors font-medium">
          {{ 'COMMON.CLOSE' | translate }}
        </button>
        <button
          (click)="copyLink()"
          class="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors font-medium flex items-center gap-2">
          <lucide-icon [name]="copied() ? 'Check' : 'Copy'" class="!w-4 !h-4"></lucide-icon>
          {{ (copied() ? 'USER.RESET_LINK_DIALOG.COPIED' : 'USER.RESET_LINK_DIALOG.COPY') | translate }}
        </button>
      </div>
    </div>
  `
})
export class ResetLinkDialog {
  protected dialogRef = inject(MatDialogRef<ResetLinkDialog>);
  protected data: ResetLinkDialogData = inject(MAT_DIALOG_DATA);

  copied = signal(false);

  copyLink(): void {
    navigator.clipboard.writeText(this.data.resetUrl).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
