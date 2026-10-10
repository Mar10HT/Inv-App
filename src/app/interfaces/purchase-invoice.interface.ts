import { ItemType } from './inventory-item.interface';

export enum PurchaseInvoiceStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentCondition {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
}

export interface PurchaseInvoiceItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string | null;
  itemName: string | null;
  serviceTag: string | null;
  notes: string | null;
  // Null inherits the invoice's taxPercent; an explicit value (including 0) overrides it.
  taxPercent: number | null;
  taxAmount: number;
  inventoryItem?: {
    id: string;
    name: string;
    serviceTag: string | null;
    quantity: number;
    itemType?: ItemType;
    price?: number | null;
    currency?: string | null;
  };
}

export interface PurchaseInvoiceUserRef {
  id: string;
  name: string | null;
  email: string;
}

export interface PurchaseInvoiceWarehouseRef {
  id: string;
  name: string;
}

export interface PurchaseInvoiceSupplierRef {
  id: string;
  name: string;
}

export interface PurchaseInvoice {
  id: string;
  // Internal Obsid correlative, e.g. COM-0001.
  number: string;
  // The supplier's own invoice number.
  invoiceNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseInvoiceStatus;
  currency: string;
  totalAmount: number;
  taxPercent: number | null;
  taxAmount: number;
  paymentCondition: PaymentCondition;
  notes: string | null;
  createdById: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: PurchaseInvoiceWarehouseRef;
  supplier?: PurchaseInvoiceSupplierRef;
  createdBy?: PurchaseInvoiceUserRef;
  cancelledBy?: PurchaseInvoiceUserRef | null;
  items: PurchaseInvoiceItem[];
}

export interface CreatePurchaseInvoiceBulkItemDto {
  kind: ItemType.BULK;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
  notes?: string;
}

export interface CreatePurchaseInvoiceUniqueItemDto {
  kind: ItemType.UNIQUE;
  name: string;
  category: string;
  model?: string;
  serviceTag: string;
  serialNumber?: string;
  unitPrice: number;
  taxPercent?: number;
  notes?: string;
}

export type CreatePurchaseInvoiceItemDto =
  | CreatePurchaseInvoiceBulkItemDto
  | CreatePurchaseInvoiceUniqueItemDto;

export interface CreatePurchaseInvoiceDto {
  warehouseId: string;
  supplierId: string;
  invoiceNumber: string;
  currency?: string;
  taxPercent?: number;
  paymentCondition?: PaymentCondition;
  notes?: string;
  items: CreatePurchaseInvoiceItemDto[];
}

export interface CancelPurchaseInvoiceDto {
  reason?: string;
}

export interface PurchaseInvoiceStats {
  total: number;
  active: number;
  cancelled: number;
  totalByCurrency: Record<string, number>;
}
