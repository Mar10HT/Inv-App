import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NotificationService } from '../../../services/notification.service';
import { ScheduledReportsService, ScheduledReport } from '../../../services/scheduled-reports.service';
import { Spinner } from '../../shared/spinner/spinner';
import { AppDatePipe } from '../../../shared/app-date.pipe';

/**
 * Reports emailed on a schedule. Lived in Settings until 2026-11; it sits
 * with the other reports now. Seeing them needs reports:view, changing them
 * reports:export (the same permissions the API asks for).
 */
@Component({
  selector: 'app-reports-scheduled-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, TranslateModule, NgxPermissionsModule, Spinner, AppDatePipe],
  template: `
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
            *ngxPermissionsOnly="['reports:export']"
            (click)="toggleScheduledForm()"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style="background-color: var(--color-primary); color: #fff;">
            <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
            {{ 'SCHEDULED_REPORTS.ADD' | translate }}
          </button>
        </div>

        <!-- New report form -->
        @if (showScheduledForm()) {
          <div class="mb-6 p-4 rounded-xl border" style="background-color: var(--color-surface-variant); border-color: var(--color-border);">
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
                  <option value="OUTFLOWS">{{ 'SCHEDULED_REPORTS.TYPE.OUTFLOWS' | translate }}</option>
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
              <div class="flex items-center justify-between p-4 rounded-xl border" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background-color: var(--color-primary-container); color: var(--color-primary);">
                      {{ 'SCHEDULED_REPORTS.TYPE.' + report.reportType | translate }}
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                      {{ 'SCHEDULED_REPORTS.FREQUENCY.' + report.frequency | translate }}
                    </span>
                    @if (!report.isActive) {
                      <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: var(--color-status-error-bg); color: var(--color-status-error);">
                        {{ 'SCHEDULED_REPORTS.INACTIVE' | translate }}
                      </span>
                    }
                  </div>
                  <p class="text-xs mt-1.5 truncate" style="color: var(--color-on-surface-variant);">{{ report.recipientEmails }}</p>
                  <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant);">
                    {{ 'SCHEDULED_REPORTS.NEXT_SEND' | translate }}: {{ report.nextSendAt | appDate:'dd/MM/yyyy HH:mm' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                  <ng-container *ngxPermissionsOnly="['reports:export']">
                    <!-- Toggle active -->
                    <button (click)="toggleReportActive(report)"
                            class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style="background-color: var(--color-surface-variant);"
                            [title]="(report.isActive ? 'SCHEDULED_REPORTS.ACTIVE' : 'SCHEDULED_REPORTS.INACTIVE') | translate">
                      <lucide-icon [name]="report.isActive ? 'ToggleRight' : 'ToggleLeft'" class="!w-4 !h-4" [style.color]="report.isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'"></lucide-icon>
                    </button>
                  </ng-container>
                  <!-- Send now (SYSTEM_ADMIN only via permissions) -->
                  <ng-container *ngxPermissionsOnly="['audit:view']">
                    <button (click)="sendReportNow(report.id)"
                            class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style="background-color: var(--color-surface-variant);"
                            [title]="'SCHEDULED_REPORTS.SEND_NOW' | translate">
                      <lucide-icon name="Send" class="!w-4 !h-4" style="color: var(--color-primary);"></lucide-icon>
                    </button>
                  </ng-container>
                  <ng-container *ngxPermissionsOnly="['reports:export']">
                    <!-- Delete -->
                    <button (click)="deleteScheduledReport(report.id)"
                            class="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style="background-color: var(--color-status-error-bg);"
                            [title]="'COMMON.DELETE' | translate">
                      <lucide-icon name="Trash2" class="!w-4 !h-4" style="color: var(--color-status-error);"></lucide-icon>
                    </button>
                  </ng-container>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ReportsScheduledTab implements OnInit {
  scheduledReportsService = inject(ScheduledReportsService);
  private notifications = inject(NotificationService);

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
  }

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
}
