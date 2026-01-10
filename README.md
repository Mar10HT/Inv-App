# INV-APP

A modern inventory management system built with Angular 20 and NestJS.

![Angular](https://img.shields.io/badge/Angular-20.1.0-dd0031?style=flat-square&logo=angular)
![NestJS](https://img.shields.io/badge/NestJS-10.0-e0234e?style=flat-square&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Features

- **Inventory Management** - Full CRUD with advanced filters, search, and pagination
- **Warehouse Management** - Track multiple storage locations
- **Supplier Management** - Manage vendor contacts and information
- **Dashboard** - Real-time statistics and quick actions
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Easy on the eyes with desaturated colors
- **i18n Support** - Available in English and Spanish

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 20.1.0 | Main framework (standalone components) |
| Angular Material | 20.1.4 | UI components (dialogs, icons, tables) |
| Tailwind CSS | 4.1.11 | Utility-first styling |
| ngx-translate | 16.0 | Internationalization |
| RxJS | 7.8.0 | Reactive programming |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.0 | Node.js framework |
| Prisma | 5.0 | Database ORM |
| SQLite | - | Development database |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install frontend dependencies
cd Inv-App
npm install

# Install backend dependencies
cd ../Inv-App-API
npm install

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run seed
```

### Running the Application

**Start Backend** (runs on http://localhost:3000)
```bash
cd Inv-App-API
npm run start:dev
```

**Start Frontend** (runs on http://localhost:4200)
```bash
cd Inv-App
npm start
```

---

## Project Structure

```
Inv-App/                          # Frontend (Angular)
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── inventory/        # Inventory module
│   │   │   │   ├── inventory-list/
│   │   │   │   ├── inventory-form/
│   │   │   │   └── inventory-item/
│   │   │   ├── warehouses/       # Warehouse CRUD
│   │   │   ├── suppliers/        # Supplier CRUD
│   │   │   └── shared/           # Shared components
│   │   ├── services/             # API services
│   │   ├── interfaces/           # TypeScript interfaces
│   │   └── app.routes.ts         # Route definitions
│   ├── assets/i18n/              # Translation files
│   └── styles.css                # Global styles

Inv-App-API/                      # Backend (NestJS)
├── src/
│   ├── inventory/                # Inventory module
│   ├── warehouse/                # Warehouse module
│   ├── supplier/                 # Supplier module
│   └── prisma/                   # Database service
└── prisma/
    └── schema.prisma             # Database schema
```

---

## API Endpoints

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items (supports filters) |
| GET | `/api/inventory/:id` | Get item by ID |
| POST | `/api/inventory` | Create new item |
| PUT | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Delete item |
| GET | `/api/inventory/stats` | Get inventory statistics |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/warehouses/:id` | Get warehouse by ID |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/:id` | Update warehouse |
| DELETE | `/api/warehouses/:id` | Delete warehouse |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List all suppliers |
| GET | `/api/suppliers/:id` | Get supplier by ID |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/:id` | Update supplier |
| DELETE | `/api/suppliers/:id` | Delete supplier |

---

## Data Models

### Inventory Item
```typescript
{
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  minQuantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  itemType: 'UNIQUE' | 'BULK';
  serviceTag?: string;      // For UNIQUE items
  serialNumber?: string;    // For UNIQUE items
  sku?: string;
  price?: number;
  currency: 'USD' | 'HNL';
  warehouseId: string;
  supplierId?: string;
}
```

### Warehouse
```typescript
{
  id: string;
  name: string;
  location: string;
  description?: string;
}
```

### Supplier
```typescript
{
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
}
```

---

## Configuration

### Environment Variables

**Frontend** (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

**Backend** (`.env`)
```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

---

## Development Guide

For detailed information on creating new components, see the [Component Guide](./context/COMPONENT_GUIDE.md).

### Key Patterns

- **Standalone Components** - All components use `standalone: true`
- **OnPush Change Detection** - For better performance
- **Angular Signals** - For reactive state management
- **Tailwind + Material** - Tailwind for layout, Material for icons/dialogs

### Code Style

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './my-component.html'
})
export class MyComponent {
  private service = inject(MyService);
  items = signal<Item[]>([]);
  loading = signal(false);
}
```

---

## Scripts

### Frontend
```bash
npm start          # Start dev server
npm run build      # Production build
npm test           # Run tests
```

### Backend
```bash
npm run start:dev  # Start with hot reload
npm run build      # Production build
npm run seed       # Seed database
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Component Guide](./context/COMPONENT_GUIDE.md) | How to create new components |
| [Project Overview](./context/PROJECT_OVERVIEW.md) | Architecture and features |
| [Changelog](./context/CHANGELOG.md) | Version history |
| [Optimizations](./context/OPTIMIZATIONS.md) | Performance improvements |

---

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [Angular](https://angular.dev/)
- [NestJS](https://nestjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Angular Material](https://material.angular.io/)
