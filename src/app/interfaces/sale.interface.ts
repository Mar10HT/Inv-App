export enum CustomerType {
  WHOLESALE = 'WHOLESALE',
  DISTRIBUTOR = 'DISTRIBUTOR',
  RETAIL = 'RETAIL',
}

export enum SaleStatus {
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
  currency: string;
  totalAmount: number;
  status: SaleStatus;
  notes: string | null;
  createdById: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: SaleWarehouseRef;
  createdBy?: SaleUserRef;
  cancelledBy?: SaleUserRef | null;
  items: SaleItem[];
}

export interface CreateSaleItemDto {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateSaleDto {
  name?: string;
  warehouseId: string;
  customerName?: string;
  customerType: CustomerType;
  currency?: string;
  items: CreateSaleItemDto[];
  notes?: string;
}

export interface CancelSaleDto {
  reason?: string;
}

export interface SaleStats {
  total: number;
  active: number;
  cancelled: number;
  byCustomerType: Record<string, number>;
  revenueByCurrency: Record<string, number>;
}
