import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div
      class="flex items-start gap-3 p-4 rounded-lg"
      [ngClass]="alertClass">
      <mat-icon class="flex-shrink-0 mt-0.5" [ngClass]="iconClass">{{ icon }}</mat-icon>

      <div class="flex-1 min-w-0">
        @if (title) {
          <h4 class="font-semibold mb-1" [ngClass]="textClass">{{ title }}</h4>
        }
        <p [ngClass]="textClass" class="text-sm">{{ message }}</p>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        @if (retryable) {
          <button
            mat-icon-button
            (click)="retry.emit()"
            class="!w-8 !h-8"
            [ngClass]="iconClass">
            <mat-icon class="!text-lg">refresh</mat-icon>
          </button>
        }
        @if (dismissible) {
          <button
            mat-icon-button
            (click)="dismiss.emit()"
            class="!w-8 !h-8"
            [ngClass]="iconClass">
            <mat-icon class="!text-lg">close</mat-icon>
          </button>
        }
      </div>
    </div>
  `
})
export class ErrorAlert {
  @Input() type: 'error' | 'warning' | 'info' | 'success' = 'error';
  @Input() title?: string;
  @Input() message = 'An error occurred';
  @Input() dismissible = false;
  @Input() retryable = false;
  @Output() dismiss = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  get icon(): string {
    switch (this.type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'success': return 'check_circle';
      default: return 'error';
    }
  }

  get alertClass(): string {
    switch (this.type) {
      case 'error': return 'bg-red-900/30 border border-red-800';
      case 'warning': return 'bg-amber-900/30 border border-amber-800';
      case 'info': return 'bg-blue-900/30 border border-blue-800';
      case 'success': return 'bg-green-900/30 border border-green-800';
      default: return 'bg-red-900/30 border border-red-800';
    }
  }

  get iconClass(): string {
    switch (this.type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      default: return 'text-red-400';
    }
  }

  get textClass(): string {
    switch (this.type) {
      case 'error': return 'text-red-200';
      case 'warning': return 'text-amber-200';
      case 'info': return 'text-blue-200';
      case 'success': return 'text-green-200';
      default: return 'text-red-200';
    }
  }
}
