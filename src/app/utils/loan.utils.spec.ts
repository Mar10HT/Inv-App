import { Loan, LoanItem, LoanStatus, RawLoan } from '../interfaces/loan.interface';
import {
  getLoanDueDateClass,
  getLoanStatusClass,
  summarizeLoanItems,
  totalLoanQuantity,
  transformLoan
} from './loan.utils';

const item = (overrides: Partial<LoanItem> = {}): LoanItem => ({
  id: 'li-1',
  inventoryItemId: 'item-1',
  inventoryItemName: 'Laptop',
  quantity: 1,
  ...overrides
});

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan-1',
  items: [item()],
  sourceWarehouseId: 'wh-a',
  sourceWarehouseName: 'Warehouse A',
  destinationWarehouseId: 'wh-b',
  destinationWarehouseName: 'Warehouse B',
  loanDate: new Date('2026-03-10'),
  dueDate: new Date('2026-04-10'),
  status: LoanStatus.PENDING,
  createdById: 'user-1',
  createdByName: 'Ana',
  createdAt: new Date('2026-03-10'),
  updatedAt: new Date('2026-03-10'),
  ...overrides
});

const rawLoan = (overrides: Partial<RawLoan> = {}): RawLoan => ({
  id: 'loan-1',
  items: [],
  sourceWarehouseId: 'wh-a',
  destinationWarehouseId: 'wh-b',
  loanDate: '2026-03-10T00:00:00.000Z',
  dueDate: '2026-04-10T00:00:00.000Z',
  status: 'SENT',
  createdById: 'user-1',
  createdAt: '2026-03-10T00:00:00.000Z',
  updatedAt: '2026-03-11T00:00:00.000Z',
  ...overrides
});

