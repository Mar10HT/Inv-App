export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
}
