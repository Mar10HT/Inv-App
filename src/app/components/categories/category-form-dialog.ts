import { Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CrudDialogConfig, CrudDialogData } from '../shared/crud-dialog';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../interfaces/category.interface';

export { CrudDialog as CategoryFormDialog } from '../shared/crud-dialog';

export const CATEGORY_DIALOG_CONFIG: CrudDialogConfig = {
  titleAddKey: 'CATEGORY.ADD',
  titleEditKey: 'CATEGORY.EDIT',
  fields: [
    {
      key: 'name',
      labelKey: 'CATEGORY.NAME',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
        maxlength: { key: 'FORM.VALIDATION.MAX_LENGTH', params: { length: 50 } },
      },
    },
    {
      key: 'description',
      labelKey: 'CATEGORY.DESCRIPTION',
      type: 'textarea',
      rows: 3,
      validators: [Validators.maxLength(200)],
      errorMessages: {
        maxlength: { key: 'FORM.VALIDATION.MAX_LENGTH', params: { length: 200 } },
      },
    },
  ],
};

export function buildCategoryDialogData(
  mode: 'add' | 'edit',
  createFn: (data: CreateCategoryDto) => Observable<Category>,
  updateFn: (id: string, data: UpdateCategoryDto) => Observable<Category>,
  entity?: Category,
): CrudDialogData<Category> {
  return {
    mode,
    config: CATEGORY_DIALOG_CONFIG,
    entity,
    // The dialog only knows the raw, dynamically-keyed form value; the field config above
    // guarantees its keys line up with CreateCategoryDto/UpdateCategoryDto, so this narrowing is safe.
    createFn: (data: Record<string, unknown>) => createFn(data as unknown as CreateCategoryDto),
    updateFn: (id: string, data: Record<string, unknown>) => updateFn(id, data as unknown as UpdateCategoryDto),
  };
}
