import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts, useDeleteProducts } from '@/hooks/queries';
import { useProductUpload } from '@/hooks/useProductUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts(projectId || '');
  const uploadState = useProductUpload(projectId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const deleteProducts = useDeleteProducts(projectId || '');

  const currentProducts = products || [];

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    uploadState.setUploadFile(file);
    uploadState.setUploading(true);
    uploadState.setErrors([]);
    setIsProcessing(true);

    try {
      const parseResult = await api.productUpload.parse(file, projectId);

      toast.info('AI 분석 완료', {
        description: `${parseResult.rowCount}개의 행을 분석했습니다. 상품을 등록 중...`,
      });

      const result = await api.productUpload.confirm(
        projectId,
        parseResult.rows,
        parseResult.mapping,
      );

      toast.success('가져오기 완료', {
        description: `${result.imported}개의 상품이 등록되었습니다.`,
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error) {
      console.error('AI product parsing failed, trying hardcoded mapping:', error);
      try {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        await uploadState.processWithHardcodedMapping(rawData);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        uploadState.setErrors(['파일 처리에 실패했습니다.']);
      }
    } finally {
      setIsProcessing(false);
      uploadState.setUploading(false);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === currentProducts.length && currentProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentProducts.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    await deleteProducts.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast.success('삭제 완료', { description: '선택한 상품이 삭제되었습니다.' });
  };

  const handleDeleteAll = async () => {
    await deleteProducts.mutateAsync(currentProducts.map((p) => p.id));
    setSelectedIds(new Set());
    toast.success('삭제 완료', { description: '모든 상품이 삭제되었습니다.' });
  };

  const allSelected = currentProducts.length > 0 && selectedIds.size === currentProducts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < currentProducts.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory for this project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {(uploadState.isUploading || isProcessing) && !uploadState.showMappingUI ? (
            <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : (
                    <div className="text-blue-600 font-bold">XLS</div>
                  )}
                </div>
                <h2 className="text-xl font-bold">Import Products</h2>
                <p className="text-muted-foreground text-sm">
                  {isProcessing
                    ? 'Processing products...'
                    : 'Upload your Excel file containing product information.'}
                </p>
              </div>

              <ExcelUpload onUpload={handleUpload} title="Click or drag Excel file here" />

              {uploadState.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>Validation Errors ({uploadState.errors.length})</span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                    {uploadState.errors.map((err, i) => (
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
            <ExcelUpload onUpload={handleUpload} title="Import Products via Excel" />
          )}

          {!uploadState.isUploading && !isProcessing && uploadState.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors ({uploadState.errors.length})</span>
              </div>
              <ul className="text-xs text-red-600 space-y-2 max-h-60 overflow-y-auto">
                {uploadState.errors.map((err: string, i: number) => (
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
              <li>dimensions (예: 10*20*30 또는 10x20x30)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-b bg-gray-50">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleteProducts.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              선택 삭제
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={currentProducts.length === 0 || deleteProducts.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              전체 삭제
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleToggleAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Dimensions (W x L x H cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentProducts.map((p, i) => (
                  <tr key={`${p.sku}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => handleToggleRow(p.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">{p.sku}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.width} x {p.length} x {p.height}
                    </td>
                  </tr>
                ))}
                {currentProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
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
