import { ChangeDetectorRef, DestroyRef, LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { localeFor } from './app-language';

/**
 * Angular's DatePipe, in the language the app is showing right now. DatePipe
 * reads LOCALE_ID once at startup, so after switching language the dates
 * stayed in the old one until a reload. Same arguments as `date`.
 *
 * Impure so it re-runs after a language switch, and memoized so re-running
 * costs nothing while the inputs stay the same.
 */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly startupLocale = inject(LOCALE_ID);
  private last?: { key: string; result: string | null };

  constructor() {
    // Views without a translate pipe of their own wouldn't be checked again on a switch.
    const cdr = inject(ChangeDetectorRef);
    this.translate.onLangChange.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => cdr.markForCheck());
  }

  transform(value: Date | string | number | null | undefined, format = 'mediumDate', timezone?: string): string | null {
    if (value === null || value === undefined || value === '') return null;

    const language = this.translate.getCurrentLang();
    const locale = language ? localeFor(language) : this.startupLocale;
    const time = value instanceof Date ? value.getTime() : value;
    const key = `${time}|${format}|${timezone ?? ''}|${locale}`;
    if (this.last?.key !== key) {
      this.last = { key, result: formatDate(value, format, locale, timezone) };
    }
    return this.last.result;
  }
}
