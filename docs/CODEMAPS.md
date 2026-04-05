# Inv-App Frontend Codemaps

**Last Updated:** 2026-04-03

## Overview

Inv-App is a modern Angular 20 inventory management system with signals-based reactive architecture. This document maps the frontend codebase structure, key patterns, and recent architectural changes.

---

## Project Structure

```
src/app/
├── components/              # Standalone components organized by feature
│   ├── audit/               # Audit log viewing
│   ├── categories/          # Inventory category management
│   ├── dashboard/           # Analytics dashboard with widget grid
│   ├── discharge-requests/  # Stock reduction requests
│   ├── forgot-password/     # Password recovery flow
│   ├── import/              # Excel import processing
│   ├── inventory/           # Stock management CRUD
│   ├── loans/               # Warehouse lending with QR + manual confirm
│   ├── login/               # Authentication
│   ├── not-found/           # 404 page
│   ├── profile/             # User profile management
│   ├── reports/             # Analytics & export
│   ├── roles/               # Role/permission management
│   ├── settings/            # User preferences
│   ├── shared/              # Reusable dialogs & utilities
│   ├── stock-take/          # Physical inventory counts
│   └── transfers/           # Inter-warehouse transfers with QR + manual confirm
├── guards/                  # Route & auth guards
├── interceptors/            # HTTP interceptors (auth, CSRF, errors)
├── interfaces/              # Type definitions
├── services/                # Business logic services
│   ├── auth.service.ts
│   ├── inventory/
│   │   └── inventory.service.ts
│   ├── loan.service.ts
│   ├── notification.service.ts
│   ├── transfer-request.service.ts
│   ├── warehouse.service.ts
│   └── ... (10+ other services)
├── pipes/                   # Custom pipes
├── styles/                  # Global styles & design system
│   ├── colors.css           # Theme colors & CSS variables
│   ├── tokens.css           # Spacing, typography, shadows
│   └── ...
└── app.config.ts            # Global Angular config
```

---

## Core Features Architecture

### 1. Loans Module
**Location:** `src/app/components/loans/`

#### Components
- **loans.ts** — Main list view with filtering, pagination, stats
- **loan-form-dialog.ts** — Create new loans with multi-item support
- **loan-qr-dialog.ts** — QR display + scan UI for receipt/return confirmation

#### Key Patterns
- **Signal-based Filtering:** `effect()` with `allowSignalWrites: true` re-applies filters when `loanService.loans()` updates
- **Pagination Reset:** `onFilterChange()` sets `pageIndex = 0` before filtering
- **Manual QR Confirmation:** Loans support both:
  - Automated: QR scan via `LoanScanDialog`
  - Manual: Manual confirm receipt/return action in row menu
- **Subscription Teardown:** Uses `takeUntilDestroyed()` on observables

#### Recent Changes
```typescript
// effect() with allowSignalWrites for reactive filtering
effect(() => {
  this.loanService.loans();
  this.applyFilters();
}, { allowSignalWrites: true });

// onFilterChange resets pagination to first page
onFilterChange(): void {
  this.pageIndex = 0;
  this.applyFilters();
}
```

---

### 2. Transfers Module
**Location:** `src/app/components/transfers/`

#### Components
- **transfers.ts** — Main list with status stats, filtering, approval workflows
- **transfer-form-dialog.ts** — Create transfer requests with validation
- **transfer-qr-dialog.ts** — QR display + scan + reject dialog

#### Key Patterns
- **Status-Based Actions:** Different buttons/menus per status (pending, approved, received, rejected)
- **Manual Approval Path:** Transfers support both:
  - Automated: QR scan for instant receipt confirmation
  - Manual: "Confirm Receipt" action to manually mark as received
- **Rejection Workflow:** `TransferRejectDialog` captures optional reason

#### Recent Changes
```typescript
// Manual confirm receipt added to transfers
// Matches loan pattern for consistency

// Dialog result interfaces
export interface TransferScanQrResult {
  success: boolean;
}

export interface TransferRejectResult {
  reason?: string;
}
```

---

### 3. Dialog & State Management Pattern

#### Input/Output Architecture
All dialogs use Angular's new input/output decorators (not @Input/@Output):

```typescript
// In dialog component
export class LoanQrDialog {
  loan = input<Loan | null>(null);          // Read-only input
  type = input<'send' | 'return'>('send');  // With default
  qrDataUrl = input<string | null>(null);
  closed = output<void>();
  scanned = output<ScanQrResult>();
}

// In parent component
<app-loan-qr-dialog
  [loan]="selectedLoan()"
  [type]="'send'"
  [qrDataUrl]="qrData()"
  (closed)="onDialogClosed()"
  (scanned)="onQrScanned($event)"
/>
```

