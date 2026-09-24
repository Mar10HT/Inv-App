import { HttpErrorResponse } from '@angular/common/http';

/** What every failed HTTP call rejects with, produced by errorInterceptor. */
export interface ApiError {
  status: number;
  /** Translated text describing the status, safe to show as is. */
  message: string;
  /**
   * The server's own message, only for statuses where it is meant for the user
   * (400, 409, 422) and always a string (Nest sends a list for DTO validation).
   * null otherwise, so server internals are never shown.
   */
  error: { message: string } | null;
  originalError: HttpErrorResponse;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'originalError' in value && 'status' in value;
}
