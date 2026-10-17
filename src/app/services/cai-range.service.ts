import { Injectable, signal } from '@angular/core';
import { CaiRange, CreateCaiRangeDto, UpdateCaiRangeDto } from '../interfaces/cai-range.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class CaiRangeService extends BaseCrudService<CaiRange, CreateCaiRangeDto, UpdateCaiRangeDto> {
  protected readonly apiUrl = `${environment.apiUrl}/cai-ranges`;
  protected readonly items = signal<CaiRange[]>([]);

  readonly ranges = this.items;
}
