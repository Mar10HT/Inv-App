import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';
import { SkeletonCardComponent } from './skeleton-card';
import { SkeletonTableComponent } from './skeleton-table';
import { SkeletonChartComponent } from './skeleton-chart';

@Component({
  selector: 'app-skeleton-dashboard',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, SkeletonCardComponent, SkeletonTableComponent, SkeletonChartComponent],
  template: `
    <!-- Primary Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      @for (card of [1, 2, 3, 4]; track $index) {
        <app-skeleton-card />
      }
    </div>

    <!-- Secondary Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      @for (card of [1, 2, 3, 4]; track $index) {
        <app-skeleton-card />
      }
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      @for (chart of [1, 2, 3]; track $index) {
        <app-skeleton-chart />
      }
    </div>

    <!-- Tables Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      @for (table of [1, 2]; track $index) {
        <div class="border rounded-xl overflow-hidden p-6" style="background-color: var(--color-card); border-color: var(--color-border-subtle)">
          <app-skeleton width="40%" height="1.5rem" customClass="mb-2"></app-skeleton>
          <app-skeleton width="60%" height="0.875rem" customClass="mb-4"></app-skeleton>
          <app-skeleton-table [rows]="3" [columns]="4" />
        </div>
      }
    </div>

    <!-- Recent Items Table -->
    <div class="border rounded-xl overflow-hidden p-6" style="background-color: var(--color-card); border-color: var(--color-border-subtle)">
      <app-skeleton width="30%" height="1.5rem" customClass="mb-2"></app-skeleton>
      <app-skeleton width="50%" height="0.875rem" customClass="mb-6"></app-skeleton>
      <app-skeleton-table [rows]="5" [columns]="6" />
    </div>
  `
})
export class SkeletonDashboardComponent {}
