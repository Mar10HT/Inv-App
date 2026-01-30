import { Validators } from '@angular/forms';
import { CrudDialogConfig, CrudDialogData } from '../shared/crud-dialog';

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
  createFn: (data: any) => import('rxjs').Observable<any>,
  updateFn: (id: string, data: any) => import('rxjs').Observable<any>,
  entity?: any,
): CrudDialogData {
  return {
    mode,
    config: CATEGORY_DIALOG_CONFIG,
    entity,
    createFn,
    updateFn,
  };
}
