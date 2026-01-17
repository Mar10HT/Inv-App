import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Loan,
  LoanStatus,
  CreateLoanDto,
  ReturnLoanDto,
  LoanStats
} from '../interfaces/loan.interface';
import { AuthService } from './auth.service';

interface LoanApiResponse {
  id: string;
  inventoryItemId: string;
  quantity: number;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: LoanStatus;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    name: string;
    serviceTag?: string;
    quantity: number;
  };
  sourceWarehouse: {
    id: string;
    name: string;
    location: string;
  };
  destinationWarehouse: {
    id: string;
    name: string;
    location: string;
  };
  createdBy: {
    id: string;
    email: string;
    name?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/loans`;

  private loansSignal = signal<Loan[]>([]);
  private loadingSignal = signal(false);
  private statsSignal = signal<LoanStats>({
    totalActive: 0,
    totalOverdue: 0,
    totalReturned: 0,
    dueSoon: 0
  });

  loans = computed(() => this.loansSignal());
  loading = computed(() => this.loadingSignal());
  stats = computed(() => this.statsSignal());

  // Active loans only
  activeLoans = computed(() =>
    this.loansSignal().filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE)
  );

  // Overdue loans
  overdueLoans = computed(() =>
    this.loansSignal().filter(l => l.status === LoanStatus.OVERDUE)
  );

  /**
   * Map API response to frontend Loan interface
   */
  private mapLoan(apiLoan: LoanApiResponse): Loan {
    return {
      id: apiLoan.id,
      inventoryItemId: apiLoan.inventoryItemId,
      inventoryItemName: apiLoan.inventoryItem.name,
      inventoryItemServiceTag: apiLoan.inventoryItem.serviceTag,
      quantity: apiLoan.quantity,
      sourceWarehouseId: apiLoan.sourceWarehouseId,
      sourceWarehouseName: apiLoan.sourceWarehouse.name,
      destinationWarehouseId: apiLoan.destinationWarehouseId,
      destinationWarehouseName: apiLoan.destinationWarehouse.name,
      loanDate: new Date(apiLoan.loanDate),
      dueDate: new Date(apiLoan.dueDate),
      returnDate: apiLoan.returnDate ? new Date(apiLoan.returnDate) : undefined,
      status: apiLoan.status,
      notes: apiLoan.notes,
      createdById: apiLoan.createdById,
      createdByName: apiLoan.createdBy.name || apiLoan.createdBy.email,
      createdAt: new Date(apiLoan.createdAt),
      updatedAt: new Date(apiLoan.updatedAt)
    };
  }

  /**
   * Get all loans
   */
  getAll(): Observable<Loan[]> {
    this.loadingSignal.set(true);

    return this.http.get<LoanApiResponse[]>(this.apiUrl).pipe(
      map(loans => loans.map(loan => this.mapLoan(loan))),
      tap({
        next: (loans) => {
          this.loansSignal.set(loans);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.loadingSignal.set(false);
        }
      })
    );
  }

  /**
   * Get loan stats
   */
  getStats(): Observable<LoanStats> {
    return this.http.get<LoanStats>(`${this.apiUrl}/stats`).pipe(
      tap(stats => this.statsSignal.set(stats))
    );
  }

  /**
   * Load all data (loans + stats)
   */
  loadAll(): void {
    this.getAll().subscribe();
    this.getStats().subscribe();
    this.checkOverdueLoans();
  }

  /**
   * Check and update overdue loans
   */
  checkOverdueLoans(): void {
    this.http.post<any>(`${this.apiUrl}/check-overdue`, {}).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      // Refresh data after checking
      this.getAll().subscribe();
      this.getStats().subscribe();
    });
  }

  /**
   * Create a new loan
   */
  createLoan(dto: CreateLoanDto): Observable<Loan> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const payload = {
      inventoryItemId: dto.inventoryItemId,
      quantity: dto.quantity,
      sourceWarehouseId: dto.sourceWarehouseId,
      destinationWarehouseId: dto.destinationWarehouseId,
      dueDate: typeof dto.dueDate === 'string' ? dto.dueDate : dto.dueDate.toISOString(),
      createdById: user.id,
      notes: dto.notes
    };

    return this.http.post<LoanApiResponse>(this.apiUrl, payload).pipe(
      map(loan => this.mapLoan(loan)),
      tap(loan => {
        this.loansSignal.update(loans => [loan, ...loans]);
        this.getStats().subscribe();
      })
    );
  }

  /**
   * Return a loan
   */
  returnLoan(loanId: string, dto?: ReturnLoanDto): Observable<Loan> {
    const payload = dto ? {
      returnDate: dto.returnDate ?
        (typeof dto.returnDate === 'string' ? dto.returnDate : dto.returnDate.toISOString())
        : undefined,
      notes: dto.notes
    } : {};

    return this.http.patch<LoanApiResponse>(`${this.apiUrl}/${loanId}/return`, payload).pipe(
      map(loan => this.mapLoan(loan)),
      tap(updatedLoan => {
        this.loansSignal.update(loans =>
          loans.map(l => l.id === loanId ? updatedLoan : l)
        );
        this.getStats().subscribe();
      })
    );
  }

  /**
   * Get loan by ID
   */
  getLoanById(id: string): Observable<Loan> {
    return this.http.get<LoanApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(loan => this.mapLoan(loan))
    );
  }

  /**
   * Get loans for a specific item
   */
  getLoansForItem(inventoryItemId: string): Observable<Loan[]> {
    return this.http.get<LoanApiResponse[]>(`${this.apiUrl}/item/${inventoryItemId}`).pipe(
      map(loans => loans.map(loan => this.mapLoan(loan)))
    );
  }

  /**
   * Get loans for a specific warehouse
   */
  getLoansForWarehouse(warehouseId: string): Observable<Loan[]> {
    return this.http.get<LoanApiResponse[]>(`${this.apiUrl}/warehouse/${warehouseId}`).pipe(
      map(loans => loans.map(loan => this.mapLoan(loan)))
    );
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
   * Check if an item is on loan (API call)
   */
  checkItemOnLoan(inventoryItemId: string): Observable<boolean> {
    return this.http.get<{ onLoan: boolean }>(`${this.apiUrl}/check-item/${inventoryItemId}`).pipe(
      map(response => response.onLoan)
    );
  }

  /**
   * Delete a loan (admin only)
   */
  deleteLoan(loanId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${loanId}`).pipe(
      tap(() => {
        this.loansSignal.update(loans => loans.filter(l => l.id !== loanId));
        this.getStats().subscribe();
      })
    );
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
}
