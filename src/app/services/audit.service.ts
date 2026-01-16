import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import {
  AuditLog,
  AuditAction,
  AuditEntity,
  AuditChange,
  AuditLogFilter,
  CreateAuditLogDto
} from '../interfaces/audit.interface';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private authService = inject(AuthService);

  private logsSignal = signal<AuditLog[]>([]);
  private loadingSignal = signal(false);

  logs = computed(() => this.logsSignal());
  loading = computed(() => this.loadingSignal());

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load audit logs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('audit_logs');
      if (stored) {
        const logs = JSON.parse(stored).map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt)
        }));
        this.logsSignal.set(logs);
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }
  }

  /**
   * Save audit logs to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('audit_logs', JSON.stringify(this.logsSignal()));
    } catch (e) {
      console.error('Error saving audit logs:', e);
    }
  }

  /**
   * Log an action to audit trail
   */
  log(dto: CreateAuditLogDto): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const newLog: AuditLog = {
      id: this.generateId(),
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      entityName: dto.entityName,
      userId: user.id,
      userName: user.name || 'Unknown',
      userEmail: user.email,
      changes: dto.changes || [],
      metadata: dto.metadata,
      createdAt: new Date()
    };

    this.logsSignal.update(logs => [newLog, ...logs]);
    this.saveToStorage();
  }

  /**
   * Log a create action
   */
  logCreate(entity: AuditEntity, entityId: string, entityName: string, data?: any): void {
    this.log({
      action: AuditAction.CREATE,
      entity,
      entityId,
      entityName,
      metadata: data
    });
  }

  /**
   * Log an update action with changes
   */
  logUpdate(
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    oldData: any,
    newData: any
  ): void {
    const changes = this.detectChanges(oldData, newData);
    if (changes.length === 0) return;

    this.log({
      action: AuditAction.UPDATE,
      entity,
      entityId,
      entityName,
      changes
    });
  }

  /**
   * Log a delete action
   */
  logDelete(entity: AuditEntity, entityId: string, entityName: string): void {
    this.log({
      action: AuditAction.DELETE,
      entity,
      entityId,
      entityName
    });
  }

  /**
   * Log an assignment action
   */
  logAssignment(
    entityId: string,
    entityName: string,
    assignedToName: string,
    isAssign: boolean
  ): void {
    this.log({
      action: isAssign ? AuditAction.ASSIGN : AuditAction.UNASSIGN,
      entity: AuditEntity.INVENTORY_ITEM,
      entityId,
      entityName,
      metadata: { assignedTo: assignedToName }
    });
  }

  /**
   * Log a loan action
   */
  logLoan(
    loanId: string,
    itemName: string,
    borrowerName: string,
    action: 'LOAN' | 'RETURN'
  ): void {
    this.log({
      action: action === 'LOAN' ? AuditAction.LOAN : AuditAction.RETURN,
      entity: AuditEntity.LOAN,
      entityId: loanId,
      entityName: itemName,
      metadata: { borrower: borrowerName }
    });
  }

  /**
   * Detect changes between old and new data
   */
  private detectChanges(oldData: any, newData: any): AuditChange[] {
    const changes: AuditChange[] = [];
    const ignoredFields = ['id', 'createdAt', 'updatedAt', 'warehouse', 'supplier', 'assignedToUser', 'createdBy'];

    for (const key of Object.keys(newData)) {
      if (ignoredFields.includes(key)) continue;

      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null
        });
      }
    }

    return changes;
  }

  /**
   * Get filtered logs
   */
  getFilteredLogs(filter?: AuditLogFilter): AuditLog[] {
    let logs = this.logsSignal();

    if (!filter) return logs;

    if (filter.action) {
      logs = logs.filter(l => l.action === filter.action);
    }

    if (filter.entity) {
      logs = logs.filter(l => l.entity === filter.entity);
    }

    if (filter.userId) {
      logs = logs.filter(l => l.userId === filter.userId);
    }

    if (filter.entityId) {
      logs = logs.filter(l => l.entityId === filter.entityId);
    }

    if (filter.dateFrom) {
      logs = logs.filter(l => l.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      logs = logs.filter(l => l.createdAt <= filter.dateTo!);
    }

    return logs;
  }

  /**
   * Get logs for a specific entity
   */
  getLogsForEntity(entity: AuditEntity, entityId: string): AuditLog[] {
    return this.logsSignal().filter(l => l.entity === entity && l.entityId === entityId);
  }

  /**
   * Clear all logs (admin only)
   */
  clearLogs(): void {
    this.logsSignal.set([]);
    this.saveToStorage();
  }

  /**
   * Export logs to CSV
   */
  exportToCSV(logs?: AuditLog[]): void {
    const data = logs || this.logsSignal();
    const d = ';';

    let csv = `Date${d}Action${d}Entity${d}Entity Name${d}User${d}Email${d}Changes\n`;

    for (const log of data) {
      const date = log.createdAt.toLocaleString();
      const changes = log.changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(' | ');

      csv += `"${date}"${d}"${log.action}"${d}"${log.entity}"${d}"${log.entityName}"${d}"${log.userName}"${d}"${log.userEmail}"${d}"${changes}"\n`;
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  private generateId(): string {
    return 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
