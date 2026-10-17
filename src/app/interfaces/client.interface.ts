import { PaymentCondition } from './purchase-invoice.interface';

export interface Client {
  id: string;
  code: string;
  name: string;
  rtn?: string;
  phone?: string;
  paymentCondition: PaymentCondition;
  creditLimit?: number;
  // Currency of creditLimit; credit sales in another one are refused
  creditLimitCurrency: 'HNL' | 'USD';
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
  creditLimitCurrency?: 'HNL' | 'USD';
  isActive?: boolean;
}

export interface UpdateClientDto {
  code?: string;
  name?: string;
  rtn?: string;
  phone?: string;
  paymentCondition?: PaymentCondition;
  creditLimit?: number;
  creditLimitCurrency?: 'HNL' | 'USD';
  isActive?: boolean;
}
