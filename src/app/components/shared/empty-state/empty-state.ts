import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule, MatButtonModule, TranslateModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div class="rounded-full bg-[var(--color-surface-elevated)] p-6 mb-4">
        <lucide-icon [name]="icon" class="!w-12 !h-12 text-[var(--color-on-surface-variant)]"></lucide-icon>
      </div>

      <h3 class="text-xl font-semibold text-white mb-2">{{ title || ('COMMON.NO_DATA_FOUND' | translate) }}</h3>

      @if (description) {
        <p class="text-[var(--color-on-surface-variant)] mb-6 max-w-md">{{ description }}</p>
      }

      @if (actionLabel) {
        <button
          mat-flat-button
          color="primary"
          (click)="actionClick.emit()">
          @if (actionIcon) {
            <lucide-icon [name]="actionIcon" class="!w-4 !h-4 mr-2"></lucide-icon>
          }
          {{ actionLabel }}
        </button>
      }
    </div>
  `
})
export class EmptyState {
  @Input() icon = 'Inbox';
  @Input() title?: string;
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() actionClick = new EventEmitter<void>();
}
