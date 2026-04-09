import { Injectable, signal } from '@angular/core';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../interfaces/supplier.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class SupplierService extends BaseCrudService<Supplier, CreateSupplierDto, UpdateSupplierDto> {
  protected readonly apiUrl = `${environment.apiUrl}/suppliers`;
  protected readonly items = signal<Supplier[]>([]);

  readonly suppliers = this.items;
}
