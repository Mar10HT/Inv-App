import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoanStats } from '../../interfaces/loan.interface';
import { StatCard } from '../shared/stat-card/stat-card';

@Component({
  selector: 'app-loan-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, StatCard],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <app-stat-card [label]="'LOANS.PENDING' | translate" [value]="stats().totalPending" icon="Clock"></app-stat-card>
      <app-stat-card [label]="'LOANS.SENT' | translate" [value]="stats().totalSent" icon="Send" tone="info"></app-stat-card>
      <app-stat-card [label]="'LOANS.RECEIVED' | translate" [value]="stats().totalReceived" icon="PackageCheck" tone="violet"></app-stat-card>
      <app-stat-card [label]="'LOANS.OVERDUE' | translate" [value]="stats().totalOverdue" icon="AlertTriangle" tone="error"></app-stat-card>
      <app-stat-card [label]="'LOANS.RETURNED' | translate" [value]="stats().totalReturned" icon="CheckCircle2" tone="success"></app-stat-card>
    </div>
  `
})
export class LoanStatsCards {
  stats = input.required<LoanStats>();
}
