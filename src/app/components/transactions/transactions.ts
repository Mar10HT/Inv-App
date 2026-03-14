import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';

import { TransactionService } from '../../services/transaction.service';
import { NotificationService } from '../../services/notification.service';
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
    TranslateModule,
    NgxPermissionsModule
  ],
  templateUrl: './transactions.html'
})
export class Transactions implements OnInit {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

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
    this.transactionService.getAll().subscribe({
      error: (err) => this.notifications.handleError(err)
    });
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
        this.notifications.created('NOTIFICATIONS.ENTITIES.TRANSACTION');
      }
    });
  }

  deleteTransaction(transaction: Transaction): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('TRANSACTION.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('TRANSACTION.DELETE_CONFIRM.MESSAGE'),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.transactionService.delete(transaction.id).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.TRANSACTION');
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.TRANSACTION');
          }
        });
      }
    });
  }

  getTypeBadgeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.IN:
        return 'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border-[var(--color-success-border)]';
      case TransactionType.OUT:
        return 'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border-[var(--color-error-border)]';
      case TransactionType.TRANSFER:
        return 'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border-[var(--color-info-border)]';
      default:
        return 'bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] border-[var(--color-border)]';
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
