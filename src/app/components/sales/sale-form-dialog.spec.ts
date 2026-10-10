import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';

import { SaleFormDialog } from './sale-form-dialog';
import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { CustomerType, Sale, SaleStatus } from '../../interfaces/sale.interface';
import { PaymentCondition } from '../../interfaces/purchase-invoice.interface';
import { InventoryItemInterface } from '../../interfaces/inventory-item.interface';
import { Client } from '../../interfaces/client.interface';
import { ClientService } from '../../services/client.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse } from '../../../testing/report-fixtures';

const client = (overrides: Partial<Client> = {}): Client =>
  ({
    id: 'c1',
    code: 'CLI-001',
    name: 'Acme Corp',
    paymentCondition: PaymentCondition.CREDIT,
    isActive: true,
    ...overrides
  }) as unknown as Client;

const draftSale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 'draft-1',
    name: 'Draft 1',
    warehouseId: 'w1',
    customerName: 'Acme',
    customerType: CustomerType.RETAIL,
    currency: 'HNL',
    totalAmount: 900,
    taxPercent: 15,
    taxAmount: 135,
    status: SaleStatus.DRAFT,
    notes: 'draft notes',
    number: null,
    items: [
      { id: 'si1', inventoryItemId: 'laptop', quantity: 1, unitPrice: 900, lineTotal: 900, taxPercent: null, taxAmount: 135, currency: 'HNL', itemName: 'Laptop', serviceTag: null, notes: null },
    ],
    ...overrides
  }) as unknown as Sale;

