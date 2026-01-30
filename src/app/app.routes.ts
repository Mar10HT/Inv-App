import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Login - public route (redirects to dashboard if already authenticated)
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.Login),
    canActivate: [loginGuard]
  },

  // Dashboard - protected route
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },

  // Inventory - protected route
  {
    path: 'inventory',
    canActivate: [authGuard],
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

  // Other pages - protected routes
  {
    path: 'warehouses',
    loadComponent: () => import('./components/warehouses/warehouses').then(m => m.Warehouses),
    canActivate: [authGuard]
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./components/suppliers/suppliers').then(m => m.Suppliers),
    canActivate: [authGuard]
  },
  {
    path: 'categories',
    loadComponent: () => import('./components/categories/categories').then(m => m.Categories),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users').then(m => m.Users),
    canActivate: [authGuard]
  },
  {
    path: 'transactions',
    loadComponent: () => import('./components/transactions/transactions').then(m => m.Transactions),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports').then(m => m.Reports),
    canActivate: [authGuard]
  },
  {
    path: 'audit',
    loadComponent: () => import('./components/audit/audit-log').then(m => m.AuditLogComponent),
    canActivate: [authGuard]
  },
  {
    path: 'loans',
    loadComponent: () => import('./components/loans/loans').then(m => m.LoansComponent),
    canActivate: [authGuard]
  },
  {
    path: 'transfers',
    loadComponent: () => import('./components/transfers/transfers').then(m => m.TransfersComponent),
    canActivate: [authGuard]
  }
];
