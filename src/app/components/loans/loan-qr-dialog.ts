import { Component, signal, inject, output, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoanService } from '../../services/loan.service';
import { NotificationService } from '../../services/notification.service';
import { Loan } from '../../interfaces/loan.interface';

// ==================== QR Code Display Dialog ====================

/** Data required to display a QR code */
export interface LoanQrData {
  loan: Loan;
  type: 'send' | 'return';
  qrDataUrl: string | null;
}

@Component({
  selector: 'app-loan-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">
            {{ type() === 'send' ? ('LOANS.QR.SEND_TITLE' | translate) : ('LOANS.QR.RETURN_TITLE' | translate) }}
          </h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">
            {{ type() === 'send' ? ('LOANS.QR.SEND_INSTRUCTIONS' | translate) : ('LOANS.QR.RETURN_INSTRUCTIONS' | translate) }}
          </p>
        </div>
        <div class="p-6 flex flex-col items-center">
          @if (qrDataUrl()) {
            <div class="bg-white p-4 rounded-lg mb-4">
              <img [src]="qrDataUrl()" alt="QR Code" class="w-56 h-56 block" />
            </div>
            <p class="text-foreground font-medium text-center mb-1">{{ loan()?.inventoryItemName }}</p>
            <p class="text-[var(--color-on-surface-variant)] text-sm text-center">
              {{ loan()?.sourceWarehouseName }} → {{ loan()?.destinationWarehouseName }}
            </p>
          } @else {
            <div class="w-64 h-64 flex items-center justify-center bg-[var(--color-surface-elevated)] rounded-lg mb-4">
              <lucide-icon name="Loader2" class="!w-8 !h-8 !text-[var(--color-on-surface-variant)] animate-spin"></lucide-icon>
            </div>
            <p class="text-[var(--color-on-surface-variant)] text-sm">Cargando QR...</p>
          }
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="printQrCode()"
            class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <lucide-icon name="Printer" class="!w-4 !h-4 !text-current"></lucide-icon>
            <span>{{ 'LOANS.QR.PRINT' | translate }}</span>
          </button>
          <button
            (click)="downloadQrCode()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <lucide-icon name="Download" class="!w-4 !h-4 !text-white"></lucide-icon>
            <span>{{ 'LOANS.QR.DOWNLOAD' | translate }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoanQrDialog {
  /** The loan being displayed */
  loan = input<Loan | null>(null);

  /** The QR dialog type (send or return) */
  type = input<'send' | 'return'>('send');

  /** The QR data URL (base64 image) */
  qrDataUrl = input<string | null>(null);

  /** Emits when the dialog should close */
  closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  printQrCode(): void {
    const dataUrl = this.qrDataUrl();
    const currentLoan = this.loan();
    if (!dataUrl || !currentLoan) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${currentLoan.inventoryItemName}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              img { max-width: 300px; }
              h2 { margin-bottom: 5px; }
              p { color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Code" />
            <h2>${currentLoan.inventoryItemName}</h2>
            <p>${currentLoan.sourceWarehouseName} → ${currentLoan.destinationWarehouseName}</p>
            <p>${this.type() === 'send' ? 'Scan to confirm receipt' : 'Scan to confirm return'}</p>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  downloadQrCode(): void {
    const dataUrl = this.qrDataUrl();
    const currentLoan = this.loan();
    if (!dataUrl || !currentLoan) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${this.type()}-${currentLoan.id}.png`;
    link.click();
  }
}

// ==================== Scan QR Dialog ====================

/** Result emitted when QR scan is processed successfully */
export interface ScanQrResult {
  success: boolean;
}

@Component({
  selector: 'app-loan-scan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 class="text-xl font-semibold text-foreground">{{ 'LOANS.QR.SCAN_TITLE' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'LOANS.QR.SCAN_INSTRUCTIONS' | translate }}</p>
        </div>
        <div class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">QR Code Data</label>
            <textarea
              [(ngModel)]="scannedQrData"
              rows="4"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none font-mono text-sm"
              placeholder="Paste QR code data here..."
            ></textarea>
          </div>
          <p class="text-[var(--color-on-surface-variant)] text-xs">
            Scan the QR code with your device camera or paste the scanned data above.
          </p>
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="close()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="processScannedQr()"
            [disabled]="!scannedQrData"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-surface-elevated)] disabled:text-[var(--color-on-surface-variant)] text-white px-6 py-2 rounded-lg transition-all">
            {{ 'COMMON.CONFIRM' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoanScanDialog {
  private loanService = inject(LoanService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  /** Emits when the dialog should close */
  closed = output<void>();

  /** Emits when QR was scanned and processed successfully */
  scanned = output<ScanQrResult>();

  scannedQrData = '';

  close(): void {
    this.scannedQrData = '';
    this.closed.emit();
  }

  processScannedQr(): void {
    if (!this.scannedQrData) return;

    this.loanService.scanQr(this.scannedQrData).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('LOANS.QR.SCAN_SUCCESS'));
          this.scannedQrData = '';
          this.scanned.emit({ success: true });
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('LOANS.QR.SCAN_ERROR'));
      }
    });
  }
}
