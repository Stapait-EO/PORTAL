export type UserRole = 'admin' | 'user' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean;
  allowedApps: string[]; // List of app_ids (e.g. ['expedicao', 'vendas'])
  createdAt: string;
  lastLogin?: string;
}

export interface AppInfo {
  id: string;
  appId: string; // e.g., 'expedicao'
  name: string; // e.g., 'Sistema de Expedição'
  description: string;
  callbackUrl: string; // e.g., 'https://expedicao.mifireapp.com.br/callback'
  secretKey: string; // Integration secret key
  icon: string; // Lucide icon name or emoji
  active: boolean;
  category?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  username: string;
  appId?: string;
  appName?: string;
  ip: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  action: 'LOGIN' | 'LOGOUT' | 'VALIDATE_TOKEN' | 'PASSWORD_CHANGE' | 'ACCESS_DENIED' | 'ADMIN_ACTION';
  details: string;
}

export interface UserAppPermission {
  userId: string;
  appId: string;
  grantedAt: string;
  grantedBy: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface LoginParams {
  redirect_url?: string;
  app_id?: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: Omit<User, 'password'>;
  authorizedForApp?: boolean;
  message?: string;
  app?: Partial<AppInfo>;
}
