import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <lucide-icon name="file-question" class="text-[var(--color-primary)] mb-6" [size]="80" [strokeWidth]="1.5"></lucide-icon>
      <h1 class="text-5xl font-bold text-foreground mb-3">404</h1>
      <p class="text-lg text-muted mb-8">{{ 'COMMON.PAGE_NOT_FOUND' | translate }}</p>
      <a routerLink="/dashboard"
         class="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg transition-colors font-medium">
        {{ 'COMMON.GO_TO_DASHBOARD' | translate }}
      </a>
    </div>
  `
})
export class NotFoundComponent {}
