import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ReportsTrendsTab } from './reports-trends-tab';
import { TrendPoint } from '../reports.types';
import { ThemeService } from '../../../services/theme.service';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const trends: TrendPoint[] = [
  { date: '2026-03-01', in: 1, out: 2, transfer: 3 },
  { date: '2026-03-02', in: 4, out: 0, transfer: 0 }
];

describe('ReportsTrendsTab', () => {
  let fixture: ComponentFixture<ReportsTrendsTab>;
  let component: ReportsTrendsTab;
  let el: HTMLElement;
  const isDark = signal(false);

  const rows = (): string[][] =>
    Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '')
    );

  beforeEach(async () => {
    isDark.set(false);
    await TestBed.configureTestingModule({
      imports: [ReportsTrendsTab],
      providers: [...provideTestBedDefaults(), { provide: ThemeService, useValue: { isDark } }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsTrendsTab);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('trends', trends);
  });

  it('shows only the spinner while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(el.querySelector('.animate-spin')).not.toBeNull();
    expect(el.querySelector('apx-chart')).toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('shows the chart and the daily table once loaded', () => {
    fixture.detectChanges();

    expect(el.querySelector('.animate-spin')).toBeNull();
    expect(el.querySelector('apx-chart')).not.toBeNull();
    expect(el.querySelector('table')).not.toBeNull();
  });

  it('lists the days newest first with the per type counts and their total', () => {
    fixture.detectChanges();

    const [newest, oldest] = rows();
    expect(newest.slice(1)).toEqual(['4', '0', '0', '4']);
    expect(oldest.slice(1)).toEqual(['1', '2', '3', '6']);
    expect(newest[0]).toMatch(/2026/);
  });

  it('does not reorder the trends input while reversing the table', () => {
    fixture.detectChanges();

    expect(trends.map((t) => t.date)).toEqual(['2026-03-01', '2026-03-02']);
  });

  describe('chart options', () => {
    it('builds one series per transaction type from the trends', () => {
      const { series } = component.trendChartOptions();

      expect(series.map((s) => s.name)).toEqual([
        'TRANSACTIONS.TYPE.IN',
        'TRANSACTIONS.TYPE.OUT',
        'TRANSACTIONS.TYPE.TRANSFER'
      ]);
      expect(series.map((s) => s.data)).toEqual([[1, 4], [2, 0], [3, 0]]);
    });

    it('labels the x axis as day/month', () => {
      fixture.componentRef.setInput('trends', [{ date: '2026-03-05T12:00:00Z', in: 0, out: 0, transfer: 0 }]);

      expect(component.trendChartOptions().xaxis.categories).toEqual(['5/3']);
    });

    it('follows the theme', () => {
      expect(component.trendChartOptions().tooltip.theme).toBe('light');
      expect(component.trendChartOptions().yaxis.labels.style.colors).toBe('#64748b');

      isDark.set(true);

      expect(component.trendChartOptions().tooltip.theme).toBe('dark');
      expect(component.trendChartOptions().yaxis.labels.style.colors).toBe('#94a3b8');
    });
  });
});
