import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts, useOutbounds, useBatches, useCreateOutbounds } from '@/hooks/queries';
import { useUploadParse, useUploadConfirm } from '@/hooks/queries';
import { ExcelUpload } from '@/components/ExcelUpload';
import { MappingConfirmation } from '@/components/upload/MappingConfirmation';
import { Outbound } from '@wms/types';
import { AlertCircle, CheckCircle2, ChevronRight, Package, Calendar, List, Upload, ArrowLeft, Search, FileSpreadsheet, Loader2 } from 'lucide-react';

export const OutboundManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts(projectId || '');
  const { data: outbounds = [] } = useOutbounds(projectId || '');
  const { data: batches = [] } = useBatches(projectId || '');
  const createOutbound = useCreateOutbounds(projectId || '');
  const uploadParse = useUploadParse();
  const uploadConfirm = useUploadConfirm();

  const [errors, setErrors] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const currentBatches = batches.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const productSkus = new Set(products.map((p) => p.sku));

  const filteredBatches = currentBatches.filter(batch =>
    batch.batchName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBatch = currentBatches.find(b => b.batchId === selectedBatchId);

  const filteredOutbounds = selectedBatchId
    ? outbounds.filter(o => o.batchId === selectedBatchId)
    : [];

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    setUploadFile(file);
    setIsUploading(true);
    setErrors([]);

    try {
      // AI로 엑셀 파일 파싱
      const response = await uploadParse.mutateAsync({
        file,
        type: 'outbound',
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
          const headers = rawData[0] as string[];
          const data = rawData.slice(1).map(row => {
            const item: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              item[header] = (row as any[])[index];
            });
            return item;
          }) as Record<string, unknown>[];

          await processWithHardcodedMapping(data, file.name);
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

  const processWithHardcodedMapping = async (rawData: Record<string, unknown>[], fileName: string) => {
    const newErrors: string[] = [];
    const validData: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[] = [];

    rawData.forEach((item, index) => {
      const orderId = String(item['쇼핑몰주문번호'] || item.orderId || '').trim();
      const productName = String(item['주문서상품명'] || '').trim();
      let sku = String(item['연동코드'] || item['상품명 / 매핑수량'] || item.sku || '').trim();

      if (productName && productSkus.has(productName)) {
        sku = productName;
      }

      const quantity = Number(item['주문수량'] || item.quantity || 1);

      if (!orderId || !sku) {
         return;
      }

      if (!productSkus.has(sku)) {
        newErrors.push(`Row ${index + 1}: Product "${sku}" not found in registry.`);
      } else {
        validData.push({
          orderId,
          sku,
          quantity,
          batchName: fileName,
          recipientName: String(item['수취인'] || item.recipientName || '').trim(),
          recipientPhone: String(item['수취인연락처'] || item.recipientPhone || '').trim(),
          zipCode: String(item['우편번호'] || item.zipCode || '').trim(),
          address: String(item['주소'] || item.address || '').trim(),
          detailAddress: String(item['상세주소'] || item.detailAddress || '').trim(),
          shippingMemo: String(item['비고'] || item.shippingMemo || '').trim(),
        });
      }
    });

    setErrors(newErrors);

    if (validData.length > 0) {
      try {
        await createOutbound.mutateAsync(validData);
      } catch (err) {
        console.error('Failed to upload outbounds:', err);
      }
    }
  };

  const handleAIConfirm = async (mapping: Record<string, string | null>) => {
    if (!uploadSession || !projectId) return;

    try {
      await uploadConfirm.mutateAsync({
        sessionId: uploadSession.sessionId,
        mapping,
      });

      // 성공 시 배치 목록으로 이동
      setSelectedBatchId(uploadSession.sessionId);
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

  if (selectedBatchId && selectedBatch) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedBatchId(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedBatch.batchName}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {new Date(selectedBatch.createdAt).toLocaleString()} • {selectedBatch.count} items
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">SKU / Quantity</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOutbounds.map((o, i) => (
                  <tr key={`${o.orderId}-${i}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">{o.orderId}</td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-gray-900">{o.sku}</div>
                      <div className="text-xs text-gray-500">Qty: {o.quantity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{o.recipientName}</div>
                      <div className="text-xs text-gray-500">{o.recipientPhone}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="truncate text-gray-700" title={`${o.address} ${o.detailAddress || ''}`}>
                        {o.address} {o.detailAddress}
                      </div>
                      <div className="text-xs text-gray-400">{o.zipCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outbound Batches</h1>
          <p className="text-muted-foreground">Manage and track your Excel upload batches.</p>
        </div>
        <button
          onClick={() => setIsUploading(!isUploading)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isUploading
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
          }`}
        >
          {isUploading ? <ArrowLeft className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {isUploading ? 'Back to Batches' : 'Upload New Batch'}
        </button>
      </div>

      {showMappingUI && uploadSession && (
        <div className="max-w-6xl mx-auto py-8 animate-in zoom-in-95 duration-300">
          <MappingConfirmation
            type="outbound"
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

      {isUploading && !showMappingUI && (
        <div className="max-w-2xl mx-auto py-8 animate-in zoom-in-95 duration-300">
          <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {uploadParse.isPending ? (
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
                )}
              </div>
              <h2 className="text-xl font-bold">Import Outbound Orders</h2>
              <p className="text-muted-foreground text-sm">
                Upload your Excel file containing order information.
              </p>
            </div>

            <ExcelUpload<Record<string, unknown>>
              onUpload={handleUpload}
              title="Click or drag Excel file here"
              headerRow={0}
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <span>Validation Errors</span>
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
        </div>}
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search batches by name..."
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBatches.map((batch) => (
              <button
                key={batch.batchId}
                onClick={() => setSelectedBatchId(batch.batchId)}
                className="group text-left p-6 bg-white border rounded-xl hover:border-indigo-500 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-5 w-5 text-indigo-500" />
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <Package className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 truncate pr-4" title={batch.batchName}>
                      {batch.batchName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm font-semibold text-indigo-600">
                      {batch.count} Orders
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      View Details
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {filteredBatches.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 bg-gray-50 border-2 border-dashed rounded-xl">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <List className="h-8 w-8 text-gray-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-600">No batches found</p>
                  <p className="text-sm text-gray-400">
                    {searchTerm ? 'Try adjusting your search' : 'Upload your first Excel batch to get started'}
                  </p>
                </div>
                {!searchTerm && (
                  <button
                    onClick={() => setIsUploading(true)}
                    className="text-indigo-600 font-semibold text-sm hover:underline"
                  >
                    Upload now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
