import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

export type CrudFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select';

export interface CrudFieldOption {
  value: string;
  label: string;
}

/** Interpolation params passed to ngx-translate for a field's validation messages, e.g. `{ length: 2 }`. */
export type CrudTranslateParams = Record<string, string | number>;

export interface CrudFieldConfig {
  key: string;
  labelKey: string;
  type: CrudFieldType;
  required?: boolean;
  validators?: ValidatorFn[];
  placeholderKey?: string;
  rows?: number;
  options?: CrudFieldOption[];
  errorMessages?: Record<string, { key: string; params?: CrudTranslateParams }>;
}

export interface CrudDialogConfig {
  titleAddKey: string;
  titleEditKey: string;
  fields: CrudFieldConfig[];
}

/**
 * `T` is the entity type being edited (e.g. `Category`). Callers with a concrete entity type
 * should parameterize explicitly (`CrudDialogData<Category>`) so `entity` is typed correctly;
 * when omitted it defaults to a plain string-keyed record, which is what the dialog component
 * itself uses since it only knows fields by their runtime `CrudFieldConfig.key`.
 *
 * `createFn`/`updateFn` are declared with method syntax taking `unknown` rather than a fixed
 * DTO type: the dialog itself only ever has a generic, dynamically-keyed form value to pass in
 * (it has no knowledge of per-entity Create/Update DTO shapes), while each caller's `createFn`
 * typically wants its own concrete DTO parameter (e.g. `CreateCategoryDto`). Method syntax keeps
 * this parameter bivariant so callers can keep their own precise DTO param types instead of
 * being forced to make every DTO structurally assignable to/from `T`.
 */
export interface CrudDialogData<T = Record<string, unknown>> {
  mode: 'add' | 'edit';
  config: CrudDialogConfig;
  entity?: T;
  entityIdField?: string;
  createFn(data: unknown): Observable<T>;
  updateFn(id: string, data: unknown): Observable<T>;
}
