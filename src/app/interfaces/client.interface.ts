import { PaymentCondition } from './purchase-invoice.interface';

export interface Client {
  id: string;
  code: string;
  name: string;
  rtn?: string;
  phone?: string;
  paymentCondition: PaymentCondition;
  creditLimit?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientDto {
  code: string;
  name: string;
  rtn?: string;
  phone?: string;
  paymentCondition?: PaymentCondition;
  creditLimit?: number;
  isActive?: boolean;
}

export interface UpdateClientDto {
  code?: string;
  name?: string;
  rtn?: string;
  phone?: string;
  paymentCondition?: PaymentCondition;
  creditLimit?: number;
  isActive?: boolean;
}
