import { EnvironmentProviders, Provider, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Observable, of } from 'rxjs';
import { LucideIconsModule } from '../app/shared/icons';

/**
 * Minimal TranslateLoader for specs.
 *
 * Components under test only need a working `TranslateService` instance so
 * dependency injection doesn't throw (NG0201) — none of the existing specs
 * assert on actual translated copy, so returning an empty translation table
 * is sufficient (ngx-translate falls back to the key itself when a
 * translation is missing).
 */
class TestTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<TranslationObject> {
    return of({} as TranslationObject);
  }
}

/**
 * Shared TestBed provider set used across specs.
 *
 * Mirrors the provider set configured for the real app in
 * `src/app/app.config.ts` (zoneless change detection, a router, a working
 * TranslateService, ngx-permissions) plus `provideHttpClientTesting()` so
 * that any HTTP call made from a component's `ngOnInit`/constructor (or a
 * service's constructor) is intercepted instead of hitting a real network
 * address.
 *
 * Spread the result into `TestBed.configureTestingModule({ providers: [...] })`
 * alongside any per-test overrides:
 *
 * ```ts
 * TestBed.configureTestingModule({
 *   imports: [MyComponent],
 *   providers: [...provideTestBedDefaults()]
 * });
 * ```
 */
export function provideTestBedDefaults(): (Provider | EnvironmentProviders)[] {
  return [
    provideZonelessChangeDetection(),
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useClass: TestTranslateLoader
        }
      }),
      NgxPermissionsModule.forRoot(),
      LucideIconsModule
    )
  ];
}
