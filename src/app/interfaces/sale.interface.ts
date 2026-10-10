import { PaymentCondition } from './purchase-invoice.interface';

export enum CustomerType {
  WHOLESALE = 'WHOLESALE',
  DISTRIBUTOR = 'DISTRIBUTOR',
  RETAIL = 'RETAIL',
}

export enum SaleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export interface SaleItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string | null;
  itemName: string | null;
  serviceTag: string | null;
  notes: string | null;
  // Null inherits the sale's taxPercent; an explicit value (including 0) overrides it.
  taxPercent: number | null;
  taxAmount: number;
  inventoryItem?: {
    id: string;
    name: string;
    serviceTag: string | null;
    quantity: number;
    price?: number | null;
    currency?: string | null;
  };
}

export interface SaleUserRef {
  id: string;
  name: string | null;
  email: string;
}

export interface SaleWarehouseRef {
  id: string;
  name: string;
}

export interface Sale {
  id: string;
  name: string | null;
  warehouseId: string;
  customerName: string | null;
  customerType: CustomerType;
  // Optional link to a real Client (Phase 2/5). Null for a walk-in sale —
  // customerName above is unaffected either way.
  clientId: string | null;
  // Only CREDIT sales with an outstanding balance count toward a client's
  // credit limit.
  paymentCondition: PaymentCondition;
  currency: string;
  totalAmount: number;
  // Suggested default is the fiscal config's ISV%, but always editable; null = no tax.
  taxPercent: number | null;
  taxAmount: number;
  status: SaleStatus;
  notes: string | null;
  createdById: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  // Real invoice number (CAI-based or a simple correlative). Null while DRAFT —
  // a quotation isn't assigned one until confirmed.
  number: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: SaleWarehouseRef;
  createdBy?: SaleUserRef;
  cancelledBy?: SaleUserRef | null;
  items: SaleItem[];
  // Present on list responses (totalAmount + taxAmount - paid), absent
  // otherwise. Never stored — always computed by the backend on read.
  balance?: number;
}

export interface CreateSaleItemDto {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  taxPercent?: number;
}

export interface CreateSaleDto {
  name?: string;
  warehouseId: string;
  customerName?: string;
  customerType: CustomerType;
  clientId?: string;
  paymentCondition?: PaymentCondition;
  currency?: string;
  items: CreateSaleItemDto[];
  notes?: string;
  taxPercent?: number;
  // true = save as a DRAFT quotation (no stock impact, no number assigned
  // until confirmed). Absent/false is a direct sale, exactly today's behavior.
  asDraft?: boolean;
}

export type UpdateSaleDto = Partial<Omit<CreateSaleDto, 'asDraft'>>;

export interface CancelSaleDto {
  reason?: string;
}

export interface SaleStats {
  total: number;
  active: number;
  draft: number;
  cancelled: number;
  byCustomerType: Record<string, number>;
  revenueByCurrency: Record<string, number>;
}