describe('SaleFormDialog', () => {
  let fixture: ComponentFixture<SaleFormDialog>;
  let component: SaleFormDialog;
  let stock: ReturnType<typeof signal<InventoryItemInterface[]>>;
  let clients: ReturnType<typeof signal<Client[]>>;
  let sales: jasmine.SpyObj<SaleService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let created: jasmine.Spy;

  const setup = async (inputs: { mode?: 'sale' | 'quotation'; sale?: Sale | null } = {}): Promise<void> => {
    fixture = TestBed.createComponent(SaleFormDialog);
    component = fixture.componentInstance;
    if (inputs.mode !== undefined) fixture.componentRef.setInput('mode', inputs.mode);
    if (inputs.sale !== undefined) fixture.componentRef.setInput('sale', inputs.sale);
    closed = jasmine.createSpy('closed');
    created = jasmine.createSpy('created');
    component.closed.subscribe(closed);
    component.created.subscribe(created);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    stock = signal([
      item({ id: 'laptop', warehouseId: 'w1', quantity: 5, price: 900 }),
      item({ id: 'mouse', warehouseId: 'w1', quantity: 10, price: 20 }),
      item({ id: 'sold-out', warehouseId: 'w1', quantity: 0, price: 5 }),
      item({ id: 'elsewhere', warehouseId: 'w2', quantity: 3, price: 7 })
    ]);
    clients = signal([client({ id: 'c1', paymentCondition: PaymentCondition.CREDIT })]);
    sales = jasmine.createSpyObj<SaleService>('SaleService', ['create', 'update']);
    sales.create.and.returnValue(of({ id: 'sale-1' } as Sale));
    sales.update.and.returnValue(of({ id: 'draft-1' } as Sale));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [SaleFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: SaleService, useValue: sales },
        { provide: WarehouseService, useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')]) } },
        { provide: InventoryService, useValue: { items: stock } },
        { provide: ClientService, useValue: { clients } },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    await setup();
  });

  /** A form that can be submitted: a warehouse, a customer type and one laptop. */
  const readyToSubmit = (): void => {
    component.onWarehouseChange('w1');
    component.customerType.set(CustomerType.RETAIL);
    component.addItem();
    component.updateItemId(0, 'laptop');
  };

  describe('the items that can be sold', () => {
    it('are none until a warehouse is chosen', () => {
      expect(component.availableItems()).toEqual([]);
    });

    it('are the items of the chosen warehouse that have stock', () => {
      component.onWarehouseChange('w1');

      expect(component.availableItems().map((i) => i.id)).toEqual(['laptop', 'mouse']);
    });

    it('follow the stock: an item that sells out stops being offered', () => {
      component.onWarehouseChange('w1');

      stock.update((all) => all.map((i) => (i.id === 'mouse' ? { ...i, quantity: 0 } : i)));

      expect(component.availableItems().map((i) => i.id)).toEqual(['laptop']);
    });

    it('changing the warehouse clears the lines, which belonged to the other one', () => {
      readyToSubmit();

      component.onWarehouseChange('w2');

      expect(component.items()).toEqual([]);
      expect(component.warehouseId()).toBe('w2');
    });
  });

  describe('the lines', () => {
    beforeEach(() => component.onWarehouseChange('w1'));

    it('addItem adds a blank line', () => {
      component.addItem();
      component.addItem();

      expect(component.items()).toEqual([
        { inventoryItemId: '', quantity: 1, unitPrice: 0, notes: '' },
        { inventoryItemId: '', quantity: 1, unitPrice: 0, notes: '' }
      ]);
    });

    it('choosing an item suggests its current price as the unit price', () => {
      component.addItem();

      component.updateItemId(0, 'laptop');

      expect(component.items()[0]).toEqual(jasmine.objectContaining({ inventoryItemId: 'laptop', unitPrice: 900 }));
    });

    it('choosing another item replaces the price, and choosing the same one keeps what the seller typed', () => {
      component.addItem();
      component.updateItemId(0, 'laptop');
      component.updateItemPrice(0, 850);

      component.updateItemId(0, 'laptop');
      expect(component.items()[0].unitPrice).toBe(850);

      component.updateItemId(0, 'mouse');
      expect(component.items()[0].unitPrice).toBe(20);
    });

    it('suggests a price of zero for an item it does not know', () => {
      component.addItem();

      component.updateItemId(0, 'gone');

      expect(component.items()[0].unitPrice).toBe(0);
    });

    it('updateItemQuantity keeps the quantity, and falls back to 1 for zero or nothing', () => {
      component.addItem();

      component.updateItemQuantity(0, 4);
      expect(component.items()[0].quantity).toBe(4);

      component.updateItemQuantity(0, 0);
      expect(component.items()[0].quantity).toBe(1);

      component.updateItemQuantity(0, NaN);
      expect(component.items()[0].quantity).toBe(1);
    });

    it('updateItemPrice keeps a price and turns a negative one into zero', () => {
      component.addItem();

      component.updateItemPrice(0, 12.5);
      expect(component.items()[0].unitPrice).toBe(12.5);

      component.updateItemPrice(0, -3);
      expect(component.items()[0].unitPrice).toBe(0);
    });

    it('updateItemNotes and removeItem change only the line they name', () => {
      component.addItem();
      component.addItem();

      component.updateItemNotes(1, 'gift');
      expect(component.items().map((i) => i.notes)).toEqual(['', 'gift']);

      component.removeItem(0);
      expect(component.items().map((i) => i.notes)).toEqual(['gift']);
    });

    it('does not change the list it was given: each update makes a new one', () => {
      component.addItem();
      const before = component.items();

      component.updateItemQuantity(0, 3);

      expect(before[0].quantity).toBe(1);
    });
  });

  describe('stock and duplicates', () => {
    beforeEach(() => component.onWarehouseChange('w1'));

    it('getAvailable gives the stock of an item, and no limit for a blank or unknown one', () => {
      expect(component.getAvailable('laptop')).toBe(5);
      expect(component.getAvailable('')).toBe(Number.MAX_SAFE_INTEGER);
      expect(component.getAvailable('gone')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('isAlreadySelected ignores the line asking', () => {
      component.addItem();
      component.addItem();
      component.updateItemId(0, 'laptop');

      expect(component.isAlreadySelected('laptop', 1)).toBeTrue();
      expect(component.isAlreadySelected('laptop', 0)).toBeFalse();
      expect(component.isAlreadySelected('mouse', 1)).toBeFalse();
    });
  });

  describe('money', () => {
    const line = (quantity: number, unitPrice: number) => ({ inventoryItemId: 'x', quantity, unitPrice, notes: '' });

    it('lineTotal is the quantity times the price, rounded to cents', () => {
      expect(component.lineTotal(line(3, 0.1))).toBe(0.3);
      expect(component.lineTotal(line(2, 19.999))).toBe(40);
    });

    it('lineTotal treats what is not a number as zero', () => {
      expect(component.lineTotal(line(NaN, 5))).toBe(0);
      expect(component.lineTotal(line(2, undefined as unknown as number))).toBe(0);
    });

    it('total adds up every line', () => {
      component.onWarehouseChange('w1');
      component.addItem();
      component.addItem();
      component.updateItemId(0, 'laptop');
      component.updateItemQuantity(0, 2);
      component.updateItemId(1, 'mouse');
      component.updateItemQuantity(1, 3);

      expect(component.total()).toBe(2 * 900 + 3 * 20);
    });
  });

  describe('canSubmit', () => {
    it('is false on an empty form', () => {
      expect(component.canSubmit()).toBeFalse();
    });

    it('is true with a warehouse, a customer type and a valid line', () => {
      readyToSubmit();

      expect(component.canSubmit()).toBeTrue();
    });

    it('needs a warehouse, a customer type and at least one line', () => {
      readyToSubmit();

      component.customerType.set('');
      expect(component.canSubmit()).toBeFalse();
      component.customerType.set(CustomerType.RETAIL);

      component.items.set([]);
      expect(component.canSubmit()).toBeFalse();

      readyToSubmit();
      component.warehouseId.set('');
      expect(component.canSubmit()).toBeFalse();
    });

    it('needs every line to have an item, a quantity within the stock and a price', () => {
      readyToSubmit();

      component.updateItemQuantity(0, 5);
      expect(component.canSubmit()).toBeTrue();

      component.updateItemQuantity(0, 6);
      expect(component.canSubmit()).withContext('more than the stock').toBeFalse();
      component.updateItemQuantity(0, 1);

      component.updateItemId(0, '');
      expect(component.canSubmit()).withContext('no item').toBeFalse();
      component.updateItemId(0, 'laptop');

      component.items.update((list) => [{ ...list[0], unitPrice: -1 }]);
      expect(component.canSubmit()).withContext('negative price').toBeFalse();

      component.items.update((list) => [{ ...list[0], unitPrice: NaN }]);
      expect(component.canSubmit()).withContext('price is not a number').toBeFalse();

      component.items.update((list) => [{ ...list[0], unitPrice: 0 }]);
      expect(component.canSubmit()).withContext('a free item is fine').toBeTrue();
    });

    it('checks every line, not only the first', () => {
      readyToSubmit();
      component.addItem();
      component.updateItemId(1, 'mouse');
      component.updateItemQuantity(1, 11);

      expect(component.canSubmit()).toBeFalse();
    });
  });

  describe('client selection', () => {
    it('prefills the payment condition from the chosen client', () => {
      component.onClientChange('c1');

      expect(component.clientId()).toBe('c1');
      expect(component.paymentCondition()).toBe(PaymentCondition.CREDIT);
    });

    it('stays editable after the prefill: the seller can still override it', () => {
      component.onClientChange('c1');

      component.paymentCondition.set(PaymentCondition.CASH);

      expect(component.paymentCondition()).toBe(PaymentCondition.CASH);
    });

    it('does nothing to the payment condition when no client matches the id', () => {
      component.paymentCondition.set(PaymentCondition.CREDIT);

      component.onClientChange('unknown');

      expect(component.clientId()).toBe('unknown');
      expect(component.paymentCondition()).toBe(PaymentCondition.CREDIT);
    });
  });

  describe('submit', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.submit();

      expect(sales.create).not.toHaveBeenCalled();
    });

    it('sends the sale, trimming the text and leaving out what is blank', () => {
      readyToSubmit();
      component.name.set('  Order 1  ');
      component.customerName.set('   ');
      component.notes.set(' fragile ');
      component.currency.set('HNL');
      component.updateItemQuantity(0, 2);
      component.updateItemNotes(0, '  gift  ');

      component.submit();

      expect(sales.create).toHaveBeenCalledOnceWith({
        name: 'Order 1',
        warehouseId: 'w1',
        customerName: undefined,
        customerType: CustomerType.RETAIL,
        clientId: undefined,
        paymentCondition: PaymentCondition.CASH,
        currency: 'HNL',
        notes: 'fragile',
        taxPercent: undefined,
        asDraft: undefined,
        items: [{ inventoryItemId: 'laptop', quantity: 2, unitPrice: 900, notes: 'gift', taxPercent: undefined }]
      });
    });

    it('includes the chosen client and its payment condition in the DTO', () => {
      readyToSubmit();
      component.onClientChange('c1');

      component.submit();

      expect(sales.create).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ clientId: 'c1', paymentCondition: PaymentCondition.CREDIT })
      );
    });

    it('tells the user and reports the sale once it was created', () => {
      readyToSubmit();

      component.submit();

      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CREATE_SUCCESS');
      expect(created).toHaveBeenCalledOnceWith({ success: true });
      expect(component.submitting()).toBeFalse();
    });

    it('reports nothing, and adds no second message, when the service answers with nothing', () => {
      // The service turns a failed request into null and shows the reason itself (reportErrors)
      sales.create.and.returnValue(of(null));
      readyToSubmit();

      component.submit();

      expect(notifications.error).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
      expect(component.submitting()).toBeFalse();
    });

    it('does not emit created or show its own error on a failed request: SaleService already reported it', () => {
      sales.create.and.returnValue(of(null));
      readyToSubmit();

      component.submit();

      expect(notifications.error).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
      expect(component.submitting()).toBeFalse();
    });

    it('ignores a second submit while the first one is still running', () => {
      sales.create.and.returnValue(new Subject<Sale | null>());
      readyToSubmit();

      component.submit();
      component.submit();

      expect(sales.create).toHaveBeenCalledTimes(1);
      expect(component.submitting()).toBeTrue();
    });
  });

  describe('quotation mode', () => {
    it('does not cap availableItems to in-stock items', async () => {
      await setup({ mode: 'quotation' });
      component.onWarehouseChange('w1');

      expect(component.availableItems().map((i) => i.id)).toEqual(['laptop', 'mouse', 'sold-out']);
    });

    it('does not block canSubmit on a quantity over the available stock', async () => {
      await setup({ mode: 'quotation' });
      readyToSubmit();
      component.updateItemQuantity(0, 999);

      expect(component.canSubmit()).toBeTrue();
    });

    it('still requires a warehouse, a customer type and an item', async () => {
      await setup({ mode: 'quotation' });

      expect(component.canSubmit()).toBeFalse();
    });

    it('submits asDraft:true and reports a quotation-specific success message', async () => {
      await setup({ mode: 'quotation' });
      readyToSubmit();

      component.submit();

      expect(sales.create).toHaveBeenCalledOnceWith(jasmine.objectContaining({ asDraft: true }));
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CREATE_QUOTATION_SUCCESS');
    });
  });

  describe('editing an existing draft', () => {
    it('prefills every field from the given sale', async () => {
      await setup({ sale: draftSale() });

      expect(component.name()).toBe('Draft 1');
      expect(component.warehouseId()).toBe('w1');
      expect(component.customerName()).toBe('Acme');
      expect(component.customerType()).toBe(CustomerType.RETAIL);
      expect(component.currency()).toBe('HNL');
      expect(component.notes()).toBe('draft notes');
      expect(component.taxPercent()).toBe(15);
      expect(component.items()).toEqual([
        { inventoryItemId: 'laptop', quantity: 1, unitPrice: 900, notes: '', taxPercent: undefined }
      ]);
    });

    it('is in editing mode, not add mode', async () => {
      await setup({ sale: draftSale() });

      expect(component.isEditing()).toBeTrue();
    });

    it('submits via update(), not create(), keyed by the sale id', async () => {
      await setup({ sale: draftSale() });

      component.submit();

      expect(sales.update).toHaveBeenCalledOnceWith('draft-1', jasmine.objectContaining({ name: 'Draft 1' }));
      expect(sales.create).not.toHaveBeenCalled();
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.UPDATE_SUCCESS');
    });

    it('does not cap quantity to stock either, same as any quotation', async () => {
      await setup({ sale: draftSale() });

      component.updateItemQuantity(0, 999);

      expect(component.canSubmit()).toBeTrue();
    });
  });

  describe('tax', () => {
    it('a line with no explicit taxPercent inherits the ticket one', () => {
      component.taxPercent.set(15);
      const line = { inventoryItemId: 'x', quantity: 1, unitPrice: 100, notes: '' };

      expect(component.lineTax(line)).toBe(15);
    });

    it('an explicit line taxPercent, including 0, overrides the ticket one', () => {
      component.taxPercent.set(15);
      const exempt = { inventoryItemId: 'x', quantity: 1, unitPrice: 100, notes: '', taxPercent: 0 };

      expect(component.lineTax(exempt)).toBe(0);
    });

    it('taxTotal and grandTotal add up every line', () => {
      component.onWarehouseChange('w1');
      component.taxPercent.set(15);
      component.addItem();
      component.updateItemId(0, 'laptop'); // 900, taxed at 15% => 135
      component.addItem();
      component.updateItemId(1, 'mouse'); // 20, explicit 0% => exempt
      component.updateItemTaxPercent(1, 0);

      expect(component.taxTotal()).toBe(135);
      expect(component.grandTotal()).toBe(900 + 20 + 135);
    });
  });

  describe('closing', () => {
    it('close asks its parent to close', () => {
      component.close();

      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('the escape key closes it too', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(closed).toHaveBeenCalledTimes(1);
    });
  });
});
