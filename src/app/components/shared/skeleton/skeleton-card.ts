import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="rounded-lg p-6 border" style="background-color: var(--color-card); border-color: var(--color-border-subtle)">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <app-skeleton width="60%" height="1rem" customClass="mb-2"></app-skeleton>
          <app-skeleton width="50%" height="2rem"></app-skeleton>
        </div>
        <app-skeleton width="3rem" height="3rem" [circle]="true"></app-skeleton>
      </div>
      <div class="flex items-center gap-2 mt-4">
        <app-skeleton width="4rem" height="1.25rem" customClass="rounded-full"></app-skeleton>
        <app-skeleton width="8rem" height="0.875rem"></app-skeleton>
      </div>
    </div>
  `
})
export class SkeletonCardComponent {}
