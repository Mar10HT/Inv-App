export interface Supplier {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
  code?: string;
  rtn?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierDto {
  name: string;
  location: string;
  phone?: string;
  email?: string;
  code?: string;
  rtn?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDto {
  name?: string;
  location?: string;
  phone?: string;
  email?: string;
  code?: string;
  rtn?: string;
  isActive?: boolean;
}
