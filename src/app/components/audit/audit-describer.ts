import { formatDate } from '@angular/common';
import { AuditAction, AuditLog } from '../../interfaces/audit.interface';

/**
 * Turns an audit log entry into words: one sentence for the list ("creó la
 * venta V-0001"), and translated field names and values for the detail.
 *
 * IDs (warehouse, user, client...) become names from lists the page already
 * loaded. An id that a loaded list doesn't have is something deleted since;
 * when the list couldn't be loaded at all, the id stays short instead.
 */

/** A list of names by id; null while it isn't loaded (or couldn't be). */
export type NameMap = ReadonlyMap<string, string> | null;

export interface AuditRefs {
  warehouses: NameMap;
  users: NameMap;
  suppliers: NameMap;
  clients: NameMap;
  items: NameMap;
  services: NameMap;
}

export interface AuditText {
  /** Translation of a key, with params (ngx-translate's instant). */
  t: (key: string, params?: Record<string, unknown>) => string;
  /** True when the key has a translation in the current language. */
  has: (key: string) => boolean;
  /** Angular locale id of the current language, for dates. */
  locale: string;
}

/** One row of the detail: field, value before and after (already worded). */
export interface AuditDetailRow {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface AuditSentence {
  user: string;
  text: string;
}

const REF_FIELDS: Record<string, keyof AuditRefs> = {
  warehouseId: 'warehouses',
  sourceWarehouseId: 'warehouses',
  destinationWarehouseId: 'warehouses',
  managerId: 'users',
  assignedToId: 'users',
  userId: 'users',
  createdById: 'users',
  supplierId: 'suppliers',
  clientId: 'clients',
  inventoryItemId: 'items',
  itemId: 'items',
  serviceId: 'services',
};

/** Fields that point at another audited document: named by that document's number. */
const DOC_FIELDS = new Set(['saleId', 'purchaseInvoiceId', 'stockTakeId', 'loanId', 'transferRequestId', 'outflowId']);

/** The entity whose own name comes from one of the lists. */
const ENTITY_REFS: Record<string, keyof AuditRefs> = {
  Warehouse: 'warehouses',
  InventoryItem: 'items',
  inventory: 'items',
  Supplier: 'suppliers',
  Client: 'clients',
  User: 'users',
  user: 'users',
  Service: 'services',
};

const MONEY_FIELDS = new Set(['price', 'unitPrice', 'amount', 'totalAmount', 'creditLimit', 'lineTotal', 'taxAmount']);
const PERCENT_FIELDS = new Set(['isvPercent', 'taxPercent']);
const DATE_FIELD = /(At|Date)$/;
const ENUM_VALUE = /^[A-Z][A-Z0-9_]*$/;
/** What the payload carries that isn't a change of the record itself. */
const HIDDEN_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt', 'password']);

/** The words a sentence is built from; the index signature lets it pass as translation params. */
interface Words {
  [key: string]: string;
  noun: string;
  ofNoun: string;
  name: string;
}

export class AuditDescriber {
  /** Number or name of each document, by id, gathered from every loaded entry. */
  private readonly docLabels = new Map<string, string>();

  constructor(
    private readonly text: AuditText,
    private readonly refs: AuditRefs,
    logs: readonly AuditLog[],
  ) {
    for (const log of logs) {
      const own = ownLabel(log);
      if (own && !this.docLabels.has(log.entityId)) this.docLabels.set(log.entityId, own);
    }
  }

  /** What the entry is about, as named on screen: "V-0001", "Bodega Norte". Empty when it has no name. */
  label(log: AuditLog): string {
    const own = ownLabel(log) ?? this.docLabels.get(log.entityId);
    if (own) return own;
    const list = ENTITY_REFS[log.entity];
    return list ? this.refName(list, log.entityId) ?? '' : '';
  }

  /** "Venta", "Ítem de inventario": the kind of record, for the filter and the detail. */
  entityName(entity: string): string {
    const key = `AUDIT.ENTITY_NAME.${entity}`;
    return this.text.has(key) ? this.text.t(key) : humanize(entity);
  }

