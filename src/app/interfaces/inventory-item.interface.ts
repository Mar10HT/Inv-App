export enum ItemType {
  UNIQUE = 'UNIQUE',
  BULK = 'BULK'
}

export enum Currency {
  USD = 'USD',
  HNL = 'HNL'
}

export interface InventoryItemInterface {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minQuantity: number;
  category: string;
  location: string;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';

  // Nuevos campos del backend v2.0
  itemType: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  price: number;
  currency: Currency;

  // Relaciones
  warehouseId: string;
  supplierId?: string;
  assignedToUserId?: string;
  assignedAt?: Date;
}

export interface CreateInventoryItemDto {
  name: string;
  description: string;
  quantity: number;
  minQuantity: number;
  category: string;
  location: string;
  itemType: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  price: number;
  currency: Currency;
  warehouseId: string;
  supplierId?: string;
  assignedToUserId?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface UpdateInventoryItemDto {
  name?: string;
  description?: string;
  quantity?: number;
  minQuantity?: number;
  category?: string;
  location?: string;
  itemType?: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  currency?: Currency;
  warehouseId?: string;
  supplierId?: string;
  assignedToUserId?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock';
}