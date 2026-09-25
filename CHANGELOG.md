# Changelog

All notable changes to Obsid (frontend) will be documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Version `0.x.x` indicates pre-release development.

---

## [Unreleased]

### Fixed
- Code audit, security and robustness:
  - The printed QR page put the loan and transfer text typed by users into HTML without escaping it, so it ran markup. It now escapes the text and refuses a QR value that is not a base64 image.
  - A `returnUrl` is only followed when it stays inside the app. The route guards no longer send a refused user to another refused page in a loop. The inventory add and edit routes ask for `inventory:create` and `inventory:edit`, and system administrators get every permission the API defines.
  - One real time socket is opened per session and closed when signing out starts, and signing out reloads the app so the next user does not see the data of the previous one.
- Code audit, errors and messages:
  - A failed token refresh retry no longer turns into a false 401 that logs the user out, and the real error of a failed request reaches the caller (`ApiError`).
  - Failed loan, transfer, sale, outflow and discharge calls are shown to the user. Signing in and resetting a password show the reason they failed. The QR dialogs close when the code cannot be loaded.
  - The user dialog no longer wipes the warehouse assignments when they fail to load, and the role dialog no longer saves an empty permission list.
- Code audit, forms and state:
  - Raw translation keys were rendered in the UI. `npm run i18n:check` (also in CI) now fails when `en.json` and `es.json` differ or a key used in the code does not exist.
  - Login accepts the 6 character passwords the API accepts, and the forms share one strong password policy that matches the API. The transaction form asks for the warehouses its type needs. Settings switches the theme through `ThemeService`.
  - The role form, audit log, stock take, discharge list, public request form and command palette read plain fields inside `computed()`, so they did not react to changes. They use signals now.
- Unit test suite (0/12 passing) — `TestBed` setup across all specs never accounted for `provideZonelessChangeDetection()` or `TranslateService`, so every spec crashed on `NG0908`/`NG0201` instead of running.
- Cleared the entire lint backlog (~270 findings → 0), almost all `@typescript-eslint/no-explicit-any` resolved with real types (reusing existing interfaces where they exist) rather than suppressions, plus real `@angular-eslint/template` accessibility fixes (label/control association, keyboard support on clickable cards, dialog `role`/`aria` attributes) across ~50 components. CI now fails on lint instead of just reporting it.
- `dashboard.ts`: the custom-chart-builder's `ApexOptions` return type declared several sub-options optional even though the implementation always populates them, and a template data-presence check assumed one series shape (`{name, data}[]`) when pie/donut charts actually use a plain `number[]` — both were previously invisible type gaps that only surfaced once lint (and therefore full template type-checking) started running.
- Deleting an item from its detail dialog showed the confirmation and the notifications in hard coded English and the raw error message. It now uses the same translated texts and `NotificationService` calls as the inventory list.
- README and CODEMAPS linked to a backend repository that does not exist; they now point to `Mar10HT/Inv-App-API`. `context/ROADMAP.md` is refreshed for v0.5.0 and no longer lists shipped features as planned.
- Eleven templates (loans, transfers, forgot-password, reset-password) render `<lucide-icon name="CheckCircle">`, but only `CheckCircle2` was registered, and lucide-angular throws when an icon is not provided. `CheckCircle` is now registered next to it.
- Code audit, inventory and CRUD pages:
  - The inventory form always sends a status and the API only works one out when it is not sent one. For a UNIQUE item the form fixes the minimum at 1, so the BULK rule (quantity <= minimum) saved its single unit as LOW_STOCK. A UNIQUE item is now IN_USE when assigned, IN_STOCK with one unit and OUT_OF_STOCK without, the rule the API applies when it creates an item without a status. The API still uses the BULK rule when it updates, bulk updates or imports an item and after a transaction, which can turn a UNIQUE item back to LOW_STOCK from the API side.
  - The categories, suppliers and warehouses pages say "created <name>" and "updated <name>" from the name the form dialog returns, but the dialog closed with just `{ saved: true }`, so the name was always missing. The dialog now closes with the name of what the API saved.

### Added
- CI (`.github/workflows/ci.yml`): install, lint, unit tests, production build on every push/PR to `main`.
- ESLint via `@angular-eslint`, wired to `npm run lint` (`ng lint`) — this project had no linting configured at all before.
- Unit specs for the xlsx download flow, the four PDF exports, `BaseCrudService`, `triggerBlobDownload`, `loan.utils` and the skeleton components, and for every component and helper extracted in the file split (unit suite from 12 to 102 specs).
- Unit coverage of 65 percent of lines (unit suite from 102 to 646 specs): specs for the auth interceptor, the CSRF service, the xlsx contents, and the loan, sale, audit, transfer, outflow, discharge, stock take, transaction, alerts and dashboard services. Specs no longer share browser storage or open a real time socket, and CI runs `npm run test:ci` with coverage thresholds that fail the build when coverage drops.
- `trackRequest` (`utils/track-request.ts`), `chart.utils` (dashboard) and `money.utils` (`formatNumber`, `currencySymbol`, `formatMoney`), each with a spec, and first specs for `OutflowService`, `DischargeRequestService`, `CustomChartDialog` and `getCustomChartOptions`.
- Unit coverage of 80 percent of lines and 79.6 percent of statements (unit suite from 656 to 1062 specs): specs for the inventory form, the sale and outflow forms and pages, the CRUD dialog with the categories, suppliers and warehouses pages, the import dialog, the settings actions, the discharge list and detail, the QR, scan and reject dialogs, the password dialogs, the auth polling and startup, `InventoryService`, `NotificationService`, `LoggerService`, `ImportService`, `ScheduledReportsService` and `CommandPaletteService`, plus a spec that pins the guard and the permission of every route. The coverage thresholds in `karma.conf.cjs` are raised to 78/63/73/79.
- Shared building blocks with their own specs: `ConfirmService` (`ask()` answers with a boolean), `Spinner` (size and tone, announced to screen readers, stops under reduced motion), `StatCard` (label, value, icon and one of six tones) and `EmptyState` (icon, heading, description and a projected action).

