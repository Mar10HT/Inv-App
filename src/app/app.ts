import { Component, inject, OnInit, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/shared/navigation/navigation';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';
import { CommandPaletteService } from './services/command-palette.service';
import { CsrfService } from './services/csrf.service';
import { LoggerService } from './services/logger.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navigation,
    TranslateModule,
  ],
  template: `
<div class="min-h-screen bg-surface text-on-surface">
  <a href="#main-content"
     class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
    {{ 'COMMON.SKIP_NAV' | translate }}
  </a>

  @if (authService.isAuthenticated()) {
    <app-navigation></app-navigation>
  }

  <main
    id="main-content"
    class="main-content"
    [class.with-sidebar]="authService.isAuthenticated()"
    [class.sidebar-collapsed]="isCollapsed()">
    <router-outlet></router-outlet>
  </main>
</div>
  `,
  styleUrl: './app.css'
})
export class App implements OnInit {
  private translate = inject(TranslateService);
  private commandPalette = inject(CommandPaletteService);
  private csrfService = inject(CsrfService);
  private logger = inject(LoggerService);
  authService = inject(AuthService);
  sidebarService = inject(SidebarService);
  title = 'ICN';

  isCollapsed = computed(() => this.sidebarService.isCollapsed());

  ngOnInit() {
    // Initialize CSRF token for security
    this.csrfService.fetchCsrfToken().subscribe({
      error: (err) => this.logger.error('Failed to fetch CSRF token', err)
    });

    // Initialize command palette keyboard shortcut (Ctrl+K / Cmd+K)
    this.commandPalette.initKeyboardShortcut();
    // Configure available languages
    this.translate.addLangs(['es', 'en']);

    // Set default language
    this.translate.setDefaultLang('en');

    // Use saved language or detect from browser
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/es|en/) ? browserLang : 'en');

    this.translate.use(langToUse);

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}