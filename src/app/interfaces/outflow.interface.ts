export enum OutflowReason {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
  SOLD = 'SOLD',
  OTHER = 'OTHER',
}

export enum OutflowStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export interface OutflowItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
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

export interface OutflowUserRef {
  id: string;
  name: string | null;
  email: string;
}

export interface OutflowWarehouseRef {
  id: string;
  name: string;
}

export interface Outflow {
  id: string;
  name: string | null;
  warehouseId: string;
  reason: OutflowReason;
  status: OutflowStatus;
  notes: string | null;
  createdById: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse?: OutflowWarehouseRef;
  createdBy?: OutflowUserRef;
  cancelledBy?: OutflowUserRef | null;
  items: OutflowItem[];
}

export interface CreateOutflowItemDto {
  inventoryItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOutflowDto {
  name?: string;
  warehouseId: string;
  reason: OutflowReason;
  items: CreateOutflowItemDto[];
  notes?: string;
}

export interface CancelOutflowDto {
  reason?: string;
}

export interface OutflowStats {
  total: number;
  active: number;
  cancelled: number;
  byReason: Record<string, number>;
}
