import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { App } from './app';
import { provideTestBedDefaults } from '../testing/test-providers';


describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // NOTE: the original assertion here checked for an `<h1>` containing
    // "Hello, INV-ICN" — a leftover from the Angular CLI's default
    // generated template. The real `app.html` was redesigned long ago and
    // never contained that markup, so the assertion could never pass
    // regardless of TestBed setup. Replaced with a check against markup
    // that actually exists in the current template (see src/app/app.html).
    expect(compiled.querySelector('main#main-content')).toBeTruthy();
  });

  describe('the starting language', () => {
    afterEach(() => localStorage.removeItem('language'));

    const startingLanguage = (saved: string | null): string => {
      if (saved === null) localStorage.removeItem('language');
      else localStorage.setItem('language', saved);
      const use = spyOn(TestBed.inject(TranslateService), 'use').and.callThrough();
      TestBed.createComponent(App).detectChanges();
      return use.calls.mostRecent().args[0];
    };

    it('is Spanish on a first visit, so the login page is not in English', () => {
      expect(startingLanguage(null)).toBe('es');
    });

    it('is the language the user picked before', () => {
      expect(startingLanguage('en')).toBe('en');
    });

    it('falls back to Spanish when the saved value is not a supported language', () => {
      expect(startingLanguage('fr')).toBe('es');
    });
  });
});
