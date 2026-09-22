import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxPermissionsService } from 'ngx-permissions';

import { LoanMobileCards } from './loan-mobile-cards';
import { Loan, LoanStatus } from '../../interfaces/loan.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan-1',
  items: [{ id: 'li-1', inventoryItemId: 'item-1', inventoryItemName: 'Laptop', quantity: 2 }],
  sourceWarehouseId: 'wh-a',
  sourceWarehouseName: 'North',
  destinationWarehouseId: 'wh-b',
  destinationWarehouseName: 'South',
  loanDate: new Date('2026-03-01'),
  dueDate: new Date('2027-03-01'),
  status: LoanStatus.PENDING,
  createdById: 'u1',
  createdByName: 'Ana',
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
  ...overrides
});

describe('LoanMobileCards', () => {
  let fixture: ComponentFixture<LoanMobileCards>;
  let el: HTMLElement;
  let permissions: NgxPermissionsService;

  const emitted = {
    send: [] as Loan[],
    cancel: [] as Loan[],
    qr: [] as { loan: Loan; type: 'send' | 'return' }[],
    receipt: [] as Loan[],
    ret: [] as Loan[],
    initiate: [] as Loan[],
    pdf: [] as Loan[]
  };

  const render = async (loans: Loan[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('loans', loans);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();
    // ngxPermissionsOnly resolves the permission through a promise, which zoneless whenStable() does not await.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  const buttons = (): HTMLButtonElement[] => Array.from(el.querySelectorAll('button'));
  const byText = (text: string): HTMLButtonElement | undefined => buttons().find((b) => b.textContent?.includes(text));
  const byTitle = (title: string): HTMLButtonElement | null => el.querySelector(`button[title="${title}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanMobileCards],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    permissions = TestBed.inject(NgxPermissionsService);
    permissions.loadPermissions(['loans:manage']);

    fixture = TestBed.createComponent(LoanMobileCards);
    el = fixture.nativeElement as HTMLElement;

    Object.values(emitted).forEach((list) => (list.length = 0));
    const c = fixture.componentInstance;
    c.sendRequested.subscribe((l) => emitted.send.push(l));
    c.cancelRequested.subscribe((l) => emitted.cancel.push(l));
    c.showQrRequested.subscribe((e) => emitted.qr.push(e));
    c.confirmReceiptRequested.subscribe((l) => emitted.receipt.push(l));
    c.confirmReturnRequested.subscribe((l) => emitted.ret.push(l));
    c.initiateReturnRequested.subscribe((l) => emitted.initiate.push(l));
    c.downloadPdfRequested.subscribe((l) => emitted.pdf.push(l));
  });

  describe('content', () => {
    it('shows the empty state when there are no loans', async () => {
      await render([]);

      expect(el.textContent).toContain('LOANS.NO_LOANS');
      expect(el.querySelectorAll('.p-4').length).toBe(0);
    });

    it('renders one card per loan with warehouses, quantity and the status label', async () => {
      await render([loan({ id: 'a' }), loan({ id: 'b', status: LoanStatus.SENT })]);

      expect(el.querySelectorAll('.p-4').length).toBe(2);
      expect(el.textContent).toContain('North');
      expect(el.textContent).toContain('South');
      expect(el.textContent).toContain('LOANS.STATUS.PENDING');
      expect(el.textContent).toContain('LOANS.STATUS.SENT');
    });

    it('uses the loan name as the title and moves the item summary below it', async () => {
      await render([loan({ name: 'Field kit' })]);

      expect(el.querySelector('.p-4 p.font-medium')?.textContent).toContain('Field kit');
      expect(el.textContent).toContain('Laptop ×2');
    });

    it('falls back to the item summary as the title when the loan has no name', async () => {
      await render([loan()]);

      expect(el.querySelector('.p-4 p.font-medium')?.textContent).toContain('Laptop ×2');
    });
  });

  describe('actions by status', () => {
    it('PENDING: send and cancel emit the loan', async () => {
      const l = loan();
      await render([l]);

      el.querySelector<HTMLButtonElement>('button.ds-btn--send')?.click();
      el.querySelector<HTMLButtonElement>('button.ds-btn--danger-ghost')?.click();

      expect(emitted.send).toEqual([l]);
      expect(emitted.cancel).toEqual([l]);
    });

    it('SENT: show QR emits type "send" and manual confirm emits the receipt', async () => {
      const l = loan({ status: LoanStatus.SENT });
      await render([l]);

      el.querySelector<HTMLButtonElement>('button.ds-btn--qr')?.click();
      byTitle('LOANS.MANUAL_CONFIRM_RECEIPT')?.click();

      expect(emitted.qr).toEqual([{ loan: l, type: 'send' }]);
      expect(emitted.receipt).toEqual([l]);
    });

    it('RECEIVED: initiate return emits the loan', async () => {
      const l = loan({ status: LoanStatus.RECEIVED });
      await render([l]);

      el.querySelector<HTMLButtonElement>('button.ds-btn--return')?.click();

      expect(emitted.initiate).toEqual([l]);
    });

    it('OVERDUE without a receipt: offers the manual receipt confirmation', async () => {
      const l = loan({ status: LoanStatus.OVERDUE });
      await render([l]);

      byText('LOANS.MANUAL_CONFIRM_RECEIPT')?.click();

      expect(emitted.receipt).toEqual([l]);
      expect(byText('LOANS.INITIATE_RETURN')).toBeUndefined();
    });

    it('OVERDUE already received: offers to start the return or confirm it', async () => {
      const l = loan({ status: LoanStatus.OVERDUE, receivedAt: new Date('2026-03-05') });
      await render([l]);

      byText('LOANS.INITIATE_RETURN')?.click();
      byTitle('LOANS.MANUAL_CONFIRM_RETURN')?.click();

      expect(emitted.initiate).toEqual([l]);
      expect(emitted.ret).toEqual([l]);
      expect(byText('LOANS.MANUAL_CONFIRM_RECEIPT')).toBeUndefined();
    });

    it('RETURN_PENDING: show QR emits type "return" and manual confirm emits the return', async () => {
      const l = loan({ status: LoanStatus.RETURN_PENDING });
      await render([l]);

      el.querySelector<HTMLButtonElement>('button.ds-btn--approve')?.click();
      byTitle('LOANS.MANUAL_CONFIRM_RETURN')?.click();

      expect(emitted.qr).toEqual([{ loan: l, type: 'return' }]);
      expect(emitted.ret).toEqual([l]);
    });

    it('closed loans (RETURNED, CANCELLED) have no action buttons besides the PDF download', async () => {
      await render([loan({ status: LoanStatus.RETURNED }), loan({ id: 'b', status: LoanStatus.CANCELLED })]);

      expect(buttons().length).toBe(2);
      expect(buttons().every((b) => b.textContent?.includes('PDF'))).toBeTrue();
    });
  });

  it('always offers the PDF download, whatever the status', async () => {
    const l = loan({ status: LoanStatus.RETURNED });
    await render([l]);

    byText('PDF')?.click();

    expect(emitted.pdf).toEqual([l]);
  });

  describe('permissions and loading', () => {
    it('hides the manage actions from users without loans:manage', async () => {
      permissions.flushPermissions();
      await render([loan()]);

      expect(el.querySelector('button.ds-btn--send')).toBeNull();
      expect(el.querySelector('button.ds-btn--danger-ghost')).toBeNull();
    });

    it('keeps the QR button visible without the manage permission', async () => {
      permissions.flushPermissions();
      await render([loan({ status: LoanStatus.SENT })]);

      expect(el.querySelector('button.ds-btn--qr')).not.toBeNull();
      expect(byTitle('LOANS.MANUAL_CONFIRM_RECEIPT')).toBeNull();
    });

    it('disables the action buttons while a request is in flight', async () => {
      await render([loan()], true);

      expect(el.querySelector<HTMLButtonElement>('button.ds-btn--send')?.disabled).toBeTrue();
      expect(el.querySelector<HTMLButtonElement>('button.ds-btn--danger-ghost')?.disabled).toBeTrue();
    });
  });
});
