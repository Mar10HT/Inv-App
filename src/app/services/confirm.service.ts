import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

import { ConfirmDialog, ConfirmDialogData } from '../components/shared/confirm-dialog/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);

  /** Asks the user to confirm and emits once: true when they confirm, false when they cancel or dismiss. */
  ask(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, panelClass: 'confirm-dialog-container' })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
