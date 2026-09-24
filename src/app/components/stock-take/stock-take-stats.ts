import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { StockTakeStats } from '../../interfaces/stock-take.interface';
import { StatCard } from '../shared/stat-card/stat-card';

@Component({
  selector: 'app-stock-take-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, StatCard],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <app-stat-card [label]="'STOCK_TAKE.STATS.TOTAL' | translate" [value]="stats().total" icon="ClipboardCheck"></app-stat-card>
      <app-stat-card [label]="'STOCK_TAKE.STATS.IN_PROGRESS' | translate" [value]="stats().inProgress" icon="Clock" tone="info"></app-stat-card>
      <app-stat-card [label]="'STOCK_TAKE.STATS.COMPLETED' | translate" [value]="stats().completed" icon="CheckCircle2" tone="success"></app-stat-card>
      <app-stat-card [label]="'STOCK_TAKE.STATS.CANCELLED' | translate" [value]="stats().cancelled" icon="XCircle" tone="error"></app-stat-card>
    </div>
  `
})
export class StockTakeStatsCards {
  stats = input.required<StockTakeStats>();
}
