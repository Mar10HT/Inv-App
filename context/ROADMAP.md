# INV-APP - Development Roadmap

## Current State
The base application is complete with the following features:
- Inventory management (BULK and UNIQUE items)
- Warehouses, Categories, Suppliers
- Users (with EXTERNAL role for assignments only)
- Transactions (Entry, Exit, Transfer)
- Reports (Value, Transactions, Status, Assignments, Trends)
- PDF and CSV export
- Multi-language (ES/EN)
- Dark theme

---

## Upcoming Features

### 1. Bulk Import (CSV/Excel)
**Priority:** High
**Status:** Pending

Allow uploading multiple items from a CSV or Excel file.
- Downloadable template with correct format
- Data validation before import
- Preview of items to import
- Error and duplicate handling
- Support for BULK and UNIQUE items

---

### 2. Change History / Audit Log
**Priority:** High
**Status:** Pending

Record all changes made in the system.
- Who made the change
- What was changed (old value → new value)
- When it was made
- Filters by date, user, entity type
- Exportable to PDF/CSV

---

### 3. Temporary Loans
**Priority:** Medium
**Status:** Pending

Loan system with return date.
- Assign item with due date
- Expiration alerts
- Loan history by item/user
- States: On Loan, Returned, Overdue
- Active loans dashboard

---

### 4. Warranty Control
**Priority:** Medium
**Status:** Pending

Equipment warranty tracking.
- Purchase date
- Warranty duration
- Expiration date
- Alerts before expiring (30, 15, 7 days)
- Attached documents (invoice, certificate)
- Expiring warranties report

---

### 5. Purchase Orders
**Priority:** Medium
**Status:** Pending

Purchase request management.
- Create order when stock is low
- States: Draft, Pending, Approved, Received
- Approval by role (WAREHOUSE_MANAGER+)
- Convert received order to entry transaction
- Order history by supplier

---

### 6. Customizable Dashboard
**Priority:** Low
**Status:** Pending

Draggable widgets on dashboard.
- Choose which metrics to display
- Rearrange widget positions
- Save configuration per user
- Available widgets:
  - Stock summary
  - Custom charts
  - Recent transactions
  - Low stock alerts
  - Loans expiring soon
  - Warranties expiring soon

---

## Future Features (Backlog)

| Feature | Description |
|---------|-------------|
| Email Alerts | Automatic low stock notifications |
| QR Codes | Generate and print QR for UNIQUE items |
| Item Photos | Attach images to products |
| Digital Signature | On-screen signature when assigning equipment |
| Depreciation | Current asset value calculation |
| Granular Location | Shelf, row, position in warehouse |
| REST API | Endpoints for external integration |
| Offline Mode | Sync when connection is available |

---

## Changelog

### v2.1.0 (In Development)
- [ ] Bulk CSV import
- [ ] Change history / Audit log

### v2.0.0 (Current)
- [x] Complete base system
- [x] Reports with PDF/CSV export
- [x] EXTERNAL role for users without access
- [x] Full migration to Tailwind CSS
- [x] Trend charts with ApexCharts

---

*Last updated: January 2026*
