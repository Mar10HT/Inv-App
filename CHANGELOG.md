# Changelog

All notable changes to Obsid (frontend) will be documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Version `0.x.x` indicates pre-release development.

---

## [Unreleased]

### Fixed
- Unit test suite (0/12 passing) — `TestBed` setup across all specs never accounted for `provideZonelessChangeDetection()` or `TranslateService`, so every spec crashed on `NG0908`/`NG0201` instead of running.

### Added
- CI (`.github/workflows/ci.yml`): install, lint (non-blocking — see below), unit tests, production build on every push/PR to `main`.
- ESLint via `@angular-eslint`, wired to `npm run lint` (`ng lint`) — this project had no linting configured at all before.

### Known backlog
- Enabling lint surfaced ~270 pre-existing findings (mostly `@typescript-eslint/no-explicit-any`) that were never enforced before. CI runs lint but doesn't fail on it yet — needs a dedicated cleanup pass.

## [0.5.0] - 2026-07-07

### Added
- **Sales module** (`/sales`): record sales with per-customer-tier pricing (wholesale / distributor / retail) and manual per-line unit prices
  - List with stats (recorded, revenue per currency, cancelled, total), warehouse / status / customer-type filters, desktop table + mobile cards
  - Create dialog with customer name + type, currency (USD/HNL), per-line quantity and unit price (pre-filled from the item's price), and a live total
  - PDF sale receipt download and cancel-to-restore-stock, gated by `sales:view` / `sales:create` / `sales:cancel`

### Architecture
- **Manual Confirm UI Pattern**: Added manual receipt/return confirmation dialogs for loans and transfers (fallback to QR scanning)
- **Reactive Filtering with Signals**: Implemented `effect()` with `allowSignalWrites: true` for responsive filter updates across loans and transfers lists
- **takeUntilDestroyed**: Migrated all component subscriptions to use `takeUntilDestroyed()` for automatic cleanup
- **Dialog Result Types**: Standardized dialog output types (`LoanFormResult`, `ScanQrResult`, `TransferRejectResult`)

### Fixed
- **Pagination Reset on Filter**: Filters now reset page index to 0, preventing viewing wrong page after search/status change
- **Batch Operation Completion**: Implemented counter-based pattern for tracking multi-item creation (loans, transfers) instead of relying on RxJS operators

### Documentation
- Added comprehensive codemaps document (`docs/CODEMAPS.md`)
- Added detailed recent patterns guide (`docs/RECENT-PATTERNS.md`)

### Changed
- Loan confirmations now support both QR scanning and manual action buttons
- Transfer status workflows enhanced with manual reject dialog
- Component imports reorganized for better readability

---

## [0.4.5] - 2026-01-19

### Security
- CSRF protection via Double Submit Cookie pattern
- Migrated token storage from localStorage to HttpOnly cookies

### Added
- Warehouse-to-warehouse loan system with multi-item support
- Loan statistics, filtering, search, and CSV export
- Desktop table and mobile card views for loans

### Changed
- Loans now operate between warehouses instead of individual users
- Updated theme-aware design system classes

### Fixed
- Theme color consistency across all components
- Reactive item filtering using Angular Signals

---

## [0.4.0] - 2026-01-14

### Added
- Full light theme support with dark/light toggle
- Design system architecture with semantic color tokens (WCAG AA)

### Fixed
- Custom charts loading timing issue
- Dashboard stats alignment
- Transaction creation database consistency
- Material form field styling in light mode

---

## [0.3.0] - 2026-01-12

### Added
- Collapsible sidebar with smooth transitions and tooltips

### Fixed
- Dashboard status distribution chart percentages
- Dashboard counter timing issues with parallel data loading

### Changed
- Navigation component refactored to use SidebarService

---

## [0.2.0] - 2026-01-09

### Added
- Warehouses CRUD module
- Suppliers CRUD module
- Backend endpoints for warehouses and suppliers
- Full i18n translations for new modules

---

## [0.1.0] - 2025-11-22

### Added
- Inventory management with CRUD, filters, search, and pagination
- Dashboard with stats cards and recent items
- Item detail modal dialog
- Internationalization system (English and Spanish)
- NestJS + Prisma backend API

### Changed
- Desaturated color palette for reduced eye strain

### Performance
- Removed polling-based updates
- Added trackBy directives and OnPush change detection
- Unified stats calculation and search debouncing
