import { TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Subject } from 'rxjs';

import { InventoryService } from './inventory.service';
import { LoggerService } from '../logger.service';
import { WebSocketService, WsEvent } from '../websocket.service';
import {
  CreateInventoryItemDto,
  InventoryItemInterface,
  RawInventoryItem,
  Supplier,
  UpdateInventoryItemDto,
  Warehouse
} from '../../interfaces/inventory-item.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, supplier, warehouse } from '../../../testing/report-fixtures';
import { environment } from '../../../environments/environment';

const url = (path: string): string => `${environment.apiUrl}${path}`;

const page = <T>(data: T[]) => ({ data, meta: { total: data.length, page: 1, limit: 1000, totalPages: 1 } });

// What the API sends: the dates are strings until the service turns them into Date objects.
const raw = (overrides: Partial<RawInventoryItem> = {}): RawInventoryItem => ({
  ...(item() as unknown as RawInventoryItem),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides
});

const serverError = { status: 500, statusText: 'Server Error' };

describe('InventoryService', () => {
  let service: InventoryService;
  let backend: HttpTestingController;
  let inventoryEvents: Subject<WsEvent>;
  let socket: { connect: jasmine.Spy };
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    inventoryEvents = new Subject<WsEvent>();
    socket = { connect: jasmine.createSpy('connect') };
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'error']);
    TestBed.configureTestingModule({
      providers: [
        ...provideTestBedDefaults(),
        { provide: LoggerService, useValue: logger },
        { provide: WebSocketService, useValue: { ...socket, onInventoryChange: () => inventoryEvents.asObservable() } }
      ]
    });
    service = TestBed.inject(InventoryService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const get = (path: string): TestRequest => backend.expectOne((r) => r.method === 'GET' && r.url === url(path));
  const send = (method: string, path: string): TestRequest =>
    backend.expectOne((r) => r.method === method && r.url === url(path));

  /** The constructor asks for the three lists; answer them so nothing stays pending. */
  const init = (lists: { warehouses?: Warehouse[]; suppliers?: Supplier[]; items?: RawInventoryItem[] } = {}): void => {
    get('/warehouses').flush(page(lists.warehouses ?? []));
    get('/suppliers').flush(page(lists.suppliers ?? []));
    get('/inventory').flush(page(lists.items ?? []));
  };

  describe('startup', () => {
    it('opens the socket and asks for the warehouses, the suppliers and the items, up to 1000 of each', () => {
      const requests = [get('/warehouses'), get('/suppliers'), get('/inventory')];

      expect(requests.map((r) => r.request.params.get('limit'))).toEqual(['1000', '1000', '1000']);
      expect(socket.connect).toHaveBeenCalledTimes(1);
      requests.forEach((r) => r.flush(page([])));
    });

    it('keeps what the API sends and turns the item dates into Date objects', () => {
      init({
        warehouses: [warehouse('w1', 'Zeta'), warehouse('w2', 'Alfa')],
        suppliers: [supplier('s1', 'Acme')],
        items: [raw({ id: 'a', assignedAt: '2026-02-01T00:00:00Z' }), raw({ id: 'b' })]
      });

      expect(service.warehouses().map((w) => w.id)).toEqual(['w1', 'w2']);
      expect(service.suppliers().map((s) => s.id)).toEqual(['s1']);
      expect(service.locations()).toEqual(['Alfa', 'Zeta']);
      const [first, second] = service.items();
      expect(first.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(first.assignedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
      expect(second.assignedAt).toBeUndefined();
      expect(service.loading()).toBeFalse();
    });

    it('leaves the warehouses and suppliers empty and logs when they fail to load', () => {
      get('/warehouses').flush('boom', serverError);
      get('/suppliers').flush('boom', serverError);
      get('/inventory').flush(page([]));

      expect(service.warehouses()).toEqual([]);
      expect(service.suppliers()).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Error loading warehouses', jasmine.anything());
      expect(logger.error).toHaveBeenCalledWith('Error loading suppliers', jasmine.anything());
    });
  });

  describe('loadItems', () => {
    it('shows loading while the request runs and clears the previous error', () => {
      init();
      service.error.set('old');

      service.loadItems();

      expect(service.loading()).toBeTrue();
      expect(service.error()).toBeNull();
      get('/inventory').flush(page([]));
      expect(service.loading()).toBeFalse();
    });

    it('reports a failed load and stops loading', () => {
      init();

      service.loadItems();
      get('/inventory').flush('boom', serverError);

      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
    });

    it('collects the categories sorted and once, and keeps the ones it has already seen', () => {
      init({
        items: [raw({ id: 'a', category: 'B' }), raw({ id: 'b', category: 'A' }), raw({ id: 'c', category: 'B' }), raw({ id: 'd', category: '' })]
      });

      expect(service.categories()).toEqual(['A', 'B']);

      service.loadItems();
      get('/inventory').flush(page([raw({ id: 'e', category: 'C' })]));

      expect(service.categories()).toEqual(['A', 'B', 'C']);
    });
  });

  describe('reads', () => {
    it('getItemsObservable asks for up to 1000 items and gives them with Date objects', () => {
      init();
      let result: InventoryItemInterface[] = [];

      service.getItemsObservable().subscribe((items) => (result = items));
      const request = get('/inventory');
      expect(request.request.params.get('limit')).toBe('1000');
      request.flush(page([raw({ id: 'a' })]));

      expect(result.map((i) => i.id)).toEqual(['a']);
      expect(result[0].updatedAt).toEqual(new Date('2026-01-02T00:00:00Z'));
    });

    it('getItemById gives one item with Date objects', () => {
      init();
      let result: InventoryItemInterface | undefined;

      service.getItemById('a').subscribe((found) => (result = found));
      get('/inventory/a').flush(raw({ id: 'a', assignedAt: '2026-02-01T00:00:00Z' }));

      expect(result?.id).toBe('a');
      expect(result?.assignedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
    });
  });

  describe('createItem', () => {
    const dto = { name: 'New', quantity: 1, category: 'Fresh' } as CreateInventoryItemDto;

    it('posts the item, adds the answer to the list and its category to the categories', () => {
      init({ items: [raw({ id: 'a', category: 'Old' })] });
      let created: InventoryItemInterface | undefined;

      service.createItem(dto).subscribe((newItem) => (created = newItem));
      expect(service.loading()).toBeTrue();
      const request = send('POST', '/inventory');
      expect(request.request.body).toEqual(dto);
      request.flush(raw({ id: 'n', category: 'Fresh' }));

      expect(service.items().map((i) => i.id)).toEqual(['a', 'n']);
      expect(service.categories()).toEqual(['Fresh', 'Old']);
      expect(created?.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(service.loading()).toBeFalse();
    });

    it('records a failure, stops loading, leaves the list alone and lets the caller see the error', () => {
      init({ items: [raw({ id: 'a' })] });
      let failure: unknown;

      service.createItem(dto).subscribe({ error: (err) => (failure = err) });
      send('POST', '/inventory').flush('boom', serverError);

      expect(failure).toBeDefined();
      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
      expect(service.items().map((i) => i.id)).toEqual(['a']);
    });
  });

  describe('updateItem', () => {
    const updates = { name: 'Renamed' } as UpdateInventoryItemDto;

    it('patches the item, replaces only that one in the list and adds a new category', () => {
      init({ items: [raw({ id: 'a', name: 'Old', category: 'Old' }), raw({ id: 'b', name: 'Other', category: 'Old' })] });

      service.updateItem('a', updates).subscribe();
      const request = send('PATCH', '/inventory/a');
      expect(request.request.body).toEqual(updates);
      request.flush(raw({ id: 'a', name: 'Renamed', category: 'Fresh' }));

      expect(service.items().map((i) => i.name)).toEqual(['Renamed', 'Other']);
      expect(service.categories()).toEqual(['Fresh', 'Old']);
      expect(service.loading()).toBeFalse();
    });

    it('records a failure and leaves the list alone', () => {
      init({ items: [raw({ id: 'a', name: 'Old' })] });
      let failure: unknown;

      service.updateItem('a', updates).subscribe({ error: (err) => (failure = err) });
      send('PATCH', '/inventory/a').flush('boom', serverError);

      expect(failure).toBeDefined();
      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
      expect(service.items()[0].name).toBe('Old');
    });
  });

  describe('deleteItem', () => {
    it('deletes the item and takes it out of the list', () => {
      init({ items: [raw({ id: 'a' }), raw({ id: 'b' })] });

      service.deleteItem('a').subscribe();
      send('DELETE', '/inventory/a').flush(null);

      expect(service.items().map((i) => i.id)).toEqual(['b']);
      expect(service.loading()).toBeFalse();
    });

    it('records a failure and keeps the item', () => {
      init({ items: [raw({ id: 'a' })] });
      let failure: unknown;

      service.deleteItem('a').subscribe({ error: (err) => (failure = err) });
      send('DELETE', '/inventory/a').flush('boom', serverError);

      expect(failure).toBeDefined();
      expect(service.error()).toContain('500');
      expect(service.loading()).toBeFalse();
      expect(service.items().map((i) => i.id)).toEqual(['a']);
    });
  });

  describe('refresh', () => {
    it('asks for the warehouses, the suppliers and the items again', () => {
      init();

      service.refresh();

      init({ items: [raw({ id: 'fresh' })] });
      expect(service.items().map((i) => i.id)).toEqual(['fresh']);
    });
  });

  describe('real time updates', () => {
    it('reloads the items and logs when the API reports an inventory change', () => {
      init();

      inventoryEvents.next({} as WsEvent);
      get('/inventory').flush(page([raw({ id: 'x' })]));

      expect(service.items().map((i) => i.id)).toEqual(['x']);
      expect(logger.info).toHaveBeenCalled();
    });

    it('stops listening once the service is destroyed', () => {
      init();

      service.ngOnDestroy();
      inventoryEvents.next({} as WsEvent);

      backend.expectNone((r) => r.method === 'GET' && r.url === url('/inventory'));
    });
  });
});
