export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
  TRANSFER = 'TRANSFER',
  LOAN = 'LOAN',
  RETURN = 'RETURN'
}

export enum AuditEntity {
  INVENTORY_ITEM = 'INVENTORY_ITEM',
  WAREHOUSE = 'WAREHOUSE',
  CATEGORY = 'CATEGORY',
  SUPPLIER = 'SUPPLIER',
  USER = 'USER',
  TRANSACTION = 'TRANSACTION',
  LOAN = 'LOAN'
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogFilter {
  action?: AuditAction;
  entity?: AuditEntity;
  userId?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateAuditLogDto {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
}

// Backend API types
export interface BackendAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    fields?: string[];
  } | null;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface BackendAuditResponse {
  data: BackendAuditLog[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
