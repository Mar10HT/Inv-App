import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerTone = 'primary' | 'white';

// Full class names, so Tailwind can see them
const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10'
};

const TONE_CLASSES: Record<SpinnerTone, string> = {
  primary: 'border-[var(--color-primary)]',
  white: 'border-white'
};

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  host: { class: 'contents' },
  template: `
    <div
      role="status"
      [attr.aria-label]="'COMMON.LOADING' | translate"
      class="animate-spin motion-reduce:animate-none rounded-full border-b-2"
      [class]="classes()"></div>
  `
})
export class Spinner {
  size = input<SpinnerSize>('lg');
  tone = input<SpinnerTone>('primary');

  protected classes = computed(() => `${SIZE_CLASSES[this.size()]} ${TONE_CLASSES[this.tone()]}`);
}
