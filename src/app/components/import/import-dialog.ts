import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';

import { ImportService } from '../../services/import.service';
import { ImportRow, ImportPreview, ImportResult } from '../../interfaces/import.interface';

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div>
          <h2 class="text-xl font-semibold text-slate-300">{{ 'IMPORT.TITLE' | translate }}</h2>
          <p class="text-sm text-slate-500 mt-1">{{ 'IMPORT.SUBTITLE' | translate }}</p>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6">
        <!-- Step 1: Upload -->
        @if (step() === 'upload') {
          <div class="space-y-6">
            <!-- Download Template -->
            <div class="bg-[#2d4a3f]/20 border border-[#4d7c6f]/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <mat-icon class="text-[#4d7c6f] mt-0.5">info</mat-icon>
                <div class="flex-1">
                  <p class="text-slate-300 font-medium">{{ 'IMPORT.TEMPLATE_INFO' | translate }}</p>
                  <p class="text-slate-500 text-sm mt-1">{{ 'IMPORT.TEMPLATE_DESC' | translate }}</p>
                  <button
                    (click)="downloadTemplate()"
                    class="mt-3 text-[#4d7c6f] hover:text-[#5d8c7f] text-sm font-medium flex items-center gap-1">
                    <mat-icon class="!text-lg">download</mat-icon>
                    {{ 'IMPORT.DOWNLOAD_TEMPLATE' | translate }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Drop Zone -->
            <div
              class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
              [class]="dragOver() ? 'border-[#4d7c6f] bg-[#2d4a3f]/20' : 'border-[#2a2a2a] hover:border-slate-600'"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)">
              <mat-icon class="!text-5xl text-slate-600 mb-4">cloud_upload</mat-icon>
              <p class="text-slate-400 mb-2">{{ 'IMPORT.DROP_FILE' | translate }}</p>
              <p class="text-slate-600 text-sm mb-4">{{ 'IMPORT.OR' | translate }}</p>
              <label class="inline-block">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  class="hidden"
                  (change)="onFileSelect($event)"
                />
                <span class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-2.5 rounded-lg cursor-pointer font-medium transition-colors">
                  {{ 'IMPORT.SELECT_FILE' | translate }}
                </span>
              </label>
              <p class="text-slate-600 text-xs mt-4">{{ 'IMPORT.SUPPORTED_FORMATS' | translate }}</p>
            </div>

            @if (fileError()) {
              <div class="bg-rose-950/30 border border-rose-900 rounded-lg p-4">
                <div class="flex items-center gap-2 text-rose-400">
                  <mat-icon>error</mat-icon>
                  <span>{{ fileError() }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Step 2: Preview -->
        @if (step() === 'preview' && preview()) {
          <div class="space-y-4">
            <!-- Summary -->
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-[#141414] rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-slate-300">{{ preview()!.totalCount }}</p>
                <p class="text-sm text-slate-500">{{ 'IMPORT.TOTAL_ROWS' | translate }}</p>
              </div>
              <div class="bg-[#141414] rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-emerald-400">{{ preview()!.validCount }}</p>
                <p class="text-sm text-slate-500">{{ 'IMPORT.VALID_ROWS' | translate }}</p>
              </div>
              <div class="bg-[#141414] rounded-lg p-4 text-center">
                <p class="text-2xl font-bold text-rose-400">{{ preview()!.invalidCount }}</p>
                <p class="text-sm text-slate-500">{{ 'IMPORT.INVALID_ROWS' | translate }}</p>
              </div>
            </div>

            <!-- Preview Table -->
            <div class="bg-[#141414] rounded-lg overflow-hidden">
              <div class="max-h-[300px] overflow-auto">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-[#1a1a1a]">
                    <tr>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">#</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_STATUS' | translate }}</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_NAME' | translate }}</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_CATEGORY' | translate }}</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_QTY' | translate }}</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_WAREHOUSE' | translate }}</th>
                      <th class="text-left px-4 py-3 text-slate-500 font-medium">{{ 'IMPORT.COL_ERRORS' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#2a2a2a]">
                    @for (row of preview()!.rows; track row.rowNumber) {
                      <tr [class]="row.isValid ? '' : 'bg-rose-950/10'">
                        <td class="px-4 py-3 text-slate-500">{{ row.rowNumber }}</td>
                        <td class="px-4 py-3">
                          @if (row.isValid) {
                            <span class="text-emerald-400"><mat-icon class="!text-lg">check_circle</mat-icon></span>
                          } @else {
                            <span class="text-rose-400"><mat-icon class="!text-lg">error</mat-icon></span>
                          }
                        </td>
                        <td class="px-4 py-3 text-slate-300">{{ row.name || '-' }}</td>
                        <td class="px-4 py-3 text-slate-400">{{ row.category || '-' }}</td>
                        <td class="px-4 py-3 text-slate-400">{{ row.quantity }}</td>
                        <td class="px-4 py-3 text-slate-400">{{ row.warehouseName || '-' }}</td>
                        <td class="px-4 py-3 text-rose-400 text-xs">
                          {{ row.errors.join(', ') }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            @if (preview()!.invalidCount > 0) {
              <div class="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                <div class="flex items-start gap-2 text-amber-400">
                  <mat-icon class="mt-0.5">warning</mat-icon>
                  <p class="text-sm">{{ 'IMPORT.INVALID_WARNING' | translate }}</p>
                </div>
              </div>
            }
          </div>
        }

        <!-- Step 3: Importing -->
        @if (step() === 'importing') {
          <div class="text-center py-8">
            <mat-icon class="!text-5xl text-[#4d7c6f] mb-4 animate-pulse">cloud_sync</mat-icon>
            <p class="text-slate-300 text-lg mb-4">{{ 'IMPORT.IMPORTING' | translate }}</p>
            <mat-progress-bar
              mode="determinate"
              [value]="importService.progress()"
              class="rounded-full">
            </mat-progress-bar>
            <p class="text-slate-500 text-sm mt-2">{{ importService.progress() }}%</p>
          </div>
        }

        <!-- Step 4: Result -->
        @if (step() === 'result' && result()) {
          <div class="space-y-6">
            <!-- Success/Error Icon -->
            <div class="text-center">
              @if (result()!.success) {
                <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-950/30 rounded-full mb-4">
                  <mat-icon class="!text-4xl text-emerald-400">check_circle</mat-icon>
                </div>
                <h3 class="text-xl font-semibold text-emerald-400">{{ 'IMPORT.SUCCESS' | translate }}</h3>
              } @else {
                <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-950/30 rounded-full mb-4">
                  <mat-icon class="!text-4xl text-amber-400">warning</mat-icon>
                </div>
                <h3 class="text-xl font-semibold text-amber-400">{{ 'IMPORT.PARTIAL_SUCCESS' | translate }}</h3>
              }
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-4 text-center">
                <p class="text-3xl font-bold text-emerald-400">{{ result()!.importedCount }}</p>
                <p class="text-sm text-slate-500">{{ 'IMPORT.ITEMS_IMPORTED' | translate }}</p>
              </div>
              <div class="bg-rose-950/20 border border-rose-900/30 rounded-lg p-4 text-center">
                <p class="text-3xl font-bold text-rose-400">{{ result()!.errors.length }}</p>
                <p class="text-sm text-slate-500">{{ 'IMPORT.ERRORS' | translate }}</p>
              </div>
            </div>

            <!-- Errors List -->
            @if (result()!.errors.length > 0) {
              <div class="bg-[#141414] rounded-lg p-4 max-h-[200px] overflow-auto">
                <p class="text-sm font-medium text-slate-400 mb-2">{{ 'IMPORT.ERROR_DETAILS' | translate }}:</p>
                <ul class="space-y-1 text-sm text-rose-400">
                  @for (error of result()!.errors; track $index) {
                    <li>{{ 'IMPORT.ROW' | translate }} {{ error.row }}: {{ error.message }}</li>
                  }
                </ul>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center gap-3 px-6 py-4 border-t border-[#2a2a2a]">
        <div>
          @if (step() === 'preview') {
            <button
              (click)="goBack()"
              class="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors">
              <mat-icon class="!text-lg align-middle mr-1">arrow_back</mat-icon>
              {{ 'COMMON.BACK' | translate }}
            </button>
          }
        </div>
        <div class="flex gap-3">
          <button
            (click)="dialogRef.close()"
            class="px-6 py-2.5 rounded-lg bg-[#2a2a2a] text-slate-400 hover:bg-[#3a3a3a] hover:text-slate-300 transition-colors font-medium">
            {{ step() === 'result' ? ('COMMON.CLOSE' | translate) : ('COMMON.CANCEL' | translate) }}
          </button>
          @if (step() === 'preview' && preview()!.validCount > 0) {
            <button
              (click)="startImport()"
              class="px-6 py-2.5 rounded-lg bg-[#4d7c6f] text-white hover:bg-[#5d8c7f] transition-colors font-medium flex items-center gap-2">
              <mat-icon class="!text-lg">upload</mat-icon>
              {{ 'IMPORT.IMPORT_VALID' | translate }} ({{ preview()!.validCount }})
            </button>
          }
          @if (step() === 'result') {
            <button
              (click)="dialogRef.close(true)"
              class="px-6 py-2.5 rounded-lg bg-[#4d7c6f] text-white hover:bg-[#5d8c7f] transition-colors font-medium">
              {{ 'COMMON.DONE' | translate }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 700px;
      max-width: 95vw;
    }
    ::ng-deep .mat-mdc-progress-bar {
      --mdc-linear-progress-active-indicator-color: #4d7c6f;
      --mdc-linear-progress-track-color: #2a2a2a;
    }
  `]
})
export class ImportDialog {
  dialogRef = inject(MatDialogRef<ImportDialog>);
  importService = inject(ImportService);

  step = signal<ImportStep>('upload');
  dragOver = signal(false);
  fileError = signal<string | null>(null);
  preview = signal<ImportPreview | null>(null);
  result = signal<ImportResult | null>(null);

  downloadTemplate(): void {
    this.importService.downloadTemplate();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
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

  private processFile(file: File): void {
    this.fileError.set(null);

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(extension)) {
      this.fileError.set('Invalid file type. Please upload a CSV or Excel file.');
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parseAndPreview(content);
    };
    reader.onerror = () => {
      this.fileError.set('Error reading file. Please try again.');
    };
    reader.readAsText(file);
  }

  private parseAndPreview(content: string): void {
    let preview = this.importService.parseCSV(content);

    if (preview.totalCount === 0) {
      this.fileError.set('No valid rows found in the file.');
      return;
    }

    // Validate against existing data
    preview = {
      ...preview,
      rows: this.importService.validateAgainstData(preview.rows),
      validCount: 0,
      invalidCount: 0
    };
    preview.validCount = preview.rows.filter(r => r.isValid).length;
    preview.invalidCount = preview.rows.filter(r => !r.isValid).length;

    this.preview.set(preview);
    this.step.set('preview');
  }

  goBack(): void {
    this.step.set('upload');
    this.preview.set(null);
  }

  startImport(): void {
    const previewData = this.preview();
    if (!previewData) return;

    this.step.set('importing');

    this.importService.importRows(previewData.rows).subscribe({
      next: (result) => {
        this.result.set(result);
        this.step.set('result');
      },
      error: (err) => {
        this.result.set({
          success: false,
          totalRows: previewData.totalCount,
          validRows: previewData.validCount,
          invalidRows: previewData.invalidCount,
          importedCount: 0,
          errors: [{ row: 0, field: '', message: err.message || 'Import failed' }]
        });
        this.step.set('result');
      }
    });
  }
}
