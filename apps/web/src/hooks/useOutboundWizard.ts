import { useAtom, useSetAtom } from 'jotai';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts, useBoxes } from '@/hooks/queries';
import { api } from '@/lib/api';
import {
  currentStepAtom,
  headersAtom,
  rowCountAtom,
  columnMappingAtom,
  productMappingDataAtom,
  productMappingStatsAtom,
  packingResultsAtom,
  isProcessingAtom,
  resetWizardAtom,
} from '@/store/outboundWizardAtoms';
import type { ProductMatchResult, PackingResult3D } from '@wms/types';

const OUTBOUND_FIELDS = ['orderId', 'sku', 'quantity', 'recipientName'];

export const useOutboundWizard = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: products = [] } = useProducts(projectId || '');
  const { data: boxes = [] } = useBoxes();

  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [headers, setHeaders] = useAtom(headersAtom);
  const [rowCount, setRowCount] = useAtom(rowCountAtom);
  const [columnMapping, setColumnMapping] = useAtom(columnMappingAtom);
  const [productMappingData, setProductMappingData] = useAtom(productMappingDataAtom);
  const [, setProductMappingStats] = useAtom(productMappingStatsAtom);
  const [packingResults, setPackingResults] = useAtom(packingResultsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const resetWizard = useSetAtom(resetWizardAtom);



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

  const handleColumnMappingNext = async (sessionId: string) => {
    if (!sessionId) return;

    setIsProcessing(true);

    try {
      const productMappingResult = await api.upload.productMapping(sessionId, columnMapping);

      setProductMappingData(productMappingResult.results);

      const mappedCount = productMappingResult.results.filter(
        (r: ProductMatchResult) => r.productIds && r.productIds.length > 0,
      ).length;
      setProductMappingStats({
        totalItems: productMappingResult.results.length,
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

  const handleColumnMappingChange = async (
    sessionId: string,
    field: string,
    value: string | null,
  ) => {
    const newMapping = { ...columnMapping, [field]: value };
    setColumnMapping(newMapping);

    const skuColumnChanged = field === 'sku';
    if (skuColumnChanged && value) {
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

  const handleProductMappingChange = (index: number, productIds: string[] | null) => {
    setProductMappingData((prev) => {
      const updated = [...prev];
      updated[index] = {
        outboundItemIndex: index,
        productIds: productIds || undefined,
      };
      return updated;
    });
  };

  const handleCalculate = async (sessionId: string) => {
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

    setIsProcessing(true);

    try {
      const productMappingParam: Record<number, string[] | null> = {};
      productMappingData.forEach((result) => {
        if (result.productIds && result.productIds.length > 0) {
          productMappingParam[result.outboundItemIndex] = result.productIds;
        }
      });

      const data = await api.upload.confirmMapping(sessionId, columnMapping, productMappingParam);

      toast.success('가져오기 완료', {
        description: `${data.imported}개의 데이터가 등록되었습니다.`,
      });

      const uniqueOrderIds = data.orderIds || [];

      const results: PackingResult3D[] = [];
      for (const orderId of uniqueOrderIds) {
        const result = await api.packing.calculateOrder(projectId!, orderId);
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

  const handleBack = () => {
    switch (currentStep) {
      case 'columnMapping':
        setCurrentStep('upload');
        break;
      case 'productMapping':
        setCurrentStep('columnMapping');
        break;
      case 'results':
        setCurrentStep('productMapping');
        break;
    }
  };

  const handleReset = () => {
    resetWizard();
  };

  const handleBackToDashboard = () => {
    navigate(`/projects/${projectId}`);
  };

  return {
    // State (read from atoms)
    projectId,
    currentStep,
    headers,
    rowCount,
    columnMapping,
    productMappingData,
    packingResults,
    isProcessing,
    products,
    boxes,

    // Actions
    handleUpload,
    handleColumnMappingNext,
    handleColumnMappingChange,
    handleProductMappingChange,
    handleCalculate,
    handleRecalculate,
    handleBack,
    handleReset,
    handleBackToDashboard,
  };
};
