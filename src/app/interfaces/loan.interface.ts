export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE'
}

export interface Loan {
  id: string;
  // Item info
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
  // Borrower info
  borrowerId: string;
  borrowerName: string;
  borrowerEmail?: string;
  // Loan dates
  loanDate: Date;
  dueDate: Date;
  returnDate?: Date;
  // Status
  status: LoanStatus;
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
  borrowerId: string;
  dueDate: Date;
  notes?: string;
}

export interface ReturnLoanDto {
  returnDate?: Date;
  notes?: string;
}

export interface LoanFilter {
  status?: LoanStatus;
  borrowerId?: string;
  inventoryItemId?: string;
  overdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface LoanStats {
  totalActive: number;
  totalOverdue: number;
  totalReturned: number;
  dueSoon: number; // Due within 7 days
}
