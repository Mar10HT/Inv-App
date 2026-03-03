export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description?: string;
  isActive?: boolean;
  managerId?: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWarehouseDto {
  name: string;
  location: string;
  description?: string;
}

export interface UpdateWarehouseDto {
  name?: string;
  location?: string;
  description?: string;
}
