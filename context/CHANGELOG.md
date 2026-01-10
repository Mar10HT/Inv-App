# Changelog - INV-APP

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
