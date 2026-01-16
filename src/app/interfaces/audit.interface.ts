export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
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
  oldValue: any;
  newValue: any;
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}
