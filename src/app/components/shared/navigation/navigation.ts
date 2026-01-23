import { Component, inject, computed, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    MatButtonModule,
    MatTooltipModule,
    TranslateModule,
    LanguageSelectorComponent,
  ],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.css', './navigation-mobile.css']
})
export class Navigation {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private isBrowser: boolean;

  currentUser = computed(() => this.authService.currentUser());
  isCollapsed = computed(() => this.sidebarService.isCollapsed());

  // Theme state from service
  isDarkMode = computed(() => this.themeService.isDark());

  // Mobile menu state
  private mobileMenuOpen = signal<boolean>(false);
  isMobileMenuOpen = computed(() => this.mobileMenuOpen());

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Effect to manage body scroll lock when mobile menu is open
    effect(() => {
      if (this.isBrowser) {
        const isOpen = this.mobileMenuOpen();
        if (isOpen) {
          document.body.classList.add('mobile-menu-open');
          document.body.style.overflow = 'hidden';
          document.body.style.touchAction = 'none';
        } else {
          document.body.classList.remove('mobile-menu-open');
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
        }
      }
    });
  }

  // Computed to show expanded content (desktop expanded OR mobile open)
  showExpandedContent = computed(() => !this.isCollapsed() || this.isMobileMenuOpen());

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
    this.themeService.toggle();
  }

  // Mobile menu methods
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  // Logout
  logout(): void {
    this.authService.logout().subscribe();
  }
}
