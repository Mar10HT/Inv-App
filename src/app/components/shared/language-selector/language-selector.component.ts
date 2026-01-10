import { Component, inject, signal, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2">
      <button
        (click)="changeLang('es')"
        [class.active]="currentLang() === 'es'"
        class="lang-btn"
        title="Spanish">
        🇭🇳
      </button>
      <button
        (click)="changeLang('en')"
        [class.active]="currentLang() === 'en'"
        class="lang-btn"
        title="English">
        🇺🇸
      </button>
    </div>
  `,
  styles: [`
    .lang-btn {
      font-size: 1.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background-color: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      opacity: 0.5;
    }

    .lang-btn:hover {
      opacity: 0.8;
      background-color: rgba(59, 130, 246, 0.1);
    }

    .lang-btn.active {
      opacity: 1;
      background-color: rgba(59, 130, 246, 0.15);
    }
  `]
})
export class LanguageSelectorComponent implements OnInit {
  private translate = inject(TranslateService);

  currentLang = signal<string>('en');

  ngOnInit() {
    // Load saved language or default to 'en'
    const savedLang = localStorage.getItem('language') || 'en';
    this.currentLang.set(savedLang);
    this.translate.use(savedLang);
  }

  changeLang(lang: string) {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('language', lang);
  }
}
