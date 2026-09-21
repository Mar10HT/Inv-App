# Roadmap

## Current State (v0.5.0)

The application includes:
- Inventory management (bulk and serialized items) with bulk import from CSV/Excel (template download, validation, preview, error handling)
- Warehouses, categories, and suppliers
- User management with role-based access, custom roles, and granular permissions
- Transactions (entry, exit, transfer)
- Inter-warehouse loans with due dates and QR send/return flows
- Inter-warehouse transfer requests with QR confirmation
- Stock takes (physical counts) with variance reporting
- Discharge requests and outflows / write-offs (damaged, lost, sold, etc.) with PDF receipts
- Sales with per-customer-tier pricing (wholesale / distributor / retail) and PDF receipts
- Reports with PDF, Excel, and CSV export, and scheduled reports
- Audit log viewer with filters
- Customizable dashboard (drag-and-drop widgets and custom charts)
- Notifications, command palette (Ctrl+K), and live updates over WebSocket
- Internationalization (English and Spanish)
- Dark and light themes

---

## Planned Features

### Warranty Tracking
Track equipment warranties with purchase dates, expiration alerts (30/15/7 days), and attached documents.

### Purchase Orders
Create purchase requests when stock is low, with draft/pending/approved/received workflow and supplier history.

---

## Backlog

| Feature | Description |
|---------|-------------|
| Email Alerts | Automatic low stock notifications |
| Item QR Labels | Generate and print QR labels for inventory items (loans and transfers already use QR codes) |
| Item Photos | Attach images to inventory items |
| Depreciation | Asset value calculation over time |
| Granular Locations | Shelf/row/position tracking within warehouses |
| Offline Mode | Work offline with sync on reconnect |