#### Dialog Result Types
Each dialog emits strongly-typed result objects:
- `LoanFormResult { success: boolean; count: number }`
- `ScanQrResult { success: boolean }`
- `TransferScanQrResult { success: boolean }`
- `TransferRejectResult { reason?: string }`

---

### 4. Filtering & Pagination Pattern

#### applyFilters() Architecture
```typescript
applyFilters(): void {
  let loans = this.loanService.loans();  // Get latest signal value

  // Apply search filter
  if (this.searchQuery) {
    loans = loans.filter(/* ... */);
  }

  // Apply status filter
  if (this.selectedStatus !== 'all') {
    loans = loans.filter(loan => loan.status === this.selectedStatus);
  }

  // Sort
  loans = [...loans].sort(/* ... */);

  // Update computed signal for view
  this.filteredLoansSignal.set(loans);
}
```

#### Pagination Flow
1. User types in search → `onFilterChange()` called
2. `onFilterChange()` sets `pageIndex = 0`
3. Calls `applyFilters()` → updates `filteredLoansSignal`
4. View detects change → re-renders with fresh data from page 0

#### Key Fix
- **Before:** Filter changes didn't reset pagination → viewing wrong page
- **After:** `onFilterChange()` resets `pageIndex` → pagination works correctly

---

### 5. Reactive Filtering with Signals

#### Pattern: effect() with allowSignalWrites
Used in both loans and transfers:

```typescript
constructor() {
  // Whenever loanService.loans() signal changes, re-apply filters
  effect(() => {
    this.loanService.loans();  // Track signal dependency
    this.applyFilters();        // Update filtered results
  }, { allowSignalWrites: true });  // Allow signal updates inside effect
}
```

**Why `allowSignalWrites: true`?**
- Filters update `filteredLoansSignal` (a writable signal)
- Without this option, Angular throws error on signal writes in effect
- Used judiciously for validation/filtering logic only

---

### 6. Subscription Teardown Pattern

#### takeUntilDestroyed() Usage
```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

export class LoansComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.warehouseService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)  // Auto-unsubscribe on destroy
    ).subscribe({ /* ... */ });
  }
}
```

**Benefits:**
- No need for OnDestroy/unsubscribe()
- Automatic cleanup with component lifetime
- Works with both observables and subjects

---

## Data Models

### Loan (src/app/interfaces/loan.interface.ts)
```typescript
interface Loan {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
  quantity: number;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  loanDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'pending' | 'sent' | 'received' | 'returned' | 'overdue';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### TransferRequest (src/app/interfaces/transfer-request.interface.ts)
```typescript
interface TransferRequest {
  id: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: 'pending' | 'approved' | 'received' | 'rejected';
  items: TransferItem[];
  approvedDate?: Date;
  receivedDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TransferItem {
  inventoryItemId: string;
  quantity: number;
  inventoryItemName: string;
  inventoryItemServiceTag?: string;
}
```

---

## Service Architecture

### Loan Service (src/app/services/loan.service.ts)
**Entry Point:** Loads loans on init via `loadLoans()`

```typescript
export class LoanService {
  // Signal store of all loans
  loans = signal<Loan[]>([]);

  // Computed for active loans (filtering logic)
  activeLoans = computed(() =>
    this.loans().filter(l =>
      l.status === 'pending' || l.status === 'sent'
    )
  );

  // Load all loans from API
  loadLoans(): Observable<Loan[]> { /* ... */ }

  // Create single loan
  createLoan(data: CreateLoanDto): Observable<Loan> { /* ... */ }

  // Manual receipt confirmation
  confirmReceipt(loanId: string): Observable<Loan> { /* ... */ }

  // Manual return confirmation
  confirmReturn(loanId: string): Observable<Loan> { /* ... */ }