  actionName(action: string): string {
    const key = `AUDIT.ACTION.${action}`;
    return this.text.has(key) ? this.text.t(key) : humanize(action);
  }

  fieldLabel(field: string): string {
    const key = `AUDIT.FIELD.${field}`;
    return this.text.has(key) ? this.text.t(key) : humanize(field);
  }

  /** A value in words: names for ids, translated states, dates, money. */
  value(field: string, value: unknown, log: AuditLog): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return this.text.t(value ? 'AUDIT.VALUE.YES' : 'AUDIT.VALUE.NO');

    const list = REF_FIELDS[field];
    if (list && typeof value === 'string') {
      return this.refName(list, value) ?? (this.refs[list] ? this.text.t('AUDIT.DELETED') : shortId(value));
    }
    if (DOC_FIELDS.has(field) && typeof value === 'string') {
      return this.docLabels.get(value) ?? shortId(value);
    }
    if (Array.isArray(value)) {
      return field === 'permissionIds'
        ? this.text.t('AUDIT.N_PERMISSIONS', { count: value.length })
        : this.text.t('AUDIT.N_ITEMS', { count: value.length });
    }
    if (typeof value === 'number') {
      if (MONEY_FIELDS.has(field)) {
        const currency = currencyOf(log);
        const amount = value.toFixed(2);
        return currency ? `${currency} ${amount}` : amount;
      }
      if (PERCENT_FIELDS.has(field)) return `${value}%`;
      return String(value);
    }
    if (typeof value === 'string') {
      if (DATE_FIELD.test(field) && !Number.isNaN(Date.parse(value))) {
        return formatDate(value, 'mediumDate', this.text.locale);
      }
      if (ENUM_VALUE.test(value)) {
        const key = `AUDIT.VALUE.${value}`;
        return this.text.has(key) ? this.text.t(key) : value;
      }
      return value;
    }
    return JSON.stringify(value);
  }

  /** Every field of the entry, worded: what changed in an edit, what was set on a create. */
  details(log: AuditLog): AuditDetailRow[] {
    return log.changes
      .filter((c) => !HIDDEN_FIELDS.has(c.field))
      .map((c) => ({
        field: c.field,
        label: this.fieldLabel(c.field),
        before: this.value(c.field, c.oldValue, log),
        after: this.value(c.field, c.newValue, log),
      }));
  }

  /** The list's one-line summary: who, then what they did. */
  sentence(log: AuditLog): AuditSentence {
    return { user: log.userName, text: this.what(log) };
  }

  private what(log: AuditLog): string {
    const t = this.text.t;
    const noun = this.noun(log.entity);
    const ofNoun = this.ofNoun(log.entity, noun);
    const name = this.label(log);
    const base = { noun, ofNoun, name };

    switch (log.action) {
      case AuditAction.LOGIN:
      case AuditAction.LOGOUT:
      case AuditAction.PASSWORD_CHANGE:
        return t(`AUDIT.SENTENCE.${log.action}`);
      case AuditAction.CREATE:
        return this.created(log, base);
      case AuditAction.DELETE:
        return t('AUDIT.SENTENCE.DELETE', base);
      case AuditAction.UPDATE:
        return this.updated(log, base);
      default: {
        const key = `AUDIT.SENTENCE.${log.action}`;
        return this.text.has(key) ? t(key, base) : t('AUDIT.SENTENCE.OTHER', { ...base, action: this.actionName(log.action).toLowerCase() });
      }
    }
  }

  private created(log: AuditLog, base: Words): string {
    const t = this.text.t;
    const after = log.after ?? {};
    if (log.entity === 'Payment' && typeof after['amount'] === 'number') {
      const doc = this.value(after['saleId'] ? 'saleId' : 'purchaseInvoiceId', after['saleId'] ?? after['purchaseInvoiceId'], log);
      return t('AUDIT.SENTENCE.PAYMENT_CREATE', { amount: this.value('amount', after['amount'], log), doc });
    }
    if (log.entity === 'Sale' && after['status'] === 'DRAFT') {
      return t('AUDIT.SENTENCE.QUOTE_CREATE', base);
    }
    return t('AUDIT.SENTENCE.CREATE', base);
  }

