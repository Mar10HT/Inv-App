export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
}

export interface TransactionItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string;
  inventoryItem?: {
    id: string;
    name: string;
    sku?: string;
  };
}

export interface Transaction {
  id: string;
  type: TransactionType;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  userId: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items: TransactionItem[];
  sourceWarehouse?: {
    id: string;
    name: string;
  };
  destinationWarehouse?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * What Reports reads from a stock movement. A manual Transaction fits it, and
 * so does every movement from /reports/movements (sales, purchases, outflows,
 * transfers, stock takes, discharges).
 */
export interface ReportTransaction {
  id: string;
  type: TransactionType;
  date: Date | string;
  notes?: string | null;
  sourceWarehouseId?: string | null;
  destinationWarehouseId?: string | null;
  sourceWarehouse?: { id: string; name: string } | null;
  destinationWarehouse?: { id: string; name: string } | null;
  user?: { name?: string | null; email: string } | null;
  items: {
    inventoryItemId: string;
    quantity: number;
    notes?: string | null;
    inventoryItem?: { id: string; name: string; sku?: string | null } | null;
  }[];
}

export type MovementOrigin = 'TRANSACTION' | 'SALE' | 'PURCHASE' | 'OUTFLOW' | 'TRANSFER' | 'STOCK_TAKE';

export interface StockMovement extends ReportTransaction {
  origin: MovementOrigin;
  /** The document's number (V-0001, COM-0001, SAL-0001, TRA-0001...), null for manual transactions, stock takes and discharges. */
  reference: string | null;
  /** The stock a cancellation put back (or took back out). */
  cancellation: boolean;
}

export interface CreateTransactionItemDto {
  inventoryItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  userId: string;
  date: string;
  notes?: string;
  items: CreateTransactionItemDto[];
}
