import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div class="rounded-full bg-slate-800 p-6 mb-4">
        <lucide-icon [name]="icon" class="!w-12 !h-12 text-slate-500"></lucide-icon>
      </div>

      <h3 class="text-xl font-semibold text-white mb-2">{{ title }}</h3>

      @if (description) {
        <p class="text-slate-400 mb-6 max-w-md">{{ description }}</p>
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
  @Input() title = 'No data found';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() actionClick = new EventEmitter<void>();
}
