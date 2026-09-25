import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';

import { CrudDialog } from './crud-dialog';
import { CrudDialogConfig, CrudDialogData } from './crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const config: CrudDialogConfig = {
  titleAddKey: 'THING.ADD',
  titleEditKey: 'THING.EDIT',
  fields: [
    {
      key: 'name',
      labelKey: 'THING.NAME',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } }
      }
    },
    { key: 'description', labelKey: 'THING.DESCRIPTION', type: 'textarea' },
    { key: 'code', labelKey: 'THING.CODE', type: 'number' }
  ]
};

describe('CrudDialog', () => {
  let fixture: ComponentFixture<CrudDialog>;
  let component: CrudDialog;
  let el: HTMLElement;
  let close: jasmine.Spy;
  let createFn: jasmine.Spy<(data: unknown) => Observable<Record<string, unknown>>>;
  let updateFn: jasmine.Spy<(id: string, data: unknown) => Observable<Record<string, unknown>>>;

  const setup = async (data: Partial<CrudDialogData> = {}): Promise<void> => {
    close = jasmine.createSpy('close');
    createFn = jasmine.createSpy('createFn').and.callFake((value: unknown) => of({ ...(value as object), id: 'new' }));
    updateFn = jasmine.createSpy('updateFn').and.callFake((id: string, value: unknown) => of({ ...(value as object), id }));

    await TestBed.configureTestingModule({
      imports: [CrudDialog],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'add', config, createFn, updateFn, ...data } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CrudDialog);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  describe('the form', () => {
    it('has one empty control per field in add mode', async () => {
      await setup();

      expect(component.form.value).toEqual({ name: '', description: '', code: '' });
    });

    it('applies the validators of each field', async () => {
      await setup();

      expect(component.form.get('name')?.valid).toBeFalse();
      component.form.get('name')?.setValue('A');
      expect(component.form.get('name')?.errors).toEqual(jasmine.objectContaining({ minlength: jasmine.anything() }));
      component.form.get('name')?.setValue('Ab');
      expect(component.form.get('name')?.valid).toBeTrue();
      expect(component.form.get('description')?.valid).toBeTrue();
    });

    it('fills the form from the entity in edit mode, showing null and undefined as empty and the rest as text', async () => {
      await setup({ mode: 'edit', entity: { id: 'e1', name: 'Tools', description: null, code: 5 } });

      expect(component.form.value).toEqual({ name: 'Tools', description: '', code: '5' });
    });

    it('does not fill the form from an entity in add mode', async () => {
      await setup({ mode: 'add', entity: { id: 'e1', name: 'Tools' } });

      expect(component.form.value.name).toBe('');
    });
  });

  describe('getErrorEntries', () => {
    it('lists the messages a field can show, with their parameters', async () => {
      await setup();

      expect(component.getErrorEntries(config.fields[0])).toEqual([
        { errorKey: 'required', translationKey: 'FORM.VALIDATION.REQUIRED', params: undefined },
        { errorKey: 'minlength', translationKey: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } }
      ]);
    });

    it('is empty for a field with no messages', async () => {
      await setup();

      expect(component.getErrorEntries(config.fields[1])).toEqual([]);
    });
  });

  describe('onSubmit in add mode', () => {
    it('sends nothing while the form is invalid', async () => {
      await setup();

      component.onSubmit();

      expect(createFn).not.toHaveBeenCalled();
      expect(component.saving()).toBeFalse();
    });

    it('creates with the form value, leaving out the optional fields that were left empty', async () => {
      await setup();
      component.form.patchValue({ name: 'Tools', code: '7' });

      component.onSubmit();

      expect(createFn).toHaveBeenCalledOnceWith({ name: 'Tools', description: undefined, code: '7' });
    });

    it('closes with the name of what it saved so the page can say what was created', async () => {
      await setup();
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: 'Tools' });
    });

    it('closes without a name when the API answers with nothing', async () => {
      await setup({ createFn: () => of(undefined as unknown as Record<string, unknown>) });
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: undefined });
    });

    it('shows saving while the request runs', async () => {
      await setup({ createFn: () => new Subject<Record<string, unknown>>() });
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(component.saving()).toBeTrue();
      expect(close).not.toHaveBeenCalled();
    });

    it('stays open and stops saving when the request fails, so the user can try again', async () => {
      await setup({ createFn: () => throwError(() => new Error('boom')) });
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(component.saving()).toBeFalse();
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit in edit mode', () => {
    it('updates the entity by its id and closes with its name', async () => {
      await setup({ mode: 'edit', entity: { id: 'e1', name: 'Tools' } });
      component.form.patchValue({ name: 'Renamed' });

      component.onSubmit();

      expect(updateFn).toHaveBeenCalledOnceWith('e1', { name: 'Renamed', description: undefined, code: undefined });
      expect(createFn).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: 'Renamed' });
    });

    it('reads the id from the field the caller names', async () => {
      await setup({ mode: 'edit', entityIdField: 'code', entity: { code: 42, name: 'Tools' } });

      component.onSubmit();

      expect(updateFn.calls.mostRecent().args[0]).toBe('42');
    });

    it('stays open and stops saving when the update fails', async () => {
      await setup({ mode: 'edit', entity: { id: 'e1', name: 'Tools' }, updateFn: () => throwError(() => new Error('boom')) });

      component.onSubmit();

      expect(component.saving()).toBeFalse();
      expect(close).not.toHaveBeenCalled();
    });

    it('does nothing in edit mode without an entity', async () => {
      await setup({ mode: 'edit', entity: undefined });
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(updateFn).not.toHaveBeenCalled();
      expect(createFn).not.toHaveBeenCalled();
    });
  });

  it('renders a field for each entry of the config', async () => {
    await setup();

    expect(el.querySelectorAll('input, textarea, select').length).toBe(config.fields.length);
  });
});
