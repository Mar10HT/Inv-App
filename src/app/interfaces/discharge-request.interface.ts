export enum DischargeRequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface DischargeRequestItem {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
  quantity: number;
}

export interface DischargeRequest {
  id: string;
  requesterName: string;
  requesterPosition?: string;
  requesterPhone?: string;
  neededByDate?: Date;
  justification?: string;
  warehouseId: string;
  warehouseName: string;
  status: DischargeRequestStatus;
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: Date;
  rejectedReason?: string;
  notes?: string;
  items: DischargeRequestItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailableItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  itemType: string;
  serviceTag?: string;
  warehouseId: string;
  warehouseName: string;
}

export interface CreateDischargeRequestDto {
  requesterName: string;
  requesterPosition?: string;
  requesterPhone?: string;
  neededByDate?: string;
  justification?: string;
  items: {
    inventoryItemId: string;
    quantity: number;
  }[];
}

export interface DischargeRequestStats {
  total: number;
  byStatus: {
    pending: number;
    completed: number;
    rejected: number;
  };
}
