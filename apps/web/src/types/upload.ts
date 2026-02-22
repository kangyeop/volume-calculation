export interface UploadSession {
  sessionId: string;
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  mapping: {
    confidence: number;
    mapping: Record<string, { columnName: string; confidence: number } | null>;
    unmappedColumns: string[];
    notes?: string;
  };
  fileName: string;
}

export interface UploadResponse {
  success: boolean;
  data?: UploadSession;
  message?: string;
}

export interface MappingOption {
  header: string;
  field: string;
  type: 'string' | 'number' | 'date';
  required: boolean;
}