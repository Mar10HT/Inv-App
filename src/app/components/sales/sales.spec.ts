import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { SalesComponent } from './sales';
import { SaleService } from '../../services/sale.service';
import { WarehouseService } from '../../services/warehouse.service';
import { ClientService } from '../../services/client.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { FiscalConfigService } from '../../services/fiscal-config.service';
import { CustomerType, Sale, SaleStats, SaleStatus } from '../../interfaces/sale.interface';
import { FiscalConfig } from '../../interfaces/fiscal-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const sale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 'sale-1234567890',
    name: 'Order 1',
    warehouseId: 'w1',
    status: SaleStatus.ACTIVE,
    customerType: CustomerType.RETAIL,
    items: [{ quantity: 2 }, { quantity: 3 }],
    ...overrides
  }) as unknown as Sale;

const emptyStats: SaleStats = { total: 0, active: 0, draft: 0, cancelled: 0, byCustomerType: {}, revenueByCurrency: {} };

describe('SalesComponent', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let sales: ReturnType<typeof signal<Sale[]>>;
  let stats: ReturnType<typeof signal<SaleStats>>;
  let saleService: jasmine.SpyObj<SaleService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let clients: jasmine.SpyObj<ClientService>;
  let fiscalConfig: jasmine.SpyObj<FiscalConfigService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    sales = signal([sale({ id: 'a' }), sale({ id: 'b', warehouseId: 'w2', status: SaleStatus.CANCELLED, customerType: CustomerType.WHOLESALE })]);
    stats = signal(emptyStats);
    saleService = jasmine.createSpyObj<SaleService>(
      'SaleService',
      ['loadSales', 'refresh', 'cancel', 'downloadPdf', 'confirm', 'update'],
      { sales, stats, loading: signal(false), error: signal(null) } as never
    );
    saleService.cancel.and.returnValue(of(sale()));
    saleService.confirm.and.returnValue(of(sale()));
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    clients = jasmine.createSpyObj<ClientService>('ClientService', ['getAll'], { clients: signal([]) } as never);
    clients.getAll.and.returnValue(of([]));
    fiscalConfig = jasmine.createSpyObj<FiscalConfigService>(
      'FiscalConfigService',
      ['get'],
      { config: signal<FiscalConfig | null>(null), loading: signal(false), error: signal(null) } as never
    );
    fiscalConfig.get.and.returnValue(of(null));
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: SaleService, useValue: saleService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: ClientService, useValue: clients },
        { provide: InventoryService, useValue: inventory },
        { provide: FiscalConfigService, useValue: fiscalConfig },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks for the sales, the warehouses, the clients, the fiscal config and the items when it opens', () => {
      expect(saleService.loadSales).toHaveBeenCalledTimes(1);
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(clients.getAll).toHaveBeenCalledTimes(1);
      expect(fiscalConfig.get).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the warehouses fail to load', () => {
      const failure = new Error('boom');
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(SalesComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('tells the user when the clients fail to load', () => {
      const failure = new Error('boom');
      clients.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(SalesComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });
  });

  describe('filtered', () => {
    const ids = (): string[] => component.filtered().map((s) => s.id);

    it('shows every sale when no filter is set', () => {
      expect(ids()).toEqual(['a', 'b']);
    });

    it('filters by warehouse, by status and by customer type', () => {
      component.filterWarehouseId.set('w2');
      expect(ids()).toEqual(['b']);

      component.filterWarehouseId.set('');
      component.filterStatus.set(SaleStatus.ACTIVE);
      expect(ids()).toEqual(['a']);

      component.filterStatus.set('');
      component.filterCustomerType.set(CustomerType.WHOLESALE);
      expect(ids()).toEqual(['b']);
    });

    it('applies every filter at once', () => {
      component.filterWarehouseId.set('w1');
      component.filterCustomerType.set(CustomerType.WHOLESALE);

      expect(ids()).toEqual([]);
    });
  });

  describe('the form dialog', () => {
    it('opens and closes', () => {
      component.openCreateDialog();
      expect(component.showFormDialog()).toBeTrue();

      component.closeFormDialog();
      expect(component.showFormDialog()).toBeFalse();
    });

    it('closes and reloads the sales once a sale was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: true });

      expect(component.showFormDialog()).toBeFalse();
      expect(saleService.refresh).toHaveBeenCalledTimes(1);
    });

    it('stays open and reloads nothing when the sale was not created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: false });

      expect(component.showFormDialog()).toBeTrue();
      expect(saleService.refresh).not.toHaveBeenCalled();
    });

    it('opens a direct sale in "sale" mode with no entity to edit', () => {
      component.openCreateDialog();

      expect(component.dialogMode()).toBe('sale');
      expect(component.editingSale()).toBeNull();
    });

    it('opens a quotation in "quotation" mode with no entity to edit', () => {
      component.openQuotationDialog();

      expect(component.dialogMode()).toBe('quotation');
      expect(component.editingSale()).toBeNull();
    });

    it('opens an existing draft for editing in "quotation" mode', () => {
      const draft = sale({ id: 'd1', status: SaleStatus.DRAFT });

      component.editSale(draft);

      expect(component.showFormDialog()).toBeTrue();
      expect(component.dialogMode()).toBe('quotation');
      expect(component.editingSale()).toBe(draft);
    });

    it('clears the editing sale when the dialog closes', () => {
      component.editSale(sale({ id: 'd1' }));

      component.closeFormDialog();

      expect(component.editingSale()).toBeNull();
    });
  });

  describe('payment dialog', () => {
    it('opens with the sale to pay and closes clearing it', () => {
      const target = sale({ id: 'a' });

      component.openPaymentDialog(target);
      expect(component.showPaymentDialog()).toBeTrue();
      expect(component.payingSale()).toBe(target);

      component.closePaymentDialog();
      expect(component.showPaymentDialog()).toBeFalse();
      expect(component.payingSale()).toBeNull();
    });

    it('refreshes the sales list when a payment is recorded', () => {
      component.onPaymentRecorded();

      expect(saleService.refresh).toHaveBeenCalledTimes(1);
    });

    it('builds the minimal payment document from the sale', () => {
      const target = sale({ id: 'a', totalAmount: 100, taxAmount: 15, currency: 'HNL' });

      expect(component.toPaymentDocument(target)).toEqual({
        id: 'a',
        totalAmount: 100,
        taxAmount: 15,
        currency: 'HNL',
        documentType: 'sale',
      });
    });
  });

  describe('status label/class', () => {
    it('gives every status its own class, falling back for an unknown one', () => {
      expect(component.getStatusClass(SaleStatus.DRAFT)).toContain('info');
      expect(component.getStatusClass(SaleStatus.ACTIVE)).toContain('success');
      expect(component.getStatusClass(SaleStatus.CANCELLED)).toContain('error');
    });
  });

  describe('confirmSale', () => {
    it('asks the user to confirm, naming the sale, then confirms it', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { SALES: { CONFIRM_CONFIRM_MESSAGE: 'Confirm {{name}}?' } });
      translate.use('en');

      component.confirmSale(sale({ id: 'd1', name: 'Quote 1' }));

      expect(confirm.ask.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ type: 'warning', message: 'Confirm Quote 1?' })
      );
      expect(saleService.confirm).toHaveBeenCalledOnceWith('d1');
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CONFIRM_SUCCESS');
    });

    it('confirms nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.confirmSale(sale({ id: 'd1' }));

      expect(saleService.confirm).not.toHaveBeenCalled();
    });
  });

  describe('numbers and labels', () => {
    it('adds up the quantity of the items of a sale', () => {
      expect(component.totalQty(sale())).toBe(5);
      expect(component.totalQty(sale({ items: [] }))).toBe(0);
    });

    it('customerLabel prefers the linked client over the free-text name, and falls back to a dash', () => {
      expect(component.customerLabel(sale({ client: { id: 'c1', name: 'Ferretería El Progreso' }, customerName: 'Juan' } as never))).toBe('Ferretería El Progreso');
      expect(component.customerLabel(sale({ client: null, customerName: 'Juan' } as never))).toBe('Juan');
      expect(component.customerLabel(sale({ client: null, customerName: null } as never))).toBe('—');
    });

    it('formats money with the currency and two decimals, and a missing amount as zero', () => {
      expect(component.formatMoney(12.5, 'USD')).toBe('USD 12.50');
      expect(component.formatMoney(undefined as unknown as number, 'HNL')).toBe('HNL 0.00');
    });

    it('shows a dash when there is no revenue', () => {
      expect(component.revenueLabel()).toBe('—');
    });

    it('shows the revenue of each currency separately', () => {
      stats.set({ ...emptyStats, revenueByCurrency: { USD: 100, HNL: 2500.5 } });

      expect(component.revenueLabel()).toBe('USD 100.00 · HNL 2500.50');
    });
  });

  it('downloads the pdf of a sale by its id', () => {
    component.downloadPdf(sale({ id: 'a' }));

    expect(saleService.downloadPdf).toHaveBeenCalledOnceWith('a');
  });

  describe('cancel', () => {
    it('asks the user to confirm, naming the sale, or its short id when it has no name', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { SALES: { CONFIRM_CANCEL_MESSAGE: 'Cancel {{name}}?' } });
      translate.use('en');

      component.cancel(sale({ name: 'Order 1' }));
      expect(confirm.ask.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ type: 'warning', title: 'SALES.CONFIRM_CANCEL_TITLE', message: 'Cancel Order 1?' })
      );

      component.cancel(sale({ name: undefined, id: 'sale-1234567890' }));
      expect(confirm.ask.calls.mostRecent().args[0].message).toBe('Cancel sale-123?');
    });

    it('cancels the sale and says so once confirmed', () => {
      component.cancel(sale({ id: 'a' }));

      expect(saleService.cancel).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CANCEL_SUCCESS');
    });

    it('cancels nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancel(sale());

      expect(saleService.cancel).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('does not say it was cancelled, or show its own error, when the service answers with nothing', () => {
      saleService.cancel.and.returnValue(of(null));

      component.cancel(sale());

      expect(notifications.success).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('uses the draft-specific confirm message and success notice for a DRAFT, since nothing is restored', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { SALES: { CONFIRM_CANCEL_DRAFT_MESSAGE: 'Cancel quote {{name}}?' } });
      translate.use('en');

      component.cancel(sale({ id: 'd1', name: 'Quote 1', status: SaleStatus.DRAFT }));

      expect(confirm.ask.calls.mostRecent().args[0].message).toBe('Cancel quote Quote 1?');
      expect(saleService.cancel).toHaveBeenCalledOnceWith('d1');
      expect(notifications.success).toHaveBeenCalledOnceWith('SALES.CANCEL_DRAFT_SUCCESS');
    });
  });
});

