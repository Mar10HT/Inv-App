import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { LoanStats } from '../../interfaces/loan.interface';

@Component({
  selector: 'app-loan-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.PENDING' | translate }}</p>
            <p class="text-2xl font-bold text-foreground">{{ stats().totalPending }}</p>
          </div>
          <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg">
            <lucide-icon name="Clock" class="!text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.SENT' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-info)]">{{ stats().totalSent }}</p>
          </div>
          <div class="bg-[var(--color-info-bg)] p-3 rounded-lg">
            <lucide-icon name="Send" class="!text-[var(--color-status-info)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.RECEIVED' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-accent-violet)]">{{ stats().totalReceived }}</p>
          </div>
          <div class="bg-[var(--color-accent-violet-bg)] p-3 rounded-lg">
            <lucide-icon name="PackageCheck" class="!text-[var(--color-accent-violet)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.OVERDUE' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-error)]">{{ stats().totalOverdue }}</p>
          </div>
          <div class="bg-[var(--color-error-bg)] p-3 rounded-lg">
            <lucide-icon name="AlertTriangle" class="!text-[var(--color-status-error)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
      <div class="bg-surface-variant border border-theme rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'LOANS.RETURNED' | translate }}</p>
            <p class="text-2xl font-bold text-[var(--color-status-success)]">{{ stats().totalReturned }}</p>
          </div>
          <div class="bg-[var(--color-success-bg)] p-3 rounded-lg">
            <lucide-icon name="CheckCircle2" class="!text-[var(--color-status-success)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoanStatsCards {
  stats = input.required<LoanStats>();
}
