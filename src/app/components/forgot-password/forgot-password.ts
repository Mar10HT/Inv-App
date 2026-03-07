import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="flex min-h-screen">
      <!-- Left Panel - Brand -->
      <div class="hidden lg:flex w-[54%] bg-[#0f1f1a] flex-col items-center justify-center gap-8 p-16 relative">
        <div class="w-24 h-0.5 bg-[var(--color-primary)]/40"></div>
        <div class="flex flex-col items-center gap-6">
          <div class="w-[72px] h-[72px] rounded-2xl bg-[var(--color-primary)] flex items-center justify-center">
            <lucide-icon name="Package" class="!w-9 !h-9 text-white"></lucide-icon>
          </div>
          <h1 class="text-[42px] font-bold text-white font-[Outfit]">InvApp</h1>
          <p class="text-lg text-[var(--color-on-surface-variant)] text-center leading-relaxed">
            {{ 'LOGIN.TAGLINE' | translate }}
          </p>
        </div>
        <div class="w-24 h-0.5 bg-[var(--color-primary)]/40"></div>
      </div>

      <!-- Right Panel - Form -->
      <div class="flex-1 bg-surface flex flex-col items-center justify-center p-8 lg:p-16 relative">
        <!-- Mobile logo -->
        <div class="flex lg:hidden flex-col items-center gap-4 mb-10">
          <div class="w-14 h-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <lucide-icon name="Package" class="!w-8 !h-8 text-white"></lucide-icon>
          </div>
          <h1 class="text-2xl font-bold text-foreground">InvApp</h1>
        </div>

        <div class="w-full max-w-[380px] flex flex-col gap-8">
          @if (!success()) {
            <!-- Header -->
            <div class="flex flex-col gap-2">
              <h2 class="text-[28px] font-bold text-foreground">{{ 'AUTH.FORGOT_PASSWORD.TITLE' | translate }}</h2>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUTH.FORGOT_PASSWORD.SUBTITLE' | translate }}</p>
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
              <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-foreground">
                  {{ 'LOGIN.EMAIL' | translate }}
                </label>
                <div class="flex items-center gap-2.5 bg-surface-variant border border-theme rounded-lg px-3.5 py-3
                            focus-within:border-[var(--color-primary)] transition-colors">
                  <lucide-icon name="Mail" class="!w-[18px] !h-[18px] !text-[var(--color-on-surface-variant)] shrink-0"></lucide-icon>
                  <input
                    type="email"
                    formControlName="email"
                    class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-variant)] outline-none"
                    [placeholder]="'AUTH.FORGOT_PASSWORD.EMAIL_PLACEHOLDER' | translate"
                  />
                </div>
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <p class="text-[var(--color-status-error)] text-xs mt-0.5">{{ 'LOGIN.VALIDATION.INVALID_EMAIL' | translate }}</p>
                }
              </div>

              <button
                type="submit"
                [disabled]="form.invalid || loading()"
                class="w-full py-3.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-[15px]
                       hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2">
                @if (loading()) {
                  <mat-spinner diameter="20" class="!w-5 !h-5"></mat-spinner>
                  <span>{{ 'COMMON.LOADING' | translate }}...</span>
                } @else {
                  <lucide-icon name="Send" class="!w-[18px] !h-[18px]"></lucide-icon>
                  <span>{{ 'AUTH.FORGOT_PASSWORD.SUBMIT' | translate }}</span>
                }
              </button>
            </form>
          } @else {
            <!-- Success State -->
            <div class="flex flex-col items-center text-center gap-6">
              <div class="w-16 h-16 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center">
                <lucide-icon name="CheckCircle" class="!w-8 !h-8 text-[var(--color-primary)]"></lucide-icon>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-foreground mb-2">{{ 'AUTH.FORGOT_PASSWORD.SUCCESS_TITLE' | translate }}</h2>
                <p class="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">{{ 'AUTH.FORGOT_PASSWORD.SUCCESS' | translate }}</p>
              </div>
            </div>
          }

          <!-- Back to login -->
          <div class="text-center">
            <a routerLink="/login" class="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors font-medium flex items-center justify-center gap-1.5">
              <lucide-icon name="ArrowLeft" class="!w-4 !h-4"></lucide-icon>
              {{ 'AUTH.FORGOT_PASSWORD.BACK_TO_LOGIN' | translate }}
            </a>
          </div>
        </div>

        <p class="absolute bottom-6 text-[11px] text-[var(--color-on-surface-muted)]">{{ 'LOGIN.VERSION' | translate }}</p>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  success = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.loading.set(false);
        // Still show success to prevent email enumeration
        this.success.set(true);
      }
    });
  }
}
