import { Loan, LoanItem, LoanStatus, LoanFilter, RawLoan } from '../interfaces/loan.interface';

const VALID_LOAN_STATUSES: readonly LoanStatus[] = [
  LoanStatus.PENDING,
  LoanStatus.SENT,
  LoanStatus.RECEIVED,
  LoanStatus.RETURN_PENDING,
  LoanStatus.RETURNED,
  LoanStatus.OVERDUE,
  LoanStatus.CANCELLED,
  LoanStatus.ACTIVE,
];

function toLoanStatus(value: string): LoanStatus {
  if (VALID_LOAN_STATUSES.includes(value as LoanStatus)) {
    return value as LoanStatus;
  }
  return LoanStatus.PENDING;
}

/** Transform a raw backend loan response into the frontend Loan model. */
export function transformLoan(loan: RawLoan): Loan {
  const items: LoanItem[] = (loan.items ?? []).map((li) => ({
    id: li.id,
    inventoryItemId: li.inventoryItemId,
    inventoryItemName: li.inventoryItem?.name || '',
    inventoryItemServiceTag: li.inventoryItem?.serviceTag ?? undefined,
    quantity: li.quantity,
    notes: li.notes ?? undefined,
  }));

  return {
    id: loan.id,
    name: loan.name ?? undefined,
    items,
    sourceWarehouseId: loan.sourceWarehouseId,
    sourceWarehouseName: loan.sourceWarehouse?.name || '',
    destinationWarehouseId: loan.destinationWarehouseId,
    destinationWarehouseName: loan.destinationWarehouse?.name || '',
    loanDate: new Date(loan.loanDate),
    dueDate: new Date(loan.dueDate),
    returnDate: loan.returnDate ? new Date(loan.returnDate) : undefined,
    status: toLoanStatus(loan.status),
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

/** Return the active loan that contains the given item, if any. */
export function getActiveLoanForItem(loans: Loan[], inventoryItemId: string): Loan | undefined {
  return loans.find(
    (l) => ACTIVE_STATUSES.includes(l.status) && l.items.some((i) => i.inventoryItemId === inventoryItemId),
  );
}

/** Check if an item is currently on loan. */
export function isItemOnLoan(loans: Loan[], inventoryItemId: string): boolean {
  return getActiveLoanForItem(loans, inventoryItemId) !== undefined;
}

/** Filter and sort a list of loans by the given criteria. */
export function filterLoans(loans: Loan[], filter?: LoanFilter): Loan[] {
  let result = loans;

  if (!filter) return result;

  const effectiveStatus = filter.overdue ? LoanStatus.OVERDUE : filter.status;
  if (effectiveStatus) {
    result = result.filter((l) => l.status === effectiveStatus);
  }
  if (filter.sourceWarehouseId) {
    result = result.filter((l) => l.sourceWarehouseId === filter.sourceWarehouseId);
  }
  if (filter.destinationWarehouseId) {
    result = result.filter((l) => l.destinationWarehouseId === filter.destinationWarehouseId);
  }
  if (filter.inventoryItemId) {
    result = result.filter((l) => l.items.some((i) => i.inventoryItemId === filter.inventoryItemId));
  }
  if (filter.dateFrom) {
    result = result.filter((l) => l.loanDate >= filter.dateFrom!);
  }
  if (filter.dateTo) {
    result = result.filter((l) => l.loanDate <= filter.dateTo!);
  }

  return result.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
}

/** Summary text for a loan's items: "Laptop x2; Mouse x1" or single item name. */
export function summarizeLoanItems(loan: Loan): string {
  if (!loan.items.length) return '';
  return loan.items
    .map((i) => (i.quantity > 1 ? `${i.inventoryItemName} ×${i.quantity}` : i.inventoryItemName))
    .join('; ');
}

/** Total quantity across all items in a loan. */
export function totalLoanQuantity(loan: Loan): number {
  return loan.items.reduce((sum, i) => sum + i.quantity, 0);
}
