# Changelog

All notable changes to Obsid (frontend) will be documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Version `0.x.x` indicates pre-release development.

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
