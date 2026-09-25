import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Mirrors the backend @IsStrongPassword policy: 8 or more characters with an
 * uppercase letter, a lowercase letter, a digit and one of @$!%*?&, and nothing else.
 * The length is checked separately (Validators.minLength(8)).
 */
export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

/** The same policy as STRONG_PASSWORD_PATTERN, reporting which rule failed so a form can say so. */
export function strongPasswordRules(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  const errors: ValidationErrors = {};
  if (value.length > 0 && value.length < 8) errors['minLength'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/\d/.test(value)) errors['number'] = true;
  if (!/[@$!%*?&]/.test(value)) errors['special'] = true;
  if (/[^A-Za-z\d@$!%*?&]/.test(value)) errors['invalidChars'] = true;
  return Object.keys(errors).length ? errors : null;
}
