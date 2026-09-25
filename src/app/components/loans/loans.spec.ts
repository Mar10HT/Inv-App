import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';

import { LoansComponent } from './loans';
import { LoanService } from '../../services/loan.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Loan, LoanStats, LoanStatus, LoanWithQr } from '../../interfaces/loan.interface';
import { getLoanDueDateClass, getLoanStatusClass } from '../../utils/loan.utils';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { warehouse } from '../../../testing/report-fixtures';

const loan = (id: string, overrides: Partial<Loan> = {}): Loan =>
  ({
    id,
    name: `Loan ${id}`,
    status: LoanStatus.PENDING,
    sourceWarehouseName: 'Main',
    destinationWarehouseName: 'Backup',
    items: [{ inventoryItemName: 'Laptop', quantity: 2 }],
    loanDate: new Date(2026, 0, 1),
    dueDate: new Date(2026, 1, 1),
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides
  }) as unknown as Loan;

// An assertion, not an annotation: the branch that removes LoanStats.totalActive can merge with this spec either way
const stats = { totalPending: 1, totalSent: 0, totalReceived: 0, totalReturnPending: 0, totalReturned: 0, totalOverdue: 0, dueSoon: 0 } as LoanStats;

describe('LoansComponent', () => {
  let fixture: ComponentFixture<LoansComponent>;
  let component: LoansComponent;
  let allLoans: ReturnType<typeof signal<Loan[]>>;
  let loanService: jasmine.SpyObj<LoanService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const failure = new Error('boom');
  const ids = (): string[] => component.filteredLoans().map((l) => l.id);
  const withQr = (id: string, qrCodeDataUrl?: string): LoanWithQr => ({ ...loan(id), qrCodeDataUrl }) as LoanWithQr;

  beforeEach(async () => {
    allLoans = signal([
      loan('a', { name: 'Screens', status: LoanStatus.SENT, loanDate: new Date(2026, 0, 3), items: [{ inventoryItemName: 'Monitor', quantity: 1, inventoryItemServiceTag: 'TAG-9' }] as Loan['items'] }),
      loan('b', { name: undefined, sourceWarehouseName: 'North', destinationWarehouseName: 'South', loanDate: new Date(2026, 0, 2) }),
      loan('c', { status: LoanStatus.RETURNED, loanDate: new Date(2026, 0, 1) })
    ]);
    loanService = jasmine.createSpyObj<LoanService>(
      'LoanService',
      ['sendLoan', 'initiateReturn', 'cancelLoan', 'manualConfirmReceipt', 'manualConfirmReturn', 'getQrCode', 'downloadPdf', 'exportToXLSX'],
      { loans: allLoans, stats: signal(stats), loading: signal(false), error: signal(null) } as never
    );
    loanService.sendLoan.and.returnValue(of(withQr('a', 'data:image/png;base64,SEND')));
    loanService.initiateReturn.and.returnValue(of(withQr('a', 'data:image/png;base64,RETURN')));
    loanService.cancelLoan.and.returnValue(of(loan('a')));
    loanService.manualConfirmReceipt.and.returnValue(of(loan('a')));
    loanService.manualConfirmReturn.and.returnValue(of(loan('a')));
    loanService.getQrCode.and.returnValue(of('data:image/png;base64,SHOWN'));
    loanService.exportToXLSX.and.resolveTo();
    warehouses = jasmine.createSpyObj<WarehouseService>('WarehouseService', ['getAll'], {
      warehouses: signal([warehouse('w1', 'Main'), warehouse('w2', 'Backup')])
    } as never);
    warehouses.getAll.and.returnValue(of([]));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['loadItems']);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error', 'handleError', 'guardExport']);
    notifications.guardExport.and.callFake(async (task: () => Promise<unknown>) => {
      await task();
    });

    await TestBed.configureTestingModule({
      imports: [LoansComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: LoanService, useValue: loanService },
        { provide: WarehouseService, useValue: warehouses },
        { provide: InventoryService, useValue: inventory },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  });

  describe('opening the page', () => {
    it('asks for the warehouses and the items, and shows the loans newest first', () => {
      expect(warehouses.getAll).toHaveBeenCalledTimes(1);
      expect(inventory.loadItems).toHaveBeenCalledTimes(1);
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('tells the user when the warehouses fail to load', () => {
      warehouses.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(LoansComponent).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('follows the loans of the service as they change', () => {
      allLoans.update((list) => [...list, loan('d', { loanDate: new Date(2026, 0, 9) })]);
      TestBed.tick();

      expect(ids()).toEqual(['d', 'a', 'b', 'c']);
    });
  });

  describe('filters', () => {
    it('searches the name, the warehouses, the item names and the service tags, ignoring case', () => {
      component.searchQuery = 'SCREENS';
      component.applyFilters();
      expect(ids()).toEqual(['a']);

      component.searchQuery = 'south';
      component.applyFilters();
      expect(ids()).toEqual(['b']);

      component.searchQuery = 'tag-9';
      component.applyFilters();
      expect(ids()).toEqual(['a']);

      component.searchQuery = 'laptop';
      component.applyFilters();
      expect(ids()).toEqual(['b', 'c']);
    });

    it('filters by status and combines it with the search', () => {
      component.selectedStatus = LoanStatus.RETURNED;
      component.applyFilters();
      expect(ids()).toEqual(['c']);

      component.searchQuery = 'north';
      component.applyFilters();
      expect(ids()).toEqual([]);
    });

    it('onFilterChange goes back to the first page and applies the filters', () => {
      component.onPageChange({ pageIndex: 3, pageSize: 10 });
      component.selectedStatus = LoanStatus.SENT;

      component.onFilterChange();

      expect(component.pageIndex()).toBe(0);
      expect(ids()).toEqual(['a']);
    });

    it('clearFilters removes every filter and goes back to the first page', () => {
      component.searchQuery = 'x';
      component.selectedStatus = LoanStatus.SENT;
      component.onPageChange({ pageIndex: 2, pageSize: 10 });
      expect(component.hasFilters()).toBeTrue();

      component.clearFilters();

      expect(component.hasFilters()).toBeFalse();
      expect(component.pageIndex()).toBe(0);
      expect(ids()).toEqual(['a', 'b', 'c']);
    });

    it('pages the list with the size the paginator asks for', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 2 });

      expect(component.paginatedLoans().map((l) => l.id)).toEqual(['c']);
    });
  });

  describe('the dialogs', () => {
    it('opens and closes the new loan dialog', () => {
      component.openNewLoanDialog();
      expect(component.showNewLoanDialog).toBeTrue();

      component.closeNewLoanDialog();
      expect(component.showNewLoanDialog).toBeFalse();
    });

    it('closes the new loan dialog once a loan was created, and keeps it open otherwise', () => {
      component.openNewLoanDialog();
      component.onLoanCreated({ success: false, count: 0 });
      expect(component.showNewLoanDialog).toBeTrue();

      component.onLoanCreated({ success: true, count: 1 });
      expect(component.showNewLoanDialog).toBeFalse();
    });

    it('opens and closes the scan dialog, and closes it after a successful scan only', () => {
      component.openScanDialog();
      component.onQrScanned({ success: false });
      expect(component.showScanDialog).toBeTrue();

      component.onQrScanned({ success: true });
      expect(component.showScanDialog).toBeFalse();

      component.openScanDialog();
      component.closeScanDialog();
      expect(component.showScanDialog).toBeFalse();
    });
  });

  describe('sendLoan', () => {
    it('asks the user to confirm, naming the items and the route, and sends nothing when they decline', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { LOANS: { CONFIRM_SEND_MESSAGE: 'Send {{item}} from {{from}} to {{to}}?' } });
      translate.use('en');
      confirm.ask.and.returnValue(of(false));

      component.sendLoan(loan('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ type: 'info', message: 'Send Laptop ×2 from Main to Backup?' })
      );
      expect(loanService.sendLoan).not.toHaveBeenCalled();
    });

    it('sends the loan once confirmed and shows the QR the service returned', () => {
      component.sendLoan(loan('a'));

      expect(loanService.sendLoan).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('LOANS.SEND_SUCCESS');
      expect(component.showQrDialog).toBeTrue();
      expect(component.qrDialogType).toBe('send');
      expect(component.currentQrDataUrl).toBe('data:image/png;base64,SEND');
      expect(component.currentLoan?.id).toBe('a');
    });

    it('does not open the QR dialog when the answer has no QR', () => {
      loanService.sendLoan.and.returnValue(of(withQr('a')));

      component.sendLoan(loan('a'));

      expect(notifications.success).toHaveBeenCalledTimes(1);
      expect(component.showQrDialog).toBeFalse();
    });

    it('says nothing when the service answers with nothing', () => {
      loanService.sendLoan.and.returnValue(of(null));

      component.sendLoan(loan('a'));

      expect(notifications.success).not.toHaveBeenCalled();
      expect(component.showQrDialog).toBeFalse();
    });

    it('tells the user when sending fails', () => {
      loanService.sendLoan.and.returnValue(throwError(() => failure));

      component.sendLoan(loan('a'));

      expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.SEND_ERROR');
    });
  });

  describe('initiateReturn', () => {
    it('asks for confirmation and starts nothing when the user declines', () => {
      confirm.ask.and.returnValue(of(false));

      component.initiateReturn(loan('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'info' }));
      expect(loanService.initiateReturn).not.toHaveBeenCalled();
    });

    it('starts the return once confirmed and shows the return QR', () => {
      component.initiateReturn(loan('a'));

      expect(loanService.initiateReturn).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('LOANS.INITIATE_RETURN_SUCCESS');
      expect(component.qrDialogType).toBe('return');
      expect(component.currentQrDataUrl).toBe('data:image/png;base64,RETURN');
      expect(component.showQrDialog).toBeTrue();
    });

    it('tells the user when starting the return fails, and says nothing for an empty answer', () => {
      loanService.initiateReturn.and.returnValue(of(null));
      component.initiateReturn(loan('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      loanService.initiateReturn.and.returnValue(throwError(() => failure));
      component.initiateReturn(loan('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.INITIATE_RETURN_ERROR');
    });
  });

  describe('cancelLoan', () => {
    it('asks for a warning confirmation and cancels nothing when the user declines', () => {
      confirm.ask.and.returnValue(of(false));

      component.cancelLoan(loan('a'));

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'warning' }));
      expect(loanService.cancelLoan).not.toHaveBeenCalled();
    });

    it('cancels the loan once confirmed and says so', () => {
      component.cancelLoan(loan('a'));

      expect(loanService.cancelLoan).toHaveBeenCalledOnceWith('a');
      expect(notifications.success).toHaveBeenCalledOnceWith('LOANS.CANCEL_SUCCESS');
    });

    it('says nothing for an empty answer, and tells the user when cancelling fails', () => {
      loanService.cancelLoan.and.returnValue(of(null));
      component.cancelLoan(loan('a'));
      expect(notifications.success).not.toHaveBeenCalled();

      loanService.cancelLoan.and.returnValue(throwError(() => failure));
      component.cancelLoan(loan('a'));
      expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.CANCEL_ERROR');
    });
  });

  describe('confirming by hand, without the QR', () => {
    const cases: [string, (l: Loan) => void, () => jasmine.Spy, string, string][] = [
      ['receipt', (l) => component.manualConfirmReceipt(l), () => loanService.manualConfirmReceipt, 'LOANS.MANUAL_CONFIRM_RECEIPT_SUCCESS', 'LOANS.MANUAL_CONFIRM_ERROR'],
      ['return', (l) => component.manualConfirmReturn(l), () => loanService.manualConfirmReturn, 'LOANS.MANUAL_CONFIRM_RETURN_SUCCESS', 'LOANS.MANUAL_CONFIRM_RETURN_ERROR']
    ];

    for (const [name, run, service, success, error] of cases) {
      it(`asks for a warning confirmation before confirming the ${name}, and does nothing when declined`, () => {
        confirm.ask.and.returnValue(of(false));

        run(loan('a'));

        expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'warning' }));
        expect(service()).not.toHaveBeenCalled();
      });

      it(`confirms the ${name} once confirmed and says so`, () => {
        run(loan('a'));

        expect(service()).toHaveBeenCalledOnceWith('a');
        expect(notifications.success).toHaveBeenCalledOnceWith(success);
      });

      it(`says nothing for an empty answer and tells the user when confirming the ${name} fails`, () => {
        (service() as unknown as jasmine.Spy).and.returnValue(of(null));
        run(loan('a'));
        expect(notifications.success).not.toHaveBeenCalled();

        (service() as unknown as jasmine.Spy).and.returnValue(throwError(() => failure));
        run(loan('a'));
        expect(notifications.error).toHaveBeenCalledOnceWith(error);
      });
    }
  });

  describe('showQrCode', () => {
    it('opens the QR dialog at once and fills it with the code the service gives', () => {
      component.showQrCode(loan('a'), 'return');

      expect(loanService.getQrCode).toHaveBeenCalledOnceWith('a', 'return');
      expect(component.showQrDialog).toBeTrue();
      expect(component.qrDialogType).toBe('return');
      expect(component.currentQrDataUrl).toBe('data:image/png;base64,SHOWN');
      expect(component.currentLoan?.id).toBe('a');
    });

    it('tells the user and closes the dialog when the code cannot be loaded', () => {
      loanService.getQrCode.and.returnValue(throwError(() => failure) as Observable<string>);

      component.showQrCode(loan('a'), 'send');

      expect(notifications.error).toHaveBeenCalledOnceWith('LOANS.QR.SCAN_ERROR');
      expect(component.showQrDialog).toBeFalse();
      expect(component.currentLoan).toBeNull();
    });

    it('closeQrDialog forgets the loan and the code', () => {
      component.showQrCode(loan('a'), 'send');

      component.closeQrDialog();

      expect([component.showQrDialog, component.currentQrDataUrl, component.currentLoan]).toEqual([false, null, null]);
    });
  });

  describe('helpers', () => {
    it('getStatusLabel uses the translation key of the status', () => {
      expect(component.getStatusLabel(LoanStatus.SENT)).toBe('LOANS.STATUS.SENT');
    });

    it('summarize and totalQty describe the items of a loan', () => {
      const two = loan('x', { items: [{ inventoryItemName: 'Laptop', quantity: 2 }, { inventoryItemName: 'Cable', quantity: 1 }] as Loan['items'] });

      expect(component.summarize(two)).toBe('Laptop ×2; Cable');
      expect(component.totalQty(two)).toBe(3);
    });

    it('getStatusClass and getDueDateClass are the shared loan classes', () => {
      const sent = loan('x', { status: LoanStatus.SENT });

      expect(component.getStatusClass(LoanStatus.SENT)).toBe(getLoanStatusClass(LoanStatus.SENT));
      expect(component.getDueDateClass(sent)).toBe(getLoanDueDateClass(sent));
    });

    it('downloadPdf asks the service for the pdf of the loan', () => {
      component.downloadPdf(loan('a'));

      expect(loanService.downloadPdf).toHaveBeenCalledOnceWith('a');
    });

    it('exportToXLSX exports the loans that pass the filters', async () => {
      component.selectedStatus = LoanStatus.SENT;
      component.applyFilters();

      await component.exportToXLSX();

      expect(notifications.guardExport).toHaveBeenCalledTimes(1);
      expect(loanService.exportToXLSX).toHaveBeenCalledOnceWith(component.filteredLoans());
      expect(component.filteredLoans().map((l) => l.id)).toEqual(['a']);
    });
  });
});
