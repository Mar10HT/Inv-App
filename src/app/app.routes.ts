import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { permissionGuard } from './guards/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Login - public route (redirects to dashboard if already authenticated)
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.Login),
    canActivate: [loginGuard]
  },

  // Password reset - public routes
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./components/reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },

  // Discharge Request - public route (no auth, accessed via QR)
  {
    path: 'request',
    loadComponent: () => import('./components/discharge-requests/public-form/public-form').then(m => m.PublicFormComponent)
  },

  // Dashboard - protected route
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [permissionGuard('view_dashboard')]
  },

  // Inventory - protected route
  {
    path: 'inventory',
    canActivate: [permissionGuard('view_inventory')],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/inventory/inventory-list/inventory-list').then(m => m.InventoryList)
      },
      {
        path: 'add',
        loadComponent: () => import('./components/inventory/inventory-form/inventory-form.component').then(m => m.InventoryFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./components/inventory/inventory-form/inventory-form.component').then(m => m.InventoryFormComponent)
      }
    ]
  },

  // Other pages - protected routes with permission checks
  {
    path: 'warehouses',
    loadComponent: () => import('./components/warehouses/warehouses').then(m => m.Warehouses),
    canActivate: [permissionGuard('view_warehouses')]
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./components/suppliers/suppliers').then(m => m.Suppliers),
    canActivate: [permissionGuard('view_suppliers')]
  },
  {
    path: 'categories',
    loadComponent: () => import('./components/categories/categories').then(m => m.Categories),
    canActivate: [permissionGuard('view_categories')]
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings),
    canActivate: [permissionGuard('view_settings')]
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users').then(m => m.Users),
    canActivate: [permissionGuard('view_users')]
  },
  {
    path: 'transactions',
    loadComponent: () => import('./components/transactions/transactions').then(m => m.Transactions),
    canActivate: [permissionGuard('view_transactions')]
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports').then(m => m.Reports),
    canActivate: [permissionGuard('view_reports')]
  },
  {
    path: 'audit',
    loadComponent: () => import('./components/audit/audit-log').then(m => m.AuditLogComponent),
    canActivate: [permissionGuard('view_audit')]
  },
  {
    path: 'loans',
    loadComponent: () => import('./components/loans/loans').then(m => m.LoansComponent),
    canActivate: [permissionGuard('view_loans')]
  },
  {
    path: 'transfers',
    loadComponent: () => import('./components/transfers/transfers').then(m => m.TransfersComponent),
    canActivate: [permissionGuard('view_transfers')]
  },
  {
    path: 'discharges',
    loadComponent: () => import('./components/discharge-requests/discharge-list/discharge-list').then(m => m.DischargeListComponent),
    canActivate: [permissionGuard('view_discharges')]
  },
  {
    path: 'discharges/:id',
    loadComponent: () => import('./components/discharge-requests/discharge-detail/discharge-detail').then(m => m.DischargeDetailComponent),
    canActivate: [permissionGuard('view_discharges')]
  }
];
