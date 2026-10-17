import {
  Currency,
  InventoryItemInterface,
  InventoryStatus,
  ItemType,
  Supplier,
  Warehouse
} from '../app/interfaces/inventory-item.interface';
import { StockMovement, Transaction, TransactionType } from '../app/interfaces/transaction.interface';
import { Client } from '../app/interfaces/client.interface';
import { PaymentCondition } from '../app/interfaces/purchase-invoice.interface';

export const warehouse = (id: string, name: string): Warehouse => ({
  id,
  name,
  location: '',
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0)
});

export const supplier = (id: string, name: string): Supplier => ({
  id,
  name,
  location: '',
  createdAt: new Date(0),
  updatedAt: new Date(0)
});

export const client = (id: string, name: string): Client => ({
  id,
  code: id.toUpperCase(),
  name,
  paymentCondition: PaymentCondition.CASH,
  creditLimitCurrency: 'HNL',
  isActive: true,
  createdAt: new Date(0),
  updatedAt: new Date(0)
});

export const item = (overrides: Partial<InventoryItemInterface> = {}): InventoryItemInterface => ({
  id: 'i',
  name: 'Item',
  quantity: 1,
  minQuantity: 0,
  category: 'Cat',
  status: InventoryStatus.IN_STOCK,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  itemType: ItemType.BULK,
  price: 10,
  currency: Currency.USD,
  warehouseId: 'w1',
  ...overrides
});

/** A manual transaction, as /reports/movements returns it (a Transaction that is also a StockMovement). */
export const tx = (overrides: Partial<Transaction & StockMovement> = {}): Transaction & StockMovement => ({
  id: 't',
  type: TransactionType.IN,
  origin: 'TRANSACTION',
  reference: null,
  cancellation: false,
  userId: 'u',
  date: new Date('2026-01-15T12:00:00Z'),
  createdAt: new Date(0),
  updatedAt: new Date(0),
  items: [],
  ...overrides
});
