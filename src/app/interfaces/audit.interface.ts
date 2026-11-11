export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCESS = 'ACCESS',
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
  /** What the API wrote ('Sale', 'InventoryItem', 'Payment'...), not limited to AuditEntity. */
  entity: string;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes: AuditChange[];
  /** The record before and after the action, as the API logged them (either can be missing). */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}


// Backend API types
export interface BackendAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  /** Usually before/after; some actions (stock take adjustments, loan states) log their data flat. */
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    fields?: string[];
    [key: string]: unknown;
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
