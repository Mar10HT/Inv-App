import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LanguageSelectorComponent } from './language-selector.component';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('LanguageSelectorComponent', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let translate: TranslateService;

  const create = (appLang: string): void => {
    TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
      providers: [...provideTestBedDefaults()]
    });
    translate = TestBed.inject(TranslateService);
    translate.use(appLang);
    fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();
  };

  beforeEach(() => localStorage.removeItem('language'));
  afterEach(() => localStorage.removeItem('language'));

  it('keeps the language the app started in when nothing is saved, instead of forcing English', () => {
    create('es');
    expect(translate.getCurrentLang()).toBe('es');
    expect(fixture.componentInstance.currentLang()).toBe('es');
  });

  it('switches and saves the language when a flag is clicked', () => {
    create('es');
    fixture.componentInstance.changeLang('en');
    expect(translate.getCurrentLang()).toBe('en');
    expect(localStorage.getItem('language')).toBe('en');
  });

  it('follows a language change made elsewhere, such as Settings', () => {
    create('es');
    translate.use('en');
    expect(fixture.componentInstance.currentLang()).toBe('en');
  });
});
