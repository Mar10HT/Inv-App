import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ImportResult } from '../interfaces/import.interface';
import { environment } from '../../environments/environment';

interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ index?: number; id?: string; error: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  importing = signal(false);
  progress = signal(0);

  downloadTemplate(): void {
    this.http.get(`${this.apiUrl}/inventory/import-template`, {
      responseType: 'blob'
    }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla-importacion.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  uploadExcel(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    this.importing.set(true);
    this.progress.set(50);

    return this.http.post<BulkOperationResult>(
      `${this.apiUrl}/inventory/bulk-import/excel`,
      formData
    ).pipe(
      map(result => {
        this.importing.set(false);
        this.progress.set(100);

        const total = result.success + result.failed;
        return {
          success: result.failed === 0,
          totalRows: total,
          validRows: result.success,
          invalidRows: result.failed,
          importedCount: result.success,
          errors: result.errors.map(e => ({
            row: (e.index ?? -1) + 2, // +2: skip header row, convert 0-based index
            field: '',
            message: e.error
          }))
        } as ImportResult;
      }),
      catchError(err => {
        this.importing.set(false);
        this.progress.set(0);
        return throwError(() => err);
      })
    );
  }
}
