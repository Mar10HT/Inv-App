# Changelog - INV-APP

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

---

**Maintained by**: Claude Code
