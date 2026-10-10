import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
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
    // The API answers with its own name, different from what was typed, so a test can tell where the result's name comes from
    createFn = jasmine.createSpy('createFn').and.callFake(() => of({ id: 'new', name: 'Saved by API' }));
    updateFn = jasmine.createSpy('updateFn').and.callFake((id: string) => of({ id, name: 'Saved by API' }));

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

    it('closes with the name the API answered, so the page can say what was created', async () => {
      await setup();
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: 'Saved by API' });
    });

    it('closes without a name when the API answered with one that is not text', async () => {
      await setup({ createFn: () => of({ id: 'new', name: 42 }) });
      component.form.patchValue({ name: 'Tools' });

      component.onSubmit();

      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: undefined });
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
      expect(close).toHaveBeenCalledOnceWith({ saved: true, name: 'Saved by API' });
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

  describe('checkbox fields', () => {
    // Isolated from the shared `config` above so none of the existing
    // exact-equality assertions on form.value need to change.
    const checkboxConfig: CrudDialogConfig = {
      titleAddKey: 'THING.ADD',
      titleEditKey: 'THING.EDIT',
      fields: [
        { key: 'name', labelKey: 'THING.NAME', type: 'text' },
        { key: 'active', labelKey: 'THING.ACTIVE', type: 'checkbox' }
      ]
    };

    it('initializes to false in add mode, not an empty string', async () => {
      await setup({ config: checkboxConfig });

      expect(component.form.value).toEqual({ name: '', active: false });
    });

    it('patches the real boolean from the entity in edit mode, not a string', async () => {
      await setup({ config: checkboxConfig, mode: 'edit', entity: { id: 'e1', name: 'Tools', active: false } });

      // A naive String(false) patch would be the truthy string "false" here instead.
      expect(component.form.value.active).toBe(false);
    });

    it('patches true the same way', async () => {
      await setup({ config: checkboxConfig, mode: 'edit', entity: { id: 'e1', name: 'Tools', active: true } });

      expect(component.form.value.active).toBe(true);
    });

    it('renders an actual checkbox input', async () => {
      await setup({ config: checkboxConfig });

      expect(el.querySelector('input[type="checkbox"]')).toBeTruthy();
    });

    it('honors defaultValue in add mode', async () => {
      const defaultTrueConfig: CrudDialogConfig = {
        ...checkboxConfig,
        fields: [
          { key: 'name', labelKey: 'THING.NAME', type: 'text' },
          { key: 'active', labelKey: 'THING.ACTIVE', type: 'checkbox', defaultValue: true }
        ]
      };

      await setup({ config: defaultTrueConfig });

      expect(component.form.value.active).toBe(true);
    });
  });

  describe('number fields', () => {
    it('parses real user input as a number, not a string', async () => {
      await setup();

      // A bound [type]="field.type" (rather than a literal type="number") never matches
      // Angular's NumberValueAccessor selector, so DefaultValueAccessor would take over
      // and hand back the raw string the user typed instead of a parsed number.
      const input = el.querySelector('#code') as HTMLInputElement;
      input.value = '500';
      input.dispatchEvent(new Event('input'));

      expect(component.form.value.code).toBe(500);
    });
  });

  describe('select fields', () => {
    const selectConfig: CrudDialogConfig = {
      titleAddKey: 'THING.ADD',
      titleEditKey: 'THING.EDIT',
      fields: [
        {
          key: 'kind',
          labelKey: 'THING.KIND',
          type: 'select',
          options: [{ value: 'a', label: 'THING.OPTION_A' }]
        }
      ]
    };

    it('translates each option label, not just the raw key', async () => {
      await setup({ config: selectConfig });
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { THING: { OPTION_A: 'Option A' } });
      translate.use('en');
      fixture.detectChanges();

      const option = el.querySelector('option[value="a"]');

      expect(option?.textContent?.trim()).toBe('Option A');
    });
  });
});
