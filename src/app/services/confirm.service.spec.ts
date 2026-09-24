import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ConfirmService } from './confirm.service';
import { ConfirmDialog, ConfirmDialogData } from '../components/shared/confirm-dialog/confirm-dialog';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('ConfirmService', () => {
  let dialog: jasmine.SpyObj<MatDialog>;
  let service: ConfirmService;

  const data: ConfirmDialogData = { title: 'Delete', message: 'Sure?', type: 'danger' };

  const answerWith = (result: boolean | undefined): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) } as MatDialogRef<ConfirmDialog, boolean>);
  };

  const ask = (): boolean[] => {
    const answers: boolean[] = [];
    service.ask(data).subscribe((confirmed) => answers.push(confirmed));
    return answers;
  };

  beforeEach(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults(), { provide: MatDialog, useValue: dialog }] });
    service = TestBed.inject(ConfirmService);
  });

  it('opens the confirm dialog with the given data and the shared panel class', () => {
    answerWith(true);

    ask();

    expect(dialog.open).toHaveBeenCalledOnceWith(ConfirmDialog, { data, panelClass: 'confirm-dialog-container' });
  });

  it('answers true when the user confirms', () => {
    answerWith(true);

    expect(ask()).toEqual([true]);
  });

  it('answers false when the user cancels', () => {
    answerWith(false);

    expect(ask()).toEqual([false]);
  });

  it('answers false when the dialog is dismissed without an answer', () => {
    answerWith(undefined);

    expect(ask()).toEqual([false]);
  });
});
