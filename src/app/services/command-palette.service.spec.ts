import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { CommandPaletteService } from './command-palette.service';
import { CommandPalette } from '../components/shared/command-palette/command-palette';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('CommandPaletteService', () => {
  let service: CommandPaletteService;
  let dialog: { open: jasmine.Spy; closeAll: jasmine.Spy };
  let closed: Subject<void>;

  beforeEach(() => {
    closed = new Subject<void>();
    dialog = {
      open: jasmine.createSpy('open').and.callFake(() => ({ afterClosed: () => closed.asObservable() })),
      closeAll: jasmine.createSpy('closeAll')
    };
    TestBed.configureTestingModule({ providers: [...provideTestBedDefaults(), { provide: MatDialog, useValue: dialog }] });
    service = TestBed.inject(CommandPaletteService);
  });

  describe('open', () => {
    it('opens the palette full screen, without a backdrop of its own', () => {
      service.open();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        CommandPalette,
        jasmine.objectContaining({ hasBackdrop: false, width: '100%', height: '100%', panelClass: 'command-palette-dialog' })
      );
    });

    it('does not open a second palette while one is open', () => {
      service.open();
      service.open();

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('can open again once the palette has closed', () => {
      service.open();
      closed.next();

      service.open();

      expect(dialog.open).toHaveBeenCalledTimes(2);
    });
  });

  describe('close', () => {
    it('closes every dialog and lets the palette open again', () => {
      service.open();

      service.close();
      service.open();

      expect(dialog.closeAll).toHaveBeenCalledTimes(1);
      expect(dialog.open).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggle', () => {
    it('opens the palette when it is closed and closes it when it is open', () => {
      service.toggle();
      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(dialog.closeAll).not.toHaveBeenCalled();

      service.toggle();
      expect(dialog.closeAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('initKeyboardShortcut', () => {
    let press: (init: Partial<KeyboardEvent>) => KeyboardEvent;

    // Capture the listener instead of attaching it: a real one would stay on the document for
    // every later spec.
    beforeEach(() => {
      let listener: (event: KeyboardEvent) => void = () => undefined;
      spyOn(document, 'addEventListener').and.callFake(((type: string, handler: (event: KeyboardEvent) => void) => {
        if (type === 'keydown') listener = handler;
      }) as never);
      service.initKeyboardShortcut();
      press = (init) => {
        const event = { key: 'k', metaKey: false, ctrlKey: false, preventDefault: jasmine.createSpy('preventDefault'), ...init } as KeyboardEvent;
        listener(event);
        return event;
      };
    });

    it('toggles the palette on Ctrl+K and keeps the browser from using the key', () => {
      const event = press({ ctrlKey: true });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('toggles the palette on Cmd+K', () => {
      press({ metaKey: true });

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('closes an open palette on the same shortcut', () => {
      press({ ctrlKey: true });
      press({ ctrlKey: true });

      expect(dialog.closeAll).toHaveBeenCalledTimes(1);
    });

    it('ignores K on its own and other keys with Ctrl', () => {
      const plain = press({});
      const other = press({ ctrlKey: true, key: 'j' });

      expect(plain.preventDefault).not.toHaveBeenCalled();
      expect(other.preventDefault).not.toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });
});
