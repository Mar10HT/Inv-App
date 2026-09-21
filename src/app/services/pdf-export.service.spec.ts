import { TestBed } from '@angular/core/testing';

import { PdfExportService } from './pdf-export.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

interface PdfLibs {
  jsPDF: typeof import('jspdf').default;
  autoTable: typeof import('jspdf-autotable').default;
}

describe('PdfExportService', () => {
  let service: PdfExportService;
  let saveCalls: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [...provideTestBedDefaults()]
    });
    service = TestBed.inject(PdfExportService);

    // Load the real libraries (this exercises the lazy loading) but swap in a jsPDF
    // subclass whose save() only counts calls, so no spec starts a real download.
    const [{ default: RealPdf }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    saveCalls = 0;
    class NoDownloadPdf extends RealPdf {
      constructor(...args: ConstructorParameters<typeof RealPdf>) {
        super(...args);
        // save() has overloads (sync and returnPromise), so the stub needs a cast.
        this.save = (() => {
          saveCalls++;
          return this;
        }) as unknown as InstanceType<typeof RealPdf>['save'];
      }
    }
    const libs: PdfLibs = { jsPDF: NoDownloadPdf as unknown as PdfLibs['jsPDF'], autoTable };
    spyOn(service as unknown as { loadPdfLibs: () => Promise<PdfLibs> }, 'loadPdfLibs').and.resolveTo(libs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('exports the value report and saves exactly one document', async () => {
    await service.exportValueReportToPDF({
      currency: 'USD',
      totalValue: 1500,
      totalItems: 2,
      valueByCategory: [{ label: 'Laptops', value: 1500, count: 2 }],
      valueByWarehouse: [{ label: 'Main', value: 1500, count: 2 }],
      valueBySupplier: [{ label: 'Acme', value: 1500, count: 2 }],
      topItems: []
    });

    expect(saveCalls).toBe(1);
  });

  it('exports the status report and saves exactly one document', async () => {
    await service.exportStatusReportToPDF({
      inStockCount: 5,
      lowStockCount: 1,
      outOfStockCount: 0,
      lowStockItems: [],
      outOfStockItems: []
    });

    expect(saveCalls).toBe(1);
  });

  it('exports the assignments report and saves exactly one document', async () => {
    await service.exportAssignmentsReportToPDF({
      totalUniqueItems: 0,
      assignedCount: 0,
      unassignedCount: 0,
      assignmentsByUser: [],
      unassignedItems: []
    });

    expect(saveCalls).toBe(1);
  });

  it('exports an empty transactions report and saves exactly one document', async () => {
    await service.exportTransactionsToPDF({ transactions: [] });

    expect(saveCalls).toBe(1);
  });

  it('loads the real libraries on demand', async () => {
    const realLoad = (PdfExportService.prototype as unknown as { loadPdfLibs: () => Promise<PdfLibs> }).loadPdfLibs;
    const libs = await realLoad.call(service);

    expect(typeof libs.jsPDF).toBe('function');
    expect(typeof libs.autoTable).toBe('function');
  });
});
