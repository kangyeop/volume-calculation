import { useAtom, useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  packingResultsAtom,
  isProcessingAtom,
} from '@/store/outboundWizardAtoms';
import type { PackingResult3D } from '@wms/types';

/** 결과 스텝: 재계산 */
export const useResultsActions = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const [packingResults, setPackingResults] = useAtom(packingResultsAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);

  const handleRecalculate = async () => {
    setIsProcessing(true);
    try {
      const uniqueOrderIds = Array.from(new Set(packingResults.map((r) => r.orderId)));

      const results: PackingResult3D[] = [];
      for (const orderId of uniqueOrderIds) {
        const result = await api.packing.calculateOrder(projectId!, orderId);
        results.push(result);
      }

      setPackingResults(results);
      toast.success('재계산 완료');
    } catch (error) {
      console.error('Recalculation failed:', error);
      toast.error('재계산 실패', {
        description: error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { packingResults, handleRecalculate };
};
