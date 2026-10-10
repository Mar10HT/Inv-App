export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
}

export enum PaymentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export interface PaymentUserRef {
  id: string;
  name: string | null;
  email: string;
}

export interface Payment {
  id: string;
  saleId: string | null;
  purchaseInvoiceId: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  createdById: string;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: PaymentUserRef;
  cancelledBy?: PaymentUserRef | null;
}

export interface CreatePaymentDto {
  saleId?: string;
  purchaseInvoiceId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface CancelPaymentDto {
  reason?: string;
}

export interface PaymentStats {
  total: number;
  active: number;
  cancelled: number;
  byMethod: Record<string, number>;
}
