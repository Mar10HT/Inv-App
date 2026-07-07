import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { InventoryService } from './inventory.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { environment } from '../../../environments/environment';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTestBedDefaults()]
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);

    // The service's constructor eagerly loads warehouses, suppliers and
    // items (see InventoryService.loadInitialData()). Flush those so they
    // don't leak into other tests as pending requests.
    httpMock.expectOne(req => req.url === `${environment.apiUrl}/warehouses`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } });
    httpMock.expectOne(req => req.url === `${environment.apiUrl}/suppliers`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } });
    httpMock.expectOne(req => req.url === `${environment.apiUrl}/inventory`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
