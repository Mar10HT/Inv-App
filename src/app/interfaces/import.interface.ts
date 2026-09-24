export interface ImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedCount: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}