describe('SalesComponent — accounts receivable view (route data: onlyWithBalance)', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let sales: ReturnType<typeof signal<Sale[]>>;

  beforeEach(async () => {
    sales = signal([
      sale({ id: 'a', status: SaleStatus.ACTIVE, balance: 50 } as never),
      sale({ id: 'b', status: SaleStatus.ACTIVE, balance: 0 } as never),
      sale({ id: 'c', status: SaleStatus.DRAFT, balance: 50 } as never),
    ]);
    const saleService = jasmine.createSpyObj<SaleService>(
      'SaleService',
      ['loadSales', 'refresh', 'cancel', 'downloadPdf', 'confirm', 'update'],
      { sales, stats: signal(emptyStats), loading: signal(false), error: signal(null) } as never
    );
    const warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    const clients = jasmine.createSpyObj<ClientService>('ClientService', ['getAll'], { clients: signal([]) } as never);
    clients.getAll.and.returnValue(of([]));
    const fiscalConfig = jasmine.createSpyObj<FiscalConfigService>(
      'FiscalConfigService',
      ['get'],
      { config: signal<FiscalConfig | null>(null), loading: signal(false), error: signal(null) } as never
    );
    fiscalConfig.get.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: SaleService, useValue: saleService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: ClientService, useValue: clients },
        { provide: InventoryService, useValue: jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']) },
        { provide: FiscalConfigService, useValue: fiscalConfig },
        { provide: ConfirmService, useValue: jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']) },
        { provide: NotificationService, useValue: jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']) },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { onlyWithBalance: true } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('flags isReceivablesView from the route data', () => {
    expect(component.isReceivablesView).toBeTrue();
  });

  it('shows the Accounts Receivable copy instead of the Sales one', () => {
    const title = fixture.nativeElement.querySelector('h1').textContent;
    expect(title).toContain('ACCOUNTS_RECEIVABLE.TITLE');
  });

  it('only keeps ACTIVE sales with an outstanding balance', () => {
    expect(component.filtered().map((s) => s.id)).toEqual(['a']);
  });
});
