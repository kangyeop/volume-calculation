export interface UploadSession {
  sessionId: string;
  data: Record<string, unknown>[];
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