export enum LoanStatus {
  PENDING = 'PENDING',           // Created, waiting to be sent
  SENT = 'SENT',                 // Shipped, QR generated for receipt
  RECEIVED = 'RECEIVED',         // Receiver confirmed receipt
  RETURN_PENDING = 'RETURN_PENDING', // Return initiated, QR generated
  RETURNED = 'RETURNED',         // Return confirmed
  OVERDUE = 'OVERDUE',           // Past due date
  CANCELLED = 'CANCELLED',       // Loan cancelled
  // Legacy status for backwards compatibility
  ACTIVE = 'ACTIVE'
}

export interface Loan {
  id: string;
  // Item info
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
  quantity: number;
  // Source warehouse (who lends)
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  // Destination warehouse (who borrows)
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  // Loan dates
  loanDate: Date;
  dueDate: Date;
  returnDate?: Date;
  // Status
  status: LoanStatus;
  // QR confirmation fields
  sendQrCode?: string;
  returnQrCode?: string;
  receivedAt?: Date;
  receivedById?: string;
  receivedByName?: string;
  returnConfirmedAt?: Date;
  returnConfirmedById?: string;
  returnConfirmedByName?: string;
  // Additional info
  notes?: string;
  // Who created the loan
  createdById: string;
  createdByName: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLoanDto {
  inventoryItemId: string;
  quantity: number;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  dueDate: Date | string;
  notes?: string;
}

export interface ReturnLoanDto {
  returnDate?: Date;
  notes?: string;
}

export interface LoanFilter {
  status?: LoanStatus;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  inventoryItemId?: string;
  overdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface LoanStats {
  totalPending: number;
  totalSent: number;
  totalReceived: number;
  totalReturnPending: number;
  totalReturned: number;
  totalOverdue: number;
  dueSoon: number; // Due within 7 days
  totalActive: number; // Legacy: totalPending + totalSent + totalReceived + totalReturnPending
}

// QR confirmation response
export interface LoanWithQr extends Loan {
  qrCodeDataUrl?: string;
}

// QR scan response
export interface QrScanResult {
  type: 'LOAN_SEND' | 'LOAN_RETURN';
  loan: Loan;
  message: string;
}
