import React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { ExcelUpload } from '@/components/ExcelUpload';
import { useUploadAction } from '@/hooks/outbound/useUploadAction';
import { isProcessingAtom } from '@/store/outboundWizardAtoms';

interface UploadStepProps {
  onSessionCreated: (sessionId: string) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onSessionCreated }) => {
  const isProcessing = useAtomValue(isProcessingAtom);
  const { handleUpload } = useUploadAction();

  const onUpload = async (file: File) => {
    const sessionId = await handleUpload(file);
    if (sessionId) {
      onSessionCreated(sessionId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold">엑셀 파일 업로드</h2>
        <p className="text-muted-foreground text-sm">
          주문번호, SKU, 수량이 포함된 Excel 파일을 업로드하세요.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <ExcelUpload onUpload={onUpload} title="클릭하거나 파일을 드래그하세요" />
      </div>

      {isProcessing && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-indigo-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>파일 분석 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};
