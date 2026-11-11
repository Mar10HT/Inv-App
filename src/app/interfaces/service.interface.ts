/** A service that can be quoted or sold next to inventory items (installation, support...). */
export interface Service {
  id: string;
  name: string;
  description?: string | null;
  /** Suggested price, prefilled on a sale line and editable there. */
  price?: number | null;
  currency: 'HNL' | 'USD';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  price?: number;
  currency?: 'HNL' | 'USD';
}

export type UpdateServiceDto = Partial<CreateServiceDto>;
