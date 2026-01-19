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
│   │   │   ├── transactions/     # Transaction management
│   │   │   ├── loans/            # Warehouse-to-warehouse loans
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
/login               → User authentication (public)
/dashboard           → Main control panel (protected)
/inventory           → Inventory list (protected)
  /inventory/add     → Add new item (protected)
  /inventory/edit/:id → Edit existing item (protected)
/warehouses          → Warehouse management CRUD (protected)
/suppliers           → Supplier management CRUD (protected)
/categories          → Category management CRUD (protected)
/users               → User management CRUD (protected)
/transactions        → Transaction history (protected)
/loans               → Loan management (protected)
/profile             → User profile (protected)
/settings            → App settings (protected)
```

## Implemented Features

### 1. Authentication & Security (FULLY FUNCTIONAL)
- JWT-based authentication with 7-day token expiration
- **Secure HttpOnly cookies**: Tokens stored in secure cookies (not localStorage)
- **CSRF Protection**: Double Submit Cookie Pattern with csrf-csrf
  - CSRF token endpoint: `/api/auth/csrf-token`
  - HttpOnly `_csrf` cookie with SameSite=Strict
  - Automatic token validation on state-changing requests
  - Frontend CSRF interceptor adds `X-CSRF-Token` header
- Login page with email/password
- User registration
- Auth guard protecting all routes
- HTTP interceptor with `withCredentials: true`
- Auto-redirect to login when not authenticated
- Secure password hashing with bcrypt (10 rounds)
- Rate limiting: 5 login attempts per minute, 3 register attempts per minute
- Security headers with Helmet
- Admin user auto-created in seed script
- **Credentials**: admin@example.com / password123

### 2. Dashboard (FULLY FUNCTIONAL)
- Connected to real backend data
- Stats cards showing:
  - Total items, in stock, low stock, out of stock
  - Total value in USD and HNL
  - Total users, warehouses, categories
- Category distribution chart with progress bars
- Warehouse distribution chart with progress bars
- Low stock alerts table (limited to 10 items with pagination)
- Recent transactions list (last 5)
- Recent items table (last 5)
- Quick action buttons (Add item, View all)

### 3. Inventory Management (FULLY FUNCTIONAL)
- Real-time multi-dimensional filter system
- Search by name/description/SKU/serial number
- Filters by category, location, status, item type
- Sortable and paginated table
- Responsive view (table on desktop, cards on mobile)
- CRUD operations (View, Edit, Delete)
- CSV export
- Real-time statistics
- Support for UNIQUE (serialized) and BULK items
- Service tag and serial number tracking
- User assignment for UNIQUE items
- Auto-status calculation based on quantity
- Full backend integration with validation

### 4. Warehouse Management (FULLY FUNCTIONAL)
- Responsive list with table/cards view
- Add/edit modal dialog
- Delete with confirmation
- Stats card showing total count
- Full backend integration
- Fields: name, location, description
- Item count per warehouse

### 5. Supplier Management (FULLY FUNCTIONAL)
- Responsive list with table/cards view
- Add/edit modal dialog
- Fields: name, location, phone, email
- Delete with confirmation
- Stats card showing total count
- Full backend integration

### 6. Category Management (FULLY FUNCTIONAL)
- Responsive list with table/cards view
- Add/edit modal dialog
- Delete with confirmation
- Stats card showing total count
- Full backend integration
- Fields: name, description
- Unique name validation

### 7. User Management (FULLY FUNCTIONAL)
- Responsive list with table/cards view
- Add/edit modal dialog
- Role-based access (ADMIN/EXTERNAL)
- Password hashing with bcrypt
- Delete with confirmation
- Stats card showing total count
- Full backend integration
- Password excluded from API responses

### 8. Transaction Management (FULLY FUNCTIONAL)
- Transaction types: IN (incoming), OUT (outgoing), TRANSFER
- Automatic inventory quantity updates based on transaction type
- Recent transactions view (last 5)
- Full transaction history
- Fields: type, date, items, source/destination warehouses, user, notes
- Transaction items with quantities
- Full backend integration
- Validation based on transaction type

### 9. Loan Management (FULLY FUNCTIONAL)
- Warehouse-to-warehouse loan system
- Create loans with multiple items (same UI as transactions)
- Each item row has: item selector (with available qty), quantity input, notes input
- Due date tracking with automatic overdue detection
- Loan statuses: ACTIVE, OVERDUE, RETURNED
- Return loan with confirmation dialog
- Statistics dashboard: Active, Overdue, Due Soon, Returned
- Filter by status and search by item/warehouse
- Pagination and CSV export
- Responsive design (table/cards)
- Full i18n support (ES/EN)
- localStorage persistence

### 10. Navigation (FULLY FUNCTIONAL)
- Fixed collapsible sidebar (not overlay)
- Toggle between expanded (260px) and collapsed (68px) modes
- Tooltips on icons when collapsed
- Smooth CSS transitions
- Active route highlighting
- Language selector (ES/EN)
- User info display with avatar
- SidebarService for state management

### 11. Profile & Settings (IMPLEMENTED)
- User profile view and edit
- App settings management
- Language preferences
- Theme preferences

## API Endpoints

### Authentication
- `GET /api/auth/csrf-token` - Get CSRF token (sets HttpOnly cookie)
- `POST /api/auth/login` - User login (sets JWT in HttpOnly cookie)
- `POST /api/auth/register` - User registration (sets JWT in HttpOnly cookie)
- `POST /api/auth/logout` - User logout (clears cookies)
- `GET /api/auth/profile` - Get current user profile (requires JWT)
- `POST /api/auth/profile` - Update current user profile
- `POST /api/auth/change-password` - Change user password

### Inventory
- `GET /api/inventory` - List all items (with filters, pagination)
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create item
- `PATCH /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/stats` - Get statistics
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/categories` - Get unique categories
- `GET /api/inventory/locations` - Get warehouse locations

