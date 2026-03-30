import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ImportService } from '../../services/import.service';
import { ImportResult } from '../../interfaces/import.interface';

type ImportStep = 'upload' | 'importing' | 'result';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    LucideAngularModule,
    MatProgressBarModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[var(--color-surface-variant)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <h2 class="text-xl font-semibold text-foreground">{{ 'IMPORT.TITLE' | translate }}</h2>
          <p class="text-sm text-[var(--color-on-surface-variant)] mt-1">{{ 'IMPORT.SUBTITLE' | translate }}</p>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
          <lucide-icon name="X" class="!w-5 !h-5"></lucide-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6">
        <!-- Step 1: Upload -->
        @if (step() === 'upload') {
          <div class="space-y-6">
            <!-- Download Template -->
            <div class="bg-[var(--color-primary-container)]/20 border border-[var(--color-primary)]/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <lucide-icon name="Info" class="text-[var(--color-primary)] mt-0.5 !w-5 !h-5"></lucide-icon>
                <div class="flex-1">
                  <p class="text-foreground font-medium">{{ 'IMPORT.TEMPLATE_INFO' | translate }}</p>
                  <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'IMPORT.TEMPLATE_DESC' | translate }}</p>
                  <button
                    (click)="downloadTemplate()"
                    [disabled]="downloading()"
                    class="mt-3 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                    <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
                    {{ 'IMPORT.DOWNLOAD_TEMPLATE' | translate }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Drop Zone -->
            <div
              class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
              [class]="dragOver() ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/20' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border)]'"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)">
              <lucide-icon name="CloudUpload" class="!w-12 !h-12 text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
              <p class="text-[var(--color-on-surface-variant)] mb-2">{{ 'IMPORT.DROP_FILE' | translate }}</p>
              <p class="text-[var(--color-on-surface-muted)] text-sm mb-4">{{ 'IMPORT.OR' | translate }}</p>
              <label class="inline-block">
                <input
                  type="file"
                  accept=".xlsx"
                  class="hidden"
                  (change)="onFileSelect($event)"
                />
                <span class="ds-btn ds-btn--primary cursor-pointer">
                  {{ 'IMPORT.SELECT_FILE' | translate }}
                </span>
              </label>
              <p class="text-[var(--color-on-surface-muted)] text-xs mt-4">{{ 'IMPORT.SUPPORTED_FORMATS' | translate }}</p>
            </div>

            @if (fileError()) {
              <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-lg p-4">
                <div class="flex items-center gap-2 text-[var(--color-status-error)]">
                  <lucide-icon name="AlertCircle" class="!w-5 !h-5"></lucide-icon>
                  <span>{{ fileError() }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Step 2: Importing -->
        @if (step() === 'importing') {
          <div class="text-center py-8">
            <lucide-icon name="CloudCog" class="!w-12 !h-12 text-[var(--color-primary)] mb-4 animate-pulse"></lucide-icon>
            <p class="text-foreground text-lg mb-4">{{ 'IMPORT.IMPORTING' | translate }}</p>
            <mat-progress-bar mode="indeterminate" class="rounded-full"></mat-progress-bar>
          </div>
        }

        <!-- Step 3: Result -->
        @if (step() === 'result' && result()) {
          <div class="space-y-6">
            <!-- Success/Error Icon -->
            <div class="text-center">
              @if (result()!.success) {
                <div class="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-success-bg)] rounded-full mb-4">
                  <lucide-icon name="CheckCircle2" class="!w-10 !h-10 text-[var(--color-status-success)]"></lucide-icon>
                </div>
                <h3 class="text-xl font-semibold text-[var(--color-status-success)]">{{ 'IMPORT.SUCCESS' | translate }}</h3>
              } @else {
                <div class="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-accent-amber-bg)] rounded-full mb-4">
                  <lucide-icon name="AlertTriangle" class="!w-10 !h-10 text-amber-400"></lucide-icon>
                </div>
                <h3 class="text-xl font-semibold text-amber-400">{{ 'IMPORT.PARTIAL_SUCCESS' | translate }}</h3>
              }
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[var(--color-success-bg)] border border-[var(--color-success-border)] rounded-lg p-4 text-center">
                <p class="text-3xl font-bold text-[var(--color-status-success)]">{{ result()!.importedCount }}</p>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'IMPORT.ITEMS_IMPORTED' | translate }}</p>
              </div>
              <div class="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-lg p-4 text-center">
                <p class="text-3xl font-bold text-[var(--color-status-error)]">{{ result()!.errors.length }}</p>
                <p class="text-sm text-[var(--color-on-surface-variant)]">{{ 'IMPORT.ERRORS' | translate }}</p>
              </div>
            </div>

            <!-- Errors List -->
            @if (result()!.errors.length > 0) {
              <div class="bg-[var(--color-surface)] rounded-lg p-4 max-h-[200px] overflow-auto">
                <p class="text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">{{ 'IMPORT.ERROR_DETAILS' | translate }}:</p>
                <ul class="space-y-1 text-sm text-[var(--color-status-error)]">
                  @for (error of result()!.errors; track error.row) {
                    <li>{{ 'IMPORT.ROW' | translate }} {{ error.row }}: {{ error.message }}</li>
                  }
                </ul>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="flex justify-end items-center gap-3 px-6 py-4 border-t border-[var(--color-border-subtle)]">
        <button
          (click)="dialogRef.close()"
          class="px-6 py-2.5 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground transition-colors font-medium">
          {{ step() === 'result' ? ('COMMON.CLOSE' | translate) : ('COMMON.CANCEL' | translate) }}
        </button>
        @if (step() === 'result') {
          <button
            (click)="resetToUpload()"
            class="px-6 py-2.5 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground transition-colors font-medium">
            {{ 'IMPORT.TRY_AGAIN' | translate }}
          </button>
          <button
            (click)="dialogRef.close(true)"
            class="ds-btn ds-btn--primary">
            {{ 'COMMON.DONE' | translate }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 700px;
      max-width: 95vw;
    }
  `]
})
export class ImportDialog {
  protected dialogRef = inject(MatDialogRef<ImportDialog>);
  private importService = inject(ImportService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  protected step = signal<ImportStep>('upload');
  protected dragOver = signal(false);
  protected fileError = signal<string | null>(null);
  protected result = signal<ImportResult | null>(null);
  protected downloading = signal(false);

  downloadTemplate(): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.importService.downloadTemplate()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.downloading.set(false))
      )
      .subscribe({
        error: () => {
          this.fileError.set(this.translate.instant('IMPORT.GENERIC_ERROR'));
        }
      });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (!event.relatedTarget || !target.contains(event.relatedTarget as Node)) {
      this.dragOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  resetToUpload(): void {
    this.step.set('upload');
    this.result.set(null);
    this.fileError.set(null);
  }

  private processFile(file: File): void {
    this.fileError.set(null);

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (extension !== '.xlsx' || (file.type && file.type !== XLSX_MIME)) {
      this.fileError.set(this.translate.instant('IMPORT.INVALID_FORMAT'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.fileError.set(this.translate.instant('IMPORT.FILE_TOO_LARGE'));
      return;
    }

    this.step.set('importing');

    this.importService.uploadExcel(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          // Fallback: if observable completes without emitting next or error, escape importing state
          if (this.step() === 'importing') {
            this.result.set({
              success: false,
              totalRows: 0,
              validRows: 0,
              invalidRows: 0,
              importedCount: 0,
              errors: [{ row: 0, field: '', message: this.translate.instant('IMPORT.GENERIC_ERROR') }]
            });
            this.step.set('result');
          }
        })
      )
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.step.set('result');
        },
        error: (err) => {
          const message = err?.error?.message || err?.message
            || this.translate.instant('IMPORT.GENERIC_ERROR');
          this.result.set({
            success: false,
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            importedCount: 0,
            errors: [{ row: 0, field: '', message }]
          });
          this.step.set('result');
        }
      });
  }
}
