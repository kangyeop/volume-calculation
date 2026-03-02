import { useAtom, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  currentStepAtom,
  columnMappingAtom,
  productMappingDataAtom,
  productMappingStatsAtom,
  isProcessingAtom,
} from '@/store/outboundWizardAtoms';
import type { ProductMatchResult } from '@wms/types';

/** 컬럼 매핑 스텝: 매핑 변경 + 다음(제품 매핑)으로 전환 */
export const useColumnMappingActions = () => {
  const [columnMapping, setColumnMapping] = useAtom(columnMappingAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  const setProductMappingData = useSetAtom(productMappingDataAtom);
  const setProductMappingStats = useSetAtom(productMappingStatsAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);

  const handleMappingChange = async (
    sessionId: string,
    field: string,
    value: string | null,
  ) => {
    const newMapping = { ...columnMapping, [field]: value };
    setColumnMapping(newMapping);

    if (field === 'sku' && value) {
      setIsProcessing(true);
      try {
        await api.upload.updateMapping(sessionId, newMapping);
        toast.success('컬럼 매핑 업데이트 완료');
      } catch (error) {
        console.error('Update mapping failed:', error);
        toast.error('매핑 업데이트 실패', {
          description:
            error instanceof Error ? error.message : '매핑 업데이트 중 오류가 발생했습니다.',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleNext = async (sessionId: string) => {
    if (!sessionId) return;

    setIsProcessing(true);

    try {
      const result = await api.upload.productMapping(sessionId, columnMapping);

      setProductMappingData(result.results);

      const mappedCount = result.results.filter(
        (r: ProductMatchResult) => r.productIds && r.productIds.length > 0,
      ).length;
      setProductMappingStats({
        totalItems: result.results.length,
        matchedItems: mappedCount,
        needsReview: 0,
      });

      setCurrentStep('productMapping');
      toast.success('제품 매핑 완료', {
        description: `${mappedCount}개의 항목이 매핑되었습니다.`,
      });
    } catch (error) {
      console.error('Product mapping failed:', error);
      toast.error('제품 매핑 실패', {
        description: error instanceof Error ? error.message : '제품 매핑 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleMappingChange, handleNext };
};
