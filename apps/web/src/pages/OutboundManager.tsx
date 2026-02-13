import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import ExcelUpload from '@/components/ExcelUpload';
import { Outbound } from '@wms/types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const OutboundManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, outbounds, fetchProducts, fetchOutbounds, createOutbound } = useApp();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (projectId) {
      fetchProducts(projectId);
      fetchOutbounds(projectId);
    }
  }, [projectId]);

  const currentOutbound = outbounds[projectId || ''] || [];
  const currentProducts = products[projectId || ''] || [];
  const productSkus = new Set(currentProducts.map((p) => p.sku));

  const handleUpload = async (data: Outbound[]) => {
    if (!projectId) return;

    const newErrors: string[] = [];
    const validData: any[] = [];

    data.forEach((item, index) => {
      if (!productSkus.has(item.sku)) {
        newErrors.push(`Row ${index + 1}: SKU "${item.sku}" does not exist in the product list.`);
      } else {
        validData.push(item);
      }
    });

    setErrors(newErrors);

    if (validData.length > 0) {
      try {
        await createOutbound(projectId, validData);
      } catch (err) {
        // Error handled in context
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outbound Orders</h1>
          <p className="text-muted-foreground">Import and manage outbound shipping orders.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <ExcelUpload<Outbound>
            onUpload={handleUpload}
            title="Import Outbound via Excel"
          />

          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors</span>
              </div>
              <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-red-500 italic">
                * Only valid rows were imported.
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
            <h4 className="font-bold mb-1">Expected Format:</h4>
            <ul className="list-disc ml-4 space-y-1">
              <li>order_id (String)</li>
              <li>sku (String)</li>
              <li>quantity (Number)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentOutbound.map((o, i) => (
                <tr key={`${o.orderId}-${i}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{o.orderId}</td>
                  <td className="px-4 py-3 font-mono">{o.sku}</td>
                  <td className="px-4 py-3">{o.quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Validated
                    </div>
                  </td>
                </tr>
              ))}
              {currentOutbound.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    No outbound orders imported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutboundManager;
