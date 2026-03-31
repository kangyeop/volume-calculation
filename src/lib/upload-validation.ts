const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 10MB limit';
  }
  const name = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
  if (!hasValidExtension) {
    return 'Invalid file type. Allowed: .xlsx, .xls, .csv';
  }
  return null;
}
