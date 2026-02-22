import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ExcelUploadProps {
  onUpload: (file: File) => void;
  title: string;
  maxSize?: number;
  allowedExtensions?: string[];
}

export const ExcelUpload = ({
  onUpload,
  title,
  maxSize = 10,
  allowedExtensions = ['.xlsx', '.xls', '.csv'],
}: ExcelUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      alert(`파일 크기는 ${maxSize}MB를 초과할 수 없습니다.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`허용되는 파일 형식: ${allowedExtensions.join(', ')}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    onUpload(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <Upload className="h-8 w-8 text-gray-400 mb-2" />
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <span className="text-xs text-gray-400 mt-1">Accepts .xlsx, .xls</span>
    </div>
  );
};
