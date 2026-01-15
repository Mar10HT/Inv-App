import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TranslateModule,
    LanguageSelectorComponent,
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})
export class Navigation {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private router = inject(Router);

  currentUser = computed(() => this.authService.currentUser());
  isCollapsed = computed(() => this.sidebarService.isCollapsed());

  // Theme state - initialize from localStorage or default to dark
  isDarkMode = signal<boolean>(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : 'dark') !== 'light'
  );

  // Transactions submenu state
  private transactionsExpanded = signal<boolean>(false);

  isTransactionsExpanded = computed(() => this.transactionsExpanded());

  isTransactionsActive = computed(() => {
    const url = this.router.url;
    return url.startsWith('/transactions') || url.startsWith('/reports');
  });

  toggleSidebar(event: MouseEvent): void {
    this.sidebarService.toggle();

    const button = event.currentTarget as HTMLElement;
    setTimeout(() => button.blur(), 3000);
  }

  toggleTransactions(): void {
    // If collapsed, expand sidebar first and then open submenu
    if (this.isCollapsed()) {
      this.sidebarService.toggle();
      this.transactionsExpanded.set(true);
    } else {
      this.transactionsExpanded.update(v => !v);
    }
  }

  // Toggle between dark and light theme
  toggleTheme(): void {
    const newIsDark = !this.isDarkMode();
    this.isDarkMode.set(newIsDark);
    const theme = newIsDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
