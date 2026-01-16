import { ItemType, Currency, InventoryStatus } from './inventory-item.interface';

export interface ImportRow {
  rowNumber: number;
  name: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  category: string;
  model?: string;
  itemType: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  currency?: Currency;
  warehouseName: string;
  supplierName?: string;
  status?: InventoryStatus;
  // Validation
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedCount: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  validCount: number;
  invalidCount: number;
  totalCount: number;
}

export const IMPORT_TEMPLATE_HEADERS = [
  'name',
  'description',
  'quantity',
  'minQuantity',
  'category',
  'model',
  'itemType',
  'serviceTag',
  'serialNumber',
  'sku',
  'barcode',
  'price',
  'currency',
  'warehouseName',
  'supplierName'
];
