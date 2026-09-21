import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
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
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(245,158,11,0.12);">
              <lucide-icon name="AlertTriangle" class="!w-5 !h-5" style="color: #f59e0b;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_LOW_STOCK' | translate }}</span>
          </div>
          <button (click)="exportLowStockExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #f59e0b; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Transactions -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(96,165,250,0.12);">
              <lucide-icon name="ArrowLeftRight" class="!w-5 !h-5" style="color: #60a5fa;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_TRANSACTIONS' | translate }}</span>
          </div>
          <button (click)="exportTransactionsExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #60a5fa; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Loans -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(107,123,181,0.12);">
              <lucide-icon name="HandCoins" class="!w-5 !h-5" style="color: #6b7bb5;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_LOANS' | translate }}</span>
          </div>
          <button (click)="exportLoansExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #6b7bb5; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Transfers -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(139,92,246,0.12);">
              <lucide-icon name="Truck" class="!w-5 !h-5" style="color: #8b5cf6;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_TRANSFERS' | translate }}</span>
          </div>
          <button (click)="exportTransfersExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #8b5cf6; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Stock Takes -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(14,165,233,0.12);">
              <lucide-icon name="ClipboardCheck" class="!w-5 !h-5" style="color: #0ea5e9;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_STOCK_TAKES' | translate }}</span>
          </div>
          <button (click)="exportStockTakesExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #0ea5e9; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Discharges -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(239,68,68,0.12);">
              <lucide-icon name="ClipboardList" class="!w-5 !h-5" style="color: #ef4444;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_DISCHARGES' | translate }}</span>
          </div>
          <button (click)="exportDischargesExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #ef4444; color: #fff;">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            Excel
          </button>
        </div>

        <!-- Outflows -->
        <div class="rounded-xl border p-5 flex flex-col gap-4" style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: rgba(234,88,12,0.12);">
              <lucide-icon name="PackageMinus" class="!w-5 !h-5" style="color: #ea580c;"></lucide-icon>
            </div>
            <span class="font-medium text-sm" style="color: var(--color-on-surface);">{{ 'REPORTS.EXCEL_OUTFLOWS' | translate }}</span>
          </div>
          <button (click)="exportOutflowsExcel()" class="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style="background-color: #ea580c; color: #fff;">
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

  /** Empty string means every warehouse the user can access. */
  warehouseId = input('');

  private downloadReport(endpoint: string, filename: string): void {
    const locale = this.translate.currentLang === 'es' ? 'es' : 'en';
    const params = new URLSearchParams({ locale });
    const warehouseId = this.warehouseId();
    if (warehouseId) params.set('warehouseId', warehouseId);
    this.http.get<Blob>(`${environment.apiUrl}/${endpoint}?${params.toString()}`, { responseType: 'blob' as 'json' })
      .subscribe(blob => triggerBlobDownload(blob, filename));
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
