import { ValidatorFn } from '@angular/forms';
import { Observable } from 'rxjs';

export type CrudFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select' | 'checkbox';

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
  /** Checkbox fields only: the control's value in add mode. Defaults to false. */
  defaultValue?: boolean;
}

export interface CrudDialogConfig {
  titleAddKey: string;
  titleEditKey: string;
  fields: CrudFieldConfig[];
}

/** What the dialog closes with once the API saved the entity: the page says "created <name>" from it. */
export interface CrudDialogResult {
  saved: true;
  name?: string;
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

/**
 * Shared builder behind every entity's `build<Entity>DialogData` function (e.g.
 * `buildClientDialogData`, `buildSupplierDialogData`). Those per-entity wrappers exist only to
 * pin `createFn`/`updateFn` to the entity's own DTO types instead of `unknown` — the wiring
 * itself (bundling `mode`/`config`/`entity` and narrowing the dialog's generic form value back
 * to a concrete DTO) is identical for all of them, so it lives here once.
 */
export function buildCrudDialogData<T, TCreate, TUpdate>(
  config: CrudDialogConfig,
  mode: 'add' | 'edit',
  createFn: (data: TCreate) => Observable<T>,
  updateFn: (id: string, data: TUpdate) => Observable<T>,
  entity?: T,
): CrudDialogData<T> {
  return {
    mode,
    config,
    entity,
    createFn: (data: Record<string, unknown>) => createFn(data as unknown as TCreate),
    updateFn: (id: string, data: Record<string, unknown>) => updateFn(id, data as unknown as TUpdate),
  };
}
