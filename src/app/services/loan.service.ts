import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { AuditService } from './audit.service';
import { InventoryService } from './inventory/inventory.service';
import { WarehouseService } from './warehouse.service';
import {
  Loan,
  LoanStatus,
  CreateLoanDto,
  ReturnLoanDto,
  LoanFilter,
  LoanStats
} from '../interfaces/loan.interface';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private authService = inject(AuthService);
  private auditService = inject(AuditService);
  private inventoryService = inject(InventoryService);
  private warehouseService = inject(WarehouseService);

  private loansSignal = signal<Loan[]>([]);
  private loadingSignal = signal(false);

  loans = computed(() => this.loansSignal());
  loading = computed(() => this.loadingSignal());

  // Computed stats
  stats = computed<LoanStats>(() => {
    const loans = this.loansSignal();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      totalActive: loans.filter(l => l.status === LoanStatus.ACTIVE).length,
      totalOverdue: loans.filter(l => l.status === LoanStatus.OVERDUE).length,
      totalReturned: loans.filter(l => l.status === LoanStatus.RETURNED).length,
      dueSoon: loans.filter(l =>
        l.status === LoanStatus.ACTIVE &&
        new Date(l.dueDate) <= sevenDaysFromNow &&
        new Date(l.dueDate) > now
      ).length
    };
  });

  // Active loans only
  activeLoans = computed(() =>
    this.loansSignal().filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE)
  );

  // Overdue loans
  overdueLoans = computed(() =>
    this.loansSignal().filter(l => l.status === LoanStatus.OVERDUE)
  );

  constructor() {
    this.loadFromStorage();
    this.checkOverdueLoans();
  }

  /**
   * Load loans from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('loans');
      if (stored) {
        const loans = JSON.parse(stored).map((loan: any) => ({
          ...loan,
          loanDate: new Date(loan.loanDate),
          dueDate: new Date(loan.dueDate),
          returnDate: loan.returnDate ? new Date(loan.returnDate) : undefined,
          createdAt: new Date(loan.createdAt),
          updatedAt: new Date(loan.updatedAt)
        }));
        this.loansSignal.set(loans);
      }
    } catch (e) {
      console.error('Error loading loans:', e);
    }
  }

  /**
   * Save loans to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('loans', JSON.stringify(this.loansSignal()));
    } catch (e) {
      console.error('Error saving loans:', e);
    }
  }

  /**
   * Check and update overdue loans
   */
  checkOverdueLoans(): void {
    const now = new Date();
    let hasChanges = false;

    this.loansSignal.update(loans =>
      loans.map(loan => {
        if (loan.status === LoanStatus.ACTIVE && new Date(loan.dueDate) < now) {
          hasChanges = true;
          return { ...loan, status: LoanStatus.OVERDUE, updatedAt: now };
        }
        return loan;
      })
    );

    if (hasChanges) {
      this.saveToStorage();
    }
  }

  /**
   * Create a new loan (warehouse to warehouse)
   */
  createLoan(dto: CreateLoanDto): Loan | null {
    const user = this.authService.currentUser();
    if (!user) return null;

    // Validate warehouses are different
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      console.error('Source and destination warehouses must be different');
      return null;
    }

    // Get item details
    const items = this.inventoryService.items();
    const item = items.find(i => i.id === dto.inventoryItemId);
    if (!item) return null;

    // Check if item belongs to source warehouse
    if (item.warehouseId !== dto.sourceWarehouseId) {
      console.error('Item does not belong to the source warehouse');
      return null;
    }

    // Check if item is already on loan
    const existingLoan = this.loansSignal().find(
      l => l.inventoryItemId === dto.inventoryItemId &&
           (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE)
    );
    if (existingLoan) {
      console.error('Item is already on loan');
      return null;
    }

    // Get warehouse details
    const warehouses = this.warehouseService.warehouses();
    const sourceWarehouse = warehouses.find(w => w.id === dto.sourceWarehouseId);
    const destinationWarehouse = warehouses.find(w => w.id === dto.destinationWarehouseId);

    if (!sourceWarehouse || !destinationWarehouse) {
      console.error('Invalid warehouse');
      return null;
    }

    const now = new Date();
    const newLoan: Loan = {
      id: this.generateId(),
      inventoryItemId: dto.inventoryItemId,
      inventoryItemName: item.name,
      inventoryItemServiceTag: item.serviceTag,
      quantity: dto.quantity,
      sourceWarehouseId: dto.sourceWarehouseId,
      sourceWarehouseName: sourceWarehouse.name,
      destinationWarehouseId: dto.destinationWarehouseId,
      destinationWarehouseName: destinationWarehouse.name,
      loanDate: now,
      dueDate: new Date(dto.dueDate),
      status: LoanStatus.ACTIVE,
      notes: dto.notes,
      createdById: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    };

    this.loansSignal.update(loans => [newLoan, ...loans]);
    this.saveToStorage();

    // Log audit
    this.auditService.logLoan(
      newLoan.id,
      item.name,
      `${sourceWarehouse.name} → ${destinationWarehouse.name}`,
      'LOAN'
    );

    return newLoan;
  }

  /**
   * Return a loan
   */
  returnLoan(loanId: string, dto?: ReturnLoanDto): Loan | null {
    const loan = this.loansSignal().find(l => l.id === loanId);
    if (!loan) return null;

    if (loan.status === LoanStatus.RETURNED) {
      console.error('Loan is already returned');
      return null;
    }

    const now = new Date();
    const returnDate = dto?.returnDate ? new Date(dto.returnDate) : now;

    const updatedLoan: Loan = {
      ...loan,
      status: LoanStatus.RETURNED,
      returnDate,
      notes: dto?.notes ? `${loan.notes || ''}\n${dto.notes}`.trim() : loan.notes,
      updatedAt: now
    };

    this.loansSignal.update(loans =>
      loans.map(l => l.id === loanId ? updatedLoan : l)
    );
    this.saveToStorage();

    // Log audit
    this.auditService.logLoan(
      loan.id,
      loan.inventoryItemName,
      `${loan.destinationWarehouseName} → ${loan.sourceWarehouseName}`,
      'RETURN'
    );

    return updatedLoan;
  }

  /**
   * Get loan by ID
   */
  getLoanById(id: string): Loan | undefined {
    return this.loansSignal().find(l => l.id === id);
  }

  /**
   * Get loans for a specific item
   */
  getLoansForItem(inventoryItemId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.inventoryItemId === inventoryItemId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get loans from a specific warehouse
   */
  getLoansFromWarehouse(warehouseId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.sourceWarehouseId === warehouseId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get loans to a specific warehouse
   */
  getLoansToWarehouse(warehouseId: string): Loan[] {
    return this.loansSignal()
      .filter(l => l.destinationWarehouseId === warehouseId)
      .sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Get active loan for an item (if any)
   */
  getActiveLoanForItem(inventoryItemId: string): Loan | undefined {
    return this.loansSignal().find(
      l => l.inventoryItemId === inventoryItemId &&
           (l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE)
    );
  }

  /**
   * Check if an item is currently on loan
   */
  isItemOnLoan(inventoryItemId: string): boolean {
    return this.getActiveLoanForItem(inventoryItemId) !== undefined;
  }

  /**
   * Get filtered loans
   */
  getFilteredLoans(filter?: LoanFilter): Loan[] {
    let loans = this.loansSignal();

    if (!filter) return loans;

    if (filter.status) {
      loans = loans.filter(l => l.status === filter.status);
    }

    if (filter.sourceWarehouseId) {
      loans = loans.filter(l => l.sourceWarehouseId === filter.sourceWarehouseId);
    }

    if (filter.destinationWarehouseId) {
      loans = loans.filter(l => l.destinationWarehouseId === filter.destinationWarehouseId);
    }

    if (filter.inventoryItemId) {
      loans = loans.filter(l => l.inventoryItemId === filter.inventoryItemId);
    }

    if (filter.overdue) {
      loans = loans.filter(l => l.status === LoanStatus.OVERDUE);
    }

    if (filter.dateFrom) {
      loans = loans.filter(l => l.loanDate >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      loans = loans.filter(l => l.loanDate <= filter.dateTo!);
    }

    return loans.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());
  }

  /**
   * Delete a loan (admin only)
   */
  deleteLoan(loanId: string): boolean {
    const loan = this.loansSignal().find(l => l.id === loanId);
    if (!loan) return false;

    this.loansSignal.update(loans => loans.filter(l => l.id !== loanId));
    this.saveToStorage();

    return true;
  }

  /**
   * Export loans to CSV
   */
  exportToCSV(loans?: Loan[]): void {
    const data = loans || this.loansSignal();
    const d = ';';

    let csv = `Item${d}Service Tag${d}Cantidad${d}Origen${d}Destino${d}Fecha Préstamo${d}Fecha Devolución${d}Fecha Retorno${d}Estado${d}Notas\n`;

    for (const loan of data) {
      csv += `"${loan.inventoryItemName}"${d}"${loan.inventoryItemServiceTag || ''}"${d}${loan.quantity}${d}"${loan.sourceWarehouseName}"${d}"${loan.destinationWarehouseName}"${d}"${loan.loanDate.toLocaleDateString()}"${d}"${loan.dueDate.toLocaleDateString()}"${d}"${loan.returnDate?.toLocaleDateString() || ''}"${d}"${loan.status}"${d}"${loan.notes || ''}"\n`;
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loans-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  private generateId(): string {
    return 'loan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
