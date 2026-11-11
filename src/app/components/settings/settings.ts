import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { ConfirmService } from '../../services/confirm.service';
import { FiscalConfigService } from '../../services/fiscal-config.service';
import { CaiRangeService } from '../../services/cai-range.service';
import { ThemeService } from '../../services/theme.service';
import { FiscalConfig, UpdateFiscalConfigDto } from '../../interfaces/fiscal-config.interface';
import { CaiRange, CreateCaiRangeDto } from '../../interfaces/cai-range.interface';
import { Currency } from '../../interfaces/inventory-item.interface';
import { parseDate } from '../../utils/date.utils';
import { Spinner } from '../shared/spinner/spinner';
import { AppDatePipe } from '../../shared/app-date.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AppDatePipe,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    NgxPermissionsModule,
    RouterLink,
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
            [class]="darkMode() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'">
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
              [class]="emailNotifications() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'">
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
              [class]="lowStockAlerts() ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'">
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

    <!-- Fiscal Configuration Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
            <lucide-icon name="Landmark" class="!text-[var(--color-primary)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.FISCAL.TITLE' | translate }}</h3>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.FISCAL.SUBTITLE' | translate }}</p>
          </div>
        </div>

        <ng-container *ngxPermissionsOnly="['settings:edit']">
          <div class="ml-13 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="fiscal-rtn" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.RTN' | translate }}</label>
              <input id="fiscal-rtn" type="text" maxlength="14" [(ngModel)]="fiscalForm.rtn"
                     class="w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
            <div>
              <label for="fiscal-email" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.FISCAL_EMAIL' | translate }}</label>
              <input id="fiscal-email" type="email" [(ngModel)]="fiscalForm.fiscalEmail"
                     class="w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
            <div>
              <label for="fiscal-phone" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.FISCAL_PHONE' | translate }}</label>
              <input id="fiscal-phone" type="text" [(ngModel)]="fiscalForm.fiscalPhone"
                     class="w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
            <div>
              <label for="fiscal-address" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.ADDRESS' | translate }}</label>
              <input id="fiscal-address" type="text" [(ngModel)]="fiscalForm.address"
                     class="w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
            <div>
              <label for="fiscal-currency" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.CURRENCY' | translate }}</label>
              <select id="fiscal-currency" [(ngModel)]="fiscalForm.currency"
                      class="select-chevron w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm">
                <option [value]="Currency.HNL">HNL</option>
                <option [value]="Currency.USD">USD</option>
              </select>
            </div>
            <div>
              <label for="fiscal-isv" class="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">{{ 'SETTINGS.FISCAL.ISV_PERCENT' | translate }}</label>
              <input id="fiscal-isv" type="number" min="0" max="100" step="0.01" [(ngModel)]="fiscalForm.isvPercent"
                     class="w-full bg-surface-elevated border border-theme rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
          </div>
          <div class="ml-13 mt-4">
            <button (click)="saveFiscalConfig()" class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-primary); color: #fff;">
              {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </ng-container>
      </div>
    </div>

    <!-- CAI Ranges Section -->
    <div class="bg-surface-variant rounded-xl border border-theme overflow-hidden mb-6">
      <div class="p-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center">
              <lucide-icon name="Barcode" class="!text-[var(--color-primary)]"></lucide-icon>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ 'SETTINGS.CAI.TITLE' | translate }}</h3>
              <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SETTINGS.CAI.SUBTITLE' | translate }}</p>
            </div>
          </div>
          <ng-container *ngxPermissionsOnly="['settings:edit']">
            <button (click)="toggleCaiForm()" class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-primary); color: #fff;">
              <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
              {{ 'SETTINGS.CAI.ADD' | translate }}
            </button>
          </ng-container>
        </div>

        <ng-container *ngxPermissionsOnly="['settings:edit']">
          @if (showCaiForm()) {
            <div class="mb-6 p-4 rounded-xl border" style="background-color: var(--color-surface); border-color: var(--color-border);">
              <h4 class="font-semibold text-sm mb-4" style="color: var(--color-on-surface);">{{ editingCaiRange() ? ('COMMON.EDIT' | translate) : ('SETTINGS.CAI.ADD' | translate) }}</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="cai-code" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.CAI_CODE' | translate }}</label>
                  <input id="cai-code" type="text" [(ngModel)]="caiForm.cai"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div>
                  <label for="cai-establishment" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.ESTABLISHMENT_CODE' | translate }}</label>
                  <input id="cai-establishment" type="text" maxlength="3" [(ngModel)]="caiForm.establishmentCode"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div>
                  <label for="cai-emission" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.EMISSION_POINT_CODE' | translate }}</label>
                  <input id="cai-emission" type="text" maxlength="3" [(ngModel)]="caiForm.emissionPointCode"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div>
                  <label for="cai-doctype" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.DOCUMENT_TYPE_CODE' | translate }}</label>
                  <input id="cai-doctype" type="text" maxlength="2" placeholder="01" [(ngModel)]="caiForm.documentTypeCode"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div>
                  <label for="cai-range-start" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.RANGE_START' | translate }}</label>
                  <input id="cai-range-start" type="number" min="1" [(ngModel)]="caiForm.rangeStart"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div>
                  <label for="cai-range-end" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.RANGE_END' | translate }}</label>
                  <input id="cai-range-end" type="number" min="1" [(ngModel)]="caiForm.rangeEnd"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
                <div class="sm:col-span-2">
                  <label for="cai-expires" class="block text-xs font-medium mb-1" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.EXPIRES_AT' | translate }}</label>
                  <input id="cai-expires" type="date" [(ngModel)]="caiForm.expiresAt"
                         class="w-full px-3 py-2 rounded-lg border text-sm" style="background-color: var(--color-surface-elevated); color: var(--color-on-surface); border-color: var(--color-border);" />
                </div>
              </div>

              <div class="flex gap-3 mt-4">
                <button (click)="saveCaiRange()" class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-primary); color: #fff;">
                  {{ 'COMMON.SAVE' | translate }}
                </button>
                <button (click)="cancelCaiForm()" class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
              </div>
            </div>
          }
        </ng-container>

        @if (caiRangeService.loading() && caiRangeService.ranges().length === 0) {
          <div class="flex items-center justify-center py-8">
            <app-spinner size="md"></app-spinner>
          </div>
        } @else if (caiRangeService.ranges().length === 0) {
          <div class="flex flex-col items-center justify-center py-8 gap-2">
            <lucide-icon name="Barcode" class="!w-8 !h-8" style="color: var(--color-on-surface-variant);"></lucide-icon>
            <p class="text-sm" style="color: var(--color-on-surface-variant);">{{ 'SETTINGS.CAI.NO_RANGES' | translate }}</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (range of caiRangeService.ranges(); track range.id) {
              <div class="flex items-center justify-between p-4 rounded-xl border" style="background-color: var(--color-surface); border-color: var(--color-border);">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-sm text-foreground">{{ range.cai }}</span>
                    @if (range.isActive) {
                      <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: var(--color-success-bg); color: var(--color-status-success);">
                        {{ 'SETTINGS.CAI.ACTIVE' | translate }}
                      </span>
                    } @else {
                      <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                        {{ 'SETTINGS.CAI.INACTIVE' | translate }}
                      </span>
                    }
                  </div>
                  <p class="text-xs mt-1.5" style="color: var(--color-on-surface-variant);">
                    {{ range.establishmentCode }}-{{ range.emissionPointCode }}-{{ range.documentTypeCode }} ·
                    {{ range.rangeStart }}–{{ range.rangeEnd }} ({{ range.currentNumber }}) ·
                    {{ 'SETTINGS.CAI.EXPIRES_AT' | translate }}: {{ range.expiresAt | appDate:'dd/MM/yyyy' }}
                  </p>
                </div>
                <ng-container *ngxPermissionsOnly="['settings:edit']">
                  <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button (click)="activateCaiRange(range)" [disabled]="range.isActive"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                            style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);">
                      {{ 'SETTINGS.CAI.ACTIVATE' | translate }}
                    </button>
                    <button (click)="editCaiRange(range)" class="p-1.5 rounded-lg transition-opacity hover:opacity-70" style="background-color: var(--color-surface-variant);" [title]="'COMMON.EDIT' | translate">
                      <lucide-icon name="Pencil" class="!w-4 !h-4" style="color: var(--color-on-surface-variant);"></lucide-icon>
                    </button>
                    <button (click)="deleteCaiRange(range.id)" class="p-1.5 rounded-lg transition-opacity hover:opacity-70" style="background-color: rgba(239,68,68,0.08);" [title]="'COMMON.DELETE' | translate">
                      <lucide-icon name="Trash2" class="!w-4 !h-4" style="color: #ef4444;"></lucide-icon>
                    </button>
                  </div>
                </ng-container>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Danger Zone Section -->
    <div class="bg-surface-variant rounded-xl border border-[var(--color-error-border)] overflow-hidden">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <lucide-icon name="AlertTriangle" class="!text-[var(--color-status-error)]"></lucide-icon>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[var(--color-status-error)]">{{ 'SETTINGS.DANGER_ZONE' | translate }}</h3>
          </div>
        </div>

        <div class="flex items-center justify-between ml-13 p-4 bg-red-900/10 border border-[var(--color-error-border)] rounded-lg">
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

    <!-- Scheduled reports moved to Reports > Scheduled -->
    <ng-container *ngxPermissionsOnly="['reports:view']">
      <a routerLink="/reports" [queryParams]="{ tab: 'scheduled' }"
         class="flex items-center gap-3 bg-surface-variant rounded-xl border border-theme p-6 mb-6 hover:border-[var(--color-primary)] transition-colors">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center flex-shrink-0">
          <lucide-icon name="CalendarClock" class="!text-[var(--color-primary)]"></lucide-icon>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-foreground">{{ 'SCHEDULED_REPORTS.TITLE' | translate }}</h3>
          <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'SCHEDULED_REPORTS.MOVED' | translate }}</p>
        </div>
        <lucide-icon name="ChevronRight" class="!w-5 !h-5 !text-[var(--color-on-surface-variant)]"></lucide-icon>
      </a>
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
  private fiscalConfigService = inject(FiscalConfigService);
  caiRangeService = inject(CaiRangeService);

  readonly Currency = Currency;

  currentLang = signal<string>('en');
  // The app theme lives in ThemeService: writing localStorage and data-theme from here left it stale
  darkMode = this.themeService.isDark;
  emailNotifications = signal<boolean>(true);
  lowStockAlerts = signal<boolean>(true);
  exporting = signal<boolean>(false);
  resetting = signal<boolean>(false);

  // Fiscal configuration — single-row settings, prefilled once FiscalConfigService.get() resolves.
  fiscalForm = {
    rtn: '',
    fiscalEmail: '',
    fiscalPhone: '',
    address: '',
    currency: Currency.HNL,
    isvPercent: 15,
  };

  // CAI ranges
  showCaiForm = signal(false);
  editingCaiRange = signal<CaiRange | null>(null);
  caiForm = {
    cai: '',
    establishmentCode: '',
    emissionPointCode: '',
    documentTypeCode: '',
    rangeStart: 1,
    rangeEnd: 1,
    expiresAt: '',
    isActive: false,
  };

  ngOnInit(): void {
    this.fiscalConfigService.get().subscribe((data) => {
      if (data) this.fiscalForm = this.toFiscalForm(data);
    });
    this.caiRangeService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err),
    });

    // Saved language, else the one the app started in (it falls back to the browser language)
    const savedLang = localStorage.getItem('language') || this.translate.currentLang || 'en';
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

  // Fiscal configuration
  private toFiscalForm(data: FiscalConfig): typeof this.fiscalForm {
    return {
      rtn: data.rtn ?? '',
      fiscalEmail: data.fiscalEmail ?? '',
      fiscalPhone: data.fiscalPhone ?? '',
      address: data.address ?? '',
      currency: data.currency,
      isvPercent: data.isvPercent,
    };
  }

  saveFiscalConfig(): void {
    const dto: UpdateFiscalConfigDto = {
      rtn: this.fiscalForm.rtn.trim() || undefined,
      fiscalEmail: this.fiscalForm.fiscalEmail.trim() || undefined,
      fiscalPhone: this.fiscalForm.fiscalPhone.trim() || undefined,
      address: this.fiscalForm.address.trim() || undefined,
      currency: this.fiscalForm.currency,
      isvPercent: this.fiscalForm.isvPercent,
    };

    this.fiscalConfigService.update(dto).subscribe((result) => {
      if (result) this.notifications.success('SETTINGS.FISCAL.SAVE_SUCCESS');
      // A null answer is a failed request: FiscalConfigService already showed the reason (reportErrors)
    });
  }

  // CAI ranges
  toggleCaiForm(): void {
    this.editingCaiRange.set(null);
    this.caiForm = { cai: '', establishmentCode: '', emissionPointCode: '', documentTypeCode: '', rangeStart: 1, rangeEnd: 1, expiresAt: '', isActive: false };
    this.showCaiForm.update(v => !v);
  }

  editCaiRange(range: CaiRange): void {
    this.editingCaiRange.set(range);
    this.caiForm = {
      cai: range.cai,
      establishmentCode: range.establishmentCode,
      emissionPointCode: range.emissionPointCode,
      documentTypeCode: range.documentTypeCode,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      expiresAt: range.expiresAt.slice(0, 10),
      isActive: range.isActive,
    };
    this.showCaiForm.set(true);
  }

  cancelCaiForm(): void {
    this.showCaiForm.set(false);
    this.editingCaiRange.set(null);
  }

  saveCaiRange(): void {
    const editing = this.editingCaiRange();
    const dto: CreateCaiRangeDto = {
      ...this.caiForm,
      documentTypeCode: this.caiForm.documentTypeCode.trim() || undefined,
      // <input type="date"> gives a bare YYYY-MM-DD; Prisma's DateTime needs a full ISO
      // string. Left blank, pass it through as-is so the backend's own @IsDateString()
      // rejects it the same way it rejects any other missing required field.
      expiresAt: this.caiForm.expiresAt ? parseDate(this.caiForm.expiresAt).toISOString() : this.caiForm.expiresAt,
    };

    if (editing) {
      this.caiRangeService.update(editing.id, dto).subscribe({
        next: () => {
          this.cancelCaiForm();
          this.notifications.success('SETTINGS.CAI.UPDATE_SUCCESS');
        },
        error: (err) => this.notifications.handleError(err),
      });
    } else {
      this.caiRangeService.create(dto).subscribe({
        next: () => {
          this.cancelCaiForm();
          this.notifications.success('SETTINGS.CAI.CREATE_SUCCESS');
        },
        error: (err) => this.notifications.handleError(err),
      });
    }
  }

  activateCaiRange(range: CaiRange): void {
    this.caiRangeService.update(range.id, { isActive: true }).subscribe({
      // Activating one range deactivates every other one server-side (see
      // CaiRangesService.deactivateOthers) — a single-item patch would leave
      // the previously-active row stuck showing Active until the next reload.
      next: () => this.caiRangeService.getAll().subscribe({
        error: (err) => this.notifications.handleError(err),
      }),
      error: (err) => this.notifications.handleError(err),
    });
  }

  deleteCaiRange(id: string): void {
    this.confirm.ask({
      title: this.translate.instant('SETTINGS.CAI.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('SETTINGS.CAI.CONFIRM_DELETE_MESSAGE'),
      confirmText: this.translate.instant('COMMON.DELETE'),
      type: 'danger',
    }).subscribe((confirmed) => {
      if (confirmed) {
        this.caiRangeService.delete(id).subscribe({
          next: () => this.notifications.success('SETTINGS.CAI.DELETE_SUCCESS'),
          error: (err) => this.notifications.handleError(err),
        });
      }
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
