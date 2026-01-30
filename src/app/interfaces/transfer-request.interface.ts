export enum TransferRequestStatus {
  PENDING = 'PENDING',       // Created, awaiting approval
  APPROVED = 'APPROVED',     // Approved by manager
  SENT = 'SENT',             // Items shipped, QR generated for receipt
  COMPLETED = 'COMPLETED',   // Transfer finalized via QR scan
  REJECTED = 'REJECTED',     // Rejected by approver
  CANCELLED = 'CANCELLED'    // Cancelled
}

export interface TransferRequestItem {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
  quantity: number;
}

export interface TransferRequest {
  id: string;
  status: TransferRequestStatus;
  // Source warehouse
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  // Destination warehouse
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  // Requested by
  requestedById: string;
  requestedByName: string;
  // Approved/Rejected by
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  // QR confirmation fields
  sendQrCode?: string;
  receivedAt?: Date;
  receivedById?: string;
  receivedByName?: string;
  // Items
  items: TransferRequestItem[];
  // Additional info
  notes?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransferRequestDto {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: {
    inventoryItemId: string;
    quantity: number;
  }[];
  notes?: string;
}

export interface TransferRequestFilter {
  status?: TransferRequestStatus;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  requestedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TransferRequestStats {
  total: number;
  byStatus: {
    pending: number;
    approved: number;
    sent: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
}

// QR confirmation response
export interface TransferRequestWithQr extends TransferRequest {
  qrCodeDataUrl?: string;
}
