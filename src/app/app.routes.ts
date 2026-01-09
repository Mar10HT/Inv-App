import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { InventoryList } from './components/inventory/inventory-list/inventory-list';
import { InventoryFormComponent } from './components/inventory/inventory-form/inventory-form.component';
import { InventoryItem } from './components/inventory/inventory-item/inventory-item';
import { Categories } from './components/categories/categories';
import { Profile } from './components/profile/profile';
import { Settings } from './components/settings/settings';
import { Users } from './components/users/users';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard',
    component: Dashboard
  },
  {
    path: 'inventory',
    children: [
      { path: '', component: InventoryList },
      { path: 'add', component: InventoryFormComponent },
      { path: 'edit/:id', component: InventoryFormComponent },
      { path: ':id', component: InventoryItem}
    ]
  },
  { 
    path: 'categories',
    component: Categories
  },{ 
    path: 'profile',
    component: Profile
  },
  { 
    path: 'settings',
    component: Settings
  },
  { 
    path: 'users',
    component: Users
  }
];