import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface CustomSnackbarData {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: string;
}

@Component({
  selector: 'app-custom-snackbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="flex items-stretch overflow-hidden rounded-xl min-w-[360px] max-w-[520px] border-[5px]"
      [ngClass]="borderClass">
      <!-- Icon Section -->
      <div
        class="flex items-center justify-center w-16 flex-shrink-0"
        [ngClass]="iconBgClass">
        <lucide-icon [name]="icon" class="!w-6 !h-6 text-white"></lucide-icon>
      </div>

      <!-- Content Section -->
      <div class="flex-1 flex items-center justify-between bg-[#0a0a0a] px-5 py-4 gap-4">
        <span class="text-white text-sm font-medium">{{ data.message }}</span>

        <button
          (click)="dismiss()"
          class="text-slate-500 hover:text-white transition-colors flex-shrink-0 p-1">
          <lucide-icon name="X" class="!w-5 !h-5"></lucide-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomSnackbar {
  data = inject<CustomSnackbarData>(MAT_SNACK_BAR_DATA);
  snackBarRef = inject(MatSnackBarRef<CustomSnackbar>);

  get icon(): string {
    switch (this.data.type) {
      case 'success': return 'Check';
      case 'error': return 'AlertCircle';
      case 'warning': return 'AlertTriangle';
      case 'info': return 'Info';
      default: return 'Info';
    }
  }

  get iconBgClass(): string {
    switch (this.data.type) {
      case 'success': return 'bg-[#4d7c6f]';
      case 'error': return 'bg-[#b91c1c]';
      case 'warning': return 'bg-[#b45309]';
      case 'info': return 'bg-[#1d4ed8]';
      default: return 'bg-[#1d4ed8]';
    }
  }

  get borderClass(): string {
    switch (this.data.type) {
      case 'success': return 'border-[#4d7c6f]';
      case 'error': return 'border-[#b91c1c]';
      case 'warning': return 'border-[#b45309]';
      case 'info': return 'border-[#1d4ed8]';
      default: return 'border-[#1d4ed8]';
    }
  }

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
