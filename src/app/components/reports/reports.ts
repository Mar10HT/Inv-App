import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InventoryService } from '../../services/inventory/inventory.service';
import { InventoryItemInterface } from '../../interfaces/inventory-item.interface';

type ReportCurrency = 'USD' | 'HNL' | 'ALL';

interface ValueSummary {
  label: string;
  value: number;
  count: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {
  private inventoryService = inject(InventoryService);
  private translate = inject(TranslateService);

  allItems = signal<InventoryItemInterface[]>([]);
  loading = signal<boolean>(true);
  selectedCurrency = signal<ReportCurrency>('USD');

  currencyOptions: { value: ReportCurrency; label: string }[] = [
    { value: 'USD', label: 'USD' },
    { value: 'HNL', label: 'HNL' },
    { value: 'ALL', label: 'REPORTS.ALL_CURRENCIES' }
  ];

  // Filtered items by currency
  filteredItems = computed(() => {
    const items = this.allItems();
    const currency = this.selectedCurrency();
    if (currency === 'ALL') {
      return items;
    }
    return items.filter(item => item.currency === currency);
  });

  // Total value
  totalValue = computed(() => {
    return this.filteredItems().reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity);
    }, 0);
  });

  // Total items count
  totalItemsCount = computed(() => this.filteredItems().length);

  // Value by category
  valueByCategory = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const category = item.category || 'Uncategorized';
      const existing = map.get(category) || { value: 0, count: 0 };
      map.set(category, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  // Value by warehouse
  valueByWarehouse = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const warehouses = this.inventoryService.warehouses();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      const label = warehouse?.name || 'No Warehouse';
      const existing = map.get(label) || { value: 0, count: 0 };
      map.set(label, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  // Value by supplier
  valueBySupplier = computed((): ValueSummary[] => {
    const items = this.filteredItems();
    const suppliers = this.inventoryService.suppliers();
    const map = new Map<string, { value: number; count: number }>();

    for (const item of items) {
      const supplier = suppliers.find(s => s.id === item.supplierId);
      const label = supplier?.name || 'No Supplier';
      const existing = map.get(label) || { value: 0, count: 0 };
      map.set(label, {
        value: existing.value + ((item.price || 0) * item.quantity),
        count: existing.count + 1
      });
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.value - a.value);
  });

  // Top 10 items by value
  topItems = computed((): (InventoryItemInterface & { totalValue: number })[] => {
    return this.filteredItems()
      .map(item => ({
        ...item,
        totalValue: (item.price || 0) * item.quantity
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.inventoryService.getItemsObservable().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onCurrencyChange(currency: ReportCurrency): void {
    this.selectedCurrency.set(currency);
  }

  getCurrencySymbol(): string {
    const currency = this.selectedCurrency();
    if (currency === 'ALL') return '$';
    return currency === 'USD' ? '$' : 'L';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatCurrency(value: number): string {
    return `${this.getCurrencySymbol()}${this.formatNumber(value)}`;
  }

  exportReport(): void {
    const currency = this.selectedCurrency();
    const symbol = this.getCurrencySymbol();

    let csv = 'Inventory Value Report\n';
    csv += `Currency Filter: ${currency}\n`;
    csv += `Total Value: ${symbol}${this.formatNumber(this.totalValue())}\n`;
    csv += `Total Items: ${this.totalItemsCount()}\n\n`;

    // By Category
    csv += 'VALUE BY CATEGORY\n';
    csv += 'Category,Value,Items\n';
    for (const item of this.valueByCategory()) {
      csv += `"${item.label}",${item.value},${item.count}\n`;
    }

    csv += '\nVALUE BY WAREHOUSE\n';
    csv += 'Warehouse,Value,Items\n';
    for (const item of this.valueByWarehouse()) {
      csv += `"${item.label}",${item.value},${item.count}\n`;
    }

    csv += '\nVALUE BY SUPPLIER\n';
    csv += 'Supplier,Value,Items\n';
    for (const item of this.valueBySupplier()) {
      csv += `"${item.label}",${item.value},${item.count}\n`;
    }

    csv += '\nTOP 10 ITEMS BY VALUE\n';
    csv += 'Name,Category,Quantity,Unit Price,Total Value\n';
    for (const item of this.topItems()) {
      csv += `"${item.name}","${item.category}",${item.quantity},${item.price || 0},${item.totalValue}\n`;
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-report-${currency}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
