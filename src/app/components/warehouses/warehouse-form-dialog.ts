import { Validators } from '@angular/forms';
import { CrudDialogConfig, CrudDialogData, CrudFieldOption } from '../shared/crud-dialog';
import { User } from '../../interfaces/user.interface';

export { CrudDialog as WarehouseFormDialog } from '../shared/crud-dialog';

function buildManagerOptions(users: User[]): CrudFieldOption[] {
  return users.map((u) => ({
    value: u.id,
    label: u.name ? `${u.name} (${u.email})` : u.email,
  }));
}

function buildConfig(users: User[]): CrudDialogConfig {
  return {
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
      {
        key: 'managerId',
        labelKey: 'WAREHOUSE.MANAGER',
        type: 'select',
        placeholderKey: 'WAREHOUSE.MANAGER_PLACEHOLDER',
        options: buildManagerOptions(users),
      },
    ],
  };
}

export function buildWarehouseDialogData(
  mode: 'add' | 'edit',
  createFn: (data: any) => import('rxjs').Observable<any>,
  updateFn: (id: string, data: any) => import('rxjs').Observable<any>,
  users: User[],
  entity?: any,
): CrudDialogData {
  return {
    mode,
    config: buildConfig(users),
    entity,
    createFn,
    updateFn,
  };
}
