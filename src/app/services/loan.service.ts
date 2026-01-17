import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Loan,
  LoanStatus,
  CreateLoanDto,
  ReturnLoanDto,
  LoanFilter,
  LoanStats
} from '../interfaces/loan.interface';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/loans`;

  private loansSignal = signal<Loan[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  loans = computed(() => this.loansSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

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
    this.loadLoans();
  }

  /**
   * Load loans from backend
   */
  loadLoans(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('limit', '1000');

    this.http.get<PaginatedResponse<any>>(this.apiUrl, { params }).pipe(
      map(response => response.data.map((loan: any) => this.transformLoan(loan))),
      catchError(err => {
        console.error('Error loading loans:', err);
        this.errorSignal.set(err.message || 'Error loading loans');
        return of([]);
      })
    ).subscribe(loans => {
      this.loansSignal.set(loans);
      this.loadingSignal.set(false);
    });
  }

  /**
   * Transform backend loan to frontend format
   */
  private transformLoan(loan: any): Loan {
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
      notes: loan.notes,
      createdById: loan.createdById,
      createdByName: loan.createdBy?.name || loan.createdBy?.email || '',
      createdAt: new Date(loan.createdAt),
      updatedAt: new Date(loan.updatedAt)
    };
  }

  /**
   * Create a new loan
   */
  createLoan(dto: CreateLoanDto): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<any>(this.apiUrl, dto).pipe(
      map(loan => this.transformLoan(loan)),
      tap({
        next: (newLoan) => {
          this.loansSignal.update(loans => [newLoan, ...loans]);
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error creating loan');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        console.error('Error creating loan:', err);
        return of(null);
      })
    );
  }

  /**
   * Return a loan
   */
  returnLoan(loanId: string, dto?: ReturnLoanDto): Observable<Loan | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.patch<any>(`${this.apiUrl}/${loanId}/return`, dto || {}).pipe(
      map(loan => this.transformLoan(loan)),
      tap({
        next: (updatedLoan) => {
          this.loansSignal.update(loans =>
            loans.map(l => l.id === loanId ? updatedLoan : l)
          );
          this.loadingSignal.set(false);
        },
        error: (error) => {
          this.errorSignal.set(error.error?.message || error.message || 'Error returning loan');
          this.loadingSignal.set(false);
        }
      }),
      catchError(err => {
        console.error('Error returning loan:', err);
        return of(null);
      })
    );
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
  deleteLoan(loanId: string): Observable<boolean> {
    this.loadingSignal.set(true);

    return this.http.delete<void>(`${this.apiUrl}/${loanId}`).pipe(
      map(() => {
        this.loansSignal.update(loans => loans.filter(l => l.id !== loanId));
        this.loadingSignal.set(false);
        return true;
      }),
      catchError(err => {
        console.error('Error deleting loan:', err);
        this.errorSignal.set(err.message || 'Error deleting loan');
        this.loadingSignal.set(false);
        return of(false);
      })
    );
  }

  /**
   * Check overdue loans on backend
   */
  checkOverdueLoans(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/check-overdue`, {}).pipe(
      tap(() => this.loadLoans())
    );
  }

  /**
   * Get stats from backend
   */
  getStatsFromBackend(): Observable<LoanStats> {
    return this.http.get<LoanStats>(`${this.apiUrl}/stats`);
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

  /**
   * Refresh loans from backend
   */
  refresh(): void {
    this.loadLoans();
  }
}
