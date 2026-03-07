export enum StockTakeStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface StockTakeItem {
  id: string;
  stockTakeId: string;
  itemId: string;
  itemName: string;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  notes?: string;
  warehouseName?: string;
}

export interface StockTake {
  id: string;
  warehouseId: string;
  warehouseName: string;
  status: StockTakeStatus;
  notes?: string;
  startedByName: string;
  items: StockTakeItem[];
  totalItems: number;
  countedItems: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateStockTakeDto {
  warehouseId: string;
  notes?: string;
}

export interface UpdateStockTakeItemDto {
  itemId: string;
  countedQty: number;
  notes?: string;
}

export interface StockTakeStats {
  total: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface VarianceReportItem {
  id: string;
  itemId: string;
  itemName: string;
  category?: string;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  notes?: string;
}

export interface VarianceReport {
  stockTake: {
    id: string;
    warehouse: { id: string; name: string };
    status: string;
    startedAt?: string;
    completedAt?: string;
  };
  summary: {
    totalItems: number;
    countedItems: number;
    itemsWithVariance: number;
    positiveVariance: number;
    negativeVariance: number;
    totalPositiveVariance: number;
    totalNegativeVariance: number;
  };
  items: VarianceReportItem[];
}
