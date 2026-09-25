import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TransferRequestStats } from '../../interfaces/transfer-request.interface';
import { StatCard } from '../shared/stat-card/stat-card';

@Component({
  selector: 'app-transfer-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, StatCard],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <app-stat-card [label]="'TRANSFERS.PENDING' | translate" [value]="stats().byStatus.pending" icon="Clock"></app-stat-card>
      <app-stat-card [label]="'TRANSFERS.APPROVED' | translate" [value]="stats().byStatus.approved" icon="CheckCircle2" tone="info"></app-stat-card>
      <app-stat-card [label]="'TRANSFERS.SENT' | translate" [value]="stats().byStatus.sent" icon="Send" tone="info"></app-stat-card>
      <app-stat-card [label]="'TRANSFERS.COMPLETED' | translate" [value]="stats().byStatus.completed" icon="PackageCheck" tone="success"></app-stat-card>
      <app-stat-card [label]="'TRANSFERS.REJECTED' | translate" [value]="stats().byStatus.rejected" icon="XCircle" tone="error"></app-stat-card>
    </div>
  `
})
export class TransferStatsCards {
  stats = input.required<TransferRequestStats>();
}
