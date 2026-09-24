import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type StatTone = 'neutral' | 'info' | 'success' | 'error' | 'amber' | 'violet';

interface ToneClasses {
  value: string;
  badge: string;
  icon: string;
}

// Full class names, so Tailwind can see them
const TONES: Record<StatTone, ToneClasses> = {
  neutral: {
    value: 'text-foreground',
    badge: 'bg-[var(--color-surface-elevated)]',
    icon: '!text-[var(--color-on-surface-variant)]'
  },
  info: {
    value: 'text-[var(--color-status-info)]',
    badge: 'bg-[var(--color-info-bg)]',
    icon: '!text-[var(--color-status-info)]'
  },
  success: {
    value: 'text-[var(--color-status-success)]',
    badge: 'bg-[var(--color-success-bg)]',
    icon: '!text-[var(--color-status-success)]'
  },
  error: {
    value: 'text-[var(--color-status-error)]',
    badge: 'bg-[var(--color-error-bg)]',
    icon: '!text-[var(--color-status-error)]'
  },
  amber: {
    value: 'text-[var(--color-accent-amber)]',
    badge: 'bg-[var(--color-accent-amber-bg)]',
    icon: '!text-[var(--color-accent-amber)]'
  },
  violet: {
    value: 'text-[var(--color-accent-violet)]',
    badge: 'bg-[var(--color-accent-violet-bg)]',
    icon: '!text-[var(--color-accent-violet)]'
  }
};

@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  host: { class: 'contents' },
  template: `
    <div class="bg-surface-variant border border-theme rounded-xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-[var(--color-on-surface-variant)]">{{ label() }}</p>
          <p class="text-2xl font-bold" [class]="classes().value">{{ value() }}</p>
        </div>
        <div class="p-3 rounded-lg" [class]="classes().badge">
          <lucide-icon [name]="icon()" [class]="iconClass()"></lucide-icon>
        </div>
      </div>
    </div>
  `
})
export class StatCard {
  /** Already translated text */
  label = input.required<string>();
  value = input.required<string | number>();
  /** Lucide icon name, it must be registered in APP_ICONS */
  icon = input.required<string>();
  tone = input<StatTone>('neutral');

  protected classes = computed(() => TONES[this.tone()]);
  protected iconClass = computed(() => `!w-5 !h-5 ${this.classes().icon}`);
}
