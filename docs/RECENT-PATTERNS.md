# Recent Architectural Patterns & Changes

**Last Updated:** 2026-04-03

This guide documents the modern patterns introduced in recent feature development, focusing on Loans and Transfers modules which serve as the canonical examples.

---

## Table of Contents

1. [Dialog Result Types](#dialog-result-types)
2. [Manual Confirm Receipt/Return UI](#manual-confirm-receiptreturn-ui)
3. [Pagination & Filtering Fix](#pagination--filtering-fix)
4. [finalize() Loading State Pattern](#finalize-loading-state-pattern)
5. [takeUntilDestroyed Subscription Teardown](#takeuntildestroyed-subscription-teardown)
6. [effect() with allowSignalWrites](#effect-with-allowsignalwrites)
7. [QR Code Pattern](#qr-code-pattern)

---

## Dialog Result Types

### Pattern Overview

All modal dialogs emit strongly-typed result objects via `output()`:

```typescript
// Define result interface
export interface LoanFormResult {
  success: boolean;
  count: number;  // Number of successfully created loans
}

// In component
export class LoanFormDialog {
  created = output<LoanFormResult>();

  onSuccess(count: number): void {
    this.created.emit({ success: true, count });
  }
}
```

### Usage in Parent Component

```typescript
export class LoansComponent {
  showNewLoanDialog = false;

  onLoanCreated(result: LoanFormResult): void {
    this.closeNewLoanDialog();
    // Filter updates automatically via effect()
    this.applyFilters();
  }
}
```

### Template Binding

```html
<app-loan-form-dialog
  *ngIf="showNewLoanDialog"
  (created)="onLoanCreated($event)"
  (closed)="closeNewLoanDialog()"
/>
```

### Benefits
- **Type Safety:** TypeScript catches result shape mismatches
- **Clarity:** Result interface documents what each dialog returns
- **Flexibility:** Different dialogs can emit different result shapes
- **No Callback Hell:** Each dialog is responsible for its own emit

### Examples in Codebase
- `LoanFormResult` — New loan creation dialog
- `ScanQrResult` — QR code scan dialog
- `TransferScanQrResult` — Transfer QR scan dialog
- `TransferRejectResult` — Transfer rejection dialog

---

## Manual Confirm Receipt/Return UI

### Background

Previously, only QR scanning could confirm loan/transfer receipt. The new pattern adds manual confirmation for users who:
- Don't have QR scanners available
- Prefer explicit confirmation over automation
- Need to handle edge cases

### Loans: Manual Receipt & Return

#### UI Pattern
In the main loans list, each loan row has a context menu with actions per status:

```html
<!-- Loan row in list -->
<tr *ngFor="let loan of pagedLoans()">
  <td>{{ loan.inventoryItemName }}</td>
  <td>
    <span [ngClass]="statusClass(loan.status)">
      {{ 'LOANS.STATUS.' + loan.status | translate }}
    </span>
  </td>
  <td>
    <button (click)="openRowMenu(loan)">
      <lucide-icon name="MoreVertical"></lucide-icon>
    </button>
  </td>
</tr>

<!-- Floating menu appears on click -->
<div *ngIf="menuOpenForLoan === loan.id">
  <!-- For 'sent' status → show "Confirm Receipt" -->
  <button (click)="manualConfirmReceipt(loan)">
    {{ 'LOANS.CONFIRM_RECEIPT' | translate }}
  </button>

  <!-- For 'received' status → show "Confirm Return" -->
  <button (click)="manualConfirmReturn(loan)">
    {{ 'LOANS.CONFIRM_RETURN' | translate }}
  </button>
</div>
```

#### Service Call
```typescript
manualConfirmReceipt(loan: Loan): void {
  if (loan.status !== 'sent') return;

  this.loanService.confirmReceipt(loan.id).subscribe({
    next: () => {
      this.notifications.success(
        this.translate.instant('LOANS.RECEIPT_CONFIRMED')
      );
      this.applyFilters();  // Refresh list
    },
    error: (err) => {
      this.notifications.handleError(err);
    }
  });
}
```

#### API Endpoints
- **Confirm Receipt:** `POST /api/loans/{id}/confirm-receipt`
  - Status: `sent` → `received`
- **Confirm Return:** `POST /api/loans/{id}/confirm-return`
  - Status: `received` → `returned`

### Transfers: Manual Confirm & Reject

#### Status-Based Actions
```typescript
getRowActions(request: TransferRequest): RowAction[] {
  switch (request.status) {
    case 'pending':
      return [
        { label: 'Approve', action: () => this.approve(request) },
        { label: 'Reject', action: () => this.openRejectDialog(request) }
      ];
    case 'approved':
      return [
        { label: 'Confirm Receipt', action: () => this.confirmReceipt(request) },
        { label: 'Reject', action: () => this.openRejectDialog(request) }
      ];
    case 'received':
    case 'rejected':
      return [];  // Terminal states
  }
}
```

#### Rejection Dialog
```typescript
openRejectDialog(request: TransferRequest): void {
  this.showRejectDialog = true;
  this.selectedRequest = request;
}

onRejectConfirmed(result: TransferRejectResult): void {
  if (!this.selectedRequest) return;

  this.transferService.reject(
    this.selectedRequest.id,
    { reason: result.reason }
  ).subscribe({
    next: () => {
      this.notifications.success(
        this.translate.instant('TRANSFERS.REJECTED')
      );
      this.showRejectDialog = false;
      this.applyFilters();
    },
    error: (err) => {
      this.notifications.handleError(err);
    }
  });
}
```

#### Transfer Rejection Dialog Component
```typescript
@Component({
  selector: 'app-transfer-reject-dialog',
  template: `
    <div class="modal">
      <h2>{{ 'TRANSFERS.REJECT_TITLE' | translate }}</h2>
      <textarea
        [(ngModel)]="rejectReason"
        [placeholder]="'TRANSFERS.REJECT_REASON_PLACEHOLDER' | translate"
      ></textarea>
      <button (click)="confirmReject()" class="bg-red-600">
        {{ 'TRANSFERS.REJECT' | translate }}
      </button>
    </div>
  `
})
export class TransferRejectDialog {
  request = input<TransferRequest | null>(null);
  rejected = output<TransferRejectResult>();
  rejectReason = '';

  confirmReject(): void {
    this.rejected.emit({ reason: this.rejectReason || undefined });
    this.rejectReason = '';
  }
}
```

### Key Differences from QR Pattern
| Aspect | QR Scan | Manual |
|--------|---------|--------|
| **Trigger** | User scans QR code | User clicks button |
| **Validation** | QR decoding validates | None (trust user) |
| **Metadata** | QR contains loan/transfer ID | ID comes from row context |
| **Confirmation** | Automatic on success | Dialog shows result |
| **Use Case** | Fast warehouse operations | Fallback, edge cases |

---

## Pagination & Filtering Fix

### The Problem

**Scenario:**
1. User views loans page 1 (showing items 0-9)
2. User types search query → filters to 3 items
3. Bug: View still shows page 1 position → shows only 1-2 items (looks empty)

**Root Cause:** Filter changes didn't reset `pageIndex`, so paginator showed results from position 10+ of a 3-item list.

### The Solution

Reset `pageIndex` to 0 whenever filters change:

```typescript
onFilterChange(): void {
  this.pageIndex = 0;  // Reset to first page
  this.applyFilters();
}
```

### Where Filters Change

```typescript
export class LoansComponent {
  // Search input change
  <input (ngModelChange)="onFilterChange()" />

  // Status dropdown change
  <select (ngModelChange)="onFilterChange()" />

  // Clear filters button
  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.pageIndex = 0;  // Explicit reset
    this.applyFilters();
  }

  // User creates new loan
  onLoanCreated(result: LoanFormResult): void {
    this.closeNewLoanDialog();
    this.pageIndex = 0;  // New items go to top
    this.applyFilters();
  }

  // Pagination change (different from filtering)
  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    // DO NOT call applyFilters() here — paginator change shouldn't re-filter
  }
}
```

### Implementation Checklist

When adding filters to a list component:
- [ ] Create `onFilterChange()` method
- [ ] In `onFilterChange()`, set `pageIndex = 0`
- [ ] Wire filter inputs to `(ngModelChange)="onFilterChange()"`
- [ ] Call `onFilterChange()` in any action that creates/deletes items
- [ ] Keep `onPageChange()` separate — don't call applyFilters

---

## finalize() Loading State Pattern

### Overview

When a dialog creates multiple items (e.g., "Create 5 loans"), track completion with a counter:

```typescript
createLoan(): void {
  const items = this.loanItems().filter(item => item.inventoryItemId);

  let successCount = 0;
  let completedCount = 0;

  // Fire all requests in parallel
  for (const item of items) {
    this.loanService.createLoan(item).subscribe({
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

private checkAllCompleted(completed: number, total: number, success: number): void {
  if (completed === total) {
    // All requests finished (success or error)
    if (success > 0) {
      this.notifications.success(
        this.translate.instant('LOANS.LOANS_CREATED', { count: success })
      );
      this.created.emit({ success: true, count: success });
    } else {
      this.notifications.error(
        this.translate.instant('LOANS.LOAN_ERROR')
      );
    }
  }
}
```

### Why Not Use finalize()?

Original approach used RxJS `finalize()` operator:

```typescript
// BEFORE: Hard to track partial success
this.loanService.createLoan(item)
  .pipe(finalize(() => checkDone()))
  .subscribe(/* ... */);
```

**Problem:** `finalize()` fires on error too, hard to distinguish success count.

### New Pattern: Manual Counter

**Advantages:**
- Clear success vs. error distinction
- Easy to display partial results (3 of 5 created)
- Handles mixed success/failure scenarios
- Works with any async pattern (promises, callbacks)

### UI Feedback Options

```typescript
// Option 1: Show count after dialog closes
this.notifications.success('Created 3 loans');

// Option 2: Show detailed result
this.notifications.info('Created 3 of 5. Failed: 2');

// Option 3: Return via output for parent to handle
this.created.emit({ success: true, count: 3, failed: 2 });
```

### Pattern Application

Use this pattern for any batch operation:
- Bulk item creation
- Bulk status updates
- Bulk exports/imports
- Multiple file uploads

---

## takeUntilDestroyed Subscription Teardown

### The Pattern

Angular 16+ provides automatic subscription cleanup:

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';

@Component({ /* ... */ })
export class LoansComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Observable auto-unsubscribes on component destroy
    this.warehouseService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (warehouses) => {
        this.warehouses.set(warehouses);
      },
      error: (err) => {
        this.notifications.handleError(err);
      }
    });
  }
}
```

### Why This Pattern?

**Before (OnDestroy):**
```typescript
// Old way — manual cleanup needed
private subscription?: Subscription;

ngOnInit(): void {
  this.subscription = this.service.obs$.subscribe(/* ... */);
}

ngOnDestroy(): void {
  this.subscription?.unsubscribe();  // Must remember
}
```

**Problems:**
- Easy to forget `.unsubscribe()`
- Memory leaks if component destroyed
- Lots of boilerplate

**After (takeUntilDestroyed):**
```typescript
// New way — automatic cleanup
this.service.obs$.pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(/* ... */);
// Automatically unsubscribes on destroy
```

### When to Use

| Scenario | Use takeUntilDestroyed | Use Manual |
|----------|------------------------|-----------|
| Component-level subscription | ✅ Yes | ❌ No |
| Long-lived subject | ❌ No | ✅ Use subject.complete() |
| One-time async | ✅ Yes | ✅ Either works |
| Dialog observable | ✅ Yes | ✅ Either works |

### Real-World Example from Loans Component

```typescript
constructor() {
  // Reactive effect — no subscription needed
  effect(() => {
    this.loanService.loans();
    this.applyFilters();
  }, { allowSignalWrites: true });
}

ngOnInit(): void {
  // Observable subscription — use takeUntilDestroyed
  this.warehouseService.getAll().pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe({
    error: (err) => this.notifications.handleError(err)
  });

  this.inventoryService.loadItems();
}
```

---

## effect() with allowSignalWrites

### The Problem

When you need to update a writable signal based on another signal's changes, Angular's default effect behavior throws an error:

```typescript
// ❌ FAILS: Angular prevents signal writes in effects by default
effect(() => {
  const loans = this.loanService.loans();  // Read dependency
  // This would cause: "ExpressionChangedAfterCheckError"
  this.filteredLoansSignal.set(loans);     // Write to signal
});
```

### The Solution

Enable `allowSignalWrites`:

```typescript
// ✅ WORKS: Allow controlled signal writes
effect(() => {
  this.loanService.loans();  // Track dependency
  this.applyFilters();        // Update writable signal inside
}, { allowSignalWrites: true });
```

### When to Use This Pattern

**Use case:** Re-compute derived data when source signal changes

```typescript
export class LoansComponent {
  private loanService = inject(LoanService);

  // Writable signals for filters
  searchQuery = '';
  selectedStatus: LoanStatus = 'all';
  filteredLoansSignal = signal<Loan[]>([]);

  constructor() {
    // Reactive: When service loans change, re-apply filters
    effect(() => {
      this.loanService.loans();  // Dependency
      this.applyFilters();        // Update filtered results
    }, { allowSignalWrites: true });
  }

  applyFilters(): void {
    let loans = this.loanService.loans();

    // Apply search
    if (this.searchQuery) {
      loans = loans.filter(loan =>
        loan.inventoryItemName.toLowerCase().includes(
          this.searchQuery.toLowerCase()
        )
      );
    }

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      loans = loans.filter(loan => loan.status === this.selectedStatus);
    }

    // Sort
    loans = [...loans].sort((a, b) =>
      b.loanDate.getTime() - a.loanDate.getTime()
    );

    // Update signal with filtered results
    this.filteredLoansSignal.set(loans);
  }

  // ... rest of component
}
```

### Gotchas & Best Practices

**❌ Anti-pattern: Chained effects**
```typescript
// Don't do this
effect(() => {
  const data = this.data();
  this.derived1.set(transform1(data));  // allowSignalWrites: true
}, { allowSignalWrites: true });

effect(() => {
  this.derived1();  // Read from first effect
  this.derived2.set(transform2(this.derived1()));  // Another write
}, { allowSignalWrites: true });
```

**✅ Better: Combine into one effect**
```typescript
effect(() => {
  const data = this.data();
  const derived1 = transform1(data);
  const derived2 = transform2(derived1);
  this.derived1.set(derived1);
  this.derived2.set(derived2);
}, { allowSignalWrites: true });
```

**✅ Or use computed (no writes needed)**
```typescript
// For pure transformations, use computed
derived1 = computed(() =>
  transform1(this.data())
);

derived2 = computed(() =>
  transform2(this.derived1())
);
```

### Documentation References
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [RxJS Interop](https://angular.dev/api/core/rxjs-interop)

---

## QR Code Pattern

### Overview

Both Loans and Transfers use QR codes for fast receipt confirmation. The pattern consists of:

1. **Generate QR** — API returns base64 PNG
2. **Display QR** — Modal dialog with print/download
3. **Scan QR** — User scans and sends back encoded data
4. **Process Scan** — API decodes and confirms receipt

### QR Dialog Components

#### Display QR (LoanQrDialog, TransferQrDialog)

```typescript
@Component({
  selector: 'app-loan-qr-dialog',
  template: `
    <div class="modal">
      <h2>{{ 'LOANS.QR.SEND_TITLE' | translate }}</h2>
      @if (qrDataUrl()) {
        <img [src]="qrDataUrl()" alt="QR Code" />
        <p>{{ loan()?.inventoryItemName }}</p>
      } @else {
        <spinner>Loading QR...</spinner>
      }
      <button (click)="printQrCode()">
        {{ 'LOANS.QR.PRINT' | translate }}
      </button>
      <button (click)="downloadQrCode()">
        {{ 'LOANS.QR.DOWNLOAD' | translate }}
      </button>
    </div>
  `
})
export class LoanQrDialog {
  loan = input<Loan | null>(null);
  type = input<'send' | 'return'>('send');
  qrDataUrl = input<string | null>(null);
  closed = output<void>();

  printQrCode(): void {
    const window = window.open('', '_blank');
    window.document.write(`
      <html>
        <img src="${this.qrDataUrl()}" />
        <p>${this.loan().inventoryItemName}</p>
        <script>window.print();</script>
      </html>
    `);
  }

  downloadQrCode(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `qr-${this.type()}-${this.loan().id}.png`;
    link.click();
  }
}
```

#### Scan QR (LoanScanDialog, TransferScanDialog)

```typescript
@Component({
  selector: 'app-loan-scan-dialog',
  template: `
    <div class="modal">
      <h2>{{ 'LOANS.QR.SCAN_TITLE' | translate }}</h2>
      <textarea
        [(ngModel)]="scannedQrData"
        placeholder="Paste QR code data..."
      ></textarea>
      <button (click)="processScannedQr()" [disabled]="!scannedQrData">
        {{ 'COMMON.CONFIRM' | translate }}
      </button>
    </div>
  `
})
export class LoanScanDialog {
  private loanService = inject(LoanService);
  scanned = output<ScanQrResult>();
  scannedQrData = '';

  processScannedQr(): void {
    this.loanService.scanQr(this.scannedQrData).subscribe({
      next: (result) => {
        this.scanned.emit({ success: true });
      },
      error: () => {
        this.notifications.error('Scan failed');
      }
    });
  }
}
```

### Integration in Main Component

```typescript
@Component({
  selector: 'app-loans',
  template: `
    <!-- Button to open scan dialog -->
    <button (click)="openScanDialog()">
      {{ 'LOANS.QR.SCAN' | translate }}
    </button>

    <!-- Scan dialog -->
    <app-loan-scan-dialog
      *ngIf="showScanDialog"
      (closed)="showScanDialog = false"
      (scanned)="onQrScanned($event)"
    />

    <!-- Row menu for manual confirm -->
    <button (click)="manualConfirmReceipt(loan)">
      {{ 'LOANS.CONFIRM_RECEIPT' | translate }}
    </button>
  `
})
export class LoansComponent {
  showScanDialog = false;

  openScanDialog(): void {
    this.showScanDialog = true;
  }

  onQrScanned(result: ScanQrResult): void {
    if (result.success) {
      this.showScanDialog = false;
      this.applyFilters();  // Refresh list
    }
  }

  manualConfirmReceipt(loan: Loan): void {
    this.loanService.confirmReceipt(loan.id).subscribe({
      next: () => {
        this.applyFilters();
      }
    });
  }
}
```

### API Endpoints

```
GET /api/loans/{id}/qr
  Returns: { qrDataUrl: "data:image/png;base64,..." }

POST /api/loans/scan-qr
  Body: { qrData: "base64-encoded-string" }
  Returns: { success: true }

POST /api/loans/{id}/confirm-receipt
  Returns: { loan: { ...updated loan } }

POST /api/loans/{id}/confirm-return
  Returns: { loan: { ...updated loan } }
```

---

## Summary Table

| Pattern | Location | Purpose | Key File |
|---------|----------|---------|----------|
| Dialog Results | Loans, Transfers | Type-safe dialog outputs | `loan-form-dialog.ts` |
| Manual Confirm | Loans, Transfers | Non-QR confirmation | `loans.ts` row menu |
| Pagination Fix | All lists | Reset page on filter | `applyFilters()` |
| Completion Counter | Form dialogs | Track batch completion | `checkAllCompleted()` |
| takeUntilDestroyed | All components | Auto subscription cleanup | `ngOnInit()` |
| effect() + allowSignalWrites | Loans, Transfers | Reactive filtering | Constructor |
| QR Pattern | Loans, Transfers | Print-scan workflows | `loan-qr-dialog.ts` |

---

**Next Steps:**
- Review component examples in `/context/COMPONENT_GUIDE.md`
- Check service patterns in `/src/app/services/`
- Explore type definitions in `/src/app/interfaces/`
