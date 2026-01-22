<div align="center">

# 🖥️ Inv-App Frontend

### Modern Angular 20 Inventory Management Interface

[![Angular](https://img.shields.io/badge/Angular-20.1.0-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev)
[![Material](https://img.shields.io/badge/Material-20.1.4-757575?style=for-the-badge&logo=mui&logoColor=white)](https://material.angular.io)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.1-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br/>

[Features](#-key-features) •
[Getting Started](#-getting-started) •
[Structure](#-project-structure) •
[Components](#-components)

</div>

---

## ✨ Key Features

<table>
<tr>
<td>

### 🎨 Modern UI/UX
- **Standalone Components** - Latest Angular patterns
- **Angular Signals** - Reactive state management
- **OnPush Detection** - Optimized rendering
- **Skeleton Loading** - Smooth loading states

</td>
<td>

### 🌙 Theming
- Dark/Light mode toggle
- WCAG AA compliant
- Design system tokens
- Semantic color palette

</td>
</tr>
<tr>
<td>

### 🌍 Internationalization
- English & Spanish
- ngx-translate integration
- Easy to extend
- Lazy-loaded translations

</td>
<td>

### ⌨️ Productivity
- Command palette (Ctrl+K)
- Keyboard shortcuts
- Quick search
- Batch operations

</td>
</tr>
</table>

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start
# → http://localhost:4200

# Build for production
npm run build

# Run tests
npm test

# E2E tests
npm run e2e
```

### Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── 📂 components/
│   │   ├── dashboard/           # Main dashboard + custom charts
│   │   ├── inventory/           # Inventory CRUD
│   │   │   ├── inventory-list/  # Table with filters
│   │   │   ├── inventory-form/  # Create/Edit form
│   │   │   └── inventory-item/  # Detail dialog
│   │   ├── warehouses/          # Warehouse management
│   │   ├── suppliers/           # Supplier management
│   │   ├── categories/          # Category management
│   │   ├── transactions/        # Stock movements
│   │   ├── loans/               # Item lending
│   │   ├── reports/             # Analytics & exports
│   │   ├── users/               # User management
│   │   ├── profile/             # User profile
│   │   ├── settings/            # App settings
│   │   ├── login/               # Authentication
│   │   └── shared/              # Reusable components
│   │       ├── navigation/      # Sidebar + header
│   │       ├── confirm-dialog/  # Confirmation modal
│   │       ├── skeleton/        # Loading skeletons
│   │       └── command-palette/ # Quick search (Ctrl+K)
│   │
│   ├── 📂 services/
│   │   ├── inventory/           # Inventory API + state
│   │   ├── auth.service.ts      # Authentication
│   │   ├── theme.service.ts     # Dark/Light mode
│   │   ├── notification.service.ts
│   │   └── ...
│   │
│   ├── 📂 guards/
│   │   ├── auth.guard.ts        # Route protection
│   │   └── role.guard.ts        # Role-based access
│   │
│   ├── 📂 interfaces/
│   │   ├── inventory-item.interface.ts
│   │   ├── warehouse.interface.ts
│   │   └── ...
│   │
│   └── app.routes.ts            # Lazy-loaded routes
│
├── assets/
│   └── i18n/                    # Translation files
│       ├── en.json
│       └── es.json
│
└── styles/
    ├── design-system/           # Design tokens
    │   ├── colors.css           # Color palette
    │   ├── tokens.css           # Spacing, typography
    │   └── components.css       # Component classes
    └── styles.css               # Global styles
```

---

## 🧩 Components

### Dashboard
| Component | Description |
|-----------|-------------|
| `DashboardComponent` | Main view with stats cards and charts |
| `CustomChartDialog` | Create custom charts (Bar, Line, Pie, etc.) |
| `DragDropGrid` | Reorderable widget grid |

### Inventory
| Component | Description |
|-----------|-------------|
| `InventoryList` | Paginated table with filters |
| `InventoryForm` | Create/Edit form with validation |
| `InventoryItem` | Detail view dialog |
| `ImportDialog` | Excel import wizard |

### Shared
| Component | Description |
|-----------|-------------|
| `Navigation` | Sidebar with nested menus |
| `ConfirmDialog` | Generic confirmation modal |
| `SkeletonCard` | Loading placeholder (card) |
| `SkeletonTable` | Loading placeholder (table) |
| `CommandPalette` | Quick search (Ctrl+K) |

---

## 🎯 State Management

Using **Angular Signals** for reactive state:

```typescript
@Injectable({ providedIn: 'root' })
export class InventoryService {
  // Signals for reactive state
  private itemsSignal = signal<InventoryItem[]>([]);
  private loadingSignal = signal<boolean>(false);

  // Computed values
  items = computed(() => this.itemsSignal());
  loading = computed(() => this.loadingSignal());

  lowStockItems = computed(() =>
    this.items().filter(i => i.status === 'LOW_STOCK')
  );
}

// In component
@Component({...})
export class InventoryList {
  private service = inject(InventoryService);

  items = this.service.items;      // Auto-updates
  loading = this.service.loading;
}
```

---

## 🎨 Styling

### Design System

```css
/* Semantic color tokens */
--color-primary: oklch(0.65 0.19 255);
--color-success: oklch(0.72 0.19 142);
--color-warning: oklch(0.80 0.15 85);
--color-danger: oklch(0.65 0.20 27);

/* Dark mode auto-switch */
@media (prefers-color-scheme: dark) {
  :root { /* dark colors */ }
}
```

### Component Patterns

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TranslateModule],
  template: `
    @if (loading()) {
      <app-skeleton-table />
    } @else {
      <mat-table [dataSource]="items()">...</mat-table>
    }
  `
})
export class ExampleComponent {
  private service = inject(MyService);
  items = this.service.items;
  loading = this.service.loading;
}
```

---

## 📊 Charts

Using **ng-apexcharts** for data visualization:

| Chart Type | Use Case |
|------------|----------|
| Bar | Category comparison |
| Line | Trends over time |
| Area | Volume visualization |
| Pie/Donut | Distribution |
| Radial | Progress/Goals |

```typescript
// Custom chart creation
this.dialog.open(CustomChartDialog, {
  data: {
    dataSources: ['byCategory', 'byWarehouse', 'byStatus'],
    chartTypes: ['bar', 'line', 'pie', 'donut']
  }
});
```

---

## 🔐 Route Guards

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () => import('./components/inventory/inventory-list')
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SYSTEM_ADMIN'] },
    loadComponent: () => import('./components/users/users')
  }
];
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run e2e
```

---

## 📦 Build & Deploy

```bash
# Production build
npm run build
# Output: dist/inv-app/

# Analyze bundle
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/inv-app/stats.json
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

See [VERCEL-DEPLOYMENT.md](./context/VERCEL-DEPLOYMENT.md) for details.

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| [Component Guide](./context/COMPONENT_GUIDE.md) | How to create components |
| [Project Overview](./context/PROJECT_OVERVIEW.md) | Architecture overview |
| [Optimizations](./context/OPTIMIZATIONS.md) | Performance analysis |
| [Migration Lucide](./context/MIGRATION-LUCIDE.md) | Icon migration guide |
| [Vercel Deployment](./context/VERCEL-DEPLOYMENT.md) | Frontend hosting |
| [Changelog](./context/CHANGELOG.md) | Version history |

---

<div align="center">

**Inventory Management System - Frontend**

</div>
