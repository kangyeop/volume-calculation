import { useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  currentStepAtom,
  headersAtom,
  rowCountAtom,
  columnMappingAtom,
  isProcessingAtom,
} from '@/store/outboundWizardAtoms';

const OUTBOUND_FIELDS = ['orderId', 'sku', 'quantity', 'recipientName'];

/** 업로드 스텝: 파일 파싱 → 헤더/매핑 세팅 → columnMapping 스텝으로 전환 */
export const useUploadAction = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const setCurrentStep = useSetAtom(currentStepAtom);
  const setHeaders = useSetAtom(headersAtom);
  const setRowCount = useSetAtom(rowCountAtom);
  const setColumnMapping = useSetAtom(columnMappingAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);

  const handleUpload = async (file: File): Promise<string | undefined> => {
    if (!projectId) return undefined;

    setIsProcessing(true);

    try {
      const response = await api.upload.parseMapping(file, 'outbound', projectId);

      if (!response) {
        throw new Error('Invalid response from server');
      }

      setHeaders(response.headers);
      setRowCount(response.rowCount);

      const initialMapping: Record<string, string | null> = {};
      OUTBOUND_FIELDS.forEach((field) => {
        const fieldMapping = response?.columnMapping.mapping[field];
        initialMapping[field] = fieldMapping?.columnName || null;
      });
      setColumnMapping(initialMapping);

      setCurrentStep('columnMapping');
      toast.success('분석 완료', {
        description: `${response.rowCount}개의 데이터를 분석했습니다.`,
      });

      return response.sessionId;
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('업로드 실패', {
        description: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.',
      });
      return undefined;
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleUpload };
};
