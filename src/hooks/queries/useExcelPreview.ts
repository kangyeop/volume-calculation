import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useExcelPreview() {
  return useMutation({
    mutationFn: (file: File) => api.upload.preview(file),
  });
}
