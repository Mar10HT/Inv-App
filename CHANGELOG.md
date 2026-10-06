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
  - The loan, transfer, sale, stock take and discharge pages translated their success and error notification keys twice (`notifications.success(translate.instant('KEY'))`): it worked by luck, since a resolved string that is not itself a key falls back to showing unchanged. The 49 call sites now pass the raw key, like every other notification call does. The discharge share-link failure also showed the untranslated `'Loading... error'` fallback instead of a real message (`DISCHARGES.SHARE_FORM.ERROR`, EN/ES).
  - 22 `subscribe()` calls across sales, outflows, loans, transfers and discharge requests had a dead `error` handler: the services they call (`SaleService.cancel`, `LoanService.sendLoan`, `TransferRequestService.approveRequest` and 19 more) all go through `trackRequest`, which already catches the failure and resolves with `null`, so the handler could never run. Two of them (sale and outflow creation) hid the same double-translation bug above, written across two lines instead of one, which is why the first pass missed them. `DischargeRequestService.findOne()` had the same dead-handler shape for an unrelated reason: it already catches its own errors too.
- Code audit, forms and state:
  - Raw translation keys were rendered in the UI. `npm run i18n:check` (also in CI) now fails when `en.json` and `es.json` differ or a key used in the code does not exist.
  - Login accepts the 6 character passwords the API accepts, and the forms share one strong password policy that matches the API. The transaction form asks for the warehouses its type needs. Settings switches the theme through `ThemeService`.
  - The role form, audit log, stock take, discharge list, public request form and command palette read plain fields inside `computed()`, so they did not react to changes. They use signals now.
- Code audit, reports:
  - The Status and Assignments Excel files ignored the warehouse filter and always listed every item; they now follow it like the views and the PDFs do.
  - A date-only value (`2026-09-24`) was read as midnight UTC, so west of UTC the trend summary and the trend chart axis showed the previous day, the 30 day trend put late evening transactions on the next day, and the transaction date range started a day early and ended a day early. Dates are now read and bucketed by the local calendar day (`utils/date.utils`), and the last day of the range is included up to its last millisecond.
  - The same UTC drift made the export file names carry tomorrow's date after 6 pm in Honduras and made the loan form refuse tomorrow as the due date in the evening. Both use the local day now.
  - A failed load showed a zeroed report as if there were no data. It now shows an error with a retry (blocked while a load is still running), only on the tabs that read the failed data. The items spinner no longer covers the trends and downloads tabs, which do not read the items. A failed server side Excel download now tells the user instead of failing silently (and, in the tests, aborting the whole run with an unhandled error).
  - The value tab, its PDF export and the dashboard's custom value charts added price times quantity across every item when the currency filter was 'ALL', silently blending HNL and USD into one wrong number with no exchange rate. They now show one amount per currency instead of converting (`money.utils.formatMoneyByCurrency`). The value PDF's top items table, and the tab's own top items list, formatted every row by the tab's filter instead of that item's own currency, which was wrong even for USD or HNL alone whenever an item was priced in the other one. A value-based custom chart can no longer be created with 'ALL'; one already saved with it falls back to USD instead of blending.
  - The unit tests run in the Honduras time zone (`karma.conf.cjs`). CI runs in UTC, where the specs about the local day could not fail.
  - `LoanStats.totalActive` had no reader and its comment disagreed with its calculation, so it was removed.
