import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestBedDefaults } from '../../testing/test-providers';
import { fetchAllPages } from './fetch-all-pages';

describe('fetchAllPages', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideTestBedDefaults(),
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const meta = (page: number, totalPages: number) => ({ total: 0, page, limit: 100, totalPages });

  it('follows the pages until the last one and emits every row once', () => {
    let result: number[] | undefined;
    fetchAllPages<number>(http, '/api/x', new HttpParams().set('onlyWithBalance', 'true'))
      .subscribe((rows) => (result = rows));

    const first = httpMock.expectOne((r) => r.url === '/api/x' && r.params.get('page') === '1');
    expect(first.request.params.get('limit')).toBe('100');
    expect(first.request.params.get('onlyWithBalance')).toBe('true');
    first.flush({ data: [1, 2], meta: meta(1, 2) });
    expect(result).toBeUndefined();

    httpMock.expectOne((r) => r.params.get('page') === '2').flush({ data: [3], meta: meta(2, 2) });
    expect(result).toEqual([1, 2, 3]);
  });

  it('stops after one request when everything fits in a page, and when there is nothing', () => {
    let result: number[] | undefined;
    fetchAllPages<number>(http, '/api/x').subscribe((rows) => (result = rows));
    httpMock.expectOne('/api/x?limit=100&page=1').flush({ data: [], meta: meta(1, 0) });
    expect(result).toEqual([]);
  });
});
