import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/shared/navigation/navigation';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
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
  authService = inject(AuthService);
  title = 'ICN';

  ngOnInit() {
    // Configure available languages
    this.translate.addLangs(['es', 'en']);

    // Set default language
    this.translate.setDefaultLang('en');

    // Use saved language or detect from browser
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/es|en/) ? browserLang : 'en');

    this.translate.use(langToUse);
  }
}