  // QR-based confirmation
  scanQr(qrData: string): Observable<boolean> { /* ... */ }
}
```

### Transfer Service (src/app/services/transfer-request.service.ts)
Similar pattern with status-specific operations:
- `createRequest()` - Create new transfer
- `approve()` - Manager approval
- `confirmReceipt()` - Manual receipt (manual)
- `reject()` - Reject transfer with reason
- `scanQr()` - QR-based confirmation

### Inventory Service (src/app/services/inventory/inventory.service.ts)
Manages available inventory items:
- Tracks items in stock
- Prevents loaning unavailable items
- Updates quantities on transfers

---

## i18n Pattern

All user-facing text uses `TranslateModule`:

```html
<!-- Template -->
<h1>{{ 'LOANS.TITLE' | translate }}</h1>
<button>{{ 'COMMON.CONFIRM' | translate }}</button>

<!-- With interpolation -->
<p>{{ 'LOANS.LOANS_CREATED' | translate: { count: 5 } }}</p>
```

**Translation Files:**
- `src/assets/i18n/en.json` — English
- `src/assets/i18n/es.json` — Spanish

Must keep both files in sync when adding strings.

---

## Styling & Theme System

### Design System Location
`src/styles/design-system/`

### Color System
```css
/* Dark theme (default) */
[data-theme="dark"] {
  --color-primary: #4d7c6f;
  --color-surface: #0a0a0a;
  --color-surface-variant: #1a1a1a;
  --color-foreground: #ffffff;
  --color-on-surface-variant: #b3b3b3;
  --color-border: #333333;
  /* ... 20+ more tokens */
}

/* Light theme */
[data-theme="light"] {
  --color-primary: #4d7c6f;
  --color-surface: #ffffff;
  /* ... */
}
```

### Tailwind Integration
Uses Tailwind utility classes for:
- Layout: `flex`, `grid`, `max-w-*`
- Spacing: `p-6`, `mb-8`, `gap-4`
- Colors: `text-foreground`, `bg-surface-variant`
- State: `hover:bg-*`, `disabled:opacity-50`

**Rule:** Never hardcode hex values in templates — always use CSS variables.

---

## Recent Changes Summary

### 1. Manual Confirm Receipt/Return UI (Loans & Transfers)
Added action buttons for manual confirmation without QR scan:
- **Loans:** "Confirm Receipt" / "Confirm Return" in row menu
- **Transfers:** "Confirm Receipt" / "Reject" in row menu
- Sends to `confirmReceipt()` / `confirmReturn()` / `reject()` API endpoints
- Updates row status immediately upon success

### 2. Pagination Fix (onFilterChange)
**Issue:** Filtering didn't reset page index → viewed wrong page
**Solution:** `onFilterChange()` now resets `pageIndex = 0` before filtering
**Impact:** Users see results from first page when they apply filters

### 3. finalize() Loading State Pattern
**Pattern:** Loan/Transfer form dialogs track completion via counter:
```typescript
let successCount = 0;
let completedCount = 0;

for (const item of items) {
  this.service.createLoan(item).subscribe({
    next: () => {
      successCount++;
      completedCount++;
      this.checkAllCompleted(completedCount, items.length, successCount);
    },
    error: () => {
      completedCount++;
      this.checkAllCompleted(completedCount, items.length, successCount);
    }
  });
}

private checkAllCompleted(completed: number, total: number, success: number): void {
  if (completed === total) {
    // All requests done — emit result
    this.created.emit({ success: true, count: success });
  }
}
```

### 4. takeUntilDestroyed Subscription Teardown
Angular rxjs-interop provides automatic cleanup:
```typescript
this.service.observable$.pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(/* ... */);
// Auto-unsubscribes on component destroy
```

### 5. effect() with allowSignalWrites for Reactive Filtering
```typescript
effect(() => {
  this.loanService.loans();  // Track dependency
  this.applyFilters();        // Update writable signal
}, { allowSignalWrites: true });
```

---

## Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| @angular/core | Framework | 20 |
| @angular/material | UI components | Latest |
| tailwindcss | Utility CSS | 4 |
| @ngx-translate/core | i18n | 15+ |
| ngx-permissions | RBAC | 16+ |
| lucide-angular | Icons | Latest |
| axios | HTTP client | 1.6+ |

---

## Related Areas

- **Backend API:** [Inv-App-API](https://github.com/mherrerabl/Inv-App-API) (NestJS)
- **Database:** PostgreSQL (prod) / SQLite (dev)
- **Deployment:** Vercel (see context/VERCEL-DEPLOYMENT.md)
- **Security:** JWT + HttpOnly cookies (see context/SECURITY.md)

---

## Development Commands

```bash
npm start               # Dev server → http://localhost:4200
npm run build           # Production build
npm test                # Unit tests (Jest)
npm run e2e             # E2E tests (Playwright)
npm run lint            # ESLint + Prettier check
npm run format          # Auto-format code
```

---

## Performance Notes

- **Change Detection:** OnPush strategy across all components
- **Signals:** Replacing observables for state management gradually
- **Lazy Loading:** Feature routes lazy-loaded via routing config
- **Tree Shaking:** Standalone components enable aggressive tree shaking
- **CSS Optimization:** Tailwind JIT compilation on dev & prod builds

---

**For detailed component examples, see:**
- Component Guide: `/context/COMPONENT_GUIDE.md`
- Optimizations: `/context/OPTIMIZATIONS.md`
- Security: `/context/SECURITY.md`
