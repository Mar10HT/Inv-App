import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ImportRow,
  ImportResult,
  ImportPreview,
  IMPORT_TEMPLATE_HEADERS
} from '../interfaces/import.interface';
import {
  ItemType,
  Currency,
  InventoryStatus,
  CreateInventoryItemDto
} from '../interfaces/inventory-item.interface';
import { InventoryService } from './inventory/inventory.service';
import { AuditService } from './audit.service';
import { AuditAction, AuditEntity } from '../interfaces/audit.interface';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private inventoryService = inject(InventoryService);
  private auditService = inject(AuditService);

  importing = signal(false);
  progress = signal(0);

  /**
   * Parse CSV content and return preview with validation
   */
  parseCSV(content: string): ImportPreview {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { rows: [], validCount: 0, invalidCount: 0, totalCount: 0 };
    }

    // Detect delimiter (semicolon or comma)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    const headers = this.parseCSVLine(headerLine, delimiter).map(h => h.toLowerCase().trim());
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const row = this.mapRowToImport(headers, values, i + 1);
      rows.push(row);
    }

    const validCount = rows.filter(r => r.isValid).length;
    const invalidCount = rows.filter(r => !r.isValid).length;

    return {
      rows,
      validCount,
      invalidCount,
      totalCount: rows.length
    };
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Map CSV row values to ImportRow object with validation
   */
  private mapRowToImport(headers: string[], values: string[], rowNumber: number): ImportRow {
    const getValue = (key: string): string => {
      const index = headers.indexOf(key.toLowerCase());
      return index >= 0 && values[index] ? values[index].trim() : '';
    };

    const errors: string[] = [];

    // Required fields
    const name = getValue('name');
    if (!name) errors.push('Name is required');

    const quantityStr = getValue('quantity');
    const quantity = parseInt(quantityStr) || 0;
    if (!quantityStr) errors.push('Quantity is required');

    const category = getValue('category');
    if (!category) errors.push('Category is required');

    const warehouseName = getValue('warehousename') || getValue('warehouse');
    if (!warehouseName) errors.push('Warehouse is required');

    // Item type validation
    const itemTypeStr = (getValue('itemtype') || getValue('type') || 'BULK').toUpperCase();
    let itemType: ItemType;
    if (itemTypeStr === 'UNIQUE') {
      itemType = ItemType.UNIQUE;
    } else {
      itemType = ItemType.BULK;
    }

    // For UNIQUE items, serviceTag or serialNumber should be present
    const serviceTag = getValue('servicetag');
    const serialNumber = getValue('serialnumber');
    if (itemType === ItemType.UNIQUE && !serviceTag && !serialNumber) {
      errors.push('UNIQUE items require Service Tag or Serial Number');
    }

    // Currency validation
    const currencyStr = (getValue('currency') || 'USD').toUpperCase();
    let currency: Currency;
    if (currencyStr === 'HNL') {
      currency = Currency.HNL;
    } else {
      currency = Currency.USD;
    }

    // Price
    const priceStr = getValue('price');
    const price = priceStr ? parseFloat(priceStr.replace(',', '.')) : undefined;

    // Min quantity
    const minQuantityStr = getValue('minquantity') || getValue('min_quantity') || getValue('minqty');
    const minQuantity = parseInt(minQuantityStr) || 0;

    return {
      rowNumber,
      name,
      description: getValue('description'),
      quantity,
      minQuantity,
      category,
      model: getValue('model'),
      itemType,
      serviceTag,
      serialNumber,
      sku: getValue('sku'),
      barcode: getValue('barcode'),
      price,
      currency,
      warehouseName,
      supplierName: getValue('suppliername') || getValue('supplier'),
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate rows against existing data (warehouses, suppliers)
   */
  validateAgainstData(rows: ImportRow[]): ImportRow[] {
    const warehouses = this.inventoryService.warehouses();
    const suppliers = this.inventoryService.suppliers();
    const warehouseNames = new Map(warehouses.map(w => [w.name.toLowerCase(), w]));
    const supplierNames = new Map(suppliers.map(s => [s.name.toLowerCase(), s]));

    return rows.map(row => {
      const newErrors = [...row.errors];

      // Validate warehouse exists
      if (row.warehouseName && !warehouseNames.has(row.warehouseName.toLowerCase())) {
        newErrors.push(`Warehouse "${row.warehouseName}" not found`);
      }

      // Validate supplier if provided
      if (row.supplierName && !supplierNames.has(row.supplierName.toLowerCase())) {
        newErrors.push(`Supplier "${row.supplierName}" not found`);
      }

      return {
        ...row,
        errors: newErrors,
        isValid: newErrors.length === 0
      };
    });
  }

  /**
   * Import valid rows to inventory
   */
  importRows(rows: ImportRow[]): Observable<ImportResult> {
    const validRows = rows.filter(r => r.isValid);

    if (validRows.length === 0) {
      return of({
        success: false,
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        importedCount: 0,
        errors: rows.flatMap(r => r.errors.map(e => ({
          row: r.rowNumber,
          field: '',
          message: e
        })))
      });
    }

    this.importing.set(true);
    this.progress.set(0);

    const warehouses = this.inventoryService.warehouses();
    const suppliers = this.inventoryService.suppliers();
    const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase(), w.id]));
    const supplierMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));

    // Create items one by one
    const createObservables = validRows.map((row, index) => {
      const dto: CreateInventoryItemDto = {
        name: row.name,
        description: row.description,
        quantity: row.quantity,
        minQuantity: row.minQuantity,
        category: row.category,
        model: row.model,
        itemType: row.itemType,
        serviceTag: row.serviceTag,
        serialNumber: row.serialNumber,
        sku: row.sku,
        barcode: row.barcode,
        price: row.price,
        currency: row.currency,
        warehouseId: warehouseMap.get(row.warehouseName.toLowerCase()) || '',
        supplierId: row.supplierName ? supplierMap.get(row.supplierName.toLowerCase()) : undefined
      };

      return this.inventoryService.createItem(dto).pipe(
        map(item => {
          this.progress.set(Math.round(((index + 1) / validRows.length) * 100));
          return { success: true, row: row.rowNumber, item };
        }),
        catchError(err => of({
          success: false,
          row: row.rowNumber,
          error: err.message || 'Failed to create item'
        }))
      );
    });

    return forkJoin(createObservables).pipe(
      map(results => {
        const imported = results.filter(r => r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => ({
            row: r.row,
            field: '',
            message: (r as any).error || 'Unknown error'
          }));

        // Log audit entry for bulk import
        this.auditService.log({
          action: AuditAction.CREATE,
          entity: AuditEntity.INVENTORY_ITEM,
          entityId: 'bulk-import',
          entityName: `Bulk Import (${imported} items)`,
          metadata: { importedCount: imported, totalRows: rows.length }
        });

        this.importing.set(false);
        this.progress.set(100);

        return {
          success: errors.length === 0,
          totalRows: rows.length,
          validRows: validRows.length,
          invalidRows: rows.length - validRows.length,
          importedCount: imported,
          errors: [
            ...rows.filter(r => !r.isValid).flatMap(r => r.errors.map(e => ({
              row: r.rowNumber,
              field: '',
              message: e
            }))),
            ...errors
          ]
        };
      })
    );
  }

  /**
   * Generate CSV template for download
   */
  generateTemplate(): string {
    const headers = IMPORT_TEMPLATE_HEADERS.join(';');
    const exampleRow = [
      'Laptop Dell Latitude 5430',
      'Business laptop 14 inch',
      '1',
      '1',
      'Electronics',
      'Latitude 5430',
      'UNIQUE',
      'ABC123',
      'SN-456789',
      'LAP-DELL-001',
      '',
      '1200.00',
      'USD',
      'Main Warehouse',
      'Dell Inc'
    ].join(';');

    const bulkExample = [
      'Paper A4 500 Sheets',
      'White paper for printing',
      '100',
      '20',
      'Office Supplies',
      '',
      'BULK',
      '',
      '',
      'PAP-A4-500',
      '123456789',
      '5.99',
      'USD',
      'Main Warehouse',
      ''
    ].join(';');

    return `${headers}\n${exampleRow}\n${bulkExample}`;
  }

  /**
   * Download template as CSV file
   */
  downloadTemplate(): void {
    const content = this.generateTemplate();
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventory-import-template.csv';
    link.click();
  }
}
