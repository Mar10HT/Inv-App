import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommandPalette } from '../components/shared/command-palette/command-palette';

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  private dialog = inject(MatDialog);
  private isOpen = false;

  /**
   * Initialize global keyboard shortcut
   * Call this in app.component.ts
   */
  initKeyboardShortcut(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Open the command palette
   */
  open(): void {
    if (this.isOpen) return;

    this.isOpen = true;

    const dialogRef = this.dialog.open(CommandPalette, {
      panelClass: 'command-palette-dialog',
      backdropClass: 'command-palette-backdrop',
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
      maxHeight: '100%'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.isOpen = false;
    });
  }

  /**
   * Close the command palette
   */
  close(): void {
    this.dialog.closeAll();
    this.isOpen = false;
  }

  /**
   * Toggle the command palette
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
