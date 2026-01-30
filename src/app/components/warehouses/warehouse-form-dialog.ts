import { Validators } from '@angular/forms';
import { CrudDialogConfig, CrudDialogData } from '../shared/crud-dialog';

export { CrudDialog as WarehouseFormDialog } from '../shared/crud-dialog';

export const WAREHOUSE_DIALOG_CONFIG: CrudDialogConfig = {
  titleAddKey: 'WAREHOUSE.ADD',
  titleEditKey: 'WAREHOUSE.EDIT',
  fields: [
    {
      key: 'name',
      labelKey: 'WAREHOUSE.NAME',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
      },
    },
    {
      key: 'location',
      labelKey: 'WAREHOUSE.LOCATION',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
      },
    },
    {
      key: 'description',
      labelKey: 'WAREHOUSE.DESCRIPTION',
      type: 'textarea',
      rows: 3,
    },
  ],
};

export function buildWarehouseDialogData(
  mode: 'add' | 'edit',
  createFn: (data: any) => import('rxjs').Observable<any>,
  updateFn: (id: string, data: any) => import('rxjs').Observable<any>,
  entity?: any,
): CrudDialogData {
  return {
    mode,
    config: WAREHOUSE_DIALOG_CONFIG,
    entity,
    createFn,
    updateFn,
  };
}
