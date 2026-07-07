import { Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CrudDialogConfig, CrudDialogData, CrudFieldOption } from '../shared/crud-dialog';
import { User } from '../../interfaces/user.interface';
import { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '../../interfaces/warehouse.interface';

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
  createFn: (data: CreateWarehouseDto) => Observable<Warehouse>,
  updateFn: (id: string, data: UpdateWarehouseDto) => Observable<Warehouse>,
  users: User[],
  entity?: Warehouse,
): CrudDialogData<Warehouse> {
  return {
    mode,
    config: buildConfig(users),
    entity,
    // The dialog only knows the raw, dynamically-keyed form value; the field config above
    // guarantees its keys line up with CreateWarehouseDto/UpdateWarehouseDto, so this narrowing is safe.
    createFn: (data: Record<string, unknown>) => createFn(data as unknown as CreateWarehouseDto),
    updateFn: (id: string, data: Record<string, unknown>) => updateFn(id, data as unknown as UpdateWarehouseDto),
  };
}
