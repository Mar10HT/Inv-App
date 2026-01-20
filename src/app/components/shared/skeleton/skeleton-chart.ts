import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-skeleton-chart',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="rounded-lg p-6 border" style="background-color: var(--color-card); border-color: var(--color-border-subtle)">
      <div class="mb-4">
        <app-skeleton width="40%" height="1.5rem" customClass="mb-2"></app-skeleton>
        <app-skeleton width="60%" height="0.875rem"></app-skeleton>
      </div>
      <div class="relative h-64 flex items-end justify-around gap-2 px-4">
        @for (bar of bars; track $index) {
          <div class="flex-1 flex flex-col items-center gap-2">
            <app-skeleton
              width="100%"
              [height]="bar.height"
              customClass="rounded-t"
            ></app-skeleton>
            <app-skeleton width="80%" height="0.75rem"></app-skeleton>
          </div>
        }
      </div>
    </div>
  `
})
export class SkeletonChartComponent {
  bars = [
    { height: '60%' },
    { height: '80%' },
    { height: '45%' },
    { height: '90%' },
    { height: '70%' }
  ];
}
