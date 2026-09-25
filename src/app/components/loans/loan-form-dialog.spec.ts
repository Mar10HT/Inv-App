import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { LoanFormDialog } from './loan-form-dialog';
import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/notification.service';
import { Loan } from '../../interfaces/loan.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { item, warehouse } from '../../../testing/report-fixtures';

describe('LoanFormDialog', () => {
  let fixture: ComponentFixture<LoanFormDialog>;
  let component: LoanFormDialog;
  let activeLoans: ReturnType<typeof signal<Loan[]>>;
  let loans: jasmine.SpyObj<LoanService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let closed: jasmine.Spy;
  let created: jasmine.Spy;

  beforeEach(async () => {
    activeLoans = signal<Loan[]>([]);
    loans = jasmine.createSpyObj<LoanService>('LoanService', ['createLoan'], { activeLoans } as never);
    loans.createLoan.and.returnValue(of({ id: 'l1' } as Loan));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [LoanFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: LoanService, useValue: loans },
        { provide: WarehouseService, useValue: { warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup'), warehouse('w3', 'North')]) } },
        {
          provide: InventoryService,
          useValue: {
            items: signal([
              item({ id: 'laptop', warehouseId: 'w1' }),
              item({ id: 'mouse', warehouseId: 'w1' }),
              item({ id: 'cable', warehouseId: 'w2' })
            ])
          }
        },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanFormDialog);
    component = fixture.componentInstance;
    closed = jasmine.createSpy('closed');
    created = jasmine.createSpy('created');
    component.closed.subscribe(closed);
    component.created.subscribe(created);
    fixture.detectChanges();
  });

  /** A form that can be submitted: Main to Backup, due on a date, with a laptop. */
  const readyToSubmit = (): void => {
    component.onSourceWarehouseChange('w1');
    component.selectedDestWarehouseId.set('w2');
    component.selectedDueDate.set('2026-12-01');
    component.addLoanItem();
    component.updateLoanItemId(0, 'laptop');
  };

  describe('what can be lent', () => {
    it('offers every warehouse but the source as destination', () => {
      expect(component.destinationWarehouses().map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);

      component.onSourceWarehouseChange('w1');

      expect(component.destinationWarehouses().map((w) => w.id)).toEqual(['w2', 'w3']);
    });

    it('offers every item until a source warehouse is chosen, then only the items of that warehouse', () => {
      expect(component.availableItemsForLoan().map((i) => i.id)).toEqual(['laptop', 'mouse', 'cable']);

      component.onSourceWarehouseChange('w1');

      expect(component.availableItemsForLoan().map((i) => i.id)).toEqual(['laptop', 'mouse']);
    });

    it('does not offer an item that is already on loan', () => {
      activeLoans.set([{ items: [{ inventoryItemId: 'laptop' }] } as unknown as Loan]);
      component.onSourceWarehouseChange('w1');

      expect(component.availableItemsForLoan().map((i) => i.id)).toEqual(['mouse']);

      component.onSourceWarehouseChange('');
      expect(component.availableItemsForLoan().map((i) => i.id)).toEqual(['mouse', 'cable']);
    });

    it('changing the source warehouse clears the lines and the destination', () => {
      readyToSubmit();

      component.onSourceWarehouseChange('w3');

      expect(component.loanItems()).toEqual([]);
      expect(component.selectedDestWarehouseId()).toBe('');
      expect(component.selectedSourceWarehouseId()).toBe('w3');
    });
  });

  describe('the lines', () => {
    it('addLoanItem adds a blank line', () => {
      component.addLoanItem();

      expect(component.loanItems()).toEqual([{ inventoryItemId: '', quantity: 1, notes: '' }]);
    });

    it('each update changes only the line it names', () => {
      component.addLoanItem();
      component.addLoanItem();

      component.updateLoanItemId(1, 'mouse');
      component.updateLoanItemQuantity(1, 3);
      component.updateLoanItemNotes(1, 'for the demo');

      expect(component.loanItems()).toEqual([
        { inventoryItemId: '', quantity: 1, notes: '' },
        { inventoryItemId: 'mouse', quantity: 3, notes: 'for the demo' }
      ]);
    });

    it('updateLoanItemQuantity falls back to 1 for zero or nothing', () => {
      component.addLoanItem();

      component.updateLoanItemQuantity(0, 0);
      expect(component.loanItems()[0].quantity).toBe(1);

      component.updateLoanItemQuantity(0, NaN);
      expect(component.loanItems()[0].quantity).toBe(1);
    });

    it('removeLoanItem takes out one line, and an update makes a new list instead of changing the old one', () => {
      component.addLoanItem();
      component.addLoanItem();
      const before = component.loanItems();

      component.updateLoanItemQuantity(0, 5);
      expect(before[0].quantity).toBe(1);

      component.removeLoanItem(0);
      expect(component.loanItems()).toHaveSize(1);
    });

    it('isItemAlreadySelected ignores the line asking', () => {
      component.addLoanItem();
      component.addLoanItem();
      component.updateLoanItemId(0, 'laptop');

      expect(component.isItemAlreadySelected('laptop', 1)).toBeTrue();
      expect(component.isItemAlreadySelected('laptop', 0)).toBeFalse();
      expect(component.isItemAlreadySelected('mouse', 1)).toBeFalse();
    });
  });

  describe('canCreateLoan', () => {
    it('is false on an empty form', () => {
      expect(component.canCreateLoan()).toBeFalse();
    });

    it('is true with a source, a different destination, a due date and every line chosen', () => {
      readyToSubmit();

      expect(component.canCreateLoan()).toBeTrue();
    });

    it('needs each of those things', () => {
      readyToSubmit();

      component.selectedDueDate.set('');
      expect(component.canCreateLoan()).withContext('no due date').toBeFalse();
      component.selectedDueDate.set('2026-12-01');

      component.selectedDestWarehouseId.set('');
      expect(component.canCreateLoan()).withContext('no destination').toBeFalse();

      component.selectedDestWarehouseId.set('w1');
      expect(component.canCreateLoan()).withContext('destination is the source').toBeFalse();
      component.selectedDestWarehouseId.set('w2');

      component.addLoanItem();
      expect(component.canCreateLoan()).withContext('a line without an item').toBeFalse();
      component.removeLoanItem(1);

      component.selectedSourceWarehouseId.set('');
      expect(component.canCreateLoan()).withContext('no source').toBeFalse();
    });
  });

  it('asks for a due date from tomorrow on, as a date the input understands', () => {
    expect(component.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe('createLoan', () => {
    it('sends nothing while the form cannot be submitted', () => {
      component.createLoan();

      expect(loans.createLoan).not.toHaveBeenCalled();
    });

    it('sends the loan, trimming the name and leaving out what is blank', () => {
      readyToSubmit();
      component.selectedName.set('  Screens for the demo  ');
      component.selectedNotes.set('');
      component.updateLoanItemQuantity(0, 2);
      component.addLoanItem();
      component.updateLoanItemId(1, 'mouse');
      component.updateLoanItemNotes(1, 'wireless');

      component.createLoan();

      expect(loans.createLoan).toHaveBeenCalledOnceWith({
        name: 'Screens for the demo',
        items: [
          { inventoryItemId: 'laptop', quantity: 2, notes: undefined },
          { inventoryItemId: 'mouse', quantity: 1, notes: 'wireless' }
        ],
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        dueDate: '2026-12-01',
        notes: undefined
      });
    });

    it('sends the general notes when there are some, and no name when it is blank', () => {
      readyToSubmit();
      component.selectedName.set('   ');
      component.selectedNotes.set('Return by Friday');

      component.createLoan();

      expect(loans.createLoan.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ name: undefined, notes: 'Return by Friday' }));
    });

    it('tells the user and reports how many items were lent once the loan was created', () => {
      readyToSubmit();

      component.createLoan();

      expect(notifications.success).toHaveBeenCalledOnceWith('LOANS.LOAN_CREATED');
      expect(created).toHaveBeenCalledOnceWith({ success: true, count: 1 });
    });

    it('reports nothing when the service answers with nothing: it already showed the reason', () => {
      loans.createLoan.and.returnValue(of(null));
      readyToSubmit();

      component.createLoan();

      expect(created).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('tells the user when the request fails', () => {
      loans.createLoan.and.returnValue(throwError(() => new Error('boom')));
      readyToSubmit();

      component.createLoan();

      expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.LOAN_ERROR');
      expect(created).not.toHaveBeenCalled();
    });
  });

  it('close asks its parent to close', () => {
    component.close();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
