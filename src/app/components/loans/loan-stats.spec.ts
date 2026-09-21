import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanStatsCards } from './loan-stats';
import { LoanStats } from '../../interfaces/loan.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const stats = (overrides: Partial<LoanStats> = {}): LoanStats => ({
  totalPending: 1,
  totalSent: 2,
  totalReceived: 3,
  totalReturnPending: 0,
  totalReturned: 5,
  totalOverdue: 4,
  dueSoon: 0,
  totalActive: 6,
  ...overrides
});

describe('LoanStatsCards', () => {
  let fixture: ComponentFixture<LoanStatsCards>;
  let el: HTMLElement;

  const values = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('p.text-2xl')).map((p) => p.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanStatsCards],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanStatsCards);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('stats', stats());
  });

  it('shows pending, sent, received, overdue and returned counters in that order', () => {
    fixture.detectChanges();

    expect(values()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('labels each card with its translation key', () => {
    fixture.detectChanges();

    const text = el.textContent ?? '';
    for (const key of ['PENDING', 'SENT', 'RECEIVED', 'OVERDUE', 'RETURNED']) {
      expect(text).toContain(`LOANS.${key}`);
    }
  });

  it('follows the stats input', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('stats', stats({ totalPending: 9, totalOverdue: 0 }));
    fixture.detectChanges();

    expect(values()).toEqual(['9', '2', '3', '0', '5']);
  });
});
