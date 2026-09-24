import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { RoleFormDialog, RoleFormDialogData } from './role-form-dialog';
import { RolesService } from '../../services/roles.service';
import { RoleSummary } from '../../interfaces/role.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const role: RoleSummary = {
  id: 'r1',
  name: 'AUDITOR',
  displayName: 'Auditor',
  description: 'Reads audit logs',
  isSystem: false,
  permissionCount: 0,
  userCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('RoleFormDialog', () => {
  let fixture: ComponentFixture<RoleFormDialog>;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let roles: jasmine.SpyObj<RolesService>;

  const setup = async (data: RoleFormDialogData): Promise<void> => {
    close = jasmine.createSpy('close');
    roles = jasmine.createSpyObj<RolesService>('RolesService', ['getPermissions', 'getOne', 'create', 'update']);
    roles.getPermissions.and.returnValue(of([]));
    roles.create.and.returnValue(of({ ...role, permissions: [] }));
    roles.update.and.returnValue(of({ ...role, permissions: [] }));
    roles.getOne.and.returnValue(of({ ...role, permissions: [] }));

    await TestBed.configureTestingModule({
      imports: [RoleFormDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: RolesService, useValue: roles },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormDialog);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };

  const type = (selector: string, value: string): void => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const saveButton = (): HTMLButtonElement =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('COMMON.SAVE')
    ) as HTMLButtonElement;

  describe('add mode', () => {
    beforeEach(() => setup({ mode: 'add' }));

    it('starts with Save disabled', () => {
      expect(saveButton().disabled).toBeTrue();
    });

    it('enables Save once both the name and the display name are filled', () => {
      type('#role-name', 'auditor');
      expect(saveButton().disabled).toBeTrue();

      type('#role-display-name', 'Auditor');

      expect(saveButton().disabled).toBeFalse();
    });

    it('keeps Save disabled when only whitespace is typed', () => {
      type('#role-name', '   ');
      type('#role-display-name', '   ');

      expect(saveButton().disabled).toBeTrue();
    });

    it('creates the role with a normalized name and closes the dialog', () => {
      type('#role-name', 'stock auditor');
      type('#role-display-name', ' Stock Auditor ');

      saveButton().click();

      expect(roles.create).toHaveBeenCalledOnceWith({
        name: 'STOCK_AUDITOR',
        displayName: 'Stock Auditor',
        description: undefined,
        permissionIds: []
      });
      expect(close).toHaveBeenCalledOnceWith({ saved: true });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup({ mode: 'edit', role }));

    it('starts with Save enabled because the display name is preloaded', () => {
      expect(saveButton().disabled).toBeFalse();
    });

    it('disables Save when the display name is cleared', () => {
      type('#role-display-name', '');

      expect(saveButton().disabled).toBeTrue();
    });
  });
});
