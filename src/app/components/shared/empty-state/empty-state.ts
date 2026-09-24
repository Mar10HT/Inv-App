import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  host: { class: 'contents' },
  template: `
    <div class="flex flex-col items-center justify-center py-16">
      <lucide-icon [name]="icon()" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
      <p class="text-[var(--color-on-surface-variant)] text-lg mb-2">{{ heading() }}</p>
      @if (description()) {
        <p class="text-[var(--color-on-surface-muted)] text-sm mb-6">{{ description() }}</p>
      }
      <ng-content />
    </div>
  `
})
export class EmptyState {
  /** Lucide icon name, it must be registered in APP_ICONS */
  icon = input.required<string>();
  /** Already translated text */
  heading = input.required<string>();
  /** Already translated text */
  description = input<string>();
}
