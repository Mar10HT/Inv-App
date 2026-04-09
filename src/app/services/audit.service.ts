import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { downloadStyledXLSX } from '../utils/xlsx.utils';
import { LoggerService } from './logger.service';
import {
  AuditLog,
  AuditAction,
  AuditEntity,
  AuditChange,
  AuditLogFilter,
  BackendAuditLog,
  BackendAuditResponse
} from '../interfaces/audit.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  private logsSignal = signal<AuditLog[]>([]);
  private loadingSignal = signal(false);
  private totalSignal = signal(0);

  logs = computed(() => this.logsSignal());
  loading = computed(() => this.loadingSignal());
  total = computed(() => this.totalSignal());

  /**
   * Load audit logs from backend API
   */
  loadLogs(options?: { limit?: number; offset?: number; action?: string; entity?: string }): void {
    this.loadingSignal.set(true);

    const params: Record<string, string> = {};
    if (options?.limit) params['limit'] = options.limit.toString();
    if (options?.offset) params['offset'] = options.offset.toString();
    if (options?.action) params['action'] = options.action;
    if (options?.entity) params['entity'] = options.entity;

    this.http.get<BackendAuditResponse>(`${environment.apiUrl}/audit`, { params }).subscribe({
      next: (response) => {
        const mapped = response.data.map(log => this.mapBackendLog(log));
        this.logsSignal.set(mapped);
        this.totalSignal.set(response.meta.total);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.logger.error('Error loading audit logs', err);
        this.loadingSignal.set(false);
      }
    });
  }

  /**
   * Map backend audit log to frontend AuditLog format
   */
  private mapBackendLog(log: BackendAuditLog): AuditLog {
    const changes: AuditChange[] = [];

    if (log.changes) {
      const { before, after, fields } = log.changes;

      if (before && after) {
        // Compare before/after to generate change list
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
          if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changes.push({
              field: key,
              oldValue: before[key] ?? null,
              newValue: after[key] ?? null
            });
          }
        }
      } else if (after && fields) {
        // Only after data with field list
        for (const field of fields) {
          if (after[field] !== undefined) {
            changes.push({
              field,
              oldValue: null,
              newValue: after[field]
            });
          }
        }
      } else if (after) {
        // Only after data
        for (const key of Object.keys(after)) {
          changes.push({
            field: key,
            oldValue: null,
            newValue: after[key]
          });
        }
      }
    }

    // Extract entity name from changes data
    const entityName = (log.changes?.after?.['name'] as string | undefined)
      || (log.changes?.before?.['name'] as string | undefined)
      || log.entityId;

    return {
      id: log.id,
      action: (log.action as AuditAction) || AuditAction.CREATE,
      entity: (log.entity as AuditEntity) || AuditEntity.INVENTORY_ITEM,
      entityId: log.entityId,
      entityName,
      userId: log.user?.id || log.userId || '',
      userName: log.user?.name || log.user?.email || 'System',
      userEmail: log.user?.email || '',
      changes,
      createdAt: new Date(log.createdAt)
    };
  }

  /**
   * Get filtered logs (client-side filtering for search)
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
   * Export logs to CSV
   */
  exportToXLSX(logs?: AuditLog[]): void {
    const data = logs || this.logsSignal();

    const rows = data.map(log => ({
      Date:          log.createdAt.toLocaleString(),
      Action:        log.action,
      Entity:        log.entity,
      'Entity Name': log.entityName,
      User:          log.userName,
      Email:         log.userEmail,
      Changes:       log.changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(' | '),
    }));

    downloadStyledXLSX(rows, {
      sheetName:      'Audit Log',
      filename:       `audit-log-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:    '64748B',
      colWidths:      [20, 10, 16, 30, 20, 28, 50],
      statusColIndex: 1, // Action column: CREATE / UPDATE / DELETE
    });
  }
}
