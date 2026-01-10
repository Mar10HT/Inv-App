export interface Supplier {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierDto {
  name: string;
  location?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  location?: string;
  phone?: string;
  email?: string;
}