### Warehouses
- `GET /api/warehouses` - List all
- `GET /api/warehouses/:id` - Get by ID
- `POST /api/warehouses` - Create
- `PATCH /api/warehouses/:id` - Update
- `DELETE /api/warehouses/:id` - Delete

### Suppliers
- `GET /api/suppliers` - List all
- `GET /api/suppliers/:id` - Get by ID
- `POST /api/suppliers` - Create
- `PATCH /api/suppliers/:id` - Update
- `DELETE /api/suppliers/:id` - Delete

### Categories
- `GET /api/categories` - List all
- `GET /api/categories/:id` - Get by ID
- `POST /api/categories` - Create
- `PATCH /api/categories/:id` - Update
- `DELETE /api/categories/:id` - Delete

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get by ID
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Transactions
- `GET /api/transactions` - List all transactions
- `GET /api/transactions/recent` - Get recent transactions (limit query param)
- `GET /api/transactions/:id` - Get by ID
- `POST /api/transactions` - Create transaction (IN/OUT/TRANSFER)
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

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

**Estimated Progress**: ~95% complete

- **Core infrastructure**: 100% ✓
- **Authentication & Security**: 100% ✓
  - JWT authentication ✓
  - HttpOnly cookies for tokens ✓
  - CSRF protection (Double Submit Cookie) ✓
  - Auth guards ✓
  - HTTP interceptor ✓
  - Password hashing ✓
  - Rate limiting ✓
  - Security headers (Helmet) ✓
- **Inventory management**: 100% ✓
  - CRUD operations ✓
  - Advanced filtering ✓
  - UNIQUE/BULK item types ✓
  - User assignments ✓
- **Warehouse management**: 100% ✓
- **Supplier management**: 100% ✓
- **Category management**: 100% ✓
- **User management**: 100% ✓
- **Transaction management**: 100% ✓
  - IN/OUT/TRANSFER types ✓
  - Auto inventory updates ✓
- **Dashboard**: 100% ✓
  - Real-time stats ✓
  - Charts and visualizations ✓
  - Low stock alerts ✓
  - Recent activity ✓
- **Backend API (NestJS + Prisma)**: 100% ✓
  - All CRUD endpoints ✓
  - Authentication endpoints ✓
  - Stats endpoints ✓
  - Data validation ✓
  - Error handling ✓
- **Database (SQLite)**: 100% ✓
  - Complete schema ✓
  - Seed script with 200 items ✓
  - Auto-create admin user ✓
- **i18n (ES/EN)**: 100% ✓
- **Profile & Settings**: 100% ✓

**Pending/Minor Issues**:
- Production deployment configuration
- Additional reports and analytics

## Build & Run

### Development
```bash
# Frontend (Angular)
cd Inv-App && npm start
# Runs on http://localhost:4200

# Backend (NestJS)
cd Inv-App-API && npm run start:dev
# Runs on http://localhost:3000
# API available at http://localhost:3000/api

# Database seeding (creates 200 items + admin user)
cd Inv-App-API && npm run seed

# Create admin user only
cd Inv-App-API && npm run create-admin

# Prisma Studio (database GUI)
cd Inv-App-API && npx prisma studio
# Opens on http://localhost:5555
```

### Production
```bash
# Frontend
cd Inv-App && npm run build

# Backend
cd Inv-App-API && npm run build
cd Inv-App-API && npm run start:prod
```

### Default Credentials
```
Email: admin@example.com
Password: password123
```

## Database Schema

### Models
- **User**: Authentication and user management (ADMIN/EXTERNAL roles)
- **InventoryItem**: Products with UNIQUE/BULK types, service tags, serial numbers
- **Warehouse**: Storage locations
- **Supplier**: Product suppliers
- **Category**: Product categories
- **Transaction**: Inventory movements (IN/OUT/TRANSFER)
- **TransactionItem**: Items within transactions
- **Loan**: Warehouse-to-warehouse loans with quantity, due date, status (localStorage)
- **AuditLog**: Change history tracking

---

**Last Updated**: January 19, 2026
**Version**: 0.4.5
