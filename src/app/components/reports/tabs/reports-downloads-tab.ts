import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../services/notification.service';
import { triggerBlobDownload } from '../../../utils/download.utils';

@Component({
  selector: 'app-reports-downloads-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <div>
      <div class="mb-6">
        <h2 class="text-xl font-semibold" style="color: var(--color-on-surface);">{{ 'REPORTS.TAB_DOWNLOADS' | translate }}</h2>
        <p class="text-sm mt-1" style="color: var(--color-on-surface-variant);">{{ 'REPORTS.DOWNLOAD_EXCEL' | translate }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- Inventory -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-primary-container);">
              <lucide-icon name="Package" class="!w-5 !h-5" style="color: var(--color-primary);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_INVENTORY' | translate }}</span>
          </div>
          <button (click)="exportInventoryExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-primary); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Low Stock -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-accent-amber-bg);">
              <lucide-icon name="AlertTriangle" class="!w-5 !h-5" style="color: var(--color-accent-amber);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_LOW_STOCK' | translate }}</span>
          </div>
          <button (click)="exportLowStockExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-accent-amber); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Transactions -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-accent-indigo-bg);">
              <lucide-icon name="ArrowLeftRight" class="!w-5 !h-5" style="color: var(--color-accent-indigo);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_TRANSACTIONS' | translate }}</span>
          </div>
          <button (click)="exportTransactionsExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-accent-indigo); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Loans -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-info-bg);">
              <lucide-icon name="HandCoins" class="!w-5 !h-5" style="color: var(--color-info);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_LOANS' | translate }}</span>
          </div>
          <button (click)="exportLoansExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-info); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Transfers -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-accent-violet-bg);">
              <lucide-icon name="Truck" class="!w-5 !h-5" style="color: var(--color-accent-violet);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_TRANSFERS' | translate }}</span>
          </div>
          <button (click)="exportTransfersExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-accent-violet); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Stock Takes -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-accent-cyan-bg);">
              <lucide-icon name="ClipboardCheck" class="!w-5 !h-5" style="color: var(--color-accent-cyan);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_STOCK_TAKES' | translate }}</span>
          </div>
          <button (click)="exportStockTakesExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-accent-cyan); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Discharges -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-error-bg);">
              <lucide-icon name="ClipboardList" class="!w-5 !h-5" style="color: var(--color-error);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_DISCHARGES' | translate }}</span>
          </div>
          <button (click)="exportDischargesExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-error); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Outflows -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: var(--color-warning-bg);">
              <lucide-icon name="PackageMinus" class="!w-5 !h-5" style="color: var(--color-warning);"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_OUTFLOWS' | translate }}</span>
          </div>
          <button (click)="exportOutflowsExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: var(--color-warning); color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ReportsDownloadsTab {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private notifications = inject(NotificationService);

  /** Empty string means every warehouse the user can access. */
  warehouseId = input('');

  private downloadReport(endpoint: string, filename: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    const params = new URLSearchParams({ locale });
    const warehouseId = this.warehouseId();
    if (warehouseId) params.set('warehouseId', warehouseId);
    this.http.get<Blob>(`${environment.apiUrl}/${endpoint}?${params.toString()}`, { responseType: 'blob' as 'json' })
      .subscribe({
        next: blob => triggerBlobDownload(blob, filename),
        // The error interceptor already logs the failed request
        error: () => this.notifications.error('NOTIFICATIONS.ERRORS.EXPORT_FAILED'),
      });
  }

  exportInventoryExcel(): void {
    this.downloadReport('reports/inventory/excel', `inventario_${Date.now()}.xlsx`);
  }

  exportLowStockExcel(): void {
    this.downloadReport('reports/low-stock/excel', `stock_bajo_${Date.now()}.xlsx`);
  }

  exportTransactionsExcel(): void {
    this.downloadReport('reports/transactions/excel', `transacciones_${Date.now()}.xlsx`);
  }

  exportLoansExcel(): void {
    this.downloadReport('reports/loans/excel', `prestamos_${Date.now()}.xlsx`);
  }

  exportTransfersExcel(): void {
    this.downloadReport('reports/transfers/excel', `transferencias_${Date.now()}.xlsx`);
  }

  exportStockTakesExcel(): void {
    this.downloadReport('reports/stock-takes/excel', `conteo_fisico_${Date.now()}.xlsx`);
  }

  exportDischargesExcel(): void {
    this.downloadReport('reports/discharges/excel', `bajas_${Date.now()}.xlsx`);
  }

  exportOutflowsExcel(): void {
    this.downloadReport('reports/outflows/excel', `salidas_${Date.now()}.xlsx`);
  }
}
