import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] rounded-xl w-full max-w-md">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)]">
        <h2 class="text-xl font-semibold text-foreground">{{ 'PROFILE.CHANGE_PASSWORD' | translate }}</h2>
        <button
          (click)="close()"
          class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
          <lucide-icon name="X"></lucide-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="passwordForm" (ngSubmit)="submit()" class="p-6">
        <div class="space-y-4">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PROFILE.CURRENT_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="currentPassword"
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              [class.!border-rose-500]="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched"
            />
            @if (passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched) {
              @if (passwordForm.get('currentPassword')?.errors?.['required']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
              } @else if (passwordForm.get('currentPassword')?.errors?.['minlength']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 6} }}</p>
              }
            }
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PROFILE.NEW_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="newPassword"
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              [class.!border-rose-500]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched"
            />
            @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
              @if (passwordForm.get('newPassword')?.errors?.['required']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
              } @else if (passwordForm.get('newPassword')?.errors?.['minlength']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 6} }}</p>
              }
            }
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'PROFILE.CONFIRM_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="confirmPassword"
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              [class.!border-rose-500]="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched"
            />
            @if (passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched) {
              @if (passwordForm.get('confirmPassword')?.errors?.['required']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
              }
            }
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2.5 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors font-medium">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="passwordForm.invalid || saving()"
            class="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
            @if (saving()) {
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            }
            {{ 'PROFILE.CHANGE_PASSWORD' | translate }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ChangePasswordDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialog>);
  private notifications = inject(NotificationService);
  private authService = inject(AuthService);

  saving = signal(false);

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.passwordForm.invalid) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.notifications.error('PROFILE.PASSWORD_MISMATCH');
      return;
    }

    this.saving.set(true);

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('PROFILE.PASSWORD_CHANGED');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving.set(false);
        this.notifications.error(error.error?.message || 'ERRORS.GENERIC');
      }
    });
  }
}
