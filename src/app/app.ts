import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/shared/navigation/navigation';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navigation,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private translate = inject(TranslateService);
  title = 'ICN';

  ngOnInit() {
    // Configurar idiomas disponibles
    this.translate.addLangs(['es', 'en']);

    // Establecer idioma por defecto
    this.translate.setDefaultLang('es');

    // Usar idioma guardado o detectar del navegador
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/es|en/) ? browserLang : 'es');

    this.translate.use(langToUse);
  }
}