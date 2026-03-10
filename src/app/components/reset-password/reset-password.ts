import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
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
          <img src="brand/icon-mono-white.svg" alt="Obsid" class="w-20 h-20">
          <h1 class="text-[42px] font-bold text-white font-[Outfit]">Obsid</h1>
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
          <img src="brand/icon-primary.svg" alt="Obsid" class="w-16 h-16">
          <h1 class="text-2xl font-bold text-foreground">Obsid</h1>
        </div>

        <div class="w-full max-w-[380px] flex flex-col gap-8">
          @if (state() === 'form') {
            <!-- Header -->
            <div class="flex flex-col gap-2">
              <h2 class="text-[28px] font-bold text-foreground">{{ 'AUTH.RESET_PASSWORD.TITLE' | translate }}</h2>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'AUTH.RESET_PASSWORD.SUBTITLE' | translate }}</p>
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
              <!-- New Password -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-foreground">
                  {{ 'AUTH.RESET_PASSWORD.NEW_PASSWORD' | translate }}
                </label>
                <div class="flex items-center gap-2.5 bg-surface-variant border border-theme rounded-lg px-3.5 py-3
                            focus-within:border-[var(--color-primary)] transition-colors">
                  <lucide-icon name="Lock" class="!w-[18px] !h-[18px] !text-[var(--color-on-surface-variant)] shrink-0"></lucide-icon>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-variant)] outline-none"
                    [placeholder]="'AUTH.RESET_PASSWORD.NEW_PASSWORD_PLACEHOLDER' | translate"
                  />
                  <button
                    type="button"
                    (click)="togglePassword()"
                    [attr.aria-label]="(showPassword() ? 'COMMON.HIDE_PASSWORD' : 'COMMON.SHOW_PASSWORD') | translate"
                    class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors shrink-0">
                    <lucide-icon [name]="showPassword() ? 'EyeOff' : 'Eye'" class="!w-[18px] !h-[18px]"></lucide-icon>
                  </button>
                </div>
                @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
                  <p class="text-[var(--color-status-error)] text-xs mt-0.5">{{ 'LOGIN.VALIDATION.PASSWORD_MIN' | translate }}</p>
                }
              </div>

              <!-- Confirm Password -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-foreground">
                  {{ 'AUTH.RESET_PASSWORD.CONFIRM_PASSWORD' | translate }}
                </label>
                <div class="flex items-center gap-2.5 bg-surface-variant border border-theme rounded-lg px-3.5 py-3
                            focus-within:border-[var(--color-primary)] transition-colors">
                  <lucide-icon name="Lock" class="!w-[18px] !h-[18px] !text-[var(--color-on-surface-variant)] shrink-0"></lucide-icon>
                  <input
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-variant)] outline-none"
                    [placeholder]="'AUTH.RESET_PASSWORD.CONFIRM_PASSWORD_PLACEHOLDER' | translate"
                  />
                  <button
                    type="button"
                    (click)="toggleConfirmPassword()"
                    [attr.aria-label]="(showConfirmPassword() ? 'COMMON.HIDE_PASSWORD' : 'COMMON.SHOW_PASSWORD') | translate"
                    class="text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors shrink-0">
                    <lucide-icon [name]="showConfirmPassword() ? 'EyeOff' : 'Eye'" class="!w-[18px] !h-[18px]"></lucide-icon>
                  </button>
                </div>
                @if (form.get('confirmPassword')?.touched && form.get('confirmPassword')?.value !== form.get('newPassword')?.value) {
                  <p class="text-[var(--color-status-error)] text-xs mt-0.5">{{ 'AUTH.RESET_PASSWORD.PASSWORDS_MISMATCH' | translate }}</p>
                }
              </div>

              <button
                type="submit"
                [disabled]="form.invalid || loading() || form.get('confirmPassword')?.value !== form.get('newPassword')?.value"
                class="w-full py-3.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-[15px]
                       hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2">
                @if (loading()) {
                  <mat-spinner diameter="20" class="!w-5 !h-5"></mat-spinner>
                  <span>{{ 'COMMON.LOADING' | translate }}...</span>
                } @else {
                  <lucide-icon name="KeyRound" class="!w-[18px] !h-[18px]"></lucide-icon>
                  <span>{{ 'AUTH.RESET_PASSWORD.SUBMIT' | translate }}</span>
                }
              </button>
            </form>
          } @else if (state() === 'success') {
            <!-- Success State -->
            <div class="flex flex-col items-center text-center gap-6">
              <div class="w-16 h-16 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center">
                <lucide-icon name="CheckCircle" class="!w-8 !h-8 text-[var(--color-primary)]"></lucide-icon>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-foreground mb-2">{{ 'AUTH.RESET_PASSWORD.SUCCESS_TITLE' | translate }}</h2>
                <p class="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">{{ 'AUTH.RESET_PASSWORD.SUCCESS' | translate }}</p>
              </div>
              <p class="text-xs text-[var(--color-on-surface-variant)]">{{ 'AUTH.RESET_PASSWORD.REDIRECTING' | translate }}</p>
            </div>
          } @else if (state() === 'error') {
            <!-- Error State -->
            <div class="flex flex-col items-center text-center gap-6">
              <div class="w-16 h-16 rounded-full bg-[var(--color-error-bg)] flex items-center justify-center">
                <lucide-icon name="XCircle" class="!w-8 !h-8 text-[var(--color-status-error)]"></lucide-icon>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-foreground mb-2">{{ 'AUTH.RESET_PASSWORD.ERROR_TITLE' | translate }}</h2>
                <p class="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">{{ 'AUTH.RESET_PASSWORD.INVALID_TOKEN' | translate }}</p>
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
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  state = signal<'form' | 'success' | 'error'>('form');

  private token = '';

  form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'] || '';
    if (!this.token) {
      this.state.set('error');
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.form.value.newPassword !== this.form.value.confirmPassword) return;

    this.loading.set(true);

    this.authService.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.state.set('success');
        // Auto-redirect to login after 3 seconds
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: () => {
        this.loading.set(false);
        this.state.set('error');
      }
    });
  }
}
