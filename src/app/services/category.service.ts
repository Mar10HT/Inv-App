import { Injectable, signal } from '@angular/core';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../interfaces/category.interface';
import { environment } from '../../environments/environment';
import { BaseCrudService } from './base-crud.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService extends BaseCrudService<Category, CreateCategoryDto, UpdateCategoryDto> {
  protected readonly apiUrl = `${environment.apiUrl}/categories`;
  protected readonly items = signal<Category[]>([]);

  readonly categories = this.items;
}
