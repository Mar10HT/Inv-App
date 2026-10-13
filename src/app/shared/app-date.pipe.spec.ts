import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeEsHN from '@angular/common/locales/es-HN';
import { TranslateService } from '@ngx-translate/core';
import { AppDatePipe } from './app-date.pipe';
import { provideTestBedDefaults } from '../../testing/test-providers';

registerLocaleData(localeEsHN);

@Component({
  imports: [AppDatePipe],
  template: `<span>{{ date() | appDate: 'mediumDate' : 'UTC' }}</span>`
})
class Host {
  date = signal<Date | null>(new Date('2027-03-01'));
}

describe('AppDatePipe', () => {
  const render = (): { text: () => string; host: Host } => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    return { host: fixture.componentInstance, text: () => (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '' };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
  });

  it('formats in Spanish (Honduras) when the app is in Spanish', async () => {
    TestBed.inject(TranslateService).use('es');
    const { text } = render();
    await TestBed.inject(TranslateService).use('es').toPromise();

    expect(text()).toBe('1 mar 2027');
  });

  it('follows a language switch without reloading', async () => {
    const translate = TestBed.inject(TranslateService);
    await translate.use('es').toPromise();
    const view = render();
    expect(view.text()).toBe('1 mar 2027');

    await translate.use('en').toPromise();
    await new Promise((resolve) => setTimeout(resolve));

    expect(view.text()).toBe('Mar 1, 2027');
  });

  it('shows nothing for a missing date', async () => {
    const view = render();
    view.host.date.set(null);
    await new Promise((resolve) => setTimeout(resolve));

    expect(view.text()).toBe('');
  });
});
