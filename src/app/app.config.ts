import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor, errorInterceptor } from './interceptors';
import { APP_ICONS } from './shared/icons';

// Import translations directly (SSR-safe)
import ES_TRANSLATIONS from '../assets/i18n/es.json';
import EN_TRANSLATIONS from '../assets/i18n/en.json';

const TRANSLATIONS: { [key: string]: any } = {
  es: ES_TRANSLATIONS,
  en: EN_TRANSLATIONS
};

// Static loader - SSR compatible
class StaticTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(TRANSLATIONS[lang] || TRANSLATIONS['en']);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    importProvidersFrom(
      LucideAngularModule.pick(APP_ICONS),
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useClass: StaticTranslateLoader
        }
      }),
      NgxPermissionsModule.forRoot()
    )
  ]
};
