import { Injectable, signal } from '@angular/core';
import { CreateServiceDto, Service, UpdateServiceDto } from '../interfaces/service.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

/** The catalog of services (`/services`). Named apart from Angular's own "service" classes. */
@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogService extends BaseCrudService<Service, CreateServiceDto, UpdateServiceDto> {
  protected readonly apiUrl = `${environment.apiUrl}/services`;
  protected readonly items = signal<Service[]>([]);

  readonly services = this.items;
}
