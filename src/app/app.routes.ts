import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Dashboard - loaded on first visit (most common entry point)
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
  },

  // Inventory - lazy loaded
  {
    path: 'inventory',
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
      },
      {
        path: ':id',
        loadComponent: () => import('./components/inventory/inventory-item/inventory-item').then(m => m.InventoryItem)
      }
    ]
  },

  // Other pages - lazy loaded
  {
    path: 'categories',
    loadComponent: () => import('./components/categories/categories').then(m => m.Categories)
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile').then(m => m.Profile)
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings)
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users').then(m => m.Users)
  }
];
