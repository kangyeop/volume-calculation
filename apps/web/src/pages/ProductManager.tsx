import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts, useCreateProducts } from '@/hooks/queries';
import { useUploadParse, useUploadConfirm } from '@/hooks/queries';
import { ExcelUpload } from '@/components/ExcelUpload';
import { MappingConfirmation } from '@/components/upload/MappingConfirmation';
import { Product } from '@wms/types';
import { AlertCircle, Loader2 } from 'lucide-react';

export const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts(projectId || '');
  const createProducts = useCreateProducts(projectId || '');
  const uploadParse = useUploadParse();
  const uploadConfirm = useUploadConfirm();
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const excelDateToISOString = (serial: string | number | undefined | null): string | undefined => {
    if (!serial) return undefined;
    if (typeof serial === 'string' && serial.includes('-')) return serial;
    if (typeof serial === 'number') {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return undefined;
  };

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    setUploadFile(file);
    setIsUploading(true);
    setErrors([]);

    try {
      // AI로 엑셀 파일 파싱
      const response = await uploadParse.mutateAsync({
        file,
        type: 'product',
        projectId: projectId,
      });

      if (response.success) {
        setUploadSession(response.data);
        setShowMappingUI(true);
      }
    } catch (error) {
      console.error('AI parsing failed:', error);
      // AI 실패 시 기존 방식으로 폴백
      await fallbackUpload(file);
    }
  };

  const fallbackUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = (window as any).XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = (window as any).XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

        if (rawData.length > 0) {
          // 헤더가 3행 뒤에 있다고 가정 (headerKey="상품명")
          let headerRow = 2;
          const dataRows = rawData.slice(headerRow).map(row => {
            const item: Record<string, unknown> = {};
            const headers = rawData[headerRow] as string[];
            headers.forEach((header, index) => {
              item[header] = (row as any[])[index];
            });
            return item;
          }) as Record<string, unknown>[];

          await processWithHardcodedMapping(dataRows);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Fallback upload failed:', error);
      setErrors(['파일 처리 중 오류가 발생했습니다.']);
    } finally {
      setIsUploading(false);
    }
  };

  const processWithHardcodedMapping = async (rawData: Record<string, unknown>[]) => {
    const newErrors: string[] = [];
    const validData: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

    try {
      rawData.forEach((item, index) => {
        const rowNum = index + 1;
        const productName = String(item['상품명'] || item.name || '').trim();

        if (!productName) {
          return;
        }

        let width = 0;
        let length = 0;
        let height = 0;

        const findValue = (keys: string[]) => {
          for (const key of keys) {
            if (
              item[key] !== undefined &&
              item[key] !== null &&
              String(item[key]).trim() !== ''
            ) {
              return item[key];
            }
          }
          return undefined;
        };

        const wVal = findValue(['가로', 'width', 'Width', 'W', 'w']);
        const lVal = findValue([
          '세로',
          'length',
          'Length',
          'L',
          'l',
          'depth',
          'Depth',
          'D',
          'd',
        ]);
        const hVal = findValue(['높이', 'height', 'Height', 'H', 'h']);
        const weightVal = findValue(['무게', 'weight', 'Weight', 'Kg', 'kg', 'KG']);

        if (wVal) width = parseFloat(String(wVal));
        if (lVal) length = parseFloat(String(lVal));
        if (hVal) height = parseFloat(String(hVal));
        let weight = 0;
        if (weightVal) weight = parseFloat(String(weightVal));

        const volumeStr = String(item['체적정보'] || '');
        if ((!width || !length || !height) && volumeStr) {
          const widthMatch = volumeStr.match(/(?:가로|Width|W)\s*[:-]?\s*(\d+(\.\d+)?)/i);
          const lengthMatch = volumeStr.match(
            /(?:세로|Length|L|Depth|D)\s*[:-]?\s*(\d+(\.\d+)?)/i,
          );
          const heightMatch = volumeStr.match(/(?:높이|Height|H)\s*[:-]?\s*(\d+(\.\d+)?)/i);

          if (!width && widthMatch) width = parseFloat(widthMatch[1]);
          if (!length && lengthMatch) length = parseFloat(lengthMatch[1]);
          if (!height && heightMatch) height = parseFloat(heightMatch[1]);

          if (!width && !length && !height) {
            const dimensions = volumeStr.match(
              /(\d+(\.\d+)?)\s*[*xX]\s*(\d+(\.\d+)?)\s*[*xX]\s*(\d+(\.\d+)?)/,
            );
            if (dimensions) {
              width = parseFloat(dimensions[1]);
              length = parseFloat(dimensions[3]);
              height = parseFloat(dimensions[5]);
            }
          }
        }

        const missingFields = [];
        if (!width || width <= 0) missingFields.push('Width (가로)');
        if (!length || length <= 0) missingFields.push('Length (세로)');
        if (!height || height <= 0) missingFields.push('Height (높이)');

        if (missingFields.length > 0) {
          newErrors.push(
            `Row ${rowNum} (${productName}): Missing or invalid dimensions - ${missingFields.join(', ')}`,
          );
        } else {
          validData.push({
            sku: productName,
            name: productName,
            width,
            length,
            height,
            weight: weight || 0,

            inboundDate: excelDateToISOString(
              (item['입고일'] as string | number | undefined) ??
                (item.inboundDate as string | number | undefined),
            ),
            outboundDate: excelDateToISOString(
              (item['출고일'] as string | number | undefined) ??
                (item.outboundDate as string | number | undefined),
            ),

            barcode: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(
              String(item['바코드'] || item.barcode).toLowerCase(),
            ),
            aircap: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(
              String(item['에어캡'] || item.aircap).toLowerCase(),
            ),

            remarks: (item['비고'] || item.remarks) as string | undefined,
          });
        }
      });

      if (newErrors.length > 0) {
        setErrors(newErrors);
        return;
      }

      if (validData.length > 0) {
        await createProducts.mutateAsync(validData);
        alert(`Successfully imported ${validData.length} products.`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload products. Please check the console for details.');
    }
  };

  const handleAIConfirm = async (mapping: Record<string, string | null>) => {
    if (!uploadSession || !projectId) return;

    try {
      await uploadConfirm.mutateAsync({
        sessionId: uploadSession.sessionId,
        mapping,
      });

      // 성공 시 알림 표시
      alert(`Successfully imported products.`);
      setShowMappingUI(false);
      setUploadSession(null);
    } catch (error) {
      console.error('Failed to confirm mapping:', error);
      setErrors(['매핑 확인 중 오류가 발생했습니다.']);
    }
  };

  const handleFallback = async () => {
    if (uploadFile) {
      setShowMappingUI(false);
      await fallbackUpload(uploadFile);
    }
  };

  const handleCancelMapping = () => {
    setShowMappingUI(false);
    setUploadSession(null);
    setUploadFile(null);
    setIsUploading(false);
  };

  const currentProducts = products || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory for this project.</p>
        </div>
      </div>

      {showMappingUI && uploadSession && (
        <div className="max-w-6xl mx-auto py-8 animate-in zoom-in-95 duration-300">
          <MappingConfirmation
            type="product"
            sessionId={uploadSession.sessionId}
            headers={uploadSession.headers}
            mapping={uploadSession.mapping}
            sampleRows={uploadSession.sampleRows}
            onConfirm={handleAIConfirm}
            onFallback={handleFallback}
            onCancel={handleCancelMapping}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {isUploading && !showMappingUI ? (
            <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {uploadParse.isPending ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : (
                    <div className="text-blue-600 font-bold">XLS</div>
                  )}
                </div>
                <h2 className="text-xl font-bold">Import Products</h2>
                <p className="text-muted-foreground text-sm">
                  Upload your Excel file containing product information.
                </p>
              </div>

              <ExcelUpload<Record<string, unknown>>
                onUpload={handleUpload}
                title="Click or drag Excel file here"
                headerRow={2}
                headerKey="상품명"
              />

              {uploadParse.isError && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>AI 분석 실패</span>
                  </div>
                  <p className="text-sm text-yellow-600">
                    AI가 파일을 분석하지 못했습니다. 파일을 다시 시도하거나 기존 방식으로 업로드하세요.
                  </p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>Validation Errors ({errors.length})</span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                    {errors.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="opacity-50">•</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <ExcelUpload<Record<string, unknown>>
              onUpload={handleUpload}
              title="Import Products via Excel"
              headerRow={2}
              headerKey="상품명"
            />
          )}

          {!isUploading && errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors ({errors.length})</span>
              </div>
              <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="opacity-50">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
            <h4 className="font-bold mb-1">Expected Format:</h4>
            <ul className="list-disc ml-4 space-y-1">
              <li>sku (String)</li>
              <li>name (String)</li>
              <li>width, length, height (cm)</li>
              <li>weight (kg)</li>
              <li>inboundDate, outboundDate (YYYY-MM-DD)</li>
              <li>barcode, aircap (O/X)</li>
              <li>remarks (String)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">In/Out</th>
                  <th className="px-4 py-3">Reqs</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentProducts.map((p, i) => (
                  <tr key={`${p.sku}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono">{p.sku}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.width}x{p.length}x{p.height}
                      <div className="text-xs text-gray-400">{p.weight}kg</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>
                        In: {p.inboundDate ? new Date(p.inboundDate).toLocaleDateString() : '-'}
                      </div>
                      <div>
                        Out: {p.outboundDate ? new Date(p.outboundDate).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        {p.barcode && (
                          <span className="bg-blue-100 text-blue-800 px-1 rounded w-fit">
                            Barcode
                          </span>
                        )}
                        {p.aircap && (
                          <span className="bg-purple-100 text-purple-800 px-1 rounded w-fit">
                            Aircap
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]"
                      title={p.remarks}
                    >
                      {p.remarks}
                    </td>
                  </tr>
                ))}
                {currentProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No products imported yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
