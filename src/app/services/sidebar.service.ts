import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  isCollapsed = signal(true);

  toggle(): void {
    this.isCollapsed.update(v => !v);
    // Trigger resize after CSS transition (300ms) so charts reflow
    setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }

  collapse(): void {
    this.isCollapsed.set(true);
  }

  expand(): void {
    this.isCollapsed.set(false);
  }
}
