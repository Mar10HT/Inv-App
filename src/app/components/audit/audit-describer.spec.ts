import { AuditAction, AuditChange, AuditLog } from '../../interfaces/audit.interface';
import { AuditDescriber, AuditRefs, AuditText, humanize } from './audit-describer';

// A few real Spanish strings, so the tests read the sentences the screen shows
const DICT: Record<string, string> = {
  'AUDIT.SENTENCE.CREATE': 'creó {{noun}} {{name}}',
  'AUDIT.SENTENCE.QUOTE_CREATE': 'creó la cotización {{name}}',
  'AUDIT.SENTENCE.DELETE': 'eliminó {{noun}} {{name}}',
  'AUDIT.SENTENCE.UPDATE': 'actualizó {{noun}} {{name}}',
  'AUDIT.SENTENCE.CANCEL': 'canceló {{noun}} {{name}}',
  'AUDIT.SENTENCE.CANCEL_REASON': 'canceló {{noun}} {{name}}. Motivo: {{reason}}',
  'AUDIT.SENTENCE.STATUS': 'cambió el estado {{ofNoun}} {{name}} a {{status}}',
  'AUDIT.SENTENCE.SET_FIELD': 'puso {{field}} {{ofNoun}} {{name}} en {{new}}',
  'AUDIT.SENTENCE.CHANGE_FIELD': 'cambió {{field}} {{ofNoun}} {{name}} de {{old}} a {{new}}',
  'AUDIT.SENTENCE.CHANGE_TWO': 'cambió {{first}} y {{second}} {{ofNoun}} {{name}}',
  'AUDIT.SENTENCE.CHANGE_MANY': 'editó {{noun}} {{name}} ({{count}} campos)',
  'AUDIT.SENTENCE.PAYMENT_CREATE': 'registró un pago de {{amount}} a {{doc}}',
  'AUDIT.SENTENCE.STOCK_ADJUST_FROM': 'ajustó el stock de {{name}} de {{old}} a {{new}} por {{source}}',
  'AUDIT.SENTENCE.STOCK_COUNT': 'contó {{counted}} de {{name}} (se esperaban {{expected}})',
  'AUDIT.SENTENCE.LOGIN': 'inició sesión',
  'AUDIT.SENTENCE.ASSIGN': 'asignó {{noun}} {{name}}',
  'AUDIT.SENTENCE.OTHER': '{{action}}: {{noun}} {{name}}',
  'AUDIT.SOURCE.StockTake': 'un conteo físico',
  'AUDIT.OF': 'de {{noun}}',
  'AUDIT.NOUN_OF.InventoryItem': 'del ítem',
  'AUDIT.NOUN.Sale': 'la venta',
  'AUDIT.NOUN.InventoryItem': 'el ítem',
  'AUDIT.NOUN.Warehouse': 'la bodega',
  'AUDIT.ENTITY_NAME.Sale': 'Venta',
  'AUDIT.ENTITY_NAME.Warehouse': 'Bodega',
  'AUDIT.ACTION.UPDATE': 'Actualizado',
  'AUDIT.FIELD.status': 'Estado',
  'AUDIT.FIELD.price': 'Precio',
  'AUDIT.FIELD.quantity': 'Cantidad',
  'AUDIT.FIELD.managerId': 'Encargado',
  'AUDIT.FIELD.warehouseId': 'Bodega',
  'AUDIT.VALUE.ACTIVE': 'Activa',
  'AUDIT.VALUE.CANCELLED': 'Cancelada',
  'AUDIT.VALUE.RECEIVED': 'Recibido',
  'AUDIT.VALUE.YES': 'Sí',
  'AUDIT.VALUE.NO': 'No',
  'AUDIT.DELETED': '(eliminado)',
  'AUDIT.N_ITEMS': '{{count}} ítems',
};

const text: AuditText = {
  t: (key, params) => (DICT[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params?.[k] ?? '')),
  has: (key) => key in DICT,
  locale: 'en-US',
};

const noRefs: AuditRefs = { warehouses: null, users: null, suppliers: null, clients: null, items: null, services: null };

const changesOf = (before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): AuditChange[] => {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys]
    .filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]))
    .map((field) => ({ field, oldValue: before?.[field] ?? null, newValue: after?.[field] ?? null }));
};

const entry = (over: Partial<AuditLog> & { before?: Record<string, unknown>; after?: Record<string, unknown> }): AuditLog => ({
  id: 'l1',
  action: AuditAction.UPDATE,
  entity: 'Sale',
  entityId: 's1',
  entityName: 's1',
  userId: 'u1',
  userName: 'Mario Herrera',
  userEmail: 'mario@x.com',
  changes: changesOf(over.before, over.after),
  createdAt: new Date(2026, 10, 3),
  ...over,
});

