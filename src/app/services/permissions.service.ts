import { Injectable, inject } from '@angular/core';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';
import { UserRole } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private permissionsService = inject(NgxPermissionsService);
  private rolesService = inject(NgxRolesService);

  /**
   * Define permissions for each role
   * SYSTEM_ADMIN: Full access to everything
   * WAREHOUSE_MANAGER: Manage inventory, warehouses, transactions
   * USER: Basic CRUD operations on inventory
   * VIEWER: Read-only access
   * EXTERNAL: Minimal access, view assigned items only
   */
  private rolePermissions: Record<UserRole, string[]> = {
    [UserRole.SYSTEM_ADMIN]: [
      // Users
      'view_users',
      'create_users',
      'edit_users',
      'delete_users',
      // Inventory
      'view_inventory',
      'create_inventory',
      'edit_inventory',
      'delete_inventory',
      // Warehouses
      'view_warehouses',
      'create_warehouses',
      'edit_warehouses',
      'delete_warehouses',
      // Categories
      'view_categories',
      'create_categories',
      'edit_categories',
      'delete_categories',
      // Suppliers
      'view_suppliers',
      'create_suppliers',
      'edit_suppliers',
      'delete_suppliers',
      // Transactions
      'view_transactions',
      'create_transactions',
      'edit_transactions',
      'delete_transactions',
      // Settings
      'view_settings',
      'edit_settings',
      // Dashboard
      'view_dashboard',
      'view_reports'
    ],
    [UserRole.WAREHOUSE_MANAGER]: [
      // Inventory
      'view_inventory',
      'create_inventory',
      'edit_inventory',
      'delete_inventory',
      // Warehouses
      'view_warehouses',
      'create_warehouses',
      'edit_warehouses',
      // Categories
      'view_categories',
      'create_categories',
      'edit_categories',
      // Suppliers
      'view_suppliers',
      'create_suppliers',
      'edit_suppliers',
      // Transactions
      'view_transactions',
      'create_transactions',
      'edit_transactions',
      // Dashboard
      'view_dashboard',
      'view_reports'
    ],
    [UserRole.USER]: [
      // Inventory
      'view_inventory',
      'create_inventory',
      'edit_inventory',
      // Warehouses
      'view_warehouses',
      // Categories
      'view_categories',
      // Suppliers
      'view_suppliers',
      // Transactions
      'view_transactions',
      'create_transactions',
      // Dashboard
      'view_dashboard'
    ],
    [UserRole.VIEWER]: [
      // View only access
      'view_inventory',
      'view_warehouses',
      'view_categories',
      'view_suppliers',
      'view_transactions',
      'view_dashboard'
    ],
    [UserRole.EXTERNAL]: [
      // Minimal access - view only their assigned items
      'view_assigned_items'
    ]
  };

  /**
   * Load permissions for a user based on their role
   */
  loadPermissions(role: UserRole): void {
    const permissions = this.rolePermissions[role] || [];
    this.permissionsService.loadPermissions(permissions);

    // Also set the role itself as a permission for easy role-based checks
    this.rolesService.addRole(role, permissions);
  }

  /**
   * Clear all permissions (useful for logout)
   */
  clearPermissions(): void {
    this.permissionsService.flushPermissions();
    this.rolesService.flushRoles();
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string): boolean {
    const permissions = this.permissionsService.getPermissions();
    return permission in permissions;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    const roles = this.rolesService.getRoles();
    return role in roles;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: UserRole): string[] {
    return this.rolePermissions[role] || [];
  }
}
