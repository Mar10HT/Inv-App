export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  EXTERNAL = 'EXTERNAL'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
