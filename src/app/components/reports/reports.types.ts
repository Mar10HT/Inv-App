import { InventoryItemInterface, InventoryStatus } from '../../interfaces/inventory-item.interface';

export type ReportCurrency = 'USD' | 'HNL' | 'ALL';

export interface ValueSummary {
  label: string;
  value: number;
  count: number;
}

export interface StatusSummary {
  status: InventoryStatus;
  count: number;
  items: InventoryItemInterface[];
}

export interface AssignmentSummary {
  userId: string;
  userName: string;
  userEmail: string;
  itemCount: number;
  items: InventoryItemInterface[];
}

export interface TransactionStats {
  total: number;
  inCount: number;
  outCount: number;
  transferCount: number;
  totalItems: number;
}

export interface TrendPoint {
  date: string;
  in: number;
  out: number;
  transfer: number;
}
