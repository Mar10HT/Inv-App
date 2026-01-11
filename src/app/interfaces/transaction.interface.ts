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
