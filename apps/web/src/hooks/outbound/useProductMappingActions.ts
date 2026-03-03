import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useBoxes } from '@/hooks/queries';
import { api } from '@/lib/api';
import {
  currentStepAtom,
  columnMappingAtom,
  parsedRowsAtom,
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
  const columnMapping = useAtomValue(columnMappingAtom);
  const parsedRows = useAtomValue(parsedRowsAtom);
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
      // Build orders array from parsedRows + columnMapping + productMapping
      const orders = buildOrdersFromMapping(parsedRows, columnMapping, productMappingData);

      const data = await api.upload.confirm(projectId, orders);

      toast.success('가져오기 완료', {
        description: `${data.imported}개의 데이터가 등록되었습니다.`,
      });

      // Calculate packing for each unique orderId
      const uniqueOrderIds = Array.from(new Set(orders.map((o) => o.orderId)));

      const results: PackingResult3D[] = [];
      for (const orderId of uniqueOrderIds) {
        const result = await api.packing.calculateOrder(projectId, orderId);
        results.push(result);
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

/**
 * Build the orders array for the confirm endpoint from parsed rows,
 * column mapping, and product mapping data.
 */
function buildOrdersFromMapping(
  rows: Record<string, unknown>[],
  columnMapping: Record<string, string | null>,
  productMappingData: Array<{ outboundItemIndex: number; productIds?: string[] | null }>,
): Array<{
  orderId: string;
  sku: string;
  orderQty?: number;
  quantity: number;
  recipientName?: string;
  address?: string;
  productId?: string | null;
}> {
  return rows
    .map((row, index) => {
      const orderId = columnMapping.orderId ? String(row[columnMapping.orderId] || '') : '';
      const sku = columnMapping.sku ? String(row[columnMapping.sku] || '') : '';
      const orderQty = columnMapping.orderQty
        ? parseInt(String(row[columnMapping.orderQty] || '1'), 10) || 1
        : 1;
      const quantity = columnMapping.quantity
        ? parseInt(String(row[columnMapping.quantity] || '1'), 10) || 1
        : 1;
      const recipientName = columnMapping.recipientName
        ? String(row[columnMapping.recipientName] || '')
        : undefined;
      const address = columnMapping.address
        ? String(row[columnMapping.address] || '')
        : undefined;

      const mapping = productMappingData.find((m) => m.outboundItemIndex === index);
      const productId = mapping?.productIds?.[0] || null;

      if (!orderId || !sku) return null;

      return {
        orderId,
        sku,
        orderQty,
        quantity,
        recipientName,
        address,
        productId,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);
}
