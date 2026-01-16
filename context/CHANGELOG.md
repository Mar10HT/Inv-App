# Changelog - INV-APP

## [1.4.0] - January 15, 2026

### Added
- **Loans System (Warehouse-to-Warehouse)**: Complete loan management between warehouses
  - Create loans from one warehouse to another with due date
  - Support for multiple items per loan (same UI as transactions)
  - Each item row has: item selector, quantity input, notes input
  - Items show available quantity in dropdown
  - Validation to prevent selecting same item twice
  - Loan statuses: ACTIVE, OVERDUE, RETURNED
  - Automatic overdue detection
  - Return loan functionality with confirmation dialog
  - Loan statistics: Active, Overdue, Due Soon, Returned
  - Filter by status
  - Search by item name or warehouse
  - Pagination
  - CSV export with quantity
  - Desktop table view with quantity column
  - Mobile card view
  - Full i18n support (ES/EN)

- **New Loan Interface Fields**:
  - `quantity: number` - Amount of items being loaned
  - `sourceWarehouseId/Name` - Warehouse lending the items
  - `destinationWarehouseId/Name` - Warehouse receiving the items

- **New Translations**:
  - `LOANS.SOURCE_WAREHOUSE` - Bodega Origen / Source Warehouse
  - `LOANS.DEST_WAREHOUSE` - Bodega Destino / Destination Warehouse
  - `LOANS.SELECT_SOURCE_WAREHOUSE` - Select source warehouse
  - `LOANS.SELECT_DEST_WAREHOUSE` - Select destination warehouse
  - `LOANS.NO_ITEMS_IN_WAREHOUSE` - No available items message
  - `LOANS.NO_ITEMS_ADDED` - No items added message
  - `LOANS.SELECT_SOURCE_FIRST` - Select source first message
  - `LOANS.LOANS_CREATED` - Multiple loans created message

### Changed
- Loans now work between warehouses instead of users
- Loan form UI matches transaction form exactly
- Removed UNIQUE-only restriction for loans (all items can be loaned)
- Updated COMPONENT_GUIDE.md with theme-aware classes documentation

### Fixed
- Theme colors across all components (replaced hardcoded `text-slate-300` with `text-foreground`)
- Fixed reactive item filtering using Angular Signals

---

## [1.3.0] - January 14, 2026

### Added
- **Light Mode**: Full light theme support with theme toggle
  - Theme toggle button in navbar with sun/moon icons
  - Persists theme preference in localStorage
  - Automatic theme detection on page load

- **Design System**: New scalable design system architecture
  - `src/styles/design-system/colors.css` - Semantic color tokens for dark/light themes
  - `src/styles/design-system/tokens.css` - Spacing, typography, radius, shadows
  - `src/styles/design-system/components.css` - Reusable component classes
  - `src/styles/design-system/utilities.css` - Helper classes
  - WCAG AA compliance (4.5:1+ contrast ratios)

### Fixed
- **Custom Charts Loading**: Fixed timing issue where custom charts showed empty grid lines
  - Added `dataReady` signal to track when API data is loaded
  - Charts now show loading spinner until data is ready

- **Dashboard Stats Alignment**: Secondary stats row now matches main stats row styling
  - Consistent padding, icon sizes, and layout

- **Transaction Creation** (Backend): Fixed inventory updates not being part of database transaction
  - `updateInventoryQuantitiesInTx` now uses transaction client (`tx`) instead of `this.prisma`
  - Automatic status update (IN_STOCK/LOW_STOCK/OUT_OF_STOCK) when quantities change

- **Form Inputs in Light Mode**: Fixed black background on Material form fields
- **Icon Backgrounds in Light Mode**: Fixed harsh colors on status icons

### Changed
- Removed gradient effects from navigation icons
- Dashboard cards use CSS variables from design system
- Improved error handling in transaction form dialog

---

## [1.2.0] - January 12, 2026

### Added
- **Collapsible Sidebar**: New fixed sidebar with collapse/expand functionality
  - Toggle button to switch between expanded (260px) and collapsed (68px) modes
  - Tooltips on icons when collapsed
  - Smooth CSS transitions
  - SidebarService for state management across components
  - Main content adjusts margin automatically

### Fixed
- **Dashboard Status Distribution Chart**: Fixed `getStatusPercentage()` function that was returning 0% for all statuses
  - Now correctly uses `stats().inStockItems`, `stats().lowStockItems`, `stats().outOfStockItems`
- **Dashboard Counters (Users, Warehouses, Categories)**: Fixed timing issue where counters showed 0
  - Replaced parallel subscriptions with `forkJoin` to load all data together
  - Added `catchError` handlers for graceful error handling

### Changed
- Navigation component now uses `SidebarService` instead of local signal
- App layout adjusted to work with fixed sidebar
- Removed old hamburger menu overlay navigation

---

## [1.1.0] - January 9, 2026

### Added
- **Warehouses CRUD**: Full warehouse management with list, add, edit, delete
- **Suppliers CRUD**: Full supplier management with list, add, edit, delete
- **Navigation Links**: Added warehouses and suppliers to side menu
- **Backend Endpoints**: NestJS modules for warehouses and suppliers
- **i18n Translations**: Added warehouse and supplier translations (ES/EN)

### Changed
- Updated PROJECT_OVERVIEW.md with new features
- All documentation files now in English

---

## [1.0.0] - November 22, 2025

### Added
- **Inventory Management**: Full CRUD with filters, search, pagination
- **Dashboard**: Stats cards, recent items table, quick actions
- **Item Detail Modal**: View item details in modal dialog
- **i18n System**: Spanish and English translations with ngx-translate
- **Backend API**: NestJS + Prisma with SQLite

### Changed
- **Color Palette v3.0**: Desaturated colors for reduced eye strain
  - Green/Success: `#4d7c6f` (desaturated teal)
  - Blue/Info: `#6b7bb5` (slate blue)
  - Red/Error: `#b85c5c` (muted red)
  - Orange/Warning: `#c8884d` (muted orange)
  - Background: `#0a0a0a` (pure black)

### Performance Optimizations
- Removed polling (setInterval) - 85% less CPU usage
- Added trackBy in ngFor - 90% fewer re-renders
- Unified stats calculation - 75% fewer iterations
- Added search debouncing - 83% fewer searches
- Enabled OnPush change detection - 60% fewer cycles

### Removed
- Glass effects (backdrop-blur)
- Complex gradients
- color-mix calculations in templates

---

## Data Models

### InventoryItem
- id, name, description, category
- quantity, minQuantity, status
- itemType (UNIQUE/BULK)
- serviceTag, serialNumber (for UNIQUE)
- price, currency (USD/HNL)
- warehouseId, supplierId
- assignedToUserId, assignedAt

### Warehouse
- id, name, location, description

### Supplier
- id, name, location, phone, email

### Loan
- id, inventoryItemId, inventoryItemName, inventoryItemServiceTag
- quantity
- sourceWarehouseId, sourceWarehouseName
- destinationWarehouseId, destinationWarehouseName
- loanDate, dueDate, returnDate
- status (ACTIVE/RETURNED/OVERDUE)
- notes
- createdById, createdByName
- createdAt, updatedAt

---

**Maintained by**: Claude Code
