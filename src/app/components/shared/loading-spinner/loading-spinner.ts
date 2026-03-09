import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3" [ngClass]="containerClass">
      <div
        class="animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"
        [ngClass]="sizeClass">
      </div>
      @if (message) {
        <p class="text-[var(--color-on-surface-variant)] text-sm">{{ message }}</p>
      }
    </div>
  `
})
export class LoadingSpinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() message?: string;
  @Input() fullHeight = false;

  get sizeClass(): string {
    switch (this.size) {
      case 'sm': return 'h-6 w-6';
      case 'md': return 'h-10 w-10';
      case 'lg': return 'h-16 w-16';
      default: return 'h-10 w-10';
    }
  }

  get containerClass(): string {
    return this.fullHeight ? 'min-h-[200px]' : '';
  }
}
