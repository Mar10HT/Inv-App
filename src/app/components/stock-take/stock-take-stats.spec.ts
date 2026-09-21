import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockTakeStatsCards } from './stock-take-stats';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('StockTakeStatsCards', () => {
  let fixture: ComponentFixture<StockTakeStatsCards>;
  let el: HTMLElement;

  const values = (): (string | undefined)[] =>
    Array.from(el.querySelectorAll('p.text-2xl')).map((p) => p.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockTakeStatsCards],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(StockTakeStatsCards);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('stats', { total: 9, inProgress: 2, completed: 6, cancelled: 1 });
  });

  it('shows total, in progress, completed and cancelled counters in order', () => {
    fixture.detectChanges();

    expect(values()).toEqual(['9', '2', '6', '1']);
  });

  it('labels each card with its translation key', () => {
    fixture.detectChanges();

    const text = el.textContent ?? '';
    for (const key of ['TOTAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      expect(text).toContain(`STOCK_TAKE.STATS.${key}`);
    }
  });

  it('follows the stats input', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('stats', { total: 0, inProgress: 0, completed: 0, cancelled: 0 });
    fixture.detectChanges();

    expect(values()).toEqual(['0', '0', '0', '0']);
  });
});
