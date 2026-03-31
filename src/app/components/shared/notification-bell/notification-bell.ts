import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AlertsService } from '../../../services/alerts.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, LucideAngularModule, TranslateModule],
  template: `
    <div class="relative">
      <!-- Bell button -->
      <button
        class="action-btn relative"
        (click)="toggle($event)"
        [attr.aria-label]="'ALERTS.TITLE' | translate"
        [attr.aria-expanded]="isOpen()">
        <lucide-icon name="Bell" class="action-icon"></lucide-icon>
        @if (alertsService.unreadCount() > 0) {
          <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style="background-color: var(--color-error);">
            {{ alertsService.unreadCount() > 9 ? '9+' : alertsService.unreadCount() }}
          </span>
        }
      </button>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div class="notification-dropdown absolute bottom-full mb-2 right-0 w-80 rounded-xl border shadow-lg z-50"
             style="background-color: var(--color-surface-elevated); border-color: var(--color-border);">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--color-border);">
            <span class="text-sm font-semibold" style="color: var(--color-on-surface);">
              {{ 'ALERTS.TITLE' | translate }}
            </span>
            @if (alertsService.unreadCount() > 0) {
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    style="background-color: var(--color-error-bg); color: var(--color-error);">
                {{ alertsService.unreadCount() }}
              </span>
            }
          </div>

          <!-- Alert list -->
          <div class="max-h-72 overflow-y-auto">
            @if (alertsService.isLoading()) {
              <div class="flex items-center justify-center py-8">
                <lucide-icon name="Loader" class="animate-spin w-5 h-5" style="color: var(--color-on-surface-variant);"></lucide-icon>
              </div>
            } @else if (alertsService.alerts().length === 0) {
              <div class="flex flex-col items-center justify-center py-8 gap-2">
                <lucide-icon name="BellOff" class="w-8 h-8" style="color: var(--color-on-surface-variant);"></lucide-icon>
                <p class="text-sm" style="color: var(--color-on-surface-variant);">{{ 'ALERTS.NO_ALERTS' | translate }}</p>
              </div>
            } @else {
              @for (alert of alertsService.alerts(); track alert.id) {
                <div class="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:opacity-80"
                     style="border-color: var(--color-border-subtle);"
                     [class.opacity-60]="alert.notified">
                  <!-- Type icon -->
                  <div class="mt-0.5 flex-shrink-0">
                    @if (alert.type === 'OUT_OF_STOCK') {
                      <lucide-icon name="PackageX" class="w-4 h-4" style="color: var(--color-error);"></lucide-icon>
                    } @else if (alert.type === 'LOW_STOCK') {
                      <lucide-icon name="PackageMinus" class="w-4 h-4" style="color: var(--color-warning);"></lucide-icon>
                    } @else {
                      <lucide-icon name="Clock" class="w-4 h-4" style="color: var(--color-info);"></lucide-icon>
                    }
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate" style="color: var(--color-on-surface);">
                      {{ alert.item.name }}
                    </p>
                    <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant);">
                      {{ 'ALERTS.ITEM_IN' | translate }} {{ alert.item.warehouse?.name || '—' }}
                    </p>
                    <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant);">
                      @if (alert.type === 'LOW_STOCK') {
                        {{ 'ALERTS.LOW_STOCK' | translate }} · {{ alert.currentQty }}/{{ alert.threshold }}
                      } @else if (alert.type === 'OUT_OF_STOCK') {
                        {{ 'ALERTS.OUT_OF_STOCK' | translate }}
                      } @else {
                        {{ 'ALERTS.EXPIRING_SOON' | translate }}
                      }
                    </p>
                  </div>

                  <!-- Resolve button -->
                  <button
                    class="flex-shrink-0 text-xs px-2 py-1 rounded-md transition-opacity hover:opacity-80"
                    style="background-color: var(--color-surface-variant); color: var(--color-on-surface-variant);"
                    (click)="resolve(alert.id)"
                    [attr.aria-label]="'ALERTS.RESOLVE' | translate">
                    <lucide-icon name="Check" class="w-3 h-3"></lucide-icon>
                  </button>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="px-4 py-3">
            <a
              routerLink="/audit"
              class="text-xs font-medium transition-opacity hover:opacity-80"
              style="color: var(--color-primary);"
              (click)="close()">
              {{ 'ALERTS.VIEW_ALL' | translate }}
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent {
  alertsService = inject(AlertsService);
  private elementRef = inject(ElementRef);

  isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update(v => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  resolve(id: string): void {
    this.alertsService.resolve(id).subscribe();
  }
}
