import { Currency } from './inventory-item.interface';

export interface FiscalConfig {
  id: string;
  rtn: string | null;
  fiscalEmail: string | null;
  fiscalPhone: string | null;
  address: string | null;
  currency: Currency;
  isvPercent: number;
  // Internal correlatives, never edited directly from the UI.
  fallbackSaleNumber: number;
  nextPurchaseNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFiscalConfigDto {
  rtn?: string;
  fiscalEmail?: string;
  fiscalPhone?: string;
  address?: string;
  currency?: Currency;
  isvPercent?: number;
}
