import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/queries';
import { useUploadParse, useUploadConfirm } from '@/hooks/queries';
import { useProductUpload } from '@/hooks/useProductUpload';
import { ExcelUpload } from '@/components/ExcelUpload';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { ParseUploadData } from '@wms/types';

const PRODUCT_FIELDS = ['sku', 'name', 'dimensions'];

export const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts(projectId || '');
  const uploadParse = useUploadParse();
  const uploadConfirm = useUploadConfirm();
  const uploadState = useProductUpload(projectId || '');
  const [isAutoConfirming, setIsAutoConfirming] = useState(false);

  const handleUpload = async (file: File) => {
    if (!projectId) return;

    uploadState.setUploadFile(file);
    uploadState.setUploading(true);
    uploadState.setErrors([]);

    try {
      const response = await uploadParse.mutateAsync({
        file,
        type: 'product',
        projectId: projectId,
      });

      await autoConfirmProductMapping(response);
    } catch (error) {
      console.error('AI parsing failed:', error);
      await uploadState.fallbackUpload(file);
    }
  };

  const autoConfirmProductMapping = async (uploadSession: ParseUploadData) => {
    setIsAutoConfirming(true);
    uploadState.setShowMappingUI(true);

    try {
      const mapping: Record<string, string | null> = {};

      PRODUCT_FIELDS.forEach((field) => {
        const fieldMapping = uploadSession.mapping.mapping[field];
        mapping[field] = fieldMapping?.columnName || null;
      });

      await uploadConfirm.mutateAsync({
        sessionId: uploadSession.sessionId,
        mapping,
      });

      toast.success('가져오기 완료', { description: '상품이 성공적으로 등록되었습니다.' });
      uploadState.setShowMappingUI(false);
      uploadState.setUploadSession(null);
    } catch (error) {
      console.error('Failed to auto-confirm mapping:', error);
      uploadState.setErrors(['매핑 확인 중 오류가 발생했습니다.']);
    } finally {
      setIsAutoConfirming(false);
      uploadState.setUploading(false);
    }
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {(uploadState.isUploading || isAutoConfirming) && !uploadState.showMappingUI ? (
            <div className="bg-white border rounded-xl p-8 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(uploadParse.isPending || isAutoConfirming) ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : (
                    <div className="text-blue-600 font-bold">XLS</div>
                  )}
                </div>
                <h2 className="text-xl font-bold">Import Products</h2>
                <p className="text-muted-foreground text-sm">
                  {isAutoConfirming ? 'Processing products...' : 'Upload your Excel file containing product information.'}
                </p>
              </div>

              <ExcelUpload
                onUpload={handleUpload}
                title="Click or drag Excel file here"
              />

              {uploadParse.isError && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <span>AI 분석 실패</span>
                  </div>
                  <p className="text-sm text-yellow-600">
                    AI가 파일을 분석하지 못했습니다. 파일을 다시 시도하거나 기존 방식으로
                    업로드하세요.
                  </p>
                </div>
              )}

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
            <ExcelUpload
              onUpload={handleUpload}
              title="Import Products via Excel"
            />
          )}

          {!uploadState.isUploading && !isAutoConfirming && uploadState.errors.length > 0 && (
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Dimensions (W x L x H cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentProducts.map((p, i) => (
                  <tr key={`${p.sku}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono">{p.sku}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.width} x {p.length} x {p.height}
                    </td>
                  </tr>
                ))}
                {currentProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-400">
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
