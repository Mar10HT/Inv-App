import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferStatsCards } from './transfer-stats';
import { TransferRequestStats } from '../../interfaces/transfer-request.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const stats = (byStatus: Partial<TransferRequestStats['byStatus']> = {}): TransferRequestStats => ({
  total: 20,
  byStatus: { pending: 1, approved: 2, sent: 3, completed: 4, rejected: 5, cancelled: 6, ...byStatus }
});

describe('TransferStatsCards', () => {
  let fixture: ComponentFixture<TransferStatsCards>;
  let el: HTMLElement;

  const values = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('p.text-2xl')).map((p) => p.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferStatsCards],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransferStatsCards);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('stats', stats());
  });

  it('shows pending, approved, sent, completed and rejected counters in that order', () => {
    fixture.detectChanges();

    expect(values()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('labels each card with its translation key', () => {
    fixture.detectChanges();

    const text = el.textContent ?? '';
    for (const key of ['PENDING', 'APPROVED', 'SENT', 'COMPLETED', 'REJECTED']) {
      expect(text).toContain(`TRANSFERS.${key}`);
    }
  });

  it('follows the stats input', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('stats', stats({ pending: 0, completed: 9 }));
    fixture.detectChanges();

    expect(values()).toEqual(['0', '2', '3', '9', '5']);
  });
});
