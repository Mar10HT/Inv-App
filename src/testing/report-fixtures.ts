import {
  Currency,
  InventoryItemInterface,
  InventoryStatus,
  ItemType,
  Supplier,
  Warehouse
} from '../app/interfaces/inventory-item.interface';
import { Transaction, TransactionType } from '../app/interfaces/transaction.interface';

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

export const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't',
  type: TransactionType.IN,
  userId: 'u',
  date: new Date('2026-01-15T12:00:00Z'),
  createdAt: new Date(0),
  updatedAt: new Date(0),
  items: [],
  ...overrides
});