  private updated(log: AuditLog, base: Words): string {
    const t = this.text.t;
    const after = log.after ?? {};

    // A stock take or another movement wrote the new quantity of an item
    if (typeof after['newQty'] === 'number' && typeof after['previousQty'] === 'number') {
      const source = typeof after['source'] === 'string' && this.text.has(`AUDIT.SOURCE.${after['source']}`)
        ? this.text.t(`AUDIT.SOURCE.${after['source']}`)
        : '';
      return t(source ? 'AUDIT.SENTENCE.STOCK_ADJUST_FROM' : 'AUDIT.SENTENCE.STOCK_ADJUST', {
        ...base, old: after['previousQty'], new: after['newQty'], source,
      });
    }
    // One line of a stock take counted
    if (log.entity === 'StockTakeItem' && typeof after['countedQty'] === 'number') {
      return t('AUDIT.SENTENCE.STOCK_COUNT', {
        name: this.value('itemId', after['itemId'], log),
        counted: after['countedQty'],
        expected: after['expectedQty'] ?? '—',
      });
    }

    const changes = this.details(log);
    const status = changes.find((c) => c.field === 'status');
    if (status) {
      if (log.changes.find((c) => c.field === 'status')?.newValue === 'CANCELLED') {
        const reason = after['cancellationReason'];
        return typeof reason === 'string' && reason
          ? t('AUDIT.SENTENCE.CANCEL_REASON', { ...base, reason })
          : t('AUDIT.SENTENCE.CANCEL', base);
      }
      return t('AUDIT.SENTENCE.STATUS', { ...base, status: status.after.toLowerCase() });
    }
    if (changes.length === 1) {
      const [only] = changes;
      return only.before === '—'
        ? t('AUDIT.SENTENCE.SET_FIELD', { ...base, field: only.label.toLowerCase(), new: only.after })
        : t('AUDIT.SENTENCE.CHANGE_FIELD', { ...base, field: only.label.toLowerCase(), old: only.before, new: only.after });
    }
    if (changes.length === 2) {
      return t('AUDIT.SENTENCE.CHANGE_TWO', {
        ...base, first: changes[0].label.toLowerCase(), second: changes[1].label.toLowerCase(),
      });
    }
    return changes.length
      ? t('AUDIT.SENTENCE.CHANGE_MANY', { ...base, count: changes.length })
      : t('AUDIT.SENTENCE.UPDATE', base);
  }

  /** "la venta", "el ítem": the record as the object of a sentence. */
  private noun(entity: string): string {
    const key = `AUDIT.NOUN.${entity}`;
    return this.text.has(key) ? this.text.t(key) : this.entityName(entity).toLowerCase();
  }

  /** "del ítem", "de la venta": the record after "of" (Spanish contracts "de el" into "del"). */
  private ofNoun(entity: string, noun: string): string {
    const key = `AUDIT.NOUN_OF.${entity}`;
    return this.text.has(key) ? this.text.t(key) : this.text.t('AUDIT.OF', { noun });
  }

  private refName(list: keyof AuditRefs, id: string): string | undefined {
    return this.refs[list]?.get(id);
  }
}

/** The name, number or code the entry carries about itself. */
function ownLabel(log: AuditLog): string | undefined {
  for (const source of [log.after, log.before]) {
    if (!source) continue;
    for (const key of ['name', 'number', 'displayName', 'code', 'cai', 'requesterName']) {
      const v = source[key];
      if (typeof v === 'string' && v) return v;
    }
  }
  return undefined;
}

function currencyOf(log: AuditLog): string {
  const c = log.after?.['currency'] ?? log.before?.['currency'];
  return typeof c === 'string' ? c : '';
}

function shortId(id: string): string {
  return id.length > 8 ? `…${id.slice(-6)}` : id;
}

/** "sourceWarehouseId" → "Source warehouse id": last resort for a field nobody translated. */
export function humanize(key: string): string {
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
