import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);

  currentLang = signal<string>('en');
  darkMode = signal<boolean>(true);
  emailNotifications = signal<boolean>(true);
  lowStockAlerts = signal<boolean>(true);
  exporting = signal<boolean>(false);
  resetting = signal<boolean>(false);

  ngOnInit(): void {
    // Load saved preferences
    const savedLang = localStorage.getItem('language') || 'en';
    this.currentLang.set(savedLang);

    const savedTheme = localStorage.getItem('theme');
    this.darkMode.set(savedTheme !== 'light');

    const savedEmailNotif = localStorage.getItem('emailNotifications');
    this.emailNotifications.set(savedEmailNotif !== 'false');

    const savedLowStockAlerts = localStorage.getItem('lowStockAlerts');
    this.lowStockAlerts.set(savedLowStockAlerts !== 'false');
  }

  changeLang(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('language', lang);
  }

  toggleDarkMode(): void {
    const newValue = !this.darkMode();
    this.darkMode.set(newValue);
    const theme = newValue ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleEmailNotifications(): void {
    const newValue = !this.emailNotifications();
    this.emailNotifications.set(newValue);
    localStorage.setItem('emailNotifications', String(newValue));
  }

  toggleLowStockAlerts(): void {
    const newValue = !this.lowStockAlerts();
    this.lowStockAlerts.set(newValue);
    localStorage.setItem('lowStockAlerts', String(newValue));
  }

  exportData(): void {
    this.exporting.set(true);

    this.http.get(`${environment.apiUrl}/reports/inventory/excel`, {
      responseType: 'blob',
      withCredentials: true
    }).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notifications.success('SETTINGS.EXPORT_SUCCESS');
      },
      error: (err) => {
        this.exporting.set(false);
        this.notifications.handleError(err);
      }
    });
  }

  resetData(): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('SETTINGS.RESET_CONFIRM_TITLE'),
        message: this.translate.instant('SETTINGS.RESET_CONFIRM_MESSAGE'),
        confirmText: this.translate.instant('SETTINGS.RESET_DATA'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.resetting.set(true);

        this.http.delete<{ deletedCount: number }>(`${environment.apiUrl}/inventory/reset-all`, {
          withCredentials: true
        }).subscribe({
          next: (result) => {
            this.resetting.set(false);
            this.notifications.success('SETTINGS.RESET_SUCCESS', {
              interpolateParams: { count: String(result.deletedCount) }
            });
          },
          error: (err) => {
            this.resetting.set(false);
            this.notifications.handleError(err);
          }
        });
      }
    });
  }
}
