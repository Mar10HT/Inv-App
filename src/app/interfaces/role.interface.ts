export interface RoleSummary {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string;
}

export interface RoleDetail extends RoleSummary {
  permissions: RolePermission[];
}

export interface PermissionGroupItem {
  id: string;
  key: string;
  action: string;
  description: string;
}

export interface PermissionGroup {
  module: string;
  permissions: PermissionGroupItem[];
}

export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  displayName?: string;
  description?: string;
  permissionIds?: string[];
}
