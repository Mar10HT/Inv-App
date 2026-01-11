export enum ItemType {
  UNIQUE = 'UNIQUE',
  BULK = 'BULK'
}

export enum Currency {
  USD = 'USD',
  HNL = 'HNL'
}

export enum InventoryStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
  EXTERNAL = 'EXTERNAL'
}

// Warehouse interface
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier interface
export interface Supplier {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User interface (for assignments)
export interface User {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
}

export interface InventoryItemInterface {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  category: string;
  model?: string;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;

  // Item type fields
  itemType: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;

  // Price fields
  price?: number;
  currency: Currency;

  // Warehouse relationship
  warehouseId: string;
  warehouse?: Warehouse;

  // Supplier relationship (optional)
  supplierId?: string;
  supplier?: Supplier;

  // Assignment tracking for UNIQUE items
  assignedToUserId?: string;
  assignedToUser?: User;
  assignedAt?: Date;

  // Creator
  createdById?: string;
  createdBy?: User;
}

export interface CreateInventoryItemDto {
  name: string;
  description?: string;
  quantity: number;
  minQuantity?: number;
  category: string;
  model?: string;
  itemType: ItemType;
  serviceTag?: string;
  serialNumber?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  currency?: Currency;
  warehouseId: string;
  supplierId?: string;
  assignedToUserId?: string;
  status?: InventoryStatus;
}

export interface UpdateInventoryItemDto {
  name?: string;
  description?: string;
  quantity?: number;
  minQuantity?: number;
  category?: string;
  model?: string;
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
  status?: InventoryStatus;
}

// Paginated response from API
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Stats response from API
export interface StatsResponse {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  categories: { name: string; count: number }[];
  locations: { name: string; count: number }[];
}
