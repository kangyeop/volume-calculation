import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts, useOutbounds, useCreateOutbounds, useDeleteOutbounds } from '@/hooks/queries';
import { ExcelUpload } from '@/components/ExcelUpload';
import { Outbound } from '@wms/types';
import { Trash2, Package, Search, Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const OutboundManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts(projectId || '');
  const { data: outbounds = [] } = useOutbounds(projectId || '');
  const createOutbounds = useCreateOutbounds(projectId || '');
  const deleteOutbounds = useDeleteOutbounds(projectId || '');

  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const productSkus = products.map((p) => p.sku);

  const filteredOutbounds = outbounds.filter(
    (o) =>
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result as ArrayBuffer;
        const XLSX = (window as unknown as { XLSX: { read: any; utils: { sheet_to_json: any } } }).XLSX;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

        if (rawData.length > 0) {
          const headers = rawData[0] as string[];
          const data = rawData.slice(1).map((row) => {
            const item: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              item[header] = (row as unknown[])[index];
            });
            return item;
          }) as Record<string, unknown>[];

          await processExcelData(data);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const processExcelData = async (rawData: Record<string, unknown>[]) => {
    const errors: string[] = [];
    const validData: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[] = [];

    rawData.forEach((item, index) => {
      const orderId = String(item['쇼핑몰주문번호'] || item.orderId || '').trim();
      const productName = String(item['주문서상품명'] || '').trim();
      let sku = String(item['연동코드'] || item['상품명 / 매핑수량'] || item.sku || '').trim();

      if (productName && productSkus.includes(productName)) {
        sku = productName;
      }

      const quantity = Number(item['주문수량'] || item.quantity || 1);

      if (!orderId || !sku) return;

      if (!productSkus.includes(sku)) {
        errors.push(`Row ${index + 1}: SKU "${sku}" not found`);
      } else {
        validData.push({
          orderId,
          sku,
          quantity,
          recipientName: String(item['수취인'] || item.recipientName || '').trim(),
        });
      }
    });

    if (errors.length > 0) {
      toast.error(`${errors.length}개의 행에서 오류 발생`);
      console.error('Validation errors:', errors);
    }

    if (validData.length > 0) {
      try {
        await createOutbounds.mutateAsync(validData);
        toast.success(`${validData.length}건 등록 완료`);
        setShowUpload(false);
      } catch (err) {
        toast.error('등록에 실패했습니다.');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!projectId) return;
    if (!confirm('모든 출고 데이터를 삭제하시겠습니까?')) return;

    try {
      await deleteOutbounds.mutateAsync();
      toast.success('삭제되었습니다.');
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpload(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">엑셀 업로드</h1>
            <p className="text-muted-foreground">Excel 파일로 출고 데이터를 일괄 등록합니다.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold">엑셀 파일 업로드</h2>
              <p className="text-muted-foreground text-sm">
                주문번호, SKU, 수량이 포함된 Excel 파일을 업로드하세요.
              </p>
            </div>

            <ExcelUpload onUpload={handleUpload} title="클릭하거나 파일을 드래그하세요" />

            {isUploading && (
              <div className="text-center text-sm text-gray-500">처리 중...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">출고 등록</h1>
          <p className="text-muted-foreground">CBM 계산을 위한 출고 데이터 ({outbounds.length}건)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            엑셀 업로드
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={outbounds.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            전체 삭제
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">등록된 출고</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">주문번호</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">수량</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">수취인</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOutbounds.map((o, i) => (
                  <tr key={o.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-600">{o.orderId}</td>
                    <td className="px-4 py-3 font-mono">{o.sku}</td>
                    <td className="px-4 py-3 text-right">{o.quantity}</td>
                    <td className="px-4 py-3">{o.recipientName || '-'}</td>
                  </tr>
                ))}
                {filteredOutbounds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      {searchTerm ? '검색 결과가 없습니다.' : '엑셀 파일을 업로드하세요.'}
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
