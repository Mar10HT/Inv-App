import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';

export interface SetPasswordDialogData {
  userId: string;
  userName: string;
}

// Mirrors the backend @IsStrongPassword policy: 12+ chars, upper, lower, digit, special (@$!%*?&).
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

@Component({
  selector: 'app-set-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] rounded-xl overflow-hidden min-w-[320px] max-w-lg">
      <!-- Header -->
      <div class="p-6 pb-4">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center flex-shrink-0">
            <lucide-icon name="Lock" class="!w-6 !h-6 text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-[var(--color-on-surface)] mb-1">{{ 'USER.SET_PASSWORD_DIALOG.TITLE' | translate }}</h2>
            <p class="text-[var(--color-on-surface-variant)] text-sm truncate">{{ data.userName }}</p>
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Content -->
        <div class="px-6 pb-4 flex flex-col gap-4">
          <p class="text-[var(--color-on-surface-variant)] text-sm">{{ 'USER.SET_PASSWORD_DIALOG.DESCRIPTION' | translate }}</p>

          <!-- New Password -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-foreground">{{ 'USER.SET_PASSWORD_DIALOG.NEW_PASSWORD' | translate }}</label>
            <div class="flex items-center gap-2.5 bg-[var(--color-surface)] border border-theme rounded-lg px-3.5 py-3
                        focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="Lock" class="!w-[18px] !h-[18px] !text-[var(--color-on-surface-variant)] shrink-0"></lucide-icon>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="newPassword"
                autocomplete="new-password"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-variant)] outline-none"
                [placeholder]="'USER.SET_PASSWORD_DIALOG.NEW_PASSWORD_PLACEHOLDER' | translate" />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="(showPassword() ? 'COMMON.HIDE_PASSWORD' : 'COMMON.SHOW_PASSWORD') | translate"
                class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors shrink-0">
                <lucide-icon [name]="showPassword() ? 'EyeOff' : 'Eye'" class="!w-[18px] !h-[18px]"></lucide-icon>
              </button>
            </div>
            @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
              <p class="text-[var(--color-status-error)] text-xs mt-0.5">{{ 'USER.SET_PASSWORD_DIALOG.PASSWORD_RULES' | translate }}</p>
            }
          </div>

          <!-- Confirm Password -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-foreground">{{ 'USER.SET_PASSWORD_DIALOG.CONFIRM_PASSWORD' | translate }}</label>
            <div class="flex items-center gap-2.5 bg-[var(--color-surface)] border border-theme rounded-lg px-3.5 py-3
                        focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="Lock" class="!w-[18px] !h-[18px] !text-[var(--color-on-surface-variant)] shrink-0"></lucide-icon>
              <input
                [type]="showConfirm() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-variant)] outline-none"
                [placeholder]="'USER.SET_PASSWORD_DIALOG.CONFIRM_PASSWORD_PLACEHOLDER' | translate" />
              <button
                type="button"
                (click)="showConfirm.set(!showConfirm())"
                [attr.aria-label]="(showConfirm() ? 'COMMON.HIDE_PASSWORD' : 'COMMON.SHOW_PASSWORD') | translate"
                class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors shrink-0">
                <lucide-icon [name]="showConfirm() ? 'EyeOff' : 'Eye'" class="!w-[18px] !h-[18px]"></lucide-icon>
              </button>
            </div>
            @if (form.get('confirmPassword')?.touched && !passwordsMatch()) {
              <p class="text-[var(--color-status-error)] text-xs mt-0.5">{{ 'USER.SET_PASSWORD_DIALOG.PASSWORDS_MISMATCH' | translate }}</p>
            }
          </div>
        </div>

        <!-- Actions -->
        <div class="px-6 pb-6 flex justify-end gap-3">
          <button
            type="button"
            (click)="onClose()"
            [disabled]="loading()"
            class="px-4 py-2 rounded-lg bg-[var(--color-surface-elevated)] text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors font-medium disabled:opacity-50">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || !passwordsMatch() || loading()"
            class="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (loading()) {
              <mat-spinner diameter="18" class="!w-[18px] !h-[18px]"></mat-spinner>
            } @else {
              <lucide-icon name="Check" class="!w-4 !h-4"></lucide-icon>
            }
            <span>{{ 'USER.SET_PASSWORD_DIALOG.SUBMIT' | translate }}</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class SetPasswordDialog {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notifications = inject(NotificationService);
  protected dialogRef = inject(MatDialogRef<SetPasswordDialog>);
  protected data: SetPasswordDialogData = inject(MAT_DIALOG_DATA);

  loading = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);

  form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.pattern(STRONG_PASSWORD_PATTERN)]],
    confirmPassword: ['', [Validators.required]]
  });

  passwordsMatch(): boolean {
    return this.form.get('newPassword')?.value === this.form.get('confirmPassword')?.value;
  }

  onSubmit(): void {
    if (this.form.invalid || !this.passwordsMatch() || this.loading()) return;

    this.loading.set(true);
    this.userService.setPassword(this.data.userId, this.form.value.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.dialogRef.close({ success: true });
      },
      error: (err) => {
        this.loading.set(false);
        this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.USER');
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
