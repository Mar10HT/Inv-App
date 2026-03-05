import { UserRole } from './user.interface';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: AuthUser;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: Date | string;
  warehouseIds?: string[];
}

export interface UpdateProfileResponse {
  message: string;
  user: AuthUser;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
  _dev_token?: string;
  _dev_reset_url?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface PendingReset {
  userId: string;
  userName: string | null;
  userEmail: string;
  token: string;
  resetUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface GeneratedResetLink {
  resetUrl: string;
  token: string;
  expiresAt: string;
}
