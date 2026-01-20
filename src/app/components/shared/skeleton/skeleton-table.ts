import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y" style="border-color: var(--color-border-subtle)">
        <thead>
          <tr>
            @for (col of columnsArray; track $index) {
              <th class="px-6 py-3 text-left">
                <app-skeleton width="80%" height="1rem"></app-skeleton>
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y" style="border-color: var(--color-border-subtle)">
          @for (row of rowsArray; track $index) {
            <tr>
              @for (col of columnsArray; track $index) {
                <td class="px-6 py-4">
                  <app-skeleton
                    [width]="getColumnWidth($index)"
                    height="1rem"
                  ></app-skeleton>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class SkeletonTableComponent {
  @Input() rows: number = 5;
  @Input() columns: number = 5;

  get rowsArray(): number[] {
    return Array(this.rows).fill(0);
  }

  get columnsArray(): number[] {
    return Array(this.columns).fill(0);
  }

  getColumnWidth(index: number): string {
    // Variar el ancho para que se vea más natural
    const widths = ['90%', '70%', '85%', '60%', '75%'];
    return widths[index % widths.length];
  }
}
