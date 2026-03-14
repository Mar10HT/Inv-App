import { Component, signal, inject, output, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TransferRequestService } from '../../services/transfer-request.service';
import { NotificationService } from '../../services/notification.service';
import { TransferRequest } from '../../interfaces/transfer-request.interface';

// ==================== QR Code Display Dialog ====================

@Component({
  selector: 'app-transfer-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close()">
      <div role="dialog" aria-modal="true" aria-labelledby="transfer-qr-dialog-title" class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="transfer-qr-dialog-title" class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.QR.TITLE' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'TRANSFERS.QR.INSTRUCTIONS' | translate }}</p>
        </div>
        <div class="p-6 flex flex-col items-center">
          @if (qrDataUrl()) {
            <div class="bg-white p-4 rounded-lg mb-4">
              <img [src]="qrDataUrl()" alt="QR Code" class="w-56 h-56 block" />
            </div>
            <p class="text-foreground font-medium text-center mb-1">{{ request()?.items?.length }} Items</p>
            <p class="text-[var(--color-on-surface-variant)] text-sm text-center">
              {{ request()?.sourceWarehouseName }} -> {{ request()?.destinationWarehouseName }}
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
            <span>{{ 'TRANSFERS.QR.PRINT' | translate }}</span>
          </button>
          <button
            (click)="downloadQrCode()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <lucide-icon name="Download" class="!w-4 !h-4 !text-white"></lucide-icon>
            <span>{{ 'TRANSFERS.QR.DOWNLOAD' | translate }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class TransferQrDialog {
  /** The transfer request being displayed */
  request = input<TransferRequest | null>(null);

  /** The QR data URL (base64 image) */
  qrDataUrl = input<string | null>(null);

  /** Emits when the dialog should close */
  closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  printQrCode(): void {
    const dataUrl = this.qrDataUrl();
    const currentRequest = this.request();
    if (!dataUrl || !currentRequest) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Transfer</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              img { max-width: 300px; }
              h2 { margin-bottom: 5px; }
              p { color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Code" />
            <h2>Transfer: ${currentRequest.items.length} Items</h2>
            <p>${currentRequest.sourceWarehouseName} -> ${currentRequest.destinationWarehouseName}</p>
            <p>Scan to confirm receipt</p>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  downloadQrCode(): void {
    const dataUrl = this.qrDataUrl();
    const currentRequest = this.request();
    if (!dataUrl || !currentRequest) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-transfer-${currentRequest.id}.png`;
    link.click();
  }
}

// ==================== Scan QR Dialog ====================

/** Result emitted when QR scan is processed successfully */
export interface TransferScanQrResult {
  success: boolean;
}

@Component({
  selector: 'app-transfer-scan-dialog',
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
      <div role="dialog" aria-modal="true" aria-labelledby="transfer-scan-dialog-title" class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="transfer-scan-dialog-title" class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.QR.SCAN_TITLE' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'TRANSFERS.QR.SCAN_INSTRUCTIONS' | translate }}</p>
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
export class TransferScanDialog {
  private transferService = inject(TransferRequestService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

  /** Emits when the dialog should close */
  closed = output<void>();

  /** Emits when QR was scanned and processed successfully */
  scanned = output<TransferScanQrResult>();

  scannedQrData = '';

  close(): void {
    this.scannedQrData = '';
    this.closed.emit();
  }

  processScannedQr(): void {
    if (!this.scannedQrData) return;

    this.transferService.scanQr(this.scannedQrData).subscribe({
      next: (result) => {
        if (result) {
          this.notifications.success(this.translate.instant('TRANSFERS.QR.SCAN_SUCCESS'));
          this.scannedQrData = '';
          this.scanned.emit({ success: true });
        }
      },
      error: () => {
        this.notifications.error(this.translate.instant('TRANSFERS.QR.SCAN_ERROR'));
      }
    });
  }
}

// ==================== Reject Dialog ====================

/** Result emitted when a rejection is confirmed */
export interface TransferRejectResult {
  reason?: string;
}

@Component({
  selector: 'app-transfer-reject-dialog',
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
      <div role="dialog" aria-modal="true" aria-labelledby="transfer-reject-dialog-title" class="bg-surface-variant border border-theme rounded-xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-theme">
          <h2 id="transfer-reject-dialog-title" class="text-xl font-semibold text-foreground">{{ 'TRANSFERS.REJECT_TITLE' | translate }}</h2>
        </div>
        <div class="p-6">
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'TRANSFERS.REJECT_REASON' | translate }}</label>
          <textarea
            [(ngModel)]="rejectReason"
            rows="3"
            class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
            [placeholder]="'TRANSFERS.REJECT_REASON_PLACEHOLDER' | translate"
          ></textarea>
        </div>
        <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
          <button
            (click)="close()"
            class="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            (click)="confirmReject()"
            class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all">
            {{ 'TRANSFERS.REJECT' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TransferRejectDialog {
  /** The transfer request to reject */
  request = input<TransferRequest | null>(null);

  /** Emits when the dialog should close */
  closed = output<void>();

  /** Emits when rejection is confirmed */
  rejected = output<TransferRejectResult>();

  rejectReason = '';

  close(): void {
    this.rejectReason = '';
    this.closed.emit();
  }

  confirmReject(): void {
    this.rejected.emit({ reason: this.rejectReason || undefined });
    this.rejectReason = '';
  }
}
