# Pending Optimizations

> **Important:** Before implementing any optimization, we need to complete all core functionalities first. The priority is to have a functional beta version with all CRUD operations working properly.

## Priority: Beta Version Checklist

- [x] Inventory CRUD (Create, Read, Update, Delete)
- [x] Warehouses CRUD
- [x] Categories CRUD
- [x] Suppliers CRUD
- [x] Users CRUD
- [x] Transactions module
- [x] Dashboard with stats
- [x] Profile page
- [x] Settings page
- [x] Complete form validations
- [ ] Error handling and user feedback
- [ ] Data persistence testing

**Once beta is complete, proceed with the optimizations below.**

---

## Dashboard Charts

### Recommended Library: ng-apexcharts

**Installation:**
```bash
npm install apexcharts ng-apexcharts
```

**Comparison:**

| Aspect | ng2-charts (Chart.js) | ng-apexcharts |
|--------|----------------------|---------------|
| Maintenance | Very mature, +10 years | Active, modern (2018) |
| Scalability | Can slow down with +1000 points | Better performance |
| Ease of use | Easy, many examples | More modern API |
| Date filtering | Requires extra plugin | **Built-in**: zoom, pan, brush |
| Dark mode | Manual configuration | Native with `theme: 'dark'` |
| Chart types | Basic + some advanced | More variety |
| Bundle size | ~60KB | ~120KB |

**Key ApexCharts features:**
- Native zoom (select range with mouse)
- Brush chart (mini chart for range selection)
- Range selector with buttons (1M, 3M, 6M, 1Y, ALL)
- Synchronized tooltips between charts
- Native dark mode support

**Basic example:**
```typescript
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  imports: [NgApexchartsModule],
  template: `
    <apx-chart
      [series]="chartSeries"
      [chart]="chartOptions"
      [xaxis]="xaxis"
      [theme]="{ mode: 'dark' }"
    ></apx-chart>
  `
})
export class DashboardCharts {
  chartSeries = [{ name: 'Items', data: [10, 20, 30, 40] }];
  chartOptions = { type: 'area', height: 350, zoom: { enabled: true } };
  xaxis = { type: 'datetime' };
}
```

---

## Recommended Libraries

### dayjs (Date Manipulation)

Lightweight alternative to Moment.js (2KB vs 70KB).

**Installation:**
```bash
npm install dayjs
```

**Usage:**
```typescript
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Format dates
dayjs(date).format('MMM D, YYYY');  // "Jan 9, 2026"
dayjs(date).fromNow();               // "2 hours ago"
```

---

### @auth0/angular-jwt (JWT Authentication)

Handles JWT tokens with automatic interceptors, expiration checks, and refresh.

**Installation:**
```bash
npm install @auth0/angular-jwt
```

**Configuration:**
```typescript
import { JwtModule } from '@auth0/angular-jwt';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

// In app.config.ts
JwtModule.forRoot({
  config: {
    tokenGetter,
    allowedDomains: ['localhost:3000'],
    disallowedRoutes: ['localhost:3000/auth/login']
  }
})
```

**Key features:**
- Automatic token injection in HTTP requests
- Token expiration validation
- Route guards based on token validity

---

### ngx-permissions (Role-Based Access Control)

Manage roles and permissions in templates and route guards.

**Installation:**
```bash
npm install ngx-permissions
```

**Usage:**
```typescript
// Load permissions after login
this.permissionsService.loadPermissions(['ADMIN', 'EDIT_INVENTORY']);
this.rolesService.addRole('ADMIN', ['EDIT_INVENTORY', 'DELETE_INVENTORY']);

// In templates
<button *ngxPermissionsOnly="['ADMIN']">Delete</button>
<div *ngxPermissionsExcept="['VIEWER']">Edit Form</div>

// Route guards
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [NgxPermissionsGuard],
  data: { permissions: { only: 'ADMIN' } }
}
```

---

## Other Pending Optimizations

- [ ] Implement charts with ng-apexcharts
- [ ] Add date range filter on Dashboard
- [ ] Integrate dayjs for date formatting
- [ ] Authentication and authorization (JWT)
- [ ] Role-based permissions (RBAC)
- [ ] Report export (PDF, Excel)
- [ ] Real-time notifications (WebSockets)
- [ ] Unit and e2e tests
