import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryStatsCards } from './inventory-stats';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('InventoryStatsCards', () => {
  let fixture: ComponentFixture<InventoryStatsCards>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryStatsCards],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryStatsCards);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('stats', { total: 10, inStock: 6, lowStock: 3, outOfStock: 1 });
  });

  it('shows one card per counter with its value', () => {
    fixture.detectChanges();

    const values = Array.from(el.querySelectorAll('p.text-3xl')).map((p) => p.textContent?.trim());
    expect(values).toEqual(['10', '6', '3', '1']);
  });

  it('labels the cards with the translation keys', () => {
    fixture.detectChanges();

    const text = el.textContent ?? '';
    expect(text).toContain('DASHBOARD.TOTAL_ITEMS');
    expect(text).toContain('DASHBOARD.IN_STOCK');
    expect(text).toContain('DASHBOARD.LOW_STOCK');
    expect(text).toContain('DASHBOARD.OUT_OF_STOCK');
  });

  it('shows four skeleton cards instead of the counters while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(el.querySelectorAll('app-skeleton-card').length).toBe(4);
    expect(el.querySelectorAll('p.text-3xl').length).toBe(0);
  });

  it('updates the counters when the stats change', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('stats', { total: 2, inStock: 2, lowStock: 0, outOfStock: 0 });
    fixture.detectChanges();

    const values = Array.from(el.querySelectorAll('p.text-3xl')).map((p) => p.textContent?.trim());
    expect(values).toEqual(['2', '2', '0', '0']);
  });
});
