import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../../services/theme.service';
import { formatDate } from '../reports.format';
import { TrendPoint } from '../reports.types';

@Component({
  selector: 'app-reports-trends-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, NgApexchartsModule, TranslateModule],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <span class="ml-3 text-[var(--color-on-surface-variant)]">{{ 'COMMON.LOADING' | translate }}...</span>
      </div>
    } @else {
      <!-- Trend Chart -->
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden mb-6">
        <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
          <lucide-icon name="LineChart" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
          <h2 class="text-lg font-semibold text-foreground">{{ 'REPORTS.TRANSACTIONS_LAST_30_DAYS' | translate }}</h2>
        </div>
        <div class="p-6">
          <apx-chart
            [series]="trendChartOptions().series"
            [chart]="trendChartOptions().chart"
            [colors]="trendChartOptions().colors"
            [dataLabels]="trendChartOptions().dataLabels"
            [stroke]="trendChartOptions().stroke"
            [fill]="trendChartOptions().fill"
            [xaxis]="trendChartOptions().xaxis"
            [yaxis]="trendChartOptions().yaxis"
            [grid]="trendChartOptions().grid"
            [legend]="trendChartOptions().legend"
            [tooltip]="trendChartOptions().tooltip">
          </apx-chart>
        </div>
      </div>

      <!-- Daily Summary -->
      <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-theme flex items-center gap-3">
          <lucide-icon name="Calendar" class="!text-[var(--color-primary)] !w-5 !h-5"></lucide-icon>
          <h2 class="text-lg font-semibold text-foreground">{{ 'REPORTS.DAILY_SUMMARY' | translate }}</h2>
        </div>
        <div class="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table class="w-full">
            <thead class="sticky top-0 z-10">
              <tr class="bg-[var(--color-surface)]">
                <th class="text-left px-6 py-3 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase">{{ 'REPORTS.TABLE.DATE' | translate }}</th>
                <th class="text-center px-6 py-3 text-xs font-medium text-emerald-500 uppercase">{{ 'TRANSACTIONS.TYPE.IN' | translate }}</th>
                <th class="text-center px-6 py-3 text-xs font-medium text-rose-500 uppercase">{{ 'TRANSACTIONS.TYPE.OUT' | translate }}</th>
                <th class="text-center px-6 py-3 text-xs font-medium text-blue-500 uppercase">{{ 'TRANSACTIONS.TYPE.TRANSFER' | translate }}</th>
                <th class="text-center px-6 py-3 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border-subtle)]">
              @for (day of trends().slice().reverse(); track day.date) {
                <tr class="hover:bg-[var(--color-surface-variant)] transition-colors">
                  <td class="px-6 py-3 text-foreground">{{ formatDate(day.date) }}</td>
                  <td class="px-6 py-3 text-center">
                    <span class="text-[var(--color-status-success)] font-medium">{{ day.in }}</span>
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span class="text-[var(--color-status-error)] font-medium">{{ day.out }}</span>
                  </td>
                  <td class="px-6 py-3 text-center">
                    <span class="text-[var(--color-status-info)] font-medium">{{ day.transfer }}</span>
                  </td>
                  <td class="px-6 py-3 text-center text-foreground font-medium">{{ day.in + day.out + day.transfer }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class ReportsTrendsTab {
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);

  trends = input.required<TrendPoint[]>();
  loading = input(false);

  formatDate = formatDate;

  trendChartOptions = computed(() => {
    const trends = this.trends();
    const isDark = this.themeService.isDark();

    return {
      series: [
        { name: this.translate.instant('TRANSACTIONS.TYPE.IN'), data: trends.map(t => t.in) },
        { name: this.translate.instant('TRANSACTIONS.TYPE.OUT'), data: trends.map(t => t.out) },
        { name: this.translate.instant('TRANSACTIONS.TYPE.TRANSFER'), data: trends.map(t => t.transfer) }
      ],
      chart: {
        type: 'area' as const,
        height: 350,
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#4d7c6f', '#ef4444', '#3b82f6'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1
        }
      },
      xaxis: {
        categories: trends.map(t => this.formatShortDate(t.date)),
        labels: {
          style: { colors: isDark ? '#94a3b8' : '#64748b' },
          rotate: -45,
          rotateAlways: true
        },
        axisBorder: { color: isDark ? '#334155' : '#e2e8f0' },
        axisTicks: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      yaxis: {
        labels: { style: { colors: isDark ? '#94a3b8' : '#64748b' } }
      },
      grid: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        strokeDashArray: 4
      },
      legend: {
        position: 'top' as const,
        horizontalAlign: 'right' as const,
        labels: { colors: isDark ? '#94a3b8' : '#64748b' }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light'
      }
    };
  });

  private formatShortDate(date: string): string {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}
