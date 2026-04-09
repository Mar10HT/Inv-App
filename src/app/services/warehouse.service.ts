import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '../interfaces/warehouse.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService extends BaseCrudService<Warehouse, CreateWarehouseDto, UpdateWarehouseDto> {
  protected readonly apiUrl = `${environment.apiUrl}/warehouses`;
  protected readonly items = signal<Warehouse[]>([]);

  readonly warehouses = this.items;

  setManager(warehouseId: string, managerId: string | null): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.apiUrl}/${warehouseId}/manager`, { managerId });
  }
}