- Unit test suite (0/12 passing) — `TestBed` setup across all specs never accounted for `provideZonelessChangeDetection()` or `TranslateService`, so every spec crashed on `NG0908`/`NG0201` instead of running.
- Cleared the entire lint backlog (~270 findings → 0), almost all `@typescript-eslint/no-explicit-any` resolved with real types (reusing existing interfaces where they exist) rather than suppressions, plus real `@angular-eslint/template` accessibility fixes (label/control association, keyboard support on clickable cards, dialog `role`/`aria` attributes) across ~50 components. CI now fails on lint instead of just reporting it.
- `dashboard.ts`: the custom-chart-builder's `ApexOptions` return type declared several sub-options optional even though the implementation always populates them, and a template data-presence check assumed one series shape (`{name, data}[]`) when pie/donut charts actually use a plain `number[]` — both were previously invisible type gaps that only surfaced once lint (and therefore full template type-checking) started running.
- Deleting an item from its detail dialog showed the confirmation and the notifications in hard coded English and the raw error message. It now uses the same translated texts and `NotificationService` calls as the inventory list.
- README and CODEMAPS linked to a backend repository that does not exist; they now point to `Mar10HT/Inv-App-API`. `context/ROADMAP.md` is refreshed for v0.5.0 and no longer lists shipped features as planned.
- Eleven templates (loans, transfers, forgot-password, reset-password) render `<lucide-icon name="CheckCircle">`, but only `CheckCircle2` was registered, and lucide-angular throws when an icon is not provided. `CheckCircle` is now registered next to it.
- Code audit, inventory and CRUD pages:
  - The inventory form always sends a status and the API only works one out when it is not sent one. For a UNIQUE item the form fixes the minimum at 1, so the BULK rule (quantity <= minimum) saved its single unit as LOW_STOCK. A UNIQUE item is now IN_USE when assigned, IN_STOCK with one unit and OUT_OF_STOCK without, the rule the API applies when it creates an item without a status. The API still uses the BULK rule when it updates, bulk updates or imports an item and after a transaction, which can turn a UNIQUE item back to LOW_STOCK from the API side.
  - Nine icons the templates draw were not registered in `APP_ICONS`, and lucide-angular throws when an icon is missing: `CalendarClock`, `CalendarOff`, `ToggleLeft` and `ToggleRight` in the scheduled reports section of Settings (so Settings failed to render for anybody with `reports:view`), `ShieldOff` in the empty state of the roles page (which is also what an error while loading the roles shows), `BellOff` and `Loader` in the notification bell, `Box` in the discharge detail and `CloudCog` in the import dialog. No test rendered them because they are behind a permission or in an empty or error state. They are registered now, and specs render those states.
  - The audit log drew `RotateCcw` for the RESTORE action through a lookup map (`{ [AuditAction.RESTORE]: 'RotateCcw' }`), which `check-icons.mjs` could not see since it only matched literal template and property patterns. `RotateCcw` is registered now, and the script also follows any quoted icon name assigned through a map like this one.
  - Creating a sale or an outflow that failed showed two error messages: the real reason from the service and a generic one from the form dialog. The dialogs no longer add the second one. Settings marked English as selected when the user had never saved a language and the app had started in the browser language.
  - The categories, suppliers and warehouses pages say "created <name>" and "updated <name>" from the name the form dialog returns, but the dialog closed with just `{ saved: true }`, so the name was always missing. The dialog now closes with the name of what the API saved.
  - Editing a UNIQUE item and clearing its assignment left the previous one in place: the form only sent `assignedToUserId` when it had a value, and the API only clears a field it is explicitly sent as `null` (confirmed in Inv-App-API, no backend change needed). Creating still sends nothing for an empty selection, since there is nothing to clear.
- Code audit, layout:
  - The sale, outflow, loan and transaction forms forced their dialog into horizontal scroll once the item notes field ran out of room, clipping the subtotal line (`min-w-0` was missing on a `flex-1` input, so it refused to shrink below its placeholder's width).
  - A long item name or description in the inventory table, or a long category/warehouse/supplier name in the value report, pushed every column after it out of place (`min-w-0` was missing on that one grid cell, the only one whose content length is unbounded).
  - The sidebar's collapse toggle sits half outside the sidebar on purpose, but it lived inside `.sidebar-top`, whose `overflow-x: hidden` (needed for the nav list's scroll) clipped that protruding half, making it look like the sidebar's edge was drawn in front of the button. Moved it to a sibling of `.sidebar-top` instead of a child.

### Added
- CI (`.github/workflows/ci.yml`): install, lint, unit tests, production build on every push/PR to `main`.
- ESLint via `@angular-eslint`, wired to `npm run lint` (`ng lint`) — this project had no linting configured at all before.
- Unit specs for the xlsx download flow, the four PDF exports, `BaseCrudService`, `triggerBlobDownload`, `loan.utils` and the skeleton components, and for every component and helper extracted in the file split (unit suite from 12 to 102 specs).
- Unit coverage of 65 percent of lines (unit suite from 102 to 646 specs): specs for the auth interceptor, the CSRF service, the xlsx contents, and the loan, sale, audit, transfer, outflow, discharge, stock take, transaction, alerts and dashboard services. Specs no longer share browser storage or open a real time socket, and CI runs `npm run test:ci` with coverage thresholds that fail the build when coverage drops.
- `trackRequest` (`utils/track-request.ts`), `chart.utils` (dashboard) and `money.utils` (`formatNumber`, `currencySymbol`, `formatMoney`), each with a spec, and first specs for `OutflowService`, `DischargeRequestService`, `CustomChartDialog` and `getCustomChartOptions`.
- `npm run icons:check` (also in CI) fails when a component draws an icon that `shared/icons.ts` does not register, the same way `i18n:check` does for translations.
- Unit coverage of 85.2 percent of lines and 84.6 percent of statements (unit suite from 656 to 1266 specs): specs for the loans, transfers, transactions, roles, stock take, users and profile pages and the loan and transfer dialogs, the inventory form, the sale and outflow forms and pages, the CRUD dialog with the categories, suppliers and warehouses pages, the import dialog, the settings actions, the discharge list and detail, the QR, scan and reject dialogs, the password dialogs, the auth polling and startup, `InventoryService`, `NotificationService`, `LoggerService`, `ImportService`, `ScheduledReportsService` and `CommandPaletteService`, plus a spec that pins the guard and the permission of every route. The coverage thresholds in `karma.conf.cjs` are raised to 83/70/80/84. Coverage only counts the files some spec imports, so the first spec of a large untested page lowers the overall percentage even though it raises the real coverage. Every page is imported by a spec now, so the report lists all of them.
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
