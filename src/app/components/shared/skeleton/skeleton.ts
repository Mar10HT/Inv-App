import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="baseClasses + ' ' + customClass()"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
  styles: [`
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }

    .skeleton-shimmer {
      animation: shimmer 2s infinite linear;
      background: linear-gradient(
        90deg,
        var(--color-surface-variant) 0%,
        var(--color-surface-elevated) 20%,
        var(--color-border-subtle) 40%,
        var(--color-surface-elevated) 60%,
        var(--color-surface-variant) 100%
      );
      background-size: 1000px 100%;
    }
  `]
})
export class SkeletonComponent {
  width = input('100%');
  height = input('1rem');
  circle = input(false);
  customClass = input('');

  get baseClasses(): string {
    return `skeleton-shimmer ${this.circle() ? 'rounded-full' : 'rounded'}`;
  }
}
