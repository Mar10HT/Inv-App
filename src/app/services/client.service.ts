import { Injectable, signal } from '@angular/core';
import { Client, CreateClientDto, UpdateClientDto } from '../interfaces/client.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class ClientService extends BaseCrudService<Client, CreateClientDto, UpdateClientDto> {
  protected readonly apiUrl = `${environment.apiUrl}/clients`;
  protected readonly items = signal<Client[]>([]);

  readonly clients = this.items;
}
