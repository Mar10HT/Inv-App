import { Loan, LoanStatus, LoanFilter, RawLoan } from '../interfaces/loan.interface';

/** Transform a raw backend loan response into the frontend Loan model. */
export function transformLoan(loan: RawLoan): Loan {
  return {
    id: loan.id,
    inventoryItemId: loan.inventoryItemId,
    inventoryItemName: loan.inventoryItem?.name || '',
    inventoryItemServiceTag: loan.inventoryItem?.serviceTag,
    quantity: loan.quantity,
    sourceWarehouseId: loan.sourceWarehouseId,
    sourceWarehouseName: loan.sourceWarehouse?.name || '',
    destinationWarehouseId: loan.destinationWarehouseId,
    destinationWarehouseName: loan.destinationWarehouse?.name || '',
    loanDate: new Date(loan.loanDate),
    dueDate: new Date(loan.dueDate),
    returnDate: loan.returnDate ? new Date(loan.returnDate) : undefined,
    status: loan.status as LoanStatus,
    sendQrCode: loan.sendQrCode,
    returnQrCode: loan.returnQrCode,
    receivedAt: loan.receivedAt && !isNaN(new Date(loan.receivedAt).getTime()) ? new Date(loan.receivedAt) : undefined,
    receivedById: loan.receivedById,
    receivedByName: loan.receivedBy?.name || loan.receivedBy?.email,
    returnConfirmedAt: loan.returnConfirmedAt && !isNaN(new Date(loan.returnConfirmedAt).getTime()) ? new Date(loan.returnConfirmedAt) : undefined,
    returnConfirmedById: loan.returnConfirmedById,
    returnConfirmedByName: loan.returnConfirmedBy?.name || loan.returnConfirmedBy?.email,
    notes: loan.notes,
    createdById: loan.createdById,
    createdByName: loan.createdBy?.name || loan.createdBy?.email || '',
    createdAt: new Date(loan.createdAt),
    updatedAt: new Date(loan.updatedAt),
  };
}

const ACTIVE_STATUSES = [LoanStatus.PENDING, LoanStatus.SENT, LoanStatus.RECEIVED, LoanStatus.RETURN_PENDING, LoanStatus.OVERDUE];

/** Return the active loan for an item, if any. */
export function getActiveLoanForItem(loans: Loan[], inventoryItemId: string): Loan | undefined {
  return loans.find(l => l.inventoryItemId === inventoryItemId && ACTIVE_STATUSES.includes(l.status));
}

/** Check if an item is currently on loan. */
export function isItemOnLoan(loans: Loan[], inventoryItemId: string): boolean {
  return getActiveLoanForItem(loans, inventoryItemId) !== undefined;
}

/** Filter and sort a list of loans by the given criteria. */
export function filterLoans(loans: Loan[], filter?: LoanFilter): Loan[] {
  let result = loans;

  if (!filter) return result;

  if (filter.status) {
    result = result.filter(l => l.status === filter.status);
  }
  if (filter.sourceWarehouseId) {
    result = result.filter(l => l.sourceWarehouseId === filter.sourceWarehouseId);
  }
  if (filter.destinationWarehouseId) {
    result = result.filter(l => l.destinationWarehouseId === filter.destinationWarehouseId);
  }
  if (filter.inventoryItemId) {
    result = result.filter(l => l.inventoryItemId === filter.inventoryItemId);
  }
  if (filter.overdue) {
    result = result.filter(l => l.status === LoanStatus.OVERDUE);
  }
  if (filter.dateFrom) {
    result = result.filter(l => l.loanDate >= filter.dateFrom!);
  }
  if (filter.dateTo) {
    result = result.filter(l => l.loanDate <= filter.dateTo!);
  }

  return result.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
}
