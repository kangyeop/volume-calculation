import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';

interface ExcelUploadProps<T> {
  onUpload: (data: T[], fileName: string) => void;
  title: string;
  headerRow?: number; // 0-indexed header row
}

export const ExcelUpload = <T,>({ onUpload, title, headerRow = 0 }: ExcelUploadProps<T>) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { range: headerRow }) as T[];
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

