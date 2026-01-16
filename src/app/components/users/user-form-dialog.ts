import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { UserService } from '../../services/user.service';
import { User, UserRole } from '../../interfaces/user.interface';

export interface UserFormDialogData {
  mode: 'add' | 'edit';
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
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
    MatSelectModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div>
          <h2 class="text-xl font-semibold text-foreground">
            {{ (data.mode === 'add' ? 'USER.ADD' : 'USER.EDIT') | translate }}
          </h2>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-foreground hover:bg-[#2a2a2a] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'USER.NAME' | translate }}
          </label>
          <input
            type="text"
            formControlName="name"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="'USER.NAME' | translate"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'USER.EMAIL' | translate }} {{ isExternalUser() ? '' : '*' }}
          </label>
          <input
            type="email"
            formControlName="email"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [placeholder]="isExternalUser() ? ('USER.EMAIL_OPTIONAL' | translate) : ('USER.EMAIL' | translate)"
          />
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            @if (form.get('email')?.errors?.['required']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            } @else if (form.get('email')?.errors?.['email']) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.EMAIL' | translate }}</p>
            }
          }
        </div>

        <!-- Password (hidden for EXTERNAL users) -->
        @if (!isExternalUser()) {
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'USER.PASSWORD' | translate }} {{ data.mode === 'add' ? '*' : '' }}
            </label>
            <input
              type="password"
              formControlName="password"
              class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
              [placeholder]="data.mode === 'edit' ? ('USER.PASSWORD_HINT' | translate) : ('USER.PASSWORD' | translate)"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              @if (form.get('password')?.errors?.['required']) {
                <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
              } @else if (form.get('password')?.errors?.['minlength']) {
                <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 6} }}</p>
              }
            }
          </div>
        } @else {
          <div class="bg-[#2d4a3f]/30 border border-[#4d7c6f]/30 rounded-lg p-4">
            <div class="flex items-center gap-3 text-[#4d7c6f]">
              <mat-icon class="!text-xl">info</mat-icon>
              <span class="text-sm">{{ 'USER.EXTERNAL_NO_LOGIN' | translate }}</span>
            </div>
          </div>
        }

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'USER.ROLE' | translate }}
          </label>
          <select
            formControlName="role"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
            @for (role of roles; track role) {
              <option [value]="role">{{ 'USER.ROLES.' + role | translate }}</option>
            }
          </select>
        </div>

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
export class UserFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<UserFormDialog>);
  data = inject<UserFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  saving = signal(false);
  selectedRole = signal<UserRole>(UserRole.USER);
  roles = Object.values(UserRole);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.data?.mode === 'add'
      ? [Validators.required, Validators.minLength(6), Validators.maxLength(100)]
      : [Validators.minLength(6), Validators.maxLength(100)]
    ],
    role: [UserRole.USER]
  });

  ngOnInit(): void {
    // Re-apply validators based on mode
    if (this.data.mode === 'edit') {
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.setValidators([Validators.minLength(6), Validators.maxLength(100)]);
      this.form.get('password')?.updateValueAndValidity();
    }

    if (this.data.mode === 'edit' && this.data.user) {
      this.form.patchValue({
        name: this.data.user.name || '',
        email: this.data.user.email,
        role: this.data.user.role || UserRole.USER
      });
      this.selectedRole.set(this.data.user.role || UserRole.USER);
    }

    // Listen to role changes to update validators
    this.form.get('role')?.valueChanges.subscribe((role: UserRole) => {
      this.selectedRole.set(role);
      this.updateValidatorsForRole(role);
    });
  }

  isExternalUser(): boolean {
    return this.selectedRole() === UserRole.EXTERNAL;
  }

  private updateValidatorsForRole(role: UserRole): void {
    const passwordControl = this.form.get('password');
    const emailControl = this.form.get('email');

    if (role === UserRole.EXTERNAL) {
      // EXTERNAL users don't need password or email
      passwordControl?.clearValidators();
      passwordControl?.setValue('');
      emailControl?.clearValidators();
      emailControl?.setValidators([Validators.email]); // Only validate format if provided
    } else {
      // Non-external users need email
      emailControl?.setValidators([Validators.required, Validators.email]);

      if (this.data.mode === 'add') {
        // New non-external users need password
        passwordControl?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(100)]);
      } else {
        // Editing non-external users - password optional
        passwordControl?.setValidators([Validators.minLength(6), Validators.maxLength(100)]);
      }
    }
    passwordControl?.updateValueAndValidity();
    emailControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = { ...this.form.value };

    // Remove empty password on edit
    if (this.data.mode === 'edit' && !formValue.password) {
      delete formValue.password;
    }

    if (this.data.mode === 'add') {
      this.userService.create(formValue).subscribe({
        next: () => {
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.user) {
      this.userService.update(this.data.user.id, formValue).subscribe({
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
