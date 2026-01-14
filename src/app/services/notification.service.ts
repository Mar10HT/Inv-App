import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { CustomSnackbar, CustomSnackbarData } from '../components/shared/custom-snackbar/custom-snackbar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  duration?: number;
  action?: string;
  interpolateParams?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  private readonly defaultDuration = {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
  };

  /**
   * Show a success notification
   */
  success(messageKey: string, options?: NotificationOptions): void {
    this.show(messageKey, 'success', options);
  }

  /**
   * Show an error notification
   */
  error(messageKey: string, options?: NotificationOptions): void {
    this.show(messageKey, 'error', options);
  }

  /**
   * Show a warning notification
   */
  warning(messageKey: string, options?: NotificationOptions): void {
    this.show(messageKey, 'warning', options);
  }

  /**
   * Show an info notification
   */
  info(messageKey: string, options?: NotificationOptions): void {
    this.show(messageKey, 'info', options);
  }

  /**
   * Show notification with custom component
   */
  private show(messageKey: string, type: NotificationType, options?: NotificationOptions): void {
    const message = this.translate.instant(messageKey, options?.interpolateParams);

    this.snackBar.openFromComponent(CustomSnackbar, {
      data: { message, type } as CustomSnackbarData,
      duration: options?.duration ?? this.defaultDuration[type],
      panelClass: ['custom-snackbar-container'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // ============ CRUD Helper Methods ============

  /**
   * Show success message for created item
   */
  created(entityKey: string, name?: string): void {
    if (name) {
      this.success('NOTIFICATIONS.CREATED_WITH_NAME', {
        interpolateParams: { entity: this.translate.instant(entityKey), name }
      });
    } else {
      this.success('NOTIFICATIONS.CREATED', {
        interpolateParams: { entity: this.translate.instant(entityKey) }
      });
    }
  }

  /**
   * Show success message for updated item
   */
  updated(entityKey: string, name?: string): void {
    if (name) {
      this.success('NOTIFICATIONS.UPDATED_WITH_NAME', {
        interpolateParams: { entity: this.translate.instant(entityKey), name }
      });
    } else {
      this.success('NOTIFICATIONS.UPDATED', {
        interpolateParams: { entity: this.translate.instant(entityKey) }
      });
    }
  }

  /**
   * Show success message for deleted item
   */
  deleted(entityKey: string, name?: string): void {
    if (name) {
      this.success('NOTIFICATIONS.DELETED_WITH_NAME', {
        interpolateParams: { entity: this.translate.instant(entityKey), name }
      });
    } else {
      this.success('NOTIFICATIONS.DELETED', {
        interpolateParams: { entity: this.translate.instant(entityKey) }
      });
    }
  }

  /**
   * Show error message for failed operation
   */
  operationFailed(operation: 'create' | 'update' | 'delete' | 'load', entityKey: string): void {
    const operationKey = `NOTIFICATIONS.OPERATIONS.${operation.toUpperCase()}`;
    this.error('NOTIFICATIONS.OPERATION_FAILED', {
      interpolateParams: {
        operation: this.translate.instant(operationKey),
        entity: this.translate.instant(entityKey)
      }
    });
  }

  /**
   * Handle HTTP error and show appropriate message
   */
  handleError(error: any, entityKey?: string): void {
    const errorMessage = error?.error?.message || error?.message;

    if (error?.status === 0) {
      this.error('NOTIFICATIONS.ERRORS.CONNECTION');
    } else if (error?.status === 401) {
      this.error('NOTIFICATIONS.ERRORS.UNAUTHORIZED');
    } else if (error?.status === 403) {
      this.error('NOTIFICATIONS.ERRORS.FORBIDDEN');
    } else if (error?.status === 404) {
      this.error('NOTIFICATIONS.ERRORS.NOT_FOUND', {
        interpolateParams: { entity: entityKey ? this.translate.instant(entityKey) : '' }
      });
    } else if (error?.status === 409) {
      this.error('NOTIFICATIONS.ERRORS.CONFLICT');
    } else if (error?.status >= 500) {
      this.error('NOTIFICATIONS.ERRORS.SERVER');
    } else if (errorMessage) {
      this.snackBar.openFromComponent(CustomSnackbar, {
        data: { message: errorMessage, type: 'error' } as CustomSnackbarData,
        duration: this.defaultDuration.error,
        panelClass: ['custom-snackbar-container']
      });
    } else {
      this.error('NOTIFICATIONS.ERRORS.UNKNOWN');
    }
  }
}