describe('AuditDescriber', () => {
  const describer = (logs: AuditLog[] = [], refs: AuditRefs = noRefs) => new AuditDescriber(text, refs, logs);

  describe('the sentence', () => {
    it('names a created document by its number', () => {
      const log = entry({ action: AuditAction.CREATE, after: { number: 'V-0001', status: 'ACTIVE' } });

      expect(describer([log]).sentence(log)).toEqual({ user: 'Mario Herrera', text: 'creó la venta V-0001' });
    });

    it('calls a draft sale a quotation', () => {
      const log = entry({ action: AuditAction.CREATE, after: { number: 'COT-0002', status: 'DRAFT' } });

      expect(describer([log]).sentence(log).text).toBe('creó la cotización COT-0002');
    });

    it('says a cancellation and its reason in words, naming the document from another entry', () => {
      const created = entry({ id: 'c', action: AuditAction.CREATE, after: { number: 'V-0001' } });
      const cancelled = entry({ before: { status: 'ACTIVE' }, after: { status: 'CANCELLED', cancellationReason: 'Error de precio' } });

      expect(describer([created, cancelled]).sentence(cancelled).text).toBe('canceló la venta V-0001. Motivo: Error de precio');
    });

    it('says one changed field with its old and new value', () => {
      const log = entry({ entity: 'InventoryItem', before: { name: 'Headset', price: 53.7, currency: 'HNL' }, after: { name: 'Headset', price: 60, currency: 'HNL' } });

      expect(describer().sentence(log).text).toBe('cambió precio del ítem Headset de HNL 53.70 a HNL 60.00');
    });

    it('names two changed fields, and counts more', () => {
      const two = entry({ entity: 'InventoryItem', before: { name: 'A', price: 1, quantity: 1 }, after: { name: 'A', price: 2, quantity: 2 } });
      const three = entry({ entity: 'InventoryItem', before: { name: 'A', price: 1, quantity: 1, sku: 'x' }, after: { name: 'A', price: 2, quantity: 2, sku: 'y' } });

      expect(describer().sentence(two).text).toBe('cambió precio y cantidad del ítem A');
      expect(describer().sentence(three).text).toBe('editó el ítem A (3 campos)');
    });

    it('reads a flat stock adjustment from a stock take', () => {
      const log = entry({ entity: 'InventoryItem', entityId: 'i1', after: { newQty: 7, previousQty: 10, source: 'StockTake' } });
      const refs = { ...noRefs, items: new Map([['i1', 'Laptop Dell']]) };

      expect(describer([], refs).sentence(log).text).toBe('ajustó el stock de Laptop Dell de 10 a 7 por un conteo físico');
    });

    it('reads a counted stock take line', () => {
      const log = entry({ entity: 'StockTakeItem', after: { itemId: 'i1', countedQty: 0, expectedQty: 2 } });
      const refs = { ...noRefs, items: new Map([['i1', 'Mouse']]) };

      expect(describer([], refs).sentence(log).text).toBe('contó 0 de Mouse (se esperaban 2)');
    });

    it('words a state change other than a cancellation', () => {
      const log = entry({ after: { number: 'V-3', status: 'RECEIVED' } });

      // No NOUN_OF for a sale in this dictionary: falls back to "de" + the noun
      expect(describer([log]).sentence(log).text).toBe('cambió el estado de la venta V-3 a recibido');
    });

    it('records a payment with its amount and the document it pays', () => {
      const sale = entry({ id: 'c', action: AuditAction.CREATE, after: { number: 'V-0009' } });
      const payment = entry({ id: 'p', entity: 'Payment', entityId: 'p1', action: AuditAction.CREATE, after: { amount: 40, saleId: 's1' } });

      expect(describer([sale, payment]).sentence(payment).text).toBe('registró un pago de 40.00 a V-0009');
    });

    it('needs no object for a sign in, and falls back to the action name for an action without its own sentence', () => {
      expect(describer().sentence(entry({ action: AuditAction.LOGIN })).text).toBe('inició sesión');
      expect(describer().sentence(entry({ action: AuditAction.RESTORE as AuditAction, after: { number: 'V-1' } })).text)
        .toBe('restore: la venta V-1');
    });
  });

  describe('names and values', () => {
    it('turns ids into names from the loaded lists, and a missing one into "deleted"', () => {
      const refs = { ...noRefs, warehouses: new Map([['w1', 'Bodega Norte']]) };
      const log = entry({});

      expect(describer([], refs).value('warehouseId', 'w1', log)).toBe('Bodega Norte');
      expect(describer([], refs).value('warehouseId', 'w-gone', log)).toBe('(eliminado)');
    });

    it('keeps an id short when its list could not be loaded', () => {
      expect(describer().value('managerId', 'cmv5tufpy00087dshhbtp5dr4', entry({}))).toBe('…tp5dr4');
    });

    it('names the record itself from the lists when the entry carries no name', () => {
      const refs = { ...noRefs, warehouses: new Map([['w1', 'Bodega Sur']]) };

      expect(describer([], refs).label(entry({ entity: 'Warehouse', entityId: 'w1' }))).toBe('Bodega Sur');
    });

    it('translates states and booleans, and counts lists', () => {
      const log = entry({});
      const d = describer();

      expect(d.value('status', 'ACTIVE', log)).toBe('Activa');
      expect(d.value('isActive', false, log)).toBe('No');
      expect(d.value('items', [{}, {}], log)).toBe('2 ítems');
      expect(d.value('status', 'SOMETHING_NEW', log)).toBe('SOMETHING_NEW');
      expect(d.value('rtn', null, log)).toBe('—');
    });

    it('writes dates for the fields that are dates', () => {
      expect(describer().value('dueDate', '2026-12-31T12:00:00.000Z', entry({}))).toBe('Dec 31, 2026');
    });

    it('labels fields, and makes a readable label for one nobody translated', () => {
      expect(describer().fieldLabel('managerId')).toBe('Encargado');
      expect(describer().fieldLabel('nextPurchaseNumber')).toBe('Next purchase number');
      expect(humanize('system_admin_bypass')).toBe('System admin bypass');
    });

    it('lists the detail rows worded, without internal fields', () => {
      const log = entry({ before: { status: 'ACTIVE', updatedAt: 'x' }, after: { status: 'CANCELLED', updatedAt: 'y' } });

      expect(describer().details(log)).toEqual([
        { field: 'status', label: 'Estado', before: 'Activa', after: 'Cancelada' },
      ]);
    });
  });
});
