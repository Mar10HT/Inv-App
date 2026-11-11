import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { downloadStyledXLSX } from '../utils/xlsx.utils';
import { LoggerService } from './logger.service';
import {
  AuditLog,
  AuditAction,
  AuditChange,
  BackendAuditLog,
  BackendAuditResponse
} from '../interfaces/audit.interface';
import { environment } from '../../environments/environment';
import { localDateKey } from '../utils/date.utils';

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
    const { before, after, fields } = this.normalize(log.changes);

    if (before || after) {
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

    const entityName = (after?.['name'] as string | undefined)
      || (before?.['name'] as string | undefined)
      || log.entityId;

    return {
      id: log.id,
      action: (log.action as AuditAction) || AuditAction.CREATE,
      entity: log.entity,
      entityId: log.entityId,
      entityName,
      userId: log.user?.id || log.userId || '',
      userName: log.user?.name || log.user?.email || 'System',
      userEmail: log.user?.email || '',
      changes,
      before,
      after,
      createdAt: new Date(log.createdAt)
    };
  }

  /**
   * Most entries log { before, after, fields }; some log their data flat
   * ({ status: 'RECEIVED' }, { newQty, previousQty, source }). A flat one is
   * read as the after side, so its data still shows.
   */
  private normalize(changes: BackendAuditLog['changes']): {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    fields?: string[];
  } {
    if (!changes) return {};
    if ('before' in changes || 'after' in changes) {
      return { before: changes.before ?? undefined, after: changes.after ?? undefined, fields: changes.fields };
    }
    return { after: changes };
  }

  /**
   * Download the given rows as an Excel file. The page words them (translated
   * columns, the same sentence as the list), so the file reads like the screen.
   */
  async exportToXLSX(rows: Record<string, string>[]): Promise<void> {
    await downloadStyledXLSX(rows, {
      sheetName:      'Audit Log',
      filename:       `audit-log-${localDateKey(new Date())}.xlsx`,
      headerColor:    '64748B',
      colWidths:      [20, 22, 18, 22, 60, 60],
    });
  }
}
