import { Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CrudDialogConfig, CrudDialogData, buildCrudDialogData } from '../shared/crud-dialog';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../interfaces/supplier.interface';

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
    {
      key: 'code',
      labelKey: 'SUPPLIER.CODE',
      type: 'text',
    },
    {
      key: 'rtn',
      labelKey: 'SUPPLIER.RTN',
      type: 'text',
      validators: [Validators.pattern(/^\d{14}$/)],
      errorMessages: {
        pattern: { key: 'FORM.VALIDATION.RTN' },
      },
    },
    {
      key: 'isActive',
      labelKey: 'SUPPLIER.ACTIVE',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};

export function buildSupplierDialogData(
  mode: 'add' | 'edit',
  createFn: (data: CreateSupplierDto) => Observable<Supplier>,
  updateFn: (id: string, data: UpdateSupplierDto) => Observable<Supplier>,
  entity?: Supplier,
): CrudDialogData<Supplier> {
  return buildCrudDialogData(SUPPLIER_DIALOG_CONFIG, mode, createFn, updateFn, entity);
}
