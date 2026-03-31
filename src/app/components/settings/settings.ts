import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { ScheduledReportsService, ScheduledReport } from '../../services/scheduled-reports.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule,
    NgxPermissionsModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  scheduledReportsService = inject(ScheduledReportsService);

  currentLang = signal<string>('en');
  darkMode = signal<boolean>(true);
  emailNotifications = signal<boolean>(true);
  lowStockAlerts = signal<boolean>(true);
  exporting = signal<boolean>(false);
  resetting = signal<boolean>(false);

  // Scheduled reports
  showScheduledForm = signal(false);
  editingReport = signal<ScheduledReport | null>(null);
  scheduledForm = {
    reportType: 'INVENTORY' as ScheduledReport['reportType'],
    frequency: 'WEEKLY' as ScheduledReport['frequency'],
    recipientEmails: '',
    locale: 'es',
  };

  ngOnInit(): void {
    this.scheduledReportsService.loadAll();

    // Load saved preferences (local)
    const savedLang = localStorage.getItem('language') || 'en';
    this.currentLang.set(savedLang);

    const savedTheme = localStorage.getItem('theme');
    this.darkMode.set(savedTheme !== 'light');

    // Load notification preferences from backend
    this.http.get<{ emailNotifications: boolean; lowStockAlerts: boolean }>(
      `${environment.apiUrl}/users/preferences`
    ).subscribe({
      next: (prefs) => {
        this.emailNotifications.set(prefs.emailNotifications);
        this.lowStockAlerts.set(prefs.lowStockAlerts);
      },
      error: () => {
        // Keep default values (true) if API fails
        this.emailNotifications.set(true);
        this.lowStockAlerts.set(true);
      }
    });
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
    const oldValue = this.emailNotifications();
    const newValue = !oldValue;
    this.emailNotifications.set(newValue); // Optimistic update

    this.http.patch<{ emailNotifications: boolean; lowStockAlerts: boolean }>(
      `${environment.apiUrl}/users/preferences`,
      { emailNotifications: newValue }
    ).subscribe({
      error: () => {
        this.emailNotifications.set(oldValue); // Revert on failure
        this.notifications.error('SETTINGS.SAVE_ERROR');
      }
    });
  }

  toggleLowStockAlerts(): void {
    const oldValue = this.lowStockAlerts();
    const newValue = !oldValue;
    this.lowStockAlerts.set(newValue); // Optimistic update

    this.http.patch<{ emailNotifications: boolean; lowStockAlerts: boolean }>(
      `${environment.apiUrl}/users/preferences`,
      { lowStockAlerts: newValue }
    ).subscribe({
      error: () => {
        this.lowStockAlerts.set(oldValue); // Revert on failure
        this.notifications.error('SETTINGS.SAVE_ERROR');
      }
    });
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

  // Scheduled reports methods
  toggleScheduledForm(): void {
    this.editingReport.set(null);
    this.scheduledForm = { reportType: 'INVENTORY', frequency: 'WEEKLY', recipientEmails: '', locale: 'es' };
    this.showScheduledForm.update(v => !v);
  }

  cancelScheduledForm(): void {
    this.showScheduledForm.set(false);
    this.editingReport.set(null);
  }

  saveScheduledReport(): void {
    const editing = this.editingReport();
    if (editing) {
      this.scheduledReportsService.update(editing.id, this.scheduledForm).subscribe({
        next: () => {
          this.cancelScheduledForm();
          this.notifications.success('SCHEDULED_REPORTS.UPDATED');
        },
        error: (err) => this.notifications.handleError(err),
      });
    } else {
      this.scheduledReportsService.create(this.scheduledForm).subscribe({
        next: () => {
          this.cancelScheduledForm();
          this.notifications.success('SCHEDULED_REPORTS.CREATED');
        },
        error: (err) => this.notifications.handleError(err),
      });
    }
  }

  toggleReportActive(report: ScheduledReport): void {
    this.scheduledReportsService.update(report.id, { isActive: !report.isActive }).subscribe({
      error: (err) => this.notifications.handleError(err),
    });
  }

  deleteScheduledReport(id: string): void {
    this.scheduledReportsService.delete(id).subscribe({
      next: () => this.notifications.success('SCHEDULED_REPORTS.DELETED'),
      error: (err) => this.notifications.handleError(err),
    });
  }

  sendReportNow(id: string): void {
    this.scheduledReportsService.sendNow(id).subscribe({
      next: () => this.notifications.success('SCHEDULED_REPORTS.SENT_NOW'),
      error: (err) => this.notifications.handleError(err),
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
