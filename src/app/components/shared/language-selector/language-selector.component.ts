import { Component, inject, signal, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private destroyRef = inject(DestroyRef);

  currentLang = signal<string>('en');

  ngOnInit() {
    // Only reflect the language the app already chose (saved, else the browser's, see app.ts).
    // Calling use() here with an 'en' fallback switched the whole app to English the first
    // time a user without a saved language expanded the sidebar.
    this.currentLang.set(this.translate.getCurrentLang() || 'en');
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => this.currentLang.set(lang));
  }

  changeLang(lang: string) {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('language', lang);
  }
}
