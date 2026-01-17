import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { TransactionService } from '../../services/transaction.service';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { TransactionFormDialog } from './transaction-form-dialog';

@Component({
  selector: 'app-transactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css'
})
export class Transactions implements OnInit {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  transactions = computed(() => this.transactionService.transactions());
  loading = computed(() => this.transactionService.loading());
  error = computed(() => this.transactionService.error());

  TransactionType = TransactionType;

  // Stats
  stats = computed(() => {
    const all = this.transactions();
    return {
      total: all.length,
      inCount: all.filter(t => t.type === TransactionType.IN).length,
      outCount: all.filter(t => t.type === TransactionType.OUT).length,
      transferCount: all.filter(t => t.type === TransactionType.TRANSFER).length
    };
  });

  ngOnInit(): void {
    this.loadTransactions();
  }

  private loadTransactions(): void {
    this.transactionService.getAll().subscribe();
  }

  addTransaction(): void {
    const dialogRef = this.dialog.open(TransactionFormDialog, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'item-detail-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Transaction created successfully', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      }
    });
  }

  deleteTransaction(transaction: Transaction): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Transaction',
        message: `Are you sure you want to delete this transaction? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transactionService.delete(transaction.id).subscribe({
          next: () => {
            this.snackBar.open('Transaction deleted', 'Close', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
          },
          error: (err) => {
            this.snackBar.open(`Error: ${err.message}`, 'Close', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

  getTypeBadgeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN:
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-900';
      case TransactionType.OUT:
        return 'bg-rose-950/50 text-rose-400 border-rose-900';
      case TransactionType.TRANSFER:
        return 'bg-blue-950/50 text-blue-400 border-blue-900';
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
  }

  getTypeIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN:
        return 'ArrowDown';
      case TransactionType.OUT:
        return 'ArrowUp';
      case TransactionType.TRANSFER:
        return 'ArrowLeftRight';
      default:
        return 'Receipt';
    }
  }

  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  trackByFn(index: number, transaction: Transaction): string {
    return transaction.id;
  }
}
