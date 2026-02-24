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
    <div class="bg-[#1a1a1a] rounded-xl overflow-hidden min-w-[320px] max-w-lg">
      <!-- Header -->
      <div class="p-6 pb-4">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-[#2d4a3f] flex items-center justify-center flex-shrink-0">
            <lucide-icon name="KeyRound" class="!w-6 !h-6 text-[#4d7c6f]"></lucide-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-slate-200 mb-1">{{ 'USER.RESET_LINK_DIALOG.TITLE' | translate }}</h2>
            <p class="text-slate-400 text-sm">{{ data.userName }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 pb-4">
        <p class="text-slate-400 text-sm mb-3">{{ 'USER.RESET_LINK_DIALOG.DESCRIPTION' | translate }}</p>

        <!-- URL Box -->
        <div class="bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg p-3 mb-3">
          <p class="text-xs text-slate-300 break-all font-mono select-all">{{ data.resetUrl }}</p>
        </div>

        <!-- Expiration -->
        <p class="text-xs text-slate-500 flex items-center gap-1.5">
          <lucide-icon name="Clock" class="!w-3.5 !h-3.5"></lucide-icon>
          {{ 'USER.RESET_LINK_DIALOG.EXPIRES_IN' | translate }}
        </p>
      </div>

      <!-- Actions -->
      <div class="px-6 pb-6 flex justify-end gap-3">
        <button
          (click)="onClose()"
          class="px-4 py-2 rounded-lg bg-[#242424] text-foreground hover:bg-[#2a2a2a] transition-colors font-medium">
          {{ 'COMMON.CLOSE' | translate }}
        </button>
        <button
          (click)="copyLink()"
          class="px-4 py-2 rounded-lg bg-[#4d7c6f] text-white hover:bg-[#5d8c7f] transition-colors font-medium flex items-center gap-2">
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
