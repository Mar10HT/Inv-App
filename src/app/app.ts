import { Component, inject, OnInit, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/shared/navigation/navigation';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';
import { CommandPaletteService } from './services/command-palette.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Navigation,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private translate = inject(TranslateService);
  private commandPalette = inject(CommandPaletteService);
  authService = inject(AuthService);
  sidebarService = inject(SidebarService);
  title = 'ICN';

  isCollapsed = computed(() => this.sidebarService.isCollapsed());

  ngOnInit() {
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