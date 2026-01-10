# INV-APP - Inventory Management System

## Overview

INV-APP is a modern inventory management web application built with Angular 20.1.0, using the latest framework features like standalone components and Angular Signals. The application provides an intuitive interface for managing products, warehouses, suppliers, and users.

## Tech Stack

### Frontend
- **Angular 20.1.0**: Main framework with standalone components
- **TypeScript 5.8.2**: Strongly typed programming language
- **Angular Material 20.1.4**: Material Design UI components
- **Tailwind CSS 4.1.11**: Utility-first CSS framework
- **RxJS 7.8.0**: Reactive programming
- **ngx-translate**: Internationalization (ES/EN)

### Backend
- **NestJS**: Node.js framework
- **Prisma**: ORM for database
- **SQLite**: Database (dev) / PostgreSQL (prod)

## Project Architecture

### Folder Structure

```
Inv-App/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/        # Main dashboard with stats
│   │   │   ├── inventory/        # Inventory module
│   │   │   │   ├── inventory-form/      # Add/edit form
│   │   │   │   ├── inventory-item/      # Item detail modal
│   │   │   │   └── inventory-list/      # Main list with filters
│   │   │   ├── warehouses/       # Warehouses CRUD
│   │   │   │   ├── warehouses.ts
│   │   │   │   └── warehouse-form-dialog.ts
│   │   │   ├── suppliers/        # Suppliers CRUD
│   │   │   │   ├── suppliers.ts
│   │   │   │   └── supplier-form-dialog.ts
│   │   │   ├── categories/       # Categories management
│   │   │   ├── users/            # Users management
│   │   │   ├── profile/          # User profile
│   │   │   ├── settings/         # App settings
│   │   │   └── shared/           # Shared components
│   │   │       └── navigation/   # Side navigation
│   │   ├── interfaces/           # TypeScript interfaces
│   │   ├── services/             # Application services
│   │   ├── app.config.ts         # App configuration
│   │   ├── app.routes.ts         # Route definitions
│   │   └── app.ts                # Root component
│   ├── assets/i18n/              # Translation files (es.json, en.json)
│   ├── custom-theme.scss         # Material custom theme
│   └── styles.css                # Global styles with Tailwind
```

## Routes

```
/                    → Redirects to /dashboard
/dashboard           → Main control panel
/inventory           → Inventory list
  /inventory/add     → Add new item
  /inventory/edit/:id → Edit existing item
/warehouses          → Warehouse management (CRUD)
/suppliers           → Supplier management (CRUD)
/categories          → Category management
/users               → User management
/profile             → User profile
/settings            → App settings
```

## Implemented Features

### 1. Inventory List (FULLY FUNCTIONAL)
- Real-time multi-dimensional filter system
- Search by name/description
- Filters by category, location, status
- Sortable and paginated table
- Responsive view (table on desktop, cards on mobile)
- CRUD operations (View, Edit, Delete)
- CSV export
- Real-time statistics

### 2. Dashboard (FUNCTIONAL)
- Connected to real backend data
- Stats cards (total items, in stock, low stock, out of stock)
- Recent items table
- Quick action buttons
- Item detail modal

### 3. Warehouse Management (FULLY FUNCTIONAL)
- Responsive list with table/cards
- Add/edit modal dialog
- Delete with confirmation
- Stats card showing total
- Full backend integration

### 4. Supplier Management (FULLY FUNCTIONAL)
- Responsive list with table/cards
- Add/edit modal dialog
- Fields: name, location, phone, email
- Delete with confirmation
- Full backend integration

### 5. Navigation
- Sliding side menu (drawer)
- Smooth animations
- Active route highlighting
- Language selector (ES/EN)
- Fully responsive

## API Endpoints

### Inventory
- `GET /api/inventory` - List all items (with filters)
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/stats` - Get statistics

### Warehouses
- `GET /api/warehouses` - List all
- `GET /api/warehouses/:id` - Get by ID
- `POST /api/warehouses` - Create
- `PUT /api/warehouses/:id` - Update
- `DELETE /api/warehouses/:id` - Delete

### Suppliers
- `GET /api/suppliers` - List all
- `GET /api/suppliers/:id` - Get by ID
- `POST /api/suppliers` - Create
- `PUT /api/suppliers/:id` - Update
- `DELETE /api/suppliers/:id` - Delete

## Style System

### Color Palette (Desaturated Dark Theme)

```css
/* Backgrounds */
bg-[#0a0a0a]    /* Main background (darkest) */
bg-[#1a1a1a]    /* Cards/sections */
bg-[#2a2a2a]    /* Hover/elements */

/* Accent Colors (desaturated) */
#4d7c6f         /* Green/Success - Primary actions */
#6b7bb5         /* Blue/Info */
#b85c5c         /* Red/Error */
#c8884d         /* Orange/Warning */

/* Text */
text-slate-300  /* Primary text */
text-slate-400  /* Secondary text */
text-slate-500  /* Tertiary/placeholders */
```

## Development Progress

**Estimated Progress**: ~50% complete

- **Core infrastructure**: 100% ✓
- **Inventory management**: 100% ✓
- **Warehouse management**: 100% ✓
- **Supplier management**: 100% ✓
- **Dashboard**: 80% ✓
- **Backend API**: 100% ✓
- **i18n (ES/EN)**: 100% ✓
- **Pending**: Categories, Users, Profile, Settings, Auth

## Build & Run

### Development
```bash
# Frontend
cd Inv-App && npm start

# Backend
cd Inv-App-API && npm run start:dev
```

### Production
```bash
npm run build
```

---

**Last Updated**: January 9, 2026
**Version**: 1.1.0
