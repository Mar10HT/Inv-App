import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Transactions } from './transactions';
import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionService } from '../../services/transaction.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Transaction, TransactionType } from '../../interfaces/transaction.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { tx } from '../../../testing/report-fixtures';

describe('Transactions', () => {
  let fixture: ComponentFixture<Transactions>;
  let component: Transactions;
  let all: WritableSignal<Transaction[]>;
  let service: jasmine.SpyObj<TransactionService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  beforeEach(async () => {
    all = signal([
      tx({ id: 'a', type: TransactionType.IN }),
      tx({ id: 'b', type: TransactionType.IN }),
      tx({ id: 'c', type: TransactionType.OUT }),
      tx({ id: 'd', type: TransactionType.TRANSFER })
    ]);
    service = jasmine.createSpyObj<TransactionService>('TransactionService', ['getAll', 'delete'], {
      transactions: all,
      loading: signal(false),
      error: signal(null)
    } as never);
    service.getAll.and.returnValue(of([]));
    service.delete.and.returnValue(of(undefined));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['created', 'deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [
        ...provideTestBedDefaults(),
        { provide: TransactionService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Transactions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('opening the page', () => {
    it('asks the service for the transactions', () => {
      expect(service.getAll).toHaveBeenCalledTimes(1);
    });

    it('tells the user when they fail to load', () => {
      service.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Transactions).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('follows the loading and error state of the service', () => {
      const state = service as unknown as { loading: WritableSignal<boolean>; error: WritableSignal<string | null> };
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();

      state.loading.set(true);
      state.error.set('boom');

      expect(component.loading()).toBeTrue();
      expect(component.error()).toBe('boom');
    });
  });

  it('counts the transactions by type', () => {
    expect(component.stats()).toEqual({ total: 4, inCount: 2, outCount: 1, transferCount: 1 });

    all.update((list) => list.filter((t) => t.type !== TransactionType.IN));

    expect(component.stats()).toEqual({ total: 2, inCount: 0, outCount: 1, transferCount: 1 });
  });

  describe('addTransaction', () => {
    it('opens the form in add mode', () => {
      component.addTransaction();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        TransactionFormDialog,
        jasmine.objectContaining({ width: '600px', data: { mode: 'add' } })
      );
    });

    it('says the transaction was created when the form saved it', () => {
      closeWith({ saved: true });

      component.addTransaction();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.TRANSACTION');
    });

    it('says nothing when the form was dismissed', () => {
      component.addTransaction();
      closeWith({ saved: false });
      component.addTransaction();

      expect(notifications.created).not.toHaveBeenCalled();
    });
  });

  describe('deleteTransaction', () => {
    it('asks the user to confirm with a danger dialog, and deletes nothing when they decline', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteTransaction(tx({ id: 'a' }));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
      expect(service.delete).not.toHaveBeenCalled();
    });

    it('deletes the transaction once confirmed and says so', () => {
      component.deleteTransaction(tx({ id: 'a' }));

      expect(service.delete).toHaveBeenCalledOnceWith('a');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.TRANSACTION');
    });

    it('reports a failed delete and does not say it was deleted', () => {
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteTransaction(tx({ id: 'a' }));

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.TRANSACTION');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  describe('how a type looks', () => {
    it('gives each type its own badge, and a neutral one to anything else', () => {
      const classes = [TransactionType.IN, TransactionType.OUT, TransactionType.TRANSFER, 'OTHER' as TransactionType].map((type) =>
        component.getTypeBadgeClass(type)
      );

      expect(new Set(classes).size).toBe(4);
      expect(classes[3]).toContain('surface-elevated');
    });

    it('gives each type its own icon, and a receipt to anything else', () => {
      expect([TransactionType.IN, TransactionType.OUT, TransactionType.TRANSFER, 'OTHER' as TransactionType].map((type) => component.getTypeIcon(type))).toEqual([
        'ArrowDown',
        'ArrowUp',
        'ArrowLeftRight',
        'Receipt'
      ]);
    });
  });

  it('tracks the transactions by id', () => {
    expect(component.trackByFn(0, tx({ id: 'a' }))).toBe('a');
  });
});
