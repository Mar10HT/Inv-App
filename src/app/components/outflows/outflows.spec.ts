import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { OutflowsComponent } from './outflows';
import { OutflowService } from '../../services/outflow.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Outflow, OutflowReason, OutflowStats, OutflowStatus } from '../../interfaces/outflow.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const outflow = (overrides: Partial<Outflow> = {}): Outflow =>
  ({
    id: 'outflow-1234567890',
    name: 'Broken screens',
    warehouseId: 'w1',
    status: OutflowStatus.ACTIVE,
    reason: OutflowReason.DAMAGED,
    items: [{ quantity: 2 }, { quantity: 3 }],
    ...overrides
  }) as unknown as Outflow;

const emptyStats: OutflowStats = { total: 0, active: 0, cancelled: 0, byReason: {} };

describe('OutflowsComponent', () => {
  let fixture: ComponentFixture<OutflowsComponent>;
  let component: OutflowsComponent;
  let outflows: ReturnType<typeof signal<Outflow[]>>;
  let outflowService: jasmine.SpyObj<OutflowService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    outflows = signal([
      outflow({ id: 'a' }),
      outflow({ id: 'b', warehouseId: 'w2', status: OutflowStatus.CANCELLED, reason: OutflowReason.LOST })
    ]);
    outflowService = jasmine.createSpyObj<OutflowService>(
      'OutflowService',
      ['loadOutflows', 'refresh', 'cancel', 'downloadPdf'],
      { outflows, stats: signal(emptyStats), loading: signal(false), error: signal(null) } as never
    );
    outflowService.cancel.and.returnValue(of(outflow()));
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [OutflowsComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: OutflowService, useValue: outflowService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: InventoryService, useValue: inventory },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OutflowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks for the outflows, the warehouses and the items when it opens', () => {
      expect(outflowService.loadOutflows).toHaveBeenCalledTimes(1);
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the warehouses fail to load', () => {
      const failure = new Error('boom');
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(OutflowsComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });
  });

  describe('filtered', () => {
    const ids = (): string[] => component.filtered().map((o) => o.id);

    it('shows every outflow when no filter is set', () => {
      expect(ids()).toEqual(['a', 'b']);
    });

    it('filters by warehouse, by status and by reason', () => {
      component.filterWarehouseId.set('w2');
      expect(ids()).toEqual(['b']);

      component.filterWarehouseId.set('');
      component.filterStatus.set(OutflowStatus.ACTIVE);
      expect(ids()).toEqual(['a']);

      component.filterStatus.set('');
      component.filterReason.set(OutflowReason.LOST);
      expect(ids()).toEqual(['b']);
    });

    it('applies every filter at once', () => {
      component.filterWarehouseId.set('w1');
      component.filterReason.set(OutflowReason.LOST);

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

    it('closes and reloads the outflows once one was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: true });

      expect(component.showFormDialog()).toBeFalse();
      expect(outflowService.refresh).toHaveBeenCalledTimes(1);
    });

    it('stays open and reloads nothing when nothing was created', () => {
      component.showFormDialog.set(true);

      component.onCreated({ success: false });

      expect(component.showFormDialog()).toBeTrue();
      expect(outflowService.refresh).not.toHaveBeenCalled();
    });
  });

  it('adds up the quantity of the items of an outflow', () => {
    expect(component.totalQty(outflow())).toBe(5);
    expect(component.totalQty(outflow({ items: [] }))).toBe(0);
  });

  it('downloads the pdf of an outflow by its id', () => {
    component.downloadPdf(outflow({ id: 'a' }));

    expect(outflowService.downloadPdf).toHaveBeenCalledOnceWith('a');
  });

  describe('cancel', () => {
    it('asks the user to confirm, naming the outflow, or its short id when it has no name', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { OUTFLOWS: { CONFIRM_CANCEL_MESSAGE: 'Cancel {{name}}?' } });
      translate.use('en');

      component.cancel(outflow({ name: 'Broken screens' }));
      expect(confirm.ask.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ type: 'warning', title: 'OUTFLOWS.CONFIRM_CANCEL_TITLE', message: 'Cancel Broken screens?' })
      );

      component.cancel(outflow({ name: null, id: 'outflow-1234567890' }));
      expect(confirm.ask.calls.mostRecent().args[0].message).toBe('Cancel outflow-?');
    });

    it('cancels the outflow and says so once confirmed', () => {
      component.cancel(outflow({ id: 'a' }));

      expect(outflowService.cancel).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('OUTFLOWS.CANCEL_SUCCESS');
    });

    it('cancels nothing when the user does not confirm', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancel(outflow());

      expect(outflowService.cancel).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('does not say it was cancelled when the service answers with nothing', () => {
      outflowService.cancel.and.returnValue(of(null));

      component.cancel(outflow());

      expect(notifications.success).not.toHaveBeenCalled();
    });

    it('tells the user when the cancellation fails', () => {
      outflowService.cancel.and.returnValue(throwError(() => new Error('boom')));

      component.cancel(outflow());

      expect(notifications.error).toHaveBeenCalledOnceWith('OUTFLOWS.CANCEL_ERROR');
      expect(notifications.success).not.toHaveBeenCalled();
    });
  });
});
