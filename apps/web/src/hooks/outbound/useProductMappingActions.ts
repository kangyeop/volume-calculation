import { useAtom, useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useBoxes } from '@/hooks/queries';
import { api } from '@/lib/api';
import {
  currentStepAtom,
  productMappingDataAtom,
  packingResultsAtom,
  isProcessingAtom,
} from '@/store/outboundWizardAtoms';
import type { PackingResult3D } from '@wms/types';

/** 제품 매핑 스텝: 매핑 변경 + 확인/계산 → results 스텝으로 전환 */
export const useProductMappingActions = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: boxes = [] } = useBoxes();
  const [productMappingData, setProductMappingData] = useAtom(productMappingDataAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  const setPackingResults = useSetAtom(packingResultsAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);

  const handleMappingChange = (index: number, productIds: string[] | null) => {
    setProductMappingData((prev) => {
      const updated = [...prev];
      updated[index] = {
        outboundItemIndex: index,
        productIds: productIds || undefined,
      };
      return updated;
    });
  };

  const handleCalculate = async (_sessionId: string) => {
    const unmappedCount = productMappingData.filter(
      (r) => !r.productIds || r.productIds.length === 0,
    ).length;

    if (unmappedCount > 0) {
      toast.error('매핑되지 않은 항목', {
        description: `${unmappedCount}개의 항목이 매핑되지 않았습니다.`,
      });
      return;
    }

    if (!boxes || boxes.length === 0) {
      toast.error('박스 없음', { description: '박스 관리 메뉴에서 박스를 먼저 등록해주세요.' });
      return;
    }

    if (!projectId) return;

    setIsProcessing(true);

    try {
      const outbounds = productMappingData.map(({ orderId, productIds, sku, quantity }) => ({
        orderId: orderId!,
        sku: sku!,
        quantity: quantity ?? 1,
        productId: productIds![0],
      }));

      if (outbounds.length === 0) {
        toast.error('등록할 데이터 없음', {
          description: '등록할 수 있는 유효한 데이터가 없습니다.',
        });
        return;
      }

      const data = await api.upload.confirm(projectId, outbounds);

      toast.success('가져오기 완료', {
        description: `${data.imported}개의 데이터가 등록되었습니다.`,
      });

      // Calculate packing for each unique orderId
      const uniqueOrderIds = Array.from(new Set(outbounds.map((o) => o.orderId)));

      const results: PackingResult3D[] = [];
      let hasValidResults = false;

      for (const orderId of uniqueOrderIds) {
        const result = await api.packing.calculateOrder(projectId, orderId);
        results.push(result);

        if (result.boxes.length > 0 || result.unpackedItems.length > 0) {
          hasValidResults = true;
        }
      }

      if (!hasValidResults) {
        toast.error('계산 결과 없음', {
          description: '모든 주문에 대해 패킹 결과가 없습니다. 데이터를 확인해주세요.',
        });
        setIsProcessing(false);
        return;
      }

      setPackingResults(results);
      setCurrentStep('results');
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error('계산 실패', {
        description: error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { handleMappingChange, handleCalculate };
};
