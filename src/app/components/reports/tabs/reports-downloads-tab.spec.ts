import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';

import { ReportsDownloadsTab } from './reports-downloads-tab';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../services/notification.service';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const reports: [string, string, RegExp][] = [
  ['inventory', 'reports/inventory/excel', /^inventario_\d+\.xlsx$/],
  ['low stock', 'reports/low-stock/excel', /^stock_bajo_\d+\.xlsx$/],
  ['transactions', 'reports/transactions/excel', /^transacciones_\d+\.xlsx$/],
  ['loans', 'reports/loans/excel', /^prestamos_\d+\.xlsx$/],
  ['transfers', 'reports/transfers/excel', /^transferencias_\d+\.xlsx$/],
  ['stock takes', 'reports/stock-takes/excel', /^conteo_fisico_\d+\.xlsx$/],
  ['discharges', 'reports/discharges/excel', /^bajas_\d+\.xlsx$/],
  ['outflows', 'reports/outflows/excel', /^salidas_\d+\.xlsx$/]
];

describe('ReportsDownloadsTab', () => {
  let fixture: ComponentFixture<ReportsDownloadsTab>;
  let http: HttpTestingController;
  let downloaded: string[];

  const buttons = (): HTMLButtonElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  const url = (endpoint: string, query = 'locale=en'): string => `${environment.apiUrl}/${endpoint}?${query}`;

  beforeEach(async () => {
    downloaded = [];
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloaded.push(this.download);
    });

    await TestBed.configureTestingModule({
      imports: [ReportsDownloadsTab],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportsDownloadsTab);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders one download button per report', () => {
    expect(buttons()).toHaveSize(reports.length);
  });

  reports.forEach(([name, endpoint, filename], index) => {
    it(`requests the ${name} workbook and saves it under its file name`, () => {
      buttons()[index].click();

      http.expectOne(url(endpoint)).flush(new Blob(['x']));

      expect(downloaded).toHaveSize(1);
      expect(downloaded[0]).toMatch(filename);
    });
  });

  it('sends the selected warehouse and leaves it out when empty', () => {
    fixture.componentRef.setInput('warehouseId', 'w1');
    buttons()[0].click();
    http.expectOne(url('reports/inventory/excel', 'locale=en&warehouseId=w1')).flush(new Blob());

    fixture.componentRef.setInput('warehouseId', '');
    buttons()[0].click();
    http.expectOne(url('reports/inventory/excel')).flush(new Blob());
  });

  it('tells the user when a download fails and saves nothing', () => {
    const error = spyOn(TestBed.inject(NotificationService), 'error');

    buttons()[0].click();
    http.expectOne(url('reports/inventory/excel')).flush(new Blob(['boom']), { status: 500, statusText: 'Server Error' });

    expect(error).toHaveBeenCalledOnceWith('NOTIFICATIONS.ERRORS.EXPORT_FAILED');
    expect(downloaded).toEqual([]);
  });

  it('sends the Spanish locale when the app language is es', () => {
    TestBed.inject(TranslateService).use('es');

    buttons()[0].click();

    http.expectOne(url('reports/inventory/excel', 'locale=es')).flush(new Blob());
  });
});
