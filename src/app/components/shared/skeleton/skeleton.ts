import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="baseClasses + ' ' + customClass"
      [style.width]="width"
      [style.height]="height"
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
  @Input() width: string = '100%';
  @Input() height: string = '1rem';
  @Input() circle: boolean = false;
  @Input() customClass: string = '';

  get baseClasses(): string {
    return `skeleton-shimmer ${this.circle ? 'rounded-full' : 'rounded'}`;
  }
}
