import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Mock user data (replace with actual user service when auth is implemented)
  user = signal({
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    createdAt: new Date('2024-01-01')
  });

  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  saving = signal(false);
  savingPassword = signal(false);
  editMode = signal(false);

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    const userData = this.user();
    this.profileForm.patchValue({
      name: userData.name,
      email: userData.email
    });
  }

  toggleEditMode(): void {
    this.editMode.update(v => !v);
    if (!this.editMode()) {
      this.loadUserData();
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;

    this.saving.set(true);

    // Simulate API call
    setTimeout(() => {
      this.user.update(u => ({
        ...u,
        name: this.profileForm.value.name,
        email: this.profileForm.value.email
      }));
      this.saving.set(false);
      this.editMode.set(false);
      this.snackBar.open('Profile updated successfully', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }, 500);
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    this.savingPassword.set(true);

    // Simulate API call
    setTimeout(() => {
      this.savingPassword.set(false);
      this.passwordForm.reset();
      this.snackBar.open('Password changed successfully', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }, 500);
  }

  getRoleDisplay(role: string): string {
    const roles: Record<string, string> = {
      'ADMIN': 'Administrator',
      'USER': 'User',
      'VIEWER': 'Viewer',
      'EXTERNAL': 'External'
    };
    return roles[role] || role;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
}
