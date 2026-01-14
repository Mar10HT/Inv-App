import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UserRole } from '../../interfaces/user.interface';
import { ChangePasswordDialog } from './change-password-dialog/change-password-dialog';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatDialogModule,
    TranslateModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  // Get user from auth service
  user = computed(() => this.authService.currentUser());

  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  saving = signal(false);
  editMode = signal(false);

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    const userData = this.user();
    if (userData) {
      this.profileForm.patchValue({
        name: userData.name || '',
        email: userData.email || ''
      });
    }
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

    // TODO: Implement actual API call to update profile
    setTimeout(() => {
      this.saving.set(false);
      this.editMode.set(false);
      this.notifications.success('PROFILE.UPDATED');
    }, 500);
  }

  openChangePasswordDialog(): void {
    this.dialog.open(ChangePasswordDialog, {
      panelClass: 'custom-dialog-container',
      width: '100%',
      maxWidth: '450px'
    });
  }

  getRoleDisplay(role: UserRole | string | undefined): string {
    if (!role) return '';
    return this.translate.instant(`USER.ROLES.${role}`);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.translate.currentLang || 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  }

  getUserInitials(): string {
    const userData = this.user();
    if (!userData?.name) return '?';
    return userData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
