import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3" [ngClass]="containerClass">
      <div
        class="animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"
        [ngClass]="sizeClass">
      </div>
      @if (message) {
        <p class="text-slate-400 text-sm">{{ message }}</p>
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
