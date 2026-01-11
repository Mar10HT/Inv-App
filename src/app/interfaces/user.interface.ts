export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
  EXTERNAL = 'EXTERNAL'
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
}
