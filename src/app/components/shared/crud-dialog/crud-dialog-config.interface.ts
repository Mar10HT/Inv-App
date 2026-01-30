import { ValidatorFn } from '@angular/forms';

export type CrudFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select';

export interface CrudFieldOption {
  value: string;
  label: string;
}

export interface CrudFieldConfig {
  key: string;
  labelKey: string;
  type: CrudFieldType;
  required?: boolean;
  validators?: ValidatorFn[];
  placeholderKey?: string;
  rows?: number;
  options?: CrudFieldOption[];
  errorMessages?: Record<string, { key: string; params?: Record<string, any> }>;
}

export interface CrudDialogConfig {
  titleAddKey: string;
  titleEditKey: string;
  fields: CrudFieldConfig[];
}

export interface CrudDialogData<T = any> {
  mode: 'add' | 'edit';
  config: CrudDialogConfig;
  entity?: T;
  entityIdField?: string;
  createFn: (data: any) => import('rxjs').Observable<any>;
  updateFn: (id: string, data: any) => import('rxjs').Observable<any>;
}
