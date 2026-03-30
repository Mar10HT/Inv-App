import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
  private document = inject(DOCUMENT);

  downloadTemplate(): Observable<void> {
    return this.http.get(`${this.apiUrl}/inventory/import-template`, {
      responseType: 'blob'
    }).pipe(
      tap(blob => {
        const url = URL.createObjectURL(blob);
        const link = this.document.createElement('a');
        link.href = url;
        link.download = 'plantilla-importacion.xlsx';
        this.document.body.appendChild(link);
        link.click();
        this.document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }),
      map(() => void 0)
    );
  }

  uploadExcel(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<BulkOperationResult>(
      `${this.apiUrl}/inventory/bulk-import/excel`,
      formData
    ).pipe(
      map(result => {
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
        };
      })
    );
  }
}