### Changed
- `jsPDF`, `jspdf-autotable` and `xlsx-js-style` are now loaded with a dynamic `import()` the first time the user exports, instead of being bundled into the route chunks that use them. xlsx (~1.2 MB raw) and jsPDF (~400 KB raw) become on-demand chunks; the initial bundle is unchanged. `downloadStyledXLSX`, the PDF export methods and the report and list export methods that call them are now async.
- Export failures (for example a chunk that cannot be loaded offline) are now caught by `NotificationService.guardExport`, logged through `LoggerService` (Sentry in production) and shown as a translated error notification (`NOTIFICATIONS.ERRORS.EXPORT_FAILED`, EN/ES) instead of becoming an unhandled promise rejection with no feedback. Applied to the reports, inventory, loans, transfers and audit exports.
- The skeleton components use signal `input()` instead of `@Input()`.
- The writes of the loan, transfer, sale, outflow and discharge services (about 20 methods that each repeated 20 lines of loading, error and list handling) go through `trackRequest`. It starts when subscribed instead of when the method is called.
- The dashboard charts and the custom chart preview share the palettes, the CSS variable reader, the value source list and the axis formatter through `chart.utils`, and the PDF export, the value report and the charts format money through `money.utils` (the two decimals formatter was written four times and the L or $ symbol seven).
- Twenty five confirmation dialogs go through `ConfirmService`, 24 hand drawn spinners use `Spinner`, 24 stat cards use `StatCard` and six list pages use `EmptyState`, instead of repeating the same markup and dialog boilerplate in each component.
- Fifteen older components that loaded an external `templateUrl` now use inline templates, matching the project convention.
- `InventoryService.loadItems()` no longer takes a filter object and `FilterParams` is gone: every caller asked for the whole list. `LoggerService` gets Sentry through a `SENTRY` injection token, like the websocket service gets socket.io, so its error reporting can be tested.
- Files over the 800-line limit were split without changing behavior: `pdf-export.service.ts` (890 to 559 lines; the drawing helpers moved to `services/pdf/pdf-drawing.base.ts`), `inventory-list.ts` (818 to 760), `stock-take.ts` (811 to 768), `transfers.ts` (845 to 791) and `loans.ts` (955 to 735). The stat cards became `InventoryStatsCards`, `StockTakeStatsCards`, `LoanStatsCards` and `TransferStatsCards`, and the loans mobile list became `LoanMobileCards` (inputs for the data, outputs for the row actions). `getLoanStatusClass` and `getLoanDueDateClass` moved to `loan.utils`. `dashboard.ts` (1204 to 644) was split the same way: the chart data and ApexCharts option builders moved to `DashboardChartsBase` and the recent items table became `DashboardRecentItems`. `reports.ts` (1575 to 674) was split by tab: `ReportsValueTab`, `ReportsTransactionsTab`, `ReportsStatusTab`, `ReportsAssignmentsTab`, `ReportsTrendsTab` and `ReportsDownloadsTab` live in `reports/tabs/` with inputs for the data and outputs for the exports. The Excel downloads and the trend chart options moved into their tabs, the date formatters into `reports.format.ts` and the summary types into `reports.types.ts`. Unused code was removed along the way (`getStatusColor`, `getTransactionColor` and an injected but unused `UserService`). No file is over the limit anymore.

### Removed
- Unused code found in a code-graph review: eight unreferenced types and constants, the `ThemeToggle`, `EmptyState`, `ErrorAlert` and `LoadingSpinner` components, `SanitizerService`, `SharedData`, the unused `components/shared` barrel, `PdfExportService.exportTableToPDF`, and three empty component stylesheets.
- The dead server-side rendering stack (`server.ts`, `main.server.ts`, the server config and routes, hydration, `@angular/ssr`, `@angular/platform-server`, `express`), `json-server`, the `analyze`, `build:stats` and `serve:ssr:inv-app` scripts (the build is browser only and `webpack-bundle-analyzer` was never installed) and the `extract-i18n` target.
- More unused code, found with the TypeScript language service and confirmed by the production build: about 60 service methods and computed signals in the loan, transfer, dashboard, inventory, auth, user, warehouse, sidebar, theme, websocket, discharge, audit, sale, outflow and notification services (with the specs that only covered them), `filterLoans`, `getActiveLoanForItem` and `isItemOnLoan`, the Material to Lucide `ICON_MAP`, six unused types, and the NgModules that components imported but never used (`CommonModule`, `MatButtonModule`, `MatDialogModule`, `MatSnackBarModule` and others).
- 106 translation keys that no code references, from `en.json` and `es.json` together.

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
