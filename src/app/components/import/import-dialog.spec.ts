import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';

import { ImportDialog } from './import-dialog';
import { ImportService } from '../../services/import.service';
import { ImportResult } from '../../interfaces/import.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MB = 1024 * 1024;

const imported: ImportResult = { success: true, totalRows: 2, validRows: 2, invalidRows: 0, importedCount: 2, errors: [] };

// The dialog keeps its state in protected signals, so read them through a typed view of it
interface DialogState {
  step(): string;
  dragOver(): boolean;
  fileError(): string | null;
  result(): ImportResult | null;
  downloading(): boolean;
}

const file = (name: string, options: { type?: string; size?: number } = {}): File => {
  const created = new File(['rows'], name, { type: options.type ?? XLSX_MIME });
  if (options.size !== undefined) Object.defineProperty(created, 'size', { value: options.size });
  return created;
};

describe('ImportDialog', () => {
  let fixture: ComponentFixture<ImportDialog>;
  let component: ImportDialog;
  let service: jasmine.SpyObj<ImportService>;

  const state = (): DialogState => component as unknown as DialogState;
  const failedResult = (message: string): ImportResult => ({
    success: false,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    importedCount: 0,
    errors: [{ row: 0, field: '', message }]
  });

  const dragEvent = (overrides: Partial<DragEvent> = {}): DragEvent =>
    ({ preventDefault: jasmine.createSpy('preventDefault'), stopPropagation: jasmine.createSpy('stopPropagation'), ...overrides }) as unknown as DragEvent;
  const dropOf = (...files: File[]): DragEvent => dragEvent({ dataTransfer: { files } as unknown as DataTransfer });
  const selectionOf = (...files: File[]): Event => ({ target: { files } }) as unknown as Event;

  beforeEach(async () => {
    service = jasmine.createSpyObj<ImportService>('ImportService', ['downloadTemplate', 'uploadExcel']);
    service.downloadTemplate.and.returnValue(of(undefined));
    service.uploadExcel.and.returnValue(of(imported));

    await TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: ImportService, useValue: service },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts waiting for a file', () => {
    expect([state().step(), state().dragOver(), state().fileError(), state().result()]).toEqual(['upload', false, null, null]);
  });

  describe('downloadTemplate', () => {
    it('asks the service for the template and is free again afterwards', () => {
      component.downloadTemplate();

      expect(service.downloadTemplate).toHaveBeenCalledTimes(1);
      expect(state().downloading()).toBeFalse();
      expect(state().fileError()).toBeNull();
    });

    it('says so when the template cannot be downloaded', () => {
      service.downloadTemplate.and.returnValue(throwError(() => new Error('boom')));

      component.downloadTemplate();

      expect(state().fileError()).toBe('IMPORT.GENERIC_ERROR');
      expect(state().downloading()).toBeFalse();
    });

    it('ignores a second click while the first download runs', () => {
      service.downloadTemplate.and.returnValue(new Subject<void>());

      component.downloadTemplate();
      component.downloadTemplate();

      expect(service.downloadTemplate).toHaveBeenCalledTimes(1);
      expect(state().downloading()).toBeTrue();
    });
  });

  describe('dragging a file over the dialog', () => {
    it('lights up the drop zone and keeps the browser from opening the file', () => {
      const event = dragEvent();

      component.onDragOver(event);

      expect(state().dragOver()).toBeTrue();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    describe('leaving', () => {
      const zone = document.createElement('div');
      const inside = zone.appendChild(document.createElement('span'));

      beforeEach(() => component.onDragOver(dragEvent()));

      it('turns the drop zone off when the pointer leaves it', () => {
        component.onDragLeave(dragEvent({ currentTarget: zone, relatedTarget: null }));
        expect(state().dragOver()).toBeFalse();

        component.onDragOver(dragEvent());
        component.onDragLeave(dragEvent({ currentTarget: zone, relatedTarget: document.body }));
        expect(state().dragOver()).toBeFalse();
      });

      it('keeps it on while the pointer only moves onto something inside the drop zone', () => {
        component.onDragLeave(dragEvent({ currentTarget: zone, relatedTarget: inside }));

        expect(state().dragOver()).toBeTrue();
      });
    });

    it('uploads the first file that is dropped and turns the drop zone off', () => {
      component.onDragOver(dragEvent());
      const dropped = file('items.xlsx');

      component.onDrop(dropOf(dropped, file('other.xlsx')));

      expect(state().dragOver()).toBeFalse();
      expect(service.uploadExcel).toHaveBeenCalledOnceWith(dropped);
    });

    it('does nothing when the drop carries no file', () => {
      component.onDrop(dropOf());
      component.onDrop(dragEvent());

      expect(service.uploadExcel).not.toHaveBeenCalled();
    });
  });

  describe('choosing a file', () => {
    it('uploads the file picked in the file input', () => {
      const picked = file('items.xlsx');

      component.onFileSelect(selectionOf(picked));

      expect(service.uploadExcel).toHaveBeenCalledOnceWith(picked);
    });

    it('does nothing when the picker is closed without a file', () => {
      component.onFileSelect(selectionOf());

      expect(service.uploadExcel).not.toHaveBeenCalled();
    });
  });

  describe('checking the file', () => {
    it('refuses anything that is not an xlsx file', () => {
      component.onFileSelect(selectionOf(file('items.csv', { type: 'text/csv' })));

      expect(state().fileError()).toBe('IMPORT.INVALID_FORMAT');
      expect(state().step()).toBe('upload');
      expect(service.uploadExcel).not.toHaveBeenCalled();
    });

    it('refuses an xlsx name whose content type says otherwise', () => {
      component.onFileSelect(selectionOf(file('items.xlsx', { type: 'text/plain' })));

      expect(state().fileError()).toBe('IMPORT.INVALID_FORMAT');
      expect(service.uploadExcel).not.toHaveBeenCalled();
    });

    it('accepts an uppercase extension and a file the browser gave no content type', () => {
      component.onFileSelect(selectionOf(file('ITEMS.XLSX', { type: '' })));

      expect(service.uploadExcel).toHaveBeenCalledTimes(1);
      expect(state().fileError()).toBeNull();
    });

    it('refuses a file over 10 MB and accepts one of exactly 10 MB', () => {
      component.onFileSelect(selectionOf(file('big.xlsx', { size: 10 * MB + 1 })));

      expect(state().fileError()).toBe('IMPORT.FILE_TOO_LARGE');
      expect(service.uploadExcel).not.toHaveBeenCalled();

      component.onFileSelect(selectionOf(file('limit.xlsx', { size: 10 * MB })));

      expect(service.uploadExcel).toHaveBeenCalledTimes(1);
      expect(state().fileError()).toBeNull();
    });

    it('forgets the earlier complaint when a good file arrives', () => {
      component.onFileSelect(selectionOf(file('items.csv', { type: 'text/csv' })));
      expect(state().fileError()).not.toBeNull();

      component.onFileSelect(selectionOf(file('items.xlsx')));

      expect(state().fileError()).toBeNull();
    });
  });

  describe('importing', () => {
    it('shows the importing step while the file is uploaded, then the result', () => {
      const upload = new Subject<ImportResult>();
      service.uploadExcel.and.returnValue(upload);

      component.onFileSelect(selectionOf(file('items.xlsx')));
      expect(state().step()).toBe('importing');

      upload.next(imported);
      upload.complete();

      expect(state().step()).toBe('result');
      expect(state().result()).toEqual(imported);
    });

    const failures: [string, unknown, string][] = [
      ['the message the API sent', { error: { message: 'Column A is missing' }, message: 'Http failure' }, 'Column A is missing'],
      ['the message of the error itself', { message: 'Http failure' }, 'Http failure'],
      ['a generic message when the error has none', {}, 'IMPORT.GENERIC_ERROR']
    ];

    for (const [label, error, message] of failures) {
      it(`shows ${label} when the upload fails`, () => {
        service.uploadExcel.and.returnValue(throwError(() => error));

        component.onFileSelect(selectionOf(file('items.xlsx')));

        expect(state().step()).toBe('result');
        expect(state().result()).toEqual(failedResult(message));
      });
    }

    it('does not stay on the importing step when the upload ends without an answer', () => {
      service.uploadExcel.and.returnValue(EMPTY as Observable<ImportResult>);

      component.onFileSelect(selectionOf(file('items.xlsx')));

      expect(state().step()).toBe('result');
      expect(state().result()).toEqual(failedResult('IMPORT.GENERIC_ERROR'));
    });
  });

  it('goes back to waiting for a file, forgetting the last result and error', () => {
    service.uploadExcel.and.returnValue(throwError(() => ({ message: 'boom' })));
    component.onFileSelect(selectionOf(file('items.xlsx')));

    component.resetToUpload();

    expect([state().step(), state().result(), state().fileError()]).toEqual(['upload', null, null]);
  });
});
