import { HttpErrorResponse } from '@angular/common/http';

/** Values the API sends to interpolate into a translated error (API_ERRORS.<code>). */
export type ApiErrorParams = Record<string, string | number>;

/** What every failed HTTP call rejects with, produced by errorInterceptor. */
export interface ApiError {
  status: number;
  /** Translated text describing the status, safe to show as is. */
  message: string;
  /**
   * The message meant for the user, only for statuses where the server writes one
   * (400, 409, 422); null otherwise, so server internals are never shown. Always a
   * string, safe to show as is:
   * - the API_ERRORS.<code> translation, params interpolated, when the server sent a
   *   code this app knows;
   * - the translated generic text for DTO validation (a list of messages, no code);
   * - otherwise the server's own (English) message.
   */
  error: {
    message: string;
    /** Stable error code from the API, e.g. INSUFFICIENT_STOCK. */
    code?: string;
    /** Raw values the API sent with the code. */
    params?: ApiErrorParams;
  } | null;
  originalError: HttpErrorResponse;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'originalError' in value && 'status' in value;
}
