import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatTooltipModule, TranslateModule],
  template: `
    <button
      (click)="toggleTheme()"
      [matTooltip]="tooltipText()"
      class="relative p-2 rounded-lg bg-surface-elevated hover:bg-slate-700/50 transition-all duration-300 group"
      [class.text-amber-400]="!isDark()"
      [class.text-slate-400]="isDark()">
      <!-- Sun icon -->
      <lucide-icon
        name="Sun"
        class="!w-5 !h-5 transition-all duration-300"
        [class.rotate-0]="!isDark()"
        [class.rotate-90]="isDark()"
        [class.scale-100]="!isDark()"
        [class.scale-0]="isDark()"
        [class.opacity-100]="!isDark()"
        [class.opacity-0]="isDark()"
        style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
      </lucide-icon>

      <!-- Moon icon -->
      <lucide-icon
        name="Moon"
        class="!w-5 !h-5 transition-all duration-300"
        [class.rotate-0]="isDark()"
        [class.-rotate-90]="!isDark()"
        [class.scale-100]="isDark()"
        [class.scale-0]="!isDark()"
        [class.opacity-100]="isDark()"
        [class.opacity-0]="!isDark()">
      </lucide-icon>
    </button>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ThemeToggle {
  private themeService = inject(ThemeService);
  private translate = inject(TranslateService);

  isDark = computed(() => this.themeService.isDark());

  tooltipText = computed(() =>
    this.isDark()
      ? this.translate.instant('THEME.SWITCH_TO_LIGHT')
      : this.translate.instant('THEME.SWITCH_TO_DARK')
  );

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
