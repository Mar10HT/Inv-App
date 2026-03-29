import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';

import { UserService } from '../../services/user.service';
import { WarehouseService } from '../../services/warehouse.service';
import { RolesService } from '../../services/roles.service';
import { User, UserRole } from '../../interfaces/user.interface';
import { Warehouse } from '../../interfaces/warehouse.interface';
import { RoleSummary } from '../../interfaces/role.interface';

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
    LucideAngularModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <h2 class="text-xl font-semibold text-foreground">
            {{ (data.mode === 'add' ? 'USER.ADD' : 'USER.EDIT') | translate }}
          </h2>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
          <lucide-icon name="X"></lucide-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
            {{ 'USER.NAME' | translate }}
          </label>
          <input
            type="text"
            formControlName="name"
            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            [placeholder]="'USER.NAME' | translate"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
            {{ 'USER.EMAIL' | translate }} {{ isExternalUser() ? '' : '*' }}
          </label>
          <input
            type="email"
            formControlName="email"
            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            [placeholder]="isExternalUser() ? ('USER.EMAIL_OPTIONAL' | translate) : ('USER.EMAIL' | translate)"
          />
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            @if (form.get('email')?.errors?.['required']) {
              <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            } @else if (form.get('email')?.errors?.['email']) {
              <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.EMAIL' | translate }}</p>
            }
          }
        </div>

        <!-- Password (hidden for EXTERNAL users) -->
        @if (!isExternalUser()) {
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'USER.PASSWORD' | translate }} {{ data.mode === 'add' ? '*' : '' }}
            </label>
            <input
              type="password"
              formControlName="password"
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              [placeholder]="data.mode === 'edit' ? ('USER.PASSWORD_HINT' | translate) : ('USER.PASSWORD' | translate)"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              @if (form.get('password')?.errors?.['required']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
              } @else if (form.get('password')?.errors?.['minlength']) {
                <p class="text-[var(--color-status-error)] text-sm mt-1">{{ 'FORM.VALIDATION.MIN_LENGTH' | translate: {length: 6} }}</p>
              }
            }
          </div>
        } @else {
          <div class="bg-[var(--color-primary-container)]/30 border border-[var(--color-primary)]/30 rounded-lg p-4">
            <div class="flex items-center gap-3 text-[var(--color-primary)]">
              <lucide-icon name="Info" class="!w-5 !h-5"></lucide-icon>
              <span class="text-sm">{{ 'USER.EXTERNAL_NO_LOGIN' | translate }}</span>
            </div>
          </div>
        }

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
            {{ 'USER.ROLE' | translate }}
          </label>
          <select
            formControlName="role"
            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer">
            @for (role of roles; track role) {
              <option [value]="role">{{ 'USER.ROLES.' + role | translate }}</option>
            }
          </select>
        </div>

        <!-- Custom Role Assignment -->
        @if (selectedRole() !== 'SYSTEM_ADMIN' && selectedRole() !== 'EXTERNAL') {
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'USER.CUSTOM_ROLE' | translate }}
            </label>
            <p class="text-xs text-[var(--color-on-surface-muted)] mb-2">{{ 'USER.CUSTOM_ROLE_DESC' | translate }}</p>
            @if (loadingRoles()) {
              <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm py-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]"></div>
                {{ 'COMMON.LOADING' | translate }}...
              </div>
            } @else {
              <select
                formControlName="roleId"
                class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer">
                <option [value]="null">{{ 'USER.NO_CUSTOM_ROLE' | translate }}</option>
                @for (r of availableRoles(); track r.id) {
                  <option [value]="r.id">{{ r.displayName }}</option>
                }
              </select>
            }
          </div>
        }

        <!-- Warehouse Assignment -->
        @if (selectedRole() !== 'SYSTEM_ADMIN' && selectedRole() !== 'EXTERNAL') {
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
              {{ 'USER.ASSIGNED_WAREHOUSES' | translate }}
            </label>
            <p class="text-xs text-[var(--color-on-surface-muted)] mb-3">{{ 'USER.ASSIGNED_WAREHOUSES_DESC' | translate }}</p>

            @if (loadingWarehouses()) {
              <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm py-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]"></div>
                {{ 'COMMON.LOADING' | translate }}...
              </div>
            } @else if (allWarehouses().length === 0) {
              <p class="text-[var(--color-on-surface-muted)] text-sm py-2">{{ 'USER.NO_WAREHOUSES' | translate }}</p>
            } @else {
              <div class="max-h-48 overflow-y-auto space-y-1 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-3">
                @for (wh of allWarehouses(); track wh.id) {
                  <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-variant)] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      [checked]="selectedWarehouseIds().has(wh.id)"
                      (change)="toggleWarehouse(wh.id)"
                      class="w-4 h-4 rounded border-[var(--color-border-subtle)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)]"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-foreground truncate">{{ wh.name }}</p>
                      <p class="text-xs text-[var(--color-on-surface-variant)] truncate">{{ wh.location }}</p>
                    </div>
                  </label>
                }
              </div>
            }
          </div>
        } @else if (selectedRole() === 'SYSTEM_ADMIN') {
          <div class="bg-[var(--color-primary-container)]/30 border border-[var(--color-primary)]/30 rounded-lg p-4">
            <div class="flex items-center gap-3 text-[var(--color-primary)]">
              <lucide-icon name="ShieldCheck" class="!w-5 !h-5"></lucide-icon>
              <span class="text-sm">{{ 'USER.ALL_ACCESS' | translate }}</span>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            (click)="dialogRef.close()"
            class="px-6 py-2.5 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground transition-colors font-medium">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || saving()"
            class="px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2">
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
  private warehouseService = inject(WarehouseService);
  private rolesService = inject(RolesService);

  saving = signal(false);
  selectedRole = signal<UserRole>(UserRole.USER);
  roles = Object.values(UserRole);

  // Custom role from API
  availableRoles = signal<RoleSummary[]>([]);
  loadingRoles = signal(false);

  // Warehouse assignment
  allWarehouses = signal<Warehouse[]>([]);
  loadingWarehouses = signal(false);
  selectedWarehouseIds = signal<Set<string>>(new Set());

  form: FormGroup = this.fb.group({
    name: ['', [Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.data?.mode === 'add'
      ? [Validators.required, Validators.minLength(6), Validators.maxLength(100)]
      : [Validators.minLength(6), Validators.maxLength(100)]
    ],
    role: [UserRole.USER],
    roleId: [null]
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
        role: this.data.user.role || UserRole.USER,
        roleId: this.data.user.roleId ?? null
      });
      this.selectedRole.set(this.data.user.role || UserRole.USER);
    }

    // Listen to role changes to update validators
    this.form.get('role')?.valueChanges.subscribe((role: UserRole) => {
      this.selectedRole.set(role);
      this.updateValidatorsForRole(role);
    });

    // Load custom roles from API
    this.loadRoles();

    // Load all warehouses for assignment
    this.loadWarehouses();

    // Load user's current warehouse assignments in edit mode
    if (this.data.mode === 'edit' && this.data.user) {
      this.loadUserWarehouses(this.data.user.id);
    }
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

  toggleWarehouse(warehouseId: string): void {
    this.selectedWarehouseIds.update(ids => {
      const newSet = new Set(ids);
      if (newSet.has(warehouseId)) {
        newSet.delete(warehouseId);
      } else {
        newSet.add(warehouseId);
      }
      return newSet;
    });
  }

  private loadRoles(): void {
    this.loadingRoles.set(true);
    this.rolesService.getAll().subscribe({
      next: (roles) => {
        this.availableRoles.set(roles);
        this.loadingRoles.set(false);
      },
      error: () => this.loadingRoles.set(false)
    });
  }

  private loadWarehouses(): void {
    this.loadingWarehouses.set(true);
    this.warehouseService.getAll().subscribe({
      next: (warehouses) => {
        this.allWarehouses.set(warehouses);
        this.loadingWarehouses.set(false);
      },
      error: () => {
        this.loadingWarehouses.set(false);
      }
    });
  }

  private loadUserWarehouses(userId: string): void {
    this.userService.getUserWarehouses(userId).subscribe({
      next: (warehouses) => {
        this.selectedWarehouseIds.set(new Set(warehouses.map(w => w.id)));
      }
    });
  }

  private saveWarehouseAssignments(userId: string): void {
    const role = this.selectedRole();
    if (role === 'SYSTEM_ADMIN' || role === 'EXTERNAL') return;

    const warehouseIds = Array.from(this.selectedWarehouseIds());
    this.userService.assignWarehouses(userId, warehouseIds).subscribe();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = { ...this.form.value };

    // Remove empty password on edit
    if (this.data.mode === 'edit' && !formValue.password) {
      delete formValue.password;
    }

    // Remove null roleId — backend @IsString() rejects null; omitting it means "no change"
    if (formValue.roleId == null) {
      delete formValue.roleId;
    }

    if (this.data.mode === 'add') {
      this.userService.create(formValue).subscribe({
        next: (newUser) => {
          this.saveWarehouseAssignments(newUser.id);
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    } else if (this.data.user) {
      this.userService.update(this.data.user.id, formValue).subscribe({
        next: () => {
          this.saveWarehouseAssignments(this.data.user!.id);
          this.dialogRef.close({ saved: true });
        },
        error: () => {
          this.saving.set(false);
        }
      });
    }
  }
}
