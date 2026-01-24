import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { Loan, LoanStatus } from '../../interfaces/loan.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    TranslateModule
  ],
  template: `
    <div class="min-h-screen bg-surface p-6">
      <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'LOANS.TITLE' | translate }}</h1>
              <p class="text-slate-500 text-lg">{{ 'LOANS.SUBTITLE' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="exportToCSV()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-medium">
                <lucide-icon name="Download" class="!w-5 !h-5"></lucide-icon>
                {{ 'COMMON.EXPORT' | translate }}
              </button>
              <button
                (click)="openNewLoanDialog()"
                class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
                <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
                {{ 'LOANS.NEW_LOAN' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.ACTIVE' | translate }}</p>
                <p class="text-2xl font-bold text-foreground">{{ stats().totalActive }}</p>
              </div>
              <div class="bg-sky-950/50 p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-sky-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.OVERDUE' | translate }}</p>
                <p class="text-2xl font-bold text-red-400">{{ stats().totalOverdue }}</p>
              </div>
              <div class="bg-red-950/50 p-3 rounded-lg">
                <lucide-icon name="AlertTriangle" class="!text-red-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.DUE_SOON' | translate }}</p>
                <p class="text-2xl font-bold text-amber-400">{{ stats().dueSoon }}</p>
              </div>
              <div class="bg-amber-950/50 p-3 rounded-lg">
                <lucide-icon name="Clock" class="!text-amber-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
          <div class="bg-surface-variant border border-theme rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ 'LOANS.RETURNED' | translate }}</p>
                <p class="text-2xl font-bold text-emerald-400">{{ stats().totalReturned }}</p>
              </div>
              <div class="bg-emerald-950/50 p-3 rounded-lg">
                <lucide-icon name="CheckCircle2" class="!text-emerald-400 !w-5 !h-5"></lucide-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-8">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="applyFilters()"
                  [placeholder]="'LOANS.SEARCH_PLACEHOLDER' | translate"
                  class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                />
                <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-slate-500 !w-5 !h-5"></lucide-icon>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="lg:w-48">
              <select
                [(ngModel)]="selectedStatus"
                (ngModelChange)="applyFilters()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all cursor-pointer appearance-none"
                style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem; padding-right: 2.5rem;"
              >
                <option value="all">{{ 'LOANS.ALL_STATUS' | translate }}</option>
                <option [value]="LoanStatus.ACTIVE">{{ 'LOANS.STATUS.ACTIVE' | translate }}</option>
                <option [value]="LoanStatus.OVERDUE">{{ 'LOANS.STATUS.OVERDUE' | translate }}</option>
                <option [value]="LoanStatus.RETURNED">{{ 'LOANS.STATUS.RETURNED' | translate }}</option>
              </select>
            </div>

            @if (hasFilters()) {
              <button
                (click)="clearFilters()"
                class="bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
                <lucide-icon name="X" class="!w-4 !h-4"></lucide-icon>
                {{ 'COMMON.CLEAR' | translate }}
              </button>
            }
          </div>
        </div>

        <!-- Loans List -->
        <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.LIST' | translate }}</h2>
          </div>

          <!-- Desktop Table -->
          <div class="hidden lg:block overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-[#141414]">
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.ITEM' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'DASHBOARD.TABLE.QUANTITY' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'LOANS.DUE_DATE' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1e1e1e]">
                @for (loan of paginatedLoans(); track loan.id) {
                  <tr class="hover:bg-[#1e1e1e] transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                        @if (loan.inventoryItemServiceTag) {
                          <p class="text-slate-500 text-sm">{{ loan.inventoryItemServiceTag }}</p>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 text-foreground">{{ loan.quantity }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-slate-500 !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.sourceWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <lucide-icon name="Warehouse" class="!text-[#4d7c6f] !w-4 !h-4"></lucide-icon>
                        <span class="text-foreground">{{ loan.destinationWarehouseName }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getDueDateClass(loan)">{{ formatDate(loan.dueDate) }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClass(loan.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                        {{ getStatusLabel(loan.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      @if (loan.status !== LoanStatus.RETURNED) {
                        <button
                          (click)="returnLoan(loan)"
                          class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm">
                          <lucide-icon name="CornerDownLeft" class="!w-3.5 !h-3.5"></lucide-icon>
                          {{ 'LOANS.RETURN' | translate }}
                        </button>
                      } @else {
                        <span class="text-slate-500 text-sm">{{ formatDate(loan.returnDate!) }}</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-6 py-16 text-center">
                      <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                      <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
                      <p class="text-slate-600">{{ 'LOANS.NO_LOANS_DESC' | translate }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="lg:hidden divide-y divide-[#1e1e1e]">
            @for (loan of paginatedLoans(); track loan.id) {
              <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-foreground font-medium">{{ loan.inventoryItemName }}</p>
                    <p class="text-slate-500 text-sm">
                      {{ 'DASHBOARD.TABLE.QUANTITY' | translate }}: {{ loan.quantity }}
                      @if (loan.inventoryItemServiceTag) {
                        · {{ loan.inventoryItemServiceTag }}
                      }
                    </p>
                  </div>
                  <span [class]="getStatusClass(loan.status)" class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusLabel(loan.status) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-slate-500">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.sourceWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'LOANS.DEST_WAREHOUSE' | translate }}</p>
                    <p class="text-foreground">{{ loan.destinationWarehouseName }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500">{{ 'LOANS.DUE_DATE' | translate }}</p>
                    <p [class]="getDueDateClass(loan)">{{ formatDate(loan.dueDate) }}</p>
                  </div>
                </div>
                @if (loan.status !== LoanStatus.RETURNED) {
                  <button
                    (click)="returnLoan(loan)"
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
                    <lucide-icon name="CornerDownLeft" class="!w-3.5 !h-3.5"></lucide-icon>
                    {{ 'LOANS.RETURN' | translate }}
                  </button>
                }
              </div>
            } @empty {
              <div class="p-8 text-center">
                <lucide-icon name="ClipboardList" class="!w-14 !h-14 !text-slate-700 mb-4"></lucide-icon>
                <h3 class="text-lg font-semibold text-slate-400 mb-2">{{ 'LOANS.NO_LOANS' | translate }}</h3>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (filteredLoans().length > pageSize) {
            <div class="border-t border-theme px-4 py-2">
              <mat-paginator
                [length]="filteredLoans().length"
                [pageIndex]="pageIndex"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 25, 50]"
                (page)="onPageChange($event)"
                showFirstLastButtons
                class="!bg-transparent">
              </mat-paginator>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- New Loan Dialog -->
    @if (showNewLoanDialog) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeNewLoanDialog()">
        <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-lg" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-theme">
            <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.NEW_LOAN' | translate }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ 'LOANS.NEW_LOAN_DESC' | translate }}</p>
          </div>
          <div class="p-6 space-y-4">
            <!-- Source Warehouse Select -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.SOURCE_WAREHOUSE' | translate }} *</label>
              <select
                [ngModel]="selectedSourceWarehouseId()"
                (ngModelChange)="onSourceWarehouseChange($event)"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f]"
              >
                <option value="">{{ 'LOANS.SELECT_SOURCE_WAREHOUSE' | translate }}</option>
                @for (warehouse of warehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Destination Warehouse Select -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.DEST_WAREHOUSE' | translate }} *</label>
              <select
                [ngModel]="selectedDestWarehouseId()"
                (ngModelChange)="selectedDestWarehouseId.set($event)"
                [disabled]="!selectedSourceWarehouseId()"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] disabled:opacity-50"
              >
                <option value="">{{ 'LOANS.SELECT_DEST_WAREHOUSE' | translate }}</option>
                @for (warehouse of destinationWarehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.DUE_DATE' | translate }} *</label>
              <input
                type="date"
                [ngModel]="selectedDueDate()"
                (ngModelChange)="selectedDueDate.set($event)"
                [min]="minDate"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f]"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'LOANS.NOTES' | translate }}</label>
              <textarea
                [ngModel]="selectedNotes()"
                (ngModelChange)="selectedNotes.set($event)"
                rows="2"
                class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none"
                [placeholder]="'LOANS.NOTES_PLACEHOLDER' | translate"
              ></textarea>
            </div>

            <!-- Items Section -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-slate-400">
                  {{ 'TRANSACTION.ITEMS' | translate }} *
                </label>
                <button
                  type="button"
                  (click)="addLoanItem()"
                  class="text-sm text-[#4d7c6f] hover:text-[#5d8c7f] flex items-center gap-1">
                  <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                  {{ 'TRANSACTION.ADD_ITEM' | translate }}
                </button>
              </div>

              <div class="space-y-3">
                @for (item of loanItems(); track $index; let i = $index) {
                  <div class="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-1 space-y-3">
                        <select
                          [ngModel]="item.inventoryItemId"
                          (ngModelChange)="updateLoanItemId(i, $event)"
                          class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
                          <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                          @for (invItem of getItemsForLoan(); track invItem.id) {
                            <option [value]="invItem.id" [disabled]="isItemAlreadySelected(invItem.id, i)">
                              {{ invItem.name }} ({{ invItem.quantity }} {{ 'TRANSACTION.AVAILABLE' | translate }})
                            </option>
                          }
                        </select>
                        <div class="flex gap-3">
                          <input
                            type="number"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateLoanItemQuantity(i, $event)"
                            min="1"
                            class="w-24 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors"
                            [placeholder]="'TRANSACTION.QTY_PLACEHOLDER' | translate"
                          />
                          <input
                            type="text"
                            [ngModel]="item.notes"
                            (ngModelChange)="updateLoanItemNotes(i, $event)"
                            class="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
                            [placeholder]="'TRANSACTION.NOTES_OPTIONAL' | translate"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="removeLoanItem(i)"
                        class="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors">
                        <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (loanItems().length === 0) {
                <p class="text-slate-500 text-sm text-center py-4">{{ 'TRANSACTION.NO_ITEMS' | translate }}</p>
              }
            </div>
          </div>
          <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
            <button
              (click)="closeNewLoanDialog()"
              class="px-4 py-2 text-slate-400 hover:text-foreground transition-colors">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button
              (click)="createLoan()"
              [disabled]="!canCreateLoan()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg transition-all">
              {{ 'LOANS.CREATE_LOAN' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class LoansComponent implements OnInit {
  private loanService = inject(LoanService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  // Expose enum
  LoanStatus = LoanStatus;

  // Filter state
  searchQuery = '';
  selectedStatus = 'all';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  // Dialog state
  showNewLoanDialog = false;

  // Form signals for reactivity
  selectedSourceWarehouseId = signal('');
  selectedDestWarehouseId = signal('');
  selectedDueDate = signal('');
  selectedNotes = signal('');

  // Items array (like transaction form)
  loanItems = signal<{ inventoryItemId: string; quantity: number; notes: string }[]>([]);

  // Computed
  stats = computed(() => this.loanService.stats());
  warehouses = computed(() => this.warehouseService.warehouses());

  // Destination warehouses (excludes source)
  destinationWarehouses = computed(() => {
    const all = this.warehouseService.warehouses();
    const sourceId = this.selectedSourceWarehouseId();
    return all.filter(w => w.id !== sourceId);
  });

  // Get items for loan dropdown (items from source warehouse, not on loan)
  getItemsForLoan() {
    const sourceId = this.selectedSourceWarehouseId();
    const items = this.inventoryService.items();

    if (!sourceId) {
      return items.filter(item => !this.loanService.isItemOnLoan(item.id));
    }

    return items.filter(item =>
      item.warehouseId === sourceId &&
      !this.loanService.isItemOnLoan(item.id)
    );
  }

  // Filtered loans
  private filteredLoansSignal = signal<Loan[]>([]);
  filteredLoans = computed(() => this.filteredLoansSignal());

  // Paginated loans
  paginatedLoans = computed(() => {
    const loans = this.filteredLoansSignal();
    const start = this.pageIndex * this.pageSize;
    return loans.slice(start, start + this.pageSize);
  });

  // Min date for due date picker (tomorrow)
  minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  ngOnInit(): void {
    this.warehouseService.getAll().subscribe();
    this.loanService.loadLoans();
    // Apply filters after data loads
    this.applyFilters();
  }

  applyFilters(): void {
    let loans = this.loanService.loans();

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      loans = loans.filter(loan =>
        loan.inventoryItemName.toLowerCase().includes(query) ||
        loan.sourceWarehouseName.toLowerCase().includes(query) ||
        loan.destinationWarehouseName.toLowerCase().includes(query) ||
        (loan.inventoryItemServiceTag?.toLowerCase().includes(query) ?? false)
      );
    }

    // Status filter
    if (this.selectedStatus !== 'all') {
      loans = loans.filter(loan => loan.status === this.selectedStatus);
    }

    // Sort by loan date descending
    loans = loans.sort((a, b) => b.loanDate.getTime() - a.loanDate.getTime());

    this.filteredLoansSignal.set(loans);
    this.pageIndex = 0;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return this.searchQuery !== '' || this.selectedStatus !== 'all';
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  openNewLoanDialog(): void {
    this.selectedSourceWarehouseId.set('');
    this.selectedDestWarehouseId.set('');
    this.selectedDueDate.set('');
    this.selectedNotes.set('');
    this.loanItems.set([]);
    this.showNewLoanDialog = true;
  }

  closeNewLoanDialog(): void {
    this.showNewLoanDialog = false;
  }

  onSourceWarehouseChange(warehouseId: string): void {
    this.selectedSourceWarehouseId.set(warehouseId);
    // Reset items and destination when source changes
    this.loanItems.set([]);
    this.selectedDestWarehouseId.set('');
  }

  // Add empty item row
  addLoanItem(): void {
    this.loanItems.update(items => [...items, { inventoryItemId: '', quantity: 1, notes: '' }]);
  }

  // Update item ID
  updateLoanItemId(index: number, itemId: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  // Update item quantity
  updateLoanItemQuantity(index: number, quantity: number): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  // Update item notes
  updateLoanItemNotes(index: number, notes: string): void {
    this.loanItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], notes };
      return newItems;
    });
  }

  // Remove item row
  removeLoanItem(index: number): void {
    this.loanItems.update(items => items.filter((_, i) => i !== index));
  }

  // Check if item is already selected in another row
  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.loanItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  canCreateLoan(): boolean {
    const items = this.loanItems();
    const hasValidItems = items.length > 0 && items.every(item => item.inventoryItemId);
    return hasValidItems &&
           !!this.selectedSourceWarehouseId() &&
           !!this.selectedDestWarehouseId() &&
           !!this.selectedDueDate() &&
           this.selectedSourceWarehouseId() !== this.selectedDestWarehouseId();
  }

  createLoan(): void {
    if (!this.canCreateLoan()) return;

    const items = this.loanItems().filter(item => item.inventoryItemId);
    const generalNotes = this.selectedNotes();
    let successCount = 0;
    let completedCount = 0;

    // Create a loan for each selected item
    for (const item of items) {
      // Combine general notes with item-specific notes
      const notes = [generalNotes, item.notes].filter(n => n).join(' - ') || undefined;

      this.loanService.createLoan({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        sourceWarehouseId: this.selectedSourceWarehouseId(),
        destinationWarehouseId: this.selectedDestWarehouseId(),
        dueDate: this.selectedDueDate(),
        notes
      }).subscribe({
        next: (result) => {
          if (result) {
            successCount++;
          }
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        },
        error: () => {
          completedCount++;
          this.checkAllCompleted(completedCount, items.length, successCount);
        }
      });
    }
  }

  private checkAllCompleted(completed: number, total: number, successCount: number): void {
    if (completed === total) {
      if (successCount > 0) {
        const message = successCount === 1
          ? this.translate.instant('LOANS.LOAN_CREATED')
          : this.translate.instant('LOANS.LOANS_CREATED', { count: successCount });
        this.notifications.success(message);
        this.closeNewLoanDialog();
        this.applyFilters();
      } else {
        this.notifications.error(this.translate.instant('LOANS.LOAN_ERROR'));
      }
    }
  }

  returnLoan(loan: Loan): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('LOANS.CONFIRM_RETURN_TITLE'),
        message: this.translate.instant('LOANS.CONFIRM_RETURN_MESSAGE', {
          item: loan.inventoryItemName,
          from: loan.destinationWarehouseName,
          to: loan.sourceWarehouseName
        }),
        confirmText: this.translate.instant('LOANS.RETURN'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'info'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.loanService.returnLoan(loan.id).subscribe({
          next: () => {
            this.notifications.success(this.translate.instant('LOANS.RETURN_SUCCESS'));
            this.applyFilters();
          },
          error: () => {
            this.notifications.error(this.translate.instant('LOANS.RETURN_ERROR'));
          }
        });
      }
    });
  }

  getStatusLabel(status: LoanStatus): string {
    const labels: Record<LoanStatus, string> = {
      [LoanStatus.ACTIVE]: this.translate.instant('LOANS.STATUS.ACTIVE'),
      [LoanStatus.OVERDUE]: this.translate.instant('LOANS.STATUS.OVERDUE'),
      [LoanStatus.RETURNED]: this.translate.instant('LOANS.STATUS.RETURNED')
    };
    return labels[status] || status;
  }

  getStatusClass(status: LoanStatus): string {
    const classes: Record<LoanStatus, string> = {
      [LoanStatus.ACTIVE]: 'bg-sky-950/50 text-sky-400 border border-sky-900',
      [LoanStatus.OVERDUE]: 'bg-red-950/50 text-red-400 border border-red-900',
      [LoanStatus.RETURNED]: 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'
    };
    return classes[status] || 'bg-slate-800 text-slate-400';
  }

  getDueDateClass(loan: Loan): string {
    if (loan.status === LoanStatus.RETURNED) return 'text-slate-400';
    if (loan.status === LoanStatus.OVERDUE) return 'text-red-400 font-medium';

    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3) return 'text-amber-400 font-medium';
    if (daysUntilDue <= 7) return 'text-yellow-400';
    return 'text-foreground';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  exportToCSV(): void {
    this.loanService.exportToCSV(this.filteredLoans());
  }
}