describe('loan.utils', () => {
  describe('transformLoan', () => {
    it('maps dates, warehouse names and item details from the raw response', () => {
      const result = transformLoan(
        rawLoan({
          name: 'Field kit',
          sourceWarehouse: { name: 'North' },
          destinationWarehouse: { name: 'South' },
          items: [
            {
              id: 'li-1',
              inventoryItemId: 'item-9',
              inventoryItem: { name: 'Router', serviceTag: 'TAG-1' },
              quantity: 2,
              notes: 'fragile'
            }
          ]
        })
      );

      expect(result.name).toBe('Field kit');
      expect(result.sourceWarehouseName).toBe('North');
      expect(result.destinationWarehouseName).toBe('South');
      expect(result.loanDate).toEqual(new Date('2026-03-10T00:00:00.000Z'));
      expect(result.dueDate).toEqual(new Date('2026-04-10T00:00:00.000Z'));
      expect(result.items).toEqual([
        {
          id: 'li-1',
          inventoryItemId: 'item-9',
          inventoryItemName: 'Router',
          inventoryItemServiceTag: 'TAG-1',
          quantity: 2,
          notes: 'fragile'
        }
      ]);
    });

    it('falls back to empty names and no optional fields when relations are missing', () => {
      const result = transformLoan(
        rawLoan({
          name: null,
          items: [{ id: 'li-2', inventoryItemId: 'item-2', quantity: 1 } as RawLoan['items'][number]]
        })
      );

      expect(result.name).toBeUndefined();
      expect(result.sourceWarehouseName).toBe('');
      expect(result.destinationWarehouseName).toBe('');
      expect(result.createdByName).toBe('');
      expect(result.returnDate).toBeUndefined();
      expect(result.items[0].inventoryItemName).toBe('');
      expect(result.items[0].inventoryItemServiceTag).toBeUndefined();
    });

    it('treats a missing items array as an empty list', () => {
      const raw = rawLoan();
      delete (raw as Partial<RawLoan>).items;

      expect(transformLoan(raw).items).toEqual([]);
    });

    it('prefers the user name over the email for actor names', () => {
      const result = transformLoan(
        rawLoan({
          createdBy: { name: 'Ana', email: 'ana@example.com' },
          receivedBy: { name: null, email: 'bob@example.com' },
          returnConfirmedBy: { name: 'Cara', email: 'cara@example.com' }
        })
      );

      expect(result.createdByName).toBe('Ana');
      expect(result.receivedByName).toBe('bob@example.com');
      expect(result.returnConfirmedByName).toBe('Cara');
    });

    it('ignores invalid received and return-confirmed timestamps', () => {
      const result = transformLoan(rawLoan({ receivedAt: 'not-a-date', returnConfirmedAt: '2026-03-20T00:00:00.000Z' }));

      expect(result.receivedAt).toBeUndefined();
      expect(result.returnConfirmedAt).toEqual(new Date('2026-03-20T00:00:00.000Z'));
    });

    it('falls back to PENDING for an unknown status and keeps every known one', () => {
      expect(transformLoan(rawLoan({ status: 'WHATEVER' })).status).toBe(LoanStatus.PENDING);

      for (const status of Object.values(LoanStatus)) {
        expect(transformLoan(rawLoan({ status })).status).toBe(status);
      }
    });
  });

  describe('getLoanStatusClass', () => {
    it('gives every known status its own badge style', () => {
      const classes = Object.values(LoanStatus).map((status) => getLoanStatusClass(status));

      expect(classes.every((c) => c.length > 0)).toBeTrue();
      expect(getLoanStatusClass(LoanStatus.OVERDUE)).toContain('--color-status-error');
      expect(getLoanStatusClass(LoanStatus.RETURNED)).toContain('--color-status-success');
      expect(getLoanStatusClass(LoanStatus.SENT)).toContain('--color-status-info');
    });

    it('treats the legacy ACTIVE status like a success state', () => {
      expect(getLoanStatusClass(LoanStatus.ACTIVE)).toBe(getLoanStatusClass(LoanStatus.RETURNED));
    });

    it('falls back to a neutral style for an unknown status', () => {
      expect(getLoanStatusClass('SOMETHING' as LoanStatus)).toContain('--color-surface-elevated');
    });
  });

  describe('getLoanDueDateClass', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const inDays = (days: number): Date => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    it('is muted once the loan is closed, however late it is', () => {
      const late = inDays(-10);

      expect(getLoanDueDateClass(loan({ status: LoanStatus.RETURNED, dueDate: late }), now)).toContain('on-surface-variant');
      expect(getLoanDueDateClass(loan({ status: LoanStatus.CANCELLED, dueDate: late }), now)).toContain('on-surface-variant');
    });

    it('is red and bold for an overdue loan', () => {
      expect(getLoanDueDateClass(loan({ status: LoanStatus.OVERDUE, dueDate: inDays(-2) }), now)).toBe(
        'text-[var(--color-status-error)] font-medium'
      );
    });

    it('warns in amber within three days, yellow within a week, and stays neutral after that', () => {
      const open = (days: number) => loan({ status: LoanStatus.RECEIVED, dueDate: inDays(days) });

      expect(getLoanDueDateClass(open(2), now)).toBe('text-amber-400 font-medium');
      expect(getLoanDueDateClass(open(3), now)).toBe('text-amber-400 font-medium');
      expect(getLoanDueDateClass(open(5), now)).toBe('text-yellow-400');
      expect(getLoanDueDateClass(open(7), now)).toBe('text-yellow-400');
      expect(getLoanDueDateClass(open(30), now)).toBe('text-foreground');
    });
  });

  describe('summarizeLoanItems / totalLoanQuantity', () => {
    it('returns an empty string for a loan without items', () => {
      expect(summarizeLoanItems(loan({ items: [] }))).toBe('');
    });

    it('shows the quantity only when it is greater than one', () => {
      const result = summarizeLoanItems(
        loan({
          items: [
            item({ inventoryItemName: 'Laptop', quantity: 2 }),
            item({ id: 'li-2', inventoryItemName: 'Mouse', quantity: 1 })
          ]
        })
      );

      expect(result).toBe('Laptop ×2; Mouse');
    });

    it('adds up the quantity of every item', () => {
      const result = totalLoanQuantity(
        loan({ items: [item({ quantity: 2 }), item({ id: 'li-2', quantity: 5 })] })
      );

      expect(result).toBe(7);
      expect(totalLoanQuantity(loan({ items: [] }))).toBe(0);
    });
  });
});
