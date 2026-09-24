import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { ConfirmService } from '../../services/confirm.service';
import { ScheduledReportsService, ScheduledReport } from '../../services/scheduled-reports.service';
import { ThemeService } from '../../services/theme.service';
import { Spinner } from '../shared/spinner/spinner';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    Spinner,
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground">{{ 'NAV.SETTINGS' | translate }}</h1>
      <p class="text-[var(--color-on-surface-variant)] mt-1">{{ 'SETTINGS.SUBTITLE' | translate }}</p>
    </div>

    <!-- Language Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
            <lucide-icon name="Globe" class="!text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.LANGUAGE' | translate }}</h3>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.LANGUAGE_DESC' | translate }}</p>
          </div>
        </div>

        <div class="flex gap-3 ml-13">
          <button
            (click)="changeLang('es')"
            [class]="currentLang() === 'es'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-surface-elevated text-[var(--color-on-surface-variant)] border-theme hover:border-[var(--color-border)]'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all">
            <span class="text-xl">&#127469;&#127475;</span>
            <span class="font-medium">Español</span>
          </button>
          <button
            (click)="changeLang('en')"
            [class]="currentLang() === 'en'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-surface-elevated text-[var(--color-on-surface-variant)] border-theme hover:border-[var(--color-border)]'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all">
            <span class="text-xl">&#127482;&#127480;</span>
            <span class="font-medium">English</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Appearance Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
            <lucide-icon name="Palette" class="!text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.APPEARANCE' | translate }}</h3>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.THEME_DESC' | translate }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between ml-13 p-4 bg-surface-elevated rounded-lg">
          <div class="flex items-center gap-3">
            <lucide-icon [name]="darkMode() ? 'Moon' : 'Sun'" class="!text-[var(--color-on-surface-variant)]"></lucide-icon>
            <span class="text-foreground font-medium">
              {{ darkMode() ? ('SETTINGS.DARK_MODE' | translate) : ('SETTINGS.LIGHT_MODE' | translate) }}
            </span>
          </div>
          <button
            (click)="toggleDarkMode()"
            class="relative w-12 h-6 rounded-full transition-colors"
            [class]="darkMode() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'">
            <span
              class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
              [class]="darkMode() ? 'left-7' : 'left-1'">
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Notifications Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
            <lucide-icon name="Bell" class="!text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.NOTIFICATIONS' | translate }}</h3>
          </div>
        </div>

        <div class="space-y-3 ml-13">
          <!-- Email Notifications -->
          <div class="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
            <div>
              <p class="text-foreground font-medium">{{ 'SETTINGS.EMAIL_NOTIFICATIONS' | translate }}</p>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.EMAIL_NOTIFICATIONS_DESC' | translate }}</p>
            </div>
            <button
              (click)="toggleEmailNotifications()"
              class="relative w-12 h-6 rounded-full transition-colors"
              [class]="emailNotifications() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'">
              <span
                class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                [class]="emailNotifications() ? 'left-7' : 'left-1'">
              </span>
            </button>
          </div>

          <!-- Low Stock Alerts -->
          <div class="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
            <div>
              <p class="text-foreground font-medium">{{ 'SETTINGS.LOW_STOCK_ALERTS' | translate }}</p>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.LOW_STOCK_ALERTS_DESC' | translate }}</p>
            </div>
            <button
              (click)="toggleLowStockAlerts()"
              class="relative w-12 h-6 rounded-full transition-colors"
              [class]="lowStockAlerts() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'">
              <span
                class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                [class]="lowStockAlerts() ? 'left-7' : 'left-1'">
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Management Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
            <lucide-icon name="HardDrive" class="!text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.DATA' | translate }}</h3>
          </div>
        </div>

        <div class="flex items-center justify-between ml-13 p-4 bg-surface-elevated rounded-lg">
          <div>
            <p class="text-foreground font-medium">{{ 'SETTINGS.EXPORT_DATA' | translate }}</p>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.EXPORT_DATA_DESC' | translate }}</p>
          </div>
          <button
            (click)="exportData()"
            [disabled]="exporting()"
            class="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
            @if (exporting()) {
              <app-spinner size="sm" tone="white"></app-spinner>
            } @else {
              <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            }
            <span>{{ 'COMMON.EXPORT' | translate }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Danger Zone Section -->
    <div class="bg-surface-variant rounded-xl border border-red-900/50 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <lucide-icon name="AlertTriangle" class="!text-[var(--color-status-error)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[var(--color-status-error)]">{{ 'SETTINGS.DANGER_ZONE' | translate }}</h3>
          </div>
        </div>

        <div class="flex items-center justify-between ml-13 p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
          <div>
            <p class="text-foreground font-medium">{{ 'SETTINGS.RESET_DATA' | translate }}</p>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.RESET_DATA_DESC' | translate }}</p>
          </div>
          <button
            (click)="resetData()"
            [disabled]="resetting()"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            @if (resetting()) {
              <app-spinner size="sm" tone="white"></app-spinner>
            } @else {
              <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
            }
            <span>{{ 'SETTINGS.RESET_DATA' | translate }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Scheduled Reports Section -->
    <ng-container *ngxPermissionsOnly="['reports:view']">
      <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
        <div class="p-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
                <lucide-icon name="CalendarClock" class="!text-[var(--color-primary)]"></lucide-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ 'SCHEDULED_REPORTS.TITLE' | translate }}</h3>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SCHEDULED_REPORTS.SUBTITLE' | translate }}</p>
              </div>
            </div>
            <button
              (click)="toggleScheduledForm()"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style="background-color: var(--color-primary); color: #fff;">
              <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
              {{ 'SCHEDULED_REPORTS.ADD' | translate }}
            </button>
          </div>

          <!-- New report form -->
          @if (showScheduledForm()) {
            <div class="mb-6 p-4 rounded-xl border" style="background-color: var(--color-surface); border-color: var(--color-border);">
              <h4 class="font-semibold text-sm mb-4" style="color: var(--color-on-surface);">{{ editingReport() ? ('COMMON.EDIT' | translate) : ('SCHEDULED_REPORTS.ADD' | translate) }}</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Report type -->
                <div>
                  <label for="scheduled-report-type" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SCHEDULED_REPORTS.REPORT_TYPE' | translate }}</label>
                  <select id="scheduled-report-type" class="select-chevron w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);"
                          [(ngModel)]="scheduledForm.reportType">
                    <option value="INVENTORY">{{ 'SCHEDULED_REPORTS.TYPE.INVENTORY' | translate }}</option>
                    <option value="LOW_STOCK">{{ 'SCHEDULED_REPORTS.TYPE.LOW_STOCK' | translate }}</option>
                    <option value="TRANSACTIONS">{{ 'SCHEDULED_REPORTS.TYPE.TRANSACTIONS' | translate }}</option>
                    <option value="LOANS">{{ 'SCHEDULED_REPORTS.TYPE.LOANS' | translate }}</option>
                    <option value="TRANSFERS">{{ 'SCHEDULED_REPORTS.TYPE.TRANSFERS' | translate }}</option>
                    <option value="STOCK_TAKES">{{ 'SCHEDULED_REPORTS.TYPE.STOCK_TAKES' | translate }}</option>
                    <option value="DISCHARGES">{{ 'SCHEDULED_REPORTS.TYPE.DISCHARGES' | translate }}</option>
                  </select>
                </div>

                <!-- Frequency -->
                <div>
                  <label for="scheduled-frequency" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SCHEDULED_REPORTS.FREQUENCY_LABEL' | translate }}</label>
                  <select id="scheduled-frequency" class="select-chevron w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);"
                          [(ngModel)]="scheduledForm.frequency">
                    <option value="DAILY">{{ 'SCHEDULED_REPORTS.FREQUENCY.DAILY' | translate }}</option>
                    <option value="WEEKLY">{{ 'SCHEDULED_REPORTS.FREQUENCY.WEEKLY' | translate }}</option>
                    <option value="MONTHLY">{{ 'SCHEDULED_REPORTS.FREQUENCY.MONTHLY' | translate }}</option>
                  </select>
                </div>

                <!-- Recipients -->
                <div class="sm:col-span-2">
                  <label for="scheduled-recipients" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SCHEDULED_REPORTS.RECIPIENTS' | translate }}</label>
                  <input id="scheduled-recipients" type="text" class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);"
                         [(ngModel)]="scheduledForm.recipientEmails"
                         placeholder="email@ejemplo.com, otro@ejemplo.com" />
                </div>

                <!-- Locale -->
                <div>
                  <label for="scheduled-locale" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SCHEDULED_REPORTS.LOCALE' | translate }}</label>
                  <select id="scheduled-locale" class="select-chevron w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);"
                          [(ngModel)]="scheduledForm.locale">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div class="flex gap-3 mt-4">
                <button (click)="saveScheduledReport()" class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-primary); color: #fff;">
                  {{ 'COMMON.SAVE' | translate }}
                </button>
                <button (click)="cancelScheduledForm()" class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Reports list -->
          @if (scheduledReportsService.isLoading()) {
            <div class="flex items-center justify-center py-8">
              <app-spinner size="md"></app-spinner>
            </div>
          } @else if (scheduledReportsService.reports().length === 0) {
            <div class="flex flex-col items-center justify-center py-8 gap-2">
              <lucide-icon name="CalendarOff" class="!w-8 !h-8" style="color: var(--color-on-surface-variant);"></lucide-icon>
              <p class="text-sm" style="color: var(--color-on-surface-variant);">{{ 'SCHEDULED_REPORTS.NO_REPORTS' | translate }}</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (report of scheduledReportsService.reports(); track report.id) {
                <div class="flex items-center justify-between p-4 rounded-xl border" style="background-color: var(--color-surface); border-color: var(--color-border);">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background-color: var(--color-primary-container); color: var(--color-primary);">
                        {{ 'SCHEDULED_REPORTS.TYPE.' + report.reportType | translate }}
                      </span>
                      <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                        {{ 'SCHEDULED_REPORTS.FREQUENCY.' + report.frequency | translate }}
                      </span>
                      @if (!report.isActive) {
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: rgba(239,68,68,0.12); color: #ef4444;">
                          {{ 'SCHEDULED_REPORTS.INACTIVE' | translate }}
                        </span>
                      }
                    </div>
                    <p class="text-xs mt-1.5 truncate" style="color: var(--color-on-surface-variant);">{{ report.recipientEmails }}</p>
                    <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant);">
                      {{ 'SCHEDULED_REPORTS.NEXT_SEND' | translate }}: {{ report.nextSendAt | date:'dd/MM/yyyy HH:mm' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <!-- Toggle active -->
                    <button (click)="toggleReportActive(report)"
                            class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style="background-color: var(--color-surface-variant);"
                            [title]="(report.isActive ? 'SCHEDULED_REPORTS.ACTIVE' : 'SCHEDULED_REPORTS.INACTIVE') | translate">
                      <lucide-icon [name]="report.isActive ? 'ToggleRight' : 'ToggleLeft'" class="!w-4 !h-4" [style.color]="report.isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'"></lucide-icon>
                    </button>
                    <!-- Send now (SYSTEM_ADMIN only via permissions) -->
                    <ng-container *ngxPermissionsOnly="['audit:view']">
                      <button (click)="sendReportNow(report.id)"
                              class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                              style="background-color: var(--color-surface-variant);"
                              [title]="'SCHEDULED_REPORTS.SEND_NOW' | translate">
                        <lucide-icon name="Send" class="!w-4 !h-4" style="color: var(--color-primary);"></lucide-icon>
                      </button>
                    </ng-container>
                    <!-- Delete -->
                    <button (click)="deleteScheduledReport(report.id)"
                            class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style="background-color: rgba(239,68,68,0.08);"
                            [title]="'COMMON.DELETE' | translate">
                      <lucide-icon name="Trash2" class="!w-4 !h-4" style="color: #ef4444;"></lucide-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </ng-container>
  </div>
</div>
  `,
})
export class Settings implements OnInit {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmService);
  private notifications = inject(NotificationService);
  private themeService = inject(ThemeService);
  scheduledReportsService = inject(ScheduledReportsService);

  currentLang = signal<string>('en');
  // The app theme lives in ThemeService: writing localStorage and data-theme from here left it stale
  darkMode = this.themeService.isDark;
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
    this.themeService.toggle();
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
    this.confirm.ask({
      title: this.translate.instant('SETTINGS.RESET_CONFIRM_TITLE'),
      message: this.translate.instant('SETTINGS.RESET_CONFIRM_MESSAGE'),
      confirmText: this.translate.instant('SETTINGS.RESET_DATA'),
      type: 'danger'
    }).subscribe(confirmed => {
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
