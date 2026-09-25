import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { ImportService } from './import.service';
import { ImportResult } from '../interfaces/import.interface';
import { provideTestBedDefaults } from '../../testing/test-providers';
import { environment } from '../../environments/environment';

const url = (path: string): string => `${environment.apiUrl}/inventory/${path}`;

describe('ImportService', () => {
  let service: ImportService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] });
    service = TestBed.inject(ImportService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('downloadTemplate', () => {
    let clicked: { download: string; href: string }[];

    beforeEach(() => {
      clicked = [];
      jasmine.clock().install();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:template');
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href });
      });
    });

    afterEach(() => jasmine.clock().uninstall());

    it('asks for the template as a blob and saves it as plantilla-importacion.xlsx', () => {
      let emitted = 0;

      service.downloadTemplate().subscribe(() => emitted++);
      const request = backend.expectOne(url('import-template'));
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['xlsx']));

      expect(clicked).toEqual([{ download: 'plantilla-importacion.xlsx', href: 'blob:template' }]);
      expect(emitted).toBe(1);
    });

    it('does not leave the link in the page and releases the blob address a moment later', () => {
      service.downloadTemplate().subscribe();
      backend.expectOne(url('import-template')).flush(new Blob(['xlsx']));

      expect(document.body.querySelector('a[download]')).toBeNull();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      jasmine.clock().tick(100);

      expect(URL.revokeObjectURL).toHaveBeenCalledOnceWith('blob:template');
    });

    it('passes a failed request on to the caller and saves nothing', () => {
      let failure: unknown;

      service.downloadTemplate().subscribe({ error: (err) => (failure = err) });
      backend.expectOne(url('import-template')).flush(new Blob(['boom']), { status: 500, statusText: 'Server Error' });

      expect(failure).toBeDefined();
      expect(clicked).toEqual([]);
    });
  });

  describe('uploadExcel', () => {
    const file = new File(['rows'], 'items.xlsx');
    let result: ImportResult | undefined;

    const upload = (response: object): void => {
      result = undefined;
      service.uploadExcel(file).subscribe((imported) => (result = imported));
      const request = backend.expectOne(url('bulk-import/excel'));
      expect(request.request.method).toBe('POST');
      expect((request.request.body as FormData).get('file')).toBe(file);
      request.flush(response);
    };

    it('reports a clean import when no row failed', () => {
      upload({ success: 3, failed: 0, errors: [] });

      expect(result).toEqual({
        success: true,
        totalRows: 3,
        validRows: 3,
        invalidRows: 0,
        importedCount: 3,
        errors: []
      });
    });

    it('counts the failed rows and points each error at its sheet row, past the header', () => {
      upload({ success: 3, failed: 2, errors: [{ index: 0, error: 'Name is required' }, { index: 4, error: 'Bad quantity' }] });

      expect(result?.success).toBeFalse();
      expect(result?.totalRows).toBe(5);
      expect(result?.validRows).toBe(3);
      expect(result?.invalidRows).toBe(2);
      expect(result?.importedCount).toBe(3);
      expect(result?.errors).toEqual([
        { row: 2, field: '', message: 'Name is required' },
        { row: 6, field: '', message: 'Bad quantity' }
      ]);
    });

    it('points an error without an index at row 1', () => {
      upload({ success: 0, failed: 1, errors: [{ error: 'File is empty' }] });

      expect(result?.errors).toEqual([{ row: 1, field: '', message: 'File is empty' }]);
    });
  });
});
