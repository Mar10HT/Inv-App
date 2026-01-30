import { Validators } from '@angular/forms';
import { CrudDialogConfig, CrudDialogData } from '../shared/crud-dialog';

export { CrudDialog as SupplierFormDialog } from '../shared/crud-dialog';

export const SUPPLIER_DIALOG_CONFIG: CrudDialogConfig = {
  titleAddKey: 'SUPPLIER.ADD',
  titleEditKey: 'SUPPLIER.EDIT',
  fields: [
    {
      key: 'name',
      labelKey: 'SUPPLIER.NAME',
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
      labelKey: 'SUPPLIER.LOCATION',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
      },
    },
    {
      key: 'phone',
      labelKey: 'SUPPLIER.PHONE',
      type: 'tel',
    },
    {
      key: 'email',
      labelKey: 'SUPPLIER.EMAIL',
      type: 'email',
      validators: [Validators.email],
      errorMessages: {
        email: { key: 'FORM.VALIDATION.EMAIL' },
      },
    },
  ],
};

export function buildSupplierDialogData(
  mode: 'add' | 'edit',
  createFn: (data: any) => import('rxjs').Observable<any>,
  updateFn: (id: string, data: any) => import('rxjs').Observable<any>,
  entity?: any,
): CrudDialogData {
  return {
    mode,
    config: SUPPLIER_DIALOG_CONFIG,
    entity,
    createFn,
    updateFn,
  };
}
