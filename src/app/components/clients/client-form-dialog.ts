import { Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CrudDialogConfig, CrudDialogData, buildCrudDialogData } from '../shared/crud-dialog';
import { Client, CreateClientDto, UpdateClientDto } from '../../interfaces/client.interface';

export { CrudDialog as ClientFormDialog } from '../shared/crud-dialog';

export const CLIENT_DIALOG_CONFIG: CrudDialogConfig = {
  titleAddKey: 'CLIENT.ADD',
  titleEditKey: 'CLIENT.EDIT',
  fields: [
    {
      key: 'code',
      labelKey: 'CLIENT.CODE',
      type: 'text',
      required: true,
      validators: [Validators.required],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
      },
    },
    {
      key: 'name',
      labelKey: 'CLIENT.NAME',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
      },
    },
    {
      key: 'rtn',
      labelKey: 'CLIENT.RTN',
      type: 'text',
      validators: [Validators.pattern(/^\d{14}$/)],
      errorMessages: {
        pattern: { key: 'FORM.VALIDATION.RTN' },
      },
    },
    {
      key: 'phone',
      labelKey: 'CLIENT.PHONE',
      type: 'tel',
    },
    {
      key: 'paymentCondition',
      labelKey: 'CLIENT.PAYMENT_CONDITION',
      type: 'select',
      options: [
        { value: 'CASH', label: 'CLIENT.PAYMENT_CONDITION_OPTIONS.CASH' },
        { value: 'CREDIT', label: 'CLIENT.PAYMENT_CONDITION_OPTIONS.CREDIT' },
      ],
    },
    {
      key: 'creditLimit',
      labelKey: 'CLIENT.CREDIT_LIMIT',
      type: 'number',
      validators: [Validators.min(0)],
      errorMessages: {
        min: { key: 'FORM.VALIDATION.MIN_VALUE', params: { value: 0 } },
      },
    },
    {
      key: 'isActive',
      labelKey: 'CLIENT.ACTIVE',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};

export function buildClientDialogData(
  mode: 'add' | 'edit',
  createFn: (data: CreateClientDto) => Observable<Client>,
  updateFn: (id: string, data: UpdateClientDto) => Observable<Client>,
  entity?: Client,
): CrudDialogData<Client> {
  return buildCrudDialogData(CLIENT_DIALOG_CONFIG, mode, createFn, updateFn, entity);
}
