import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts, useBoxes } from '@/hooks/queries';
import { api } from '@/lib/api';
import { ExcelUpload } from '@/components/ExcelUpload';
import { MappingPreview } from '@/components/MappingPreview';
import { PackingResult } from '@/components/PackingResult';
import { ChevronRight, ChevronLeft, CheckCircle, ArrowRight, RefreshCw, FileSpreadsheet, ArrowLeft, AlertTriangle } from 'lucide-react';
import type { ProductMatchResult, PackingResult3D } from '@wms/types';

type WizardStep = 'upload' | 'columnMapping' | 'productMapping' | 'results';

const OUTBOUND_FIELDS = ['orderId', 'sku', 'quantity', 'recipientName'];

export const OutboundWizard: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: products = [] } = useProducts(projectId || '');
  const { data: boxes = [] } = useBoxes();

  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [sessionId, setSessionId] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, unknown>[]>([]);
  const [rowCount, setRowCount] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null>>({});
  const [columnMappingResult, setColumnMappingResult] = useState<any>(null);
  const [productMappingData, setProductMappingData] = useState<ProductMatchResult[]>([]);
  const [productMappingStats, setProductMappingStats] = useState({ totalItems: 0, matchedItems: 0, needsReview: 0 });
  const [packingResults, setPackingResults] = useState<PackingResult3D[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps: { id: WizardStep; label: string; completed: boolean }[] = [
    { id: 'upload', label: '엑셀 업로드', completed: currentStep !== 'upload' },
    { id: 'columnMapping', label: '컬럼 매핑', completed: currentStep === 'productMapping' || currentStep === 'results' },
    { id: 'productMapping', label: '제품 매핑', completed: currentStep === 'results' },
    { id: 'results', label: '계산 결과', completed: false },
  ];

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    setIsProcessing(true);

    try {
      const response = await api.upload.parseMapping(file, 'outbound', projectId);

      if (response.success) {
        setSessionId(response.data.sessionId);
        setHeaders(response.data.headers);
        setSampleRows(response.data.sampleRows);
        setRowCount(response.data.rowCount);
        setColumnMappingResult(response.data.columnMapping);

        if (response.data.productMapping) {
          setProductMappingData(response.data.productMapping.results);
          setProductMappingStats({
            totalItems: response.data.productMapping.totalItems,
            matchedItems: response.data.productMapping.matchedItems,
            needsReview: response.data.productMapping.needsReview,
          });
        }

        const initialMapping: Record<string, string | null> = {};
        OUTBOUND_FIELDS.forEach((field) => {
          const fieldMapping = response.data.columnMapping.mapping[field];
          initialMapping[field] = fieldMapping?.columnName || null;
        });
        setColumnMapping(initialMapping);

        setCurrentStep('columnMapping');
        toast.success('분석 완료', { description: `${response.data.rowCount}개의 데이터를 분석했습니다.` });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('업로드 실패', { description: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleColumnMappingNext = async () => {
    setCurrentStep('productMapping');
  };

  const handleColumnMappingChange = async (field: string, value: string | null) => {
    const newMapping = { ...columnMapping, [field]: value };
    setColumnMapping(newMapping);

    const skuColumnChanged = field === 'sku';
    if (skuColumnChanged && value) {
      setIsProcessing(true);
      try {
        const response = await api.upload.updateMapping(sessionId, newMapping);

        if (response.success) {
          setProductMappingData(response.data.productMapping.results);
          setProductMappingStats({
            totalItems: response.data.productMapping.totalItems,
            matchedItems: response.data.productMapping.matchedItems,
            needsReview: response.data.productMapping.needsReview,
          });
          toast.success('제품 매핑 업데이트 완료');
        }
      } catch (error) {
        console.error('Update mapping failed:', error);
        toast.error('매핑 업데이트 실패', { description: error instanceof Error ? error.message : '매핑 업데이트 중 오류가 발생했습니다.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleProductMappingChange = (index: number, productId: string | null, confidence?: number) => {
    setProductMappingData((prev) => {
      const updated = [...prev];
      if (productId) {
        const product = products.find((p) => p.id === productId);
        updated[index] = {
          ...updated[index],
          matchedProduct: product,
          confidence: confidence || 1.0,
          needsReview: (confidence || 1.0) < 0.9,
          matchReason: 'Manual selection',
        };
      } else {
        updated[index] = {
          ...updated[index],
          matchedProduct: undefined,
          confidence: 0,
          needsReview: true,
          matchReason: 'Unmapped',
        };
      }
      return updated;
    });
  };

  const handleCalculate = async () => {
    const unmappedCount = productMappingData.filter((r) => !r.matchedProduct).length;
    const needsReviewCount = productMappingData.filter((r) => r.needsReview).length;

    if (unmappedCount > 0) {
      toast.error('매핑되지 않은 항목', { description: `${unmappedCount}개의 항목이 매핑되지 않았습니다.` });
      return;
    }

    if (needsReviewCount > 0) {
      toast.warning('검토 필요', { description: `${needsReviewCount}개의 항목이 검토가 필요합니다.` });
    }

    if (!boxes || boxes.length === 0) {
      toast.error('박스 없음', { description: '박스 관리 메뉴에서 박스를 먼저 등록해주세요.' });
      return;
    }

    setIsProcessing(true);

    try {
      const productMappingParam: Record<number, string | null> = {};
      productMappingData.forEach((result) => {
        if (result.matchedProduct) {
          productMappingParam[result.outboundItemIndex] = result.matchedProduct.id;
        }
      });

      const response = await api.upload.confirmMapping(sessionId, columnMapping, productMappingParam);

      if (response.success) {
        toast.success('가져오기 완료', { description: `${response.data.imported}개의 데이터가 등록되었습니다.` });

        const uniqueOrderIds = Array.from(new Set(productMappingData.map((m) => {
          const row = sampleRows[m.outboundItemIndex];
          const orderIdColumn = columnMapping.orderId;
          return String(row[orderIdColumn || ''] || '');
        }))).filter((id) => id);

        const results: PackingResult3D[] = [];
        for (const orderId of uniqueOrderIds) {
          const result = await api.packing.calculateOrder(projectId!, orderId);
          results.push(result);
        }

        setPackingResults(results);
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error('계산 실패', { description: error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecalculate = async () => {
    setIsProcessing(true);
    try {
      const uniqueOrderIds = Array.from(new Set(productMappingData.map((m) => {
        const row = sampleRows[m.outboundItemIndex];
        const orderIdColumn = columnMapping.orderId;
        return String(row[orderIdColumn || ''] || '');
      }))).filter((id) => id);

      const results: PackingResult3D[] = [];
      for (const orderId of uniqueOrderIds) {
        const result = await api.packing.calculateOrder(projectId!, orderId);
        results.push(result);
      }

      setPackingResults(results);
      toast.success('재계산 완료');
    } catch (error) {
      console.error('Recalculation failed:', error);
      toast.error('재계산 실패', { description: error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.' });
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
    setCurrentStep('upload');
    setSessionId('');
    setHeaders([]);
    setSampleRows([]);
    setRowCount(0);
    setColumnMapping({});
    setColumnMappingResult(null);
    setProductMappingData([]);
    setProductMappingStats({ totalItems: 0, matchedItems: 0, needsReview: 0 });
    setPackingResults([]);
  };

  const handleBackToDashboard = () => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBackToDashboard}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">출고 등록 마법사</h1>
          <p className="text-muted-foreground">엑셀 업로드부터 계산까지 단계별로 진행합니다.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm
                      ${step.completed ? 'bg-green-500 text-white' : ''}
                      ${currentStep === step.id ? 'bg-indigo-600 text-white' : ''}
                      ${!step.completed && currentStep !== step.id ? 'bg-gray-200 text-gray-600' : ''}
                    `}
                  >
                    {step.completed ? <CheckCircle className="h-5 w-5" /> : index + 1}
                  </div>
                  <span
                    className={`
                      text-sm font-medium
                      ${currentStep === step.id ? 'text-indigo-600' : 'text-gray-600'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
          {currentStep !== 'upload' && (
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              처음부터 다시
            </button>
          )}
        </div>

        {currentStep === 'upload' && (
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
              <ExcelUpload onUpload={handleUpload} title="클릭하거나 파일을 드래그하세요" />
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
        )}

        {currentStep === 'columnMapping' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">컬럼 매핑 확인</h2>
              <div className="text-sm text-gray-600">
                {rowCount}개 행 • {headers.length}개 컬럼
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                AI가 자동으로 컬럼을 매핑했습니다. 필요한 경우 컬럼을 직접 선택하여 수정할 수 있습니다.
                필수 필드: <span className="font-bold">주문번호, SKU, 수량</span>
                <br />
                <span className="text-xs text-blue-600">SKU 컬럼을 변경하면 제품 매핑이 다시 진행됩니다.</span>
              </p>
            </div>

            <div className="grid gap-4">
              {OUTBOUND_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700">
                    {field}
                  </div>
                  <select
                    value={columnMapping[field] || ''}
                    onChange={(e) => handleColumnMappingChange(field, e.target.value || null)}
                    disabled={isProcessing}
                    className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">선택 안 함</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  {columnMappingResult?.mapping?.[field]?.confidence && (
                    <span className="text-xs text-gray-500 w-16">
                      {(columnMappingResult.mapping[field].confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">데이터 미리보기 (상위 3행)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.slice(0, 6).map((header) => (
                        <th key={header} className="px-3 py-2 border text-left font-medium text-gray-600">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {headers.slice(0, 6).map((header) => (
                          <td key={header} className="px-3 py-2 border">
                            {String(row[header] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleColumnMappingNext}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'productMapping' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">제품 매핑 확인</h2>
              <div className="text-sm text-gray-600">
                필수 단계 - 모든 항목이 매핑되어야 합니다
              </div>
            </div>

            {productMappingStats.needsReview > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">검토가 필요한 항목이 있습니다</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {productMappingStats.needsReview}개 항목의 매핑을 확인하고 필요한 경우 수정하세요.
                  </p>
                </div>
              </div>
            )}

            <MappingPreview
              results={productMappingData}
              totalItems={productMappingStats.totalItems}
              matchedItems={productMappingStats.matchedItems}
              needsReview={productMappingStats.needsReview}
              products={products}
              onMappingChange={handleProductMappingChange}
              isProcessing={isProcessing}
            />

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2 border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </button>
              <button
                onClick={handleCalculate}
                disabled={isProcessing || productMappingData.some((r) => !r.matchedProduct)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    계산 중...
                  </>
                ) : (
                  <>
                    계산하기
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">계산 결과</h2>
              <button
                onClick={handleRecalculate}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                재계산
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="font-semibold text-lg">전체 주문</h3>
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">{packingResults.length}</div>
              </div>

              <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                <div className="flex flex-row items-center justify-between pb-2">
                  <h3 className="font-semibold text-lg">전체 CBM</h3>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">
                  {packingResults.reduce((sum, r) => sum + r.totalCBM, 0).toFixed(4)}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {packingResults.map((result, index) => (
                <PackingResult key={`${result.orderId}-${index}`} result={result} />
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2 border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </button>
              <button
                onClick={handleBackToDashboard}
                className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                완료
                <CheckCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
