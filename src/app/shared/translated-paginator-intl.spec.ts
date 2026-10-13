import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { TranslatedPaginatorIntl } from './translated-paginator-intl';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('TranslatedPaginatorIntl', () => {
  let intl: TranslatedPaginatorIntl;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTestBedDefaults(), TranslatedPaginatorIntl]
    });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      PAGINATOR: { ITEMS_PER_PAGE: 'Elementos por página', RANGE: '{{start}} – {{end}} de {{total}}', EMPTY_RANGE: '0 de {{total}}' }
    });
    translate.setTranslation('en', { PAGINATOR: { ITEMS_PER_PAGE: 'Items per page' } });
    translate.use('es');
    intl = TestBed.inject(TranslatedPaginatorIntl);
  });

  it('labels the page size selector in the current language', () => {
    expect(intl.itemsPerPageLabel).toBe('Elementos por página');
  });

  it('shows the range of the current page', () => {
    expect(intl.getRangeLabel(1, 10, 44)).toBe('11 – 20 de 44');
    expect(intl.getRangeLabel(4, 10, 44)).toBe('41 – 44 de 44');
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 de 0');
  });

  it('switches language and tells the paginator to re-render', () => {
    const changed = jasmine.createSpy('changed');
    intl.changes.subscribe(changed);

    translate.use('en');

    expect(intl.itemsPerPageLabel).toBe('Items per page');
    expect(changed).toHaveBeenCalled();
  });
});
