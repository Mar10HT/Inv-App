export interface CaiRange {
  id: string;
  cai: string;
  establishmentCode: string;
  emissionPointCode: string;
  documentTypeCode: string;
  rangeStart: number;
  rangeEnd: number;
  // Server-owned: set to rangeStart on create, incremented as it is consumed.
  currentNumber: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaiRangeDto {
  cai: string;
  establishmentCode: string;
  emissionPointCode: string;
  documentTypeCode?: string;
  rangeStart: number;
  rangeEnd: number;
  expiresAt: string;
  isActive?: boolean;
}

export type UpdateCaiRangeDto = Partial<CreateCaiRangeDto>;
