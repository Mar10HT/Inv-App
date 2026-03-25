import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ScheduledReport {
  id: string;
  reportType: 'INVENTORY' | 'LOW_STOCK' | 'TRANSACTIONS' | 'LOANS' | 'TRANSFERS' | 'STOCK_TAKES' | 'DISCHARGES';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipientEmails: string;
  warehouseId?: string;
  locale: string;
  isActive: boolean;
  nextSendAt: string;
  lastSentAt?: string;
  createdAt: string;
  warehouse?: { name: string };
}

export interface CreateScheduledReportDto {
  reportType: ScheduledReport['reportType'];
  frequency: ScheduledReport['frequency'];
  recipientEmails: string;
  warehouseId?: string;
  locale?: string;
}

export interface UpdateScheduledReportDto extends Partial<CreateScheduledReportDto> {
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScheduledReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/scheduled-reports`;

  reports = signal<ScheduledReport[]>([]);
  isLoading = signal(false);

  loadAll(): void {
    this.isLoading.set(true);
    this.http.get<ScheduledReport[]>(this.apiUrl).subscribe({
      next: (r) => {
        this.reports.set(r);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  create(dto: CreateScheduledReportDto): Observable<ScheduledReport> {
    return this.http.post<ScheduledReport>(this.apiUrl, dto).pipe(
      tap(() => this.loadAll()),
    );
  }

  update(id: string, dto: UpdateScheduledReportDto): Observable<ScheduledReport> {
    return this.http.patch<ScheduledReport>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.loadAll()),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.loadAll()),
    );
  }

  sendNow(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/send-now`, {});
  }
}
