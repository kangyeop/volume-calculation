import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';

interface ExcelUploadProps<T> {
  onUpload: (data: T[], fileName: string) => void;
  title: string;
  headerRow?: number; // 0-indexed header row. If headerKey is provided, this is ignored (or used as fallback start)
  headerKey?: string; // A string that must exist in the header row (e.g. "상품명")
  maxSize?: number; // in MB
  allowedExtensions?: string[];
}

export const ExcelUpload = <T,>({
  onUpload,
  title,
  headerRow = 0,
  headerKey,
  maxSize = 10,
  allowedExtensions = ['.xlsx', '.xls', '.csv']
}: ExcelUploadProps<T>) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증
    if (file.size > maxSize * 1024 * 1024) {
      alert(`파일 크기는 ${maxSize}MB를 초과할 수 없습니다.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 파일 확장자 검증
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`허용되는 파일 형식: ${allowedExtensions.join(', ')}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      let targetHeaderRow = headerRow;

      if (headerKey) {
        // Search for the row containing the headerKey
        // Convert sheet to array of arrays to scan
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        const foundIndex = rawData.findIndex(row =>
          row.some(cell => String(cell).includes(headerKey))
        );
        if (foundIndex !== -1) {
          targetHeaderRow = foundIndex;
        }
      }

      const data = XLSX.utils.sheet_to_json(ws, { range: targetHeaderRow }) as T[];
      onUpload(data, file.name);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
         onClick={() => fileInputRef.current?.click()}>
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

