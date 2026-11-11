import { Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CrudDialogConfig, CrudDialogData } from '../shared/crud-dialog';
import { CreateServiceDto, Service, UpdateServiceDto } from '../../interfaces/service.interface';

export { CrudDialog as ServiceFormDialog } from '../shared/crud-dialog';

export const SERVICE_DIALOG_CONFIG: CrudDialogConfig = {
  titleAddKey: 'SERVICE.ADD',
  titleEditKey: 'SERVICE.EDIT',
  fields: [
    {
      key: 'name',
      labelKey: 'SERVICE.NAME',
      type: 'text',
      required: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      errorMessages: {
        required: { key: 'FORM.VALIDATION.REQUIRED' },
        minlength: { key: 'FORM.VALIDATION.MIN_LENGTH', params: { length: 2 } },
        maxlength: { key: 'FORM.VALIDATION.MAX_LENGTH', params: { length: 100 } },
      },
    },
    {
      key: 'description',
      labelKey: 'SERVICE.DESCRIPTION',
      type: 'textarea',
      rows: 3,
      validators: [Validators.maxLength(200)],
      errorMessages: {
        maxlength: { key: 'FORM.VALIDATION.MAX_LENGTH', params: { length: 200 } },
      },
    },
    {
      // Only a suggestion: each sale line can change it
      key: 'price',
      labelKey: 'SERVICE.PRICE',
      type: 'number',
      validators: [Validators.min(0)],
      errorMessages: {
        min: { key: 'FORM.VALIDATION.MIN_VALUE', params: { value: 0 } },
      },
    },
    {
      key: 'currency',
      labelKey: 'SERVICE.CURRENCY',
      type: 'select',
      defaultValue: 'HNL',
      options: [
        { value: 'HNL', label: 'CLIENT.CURRENCY_OPTIONS.HNL' },
        { value: 'USD', label: 'CLIENT.CURRENCY_OPTIONS.USD' },
      ],
    },
  ],
};

export function buildServiceDialogData(
  mode: 'add' | 'edit',
  createFn: (data: CreateServiceDto) => Observable<Service>,
  updateFn: (id: string, data: UpdateServiceDto) => Observable<Service>,
  entity?: Service,
): CrudDialogData<Service> {
  return {
    mode,
    config: SERVICE_DIALOG_CONFIG,
    entity,
    // The field config above guarantees the form's keys line up with the DTOs
    createFn: (data: Record<string, unknown>) => createFn(data as unknown as CreateServiceDto),
    updateFn: (id: string, data: Record<string, unknown>) => updateFn(id, data as unknown as UpdateServiceDto),
  };
}
