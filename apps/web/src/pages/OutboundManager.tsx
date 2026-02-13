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

  const handleUpload = async (rawData: any[]) => {
    if (!projectId) return;

    const newErrors: string[] = [];
    const validData: any[] = [];

    rawData.forEach((item, index) => {
      // Map Excel columns to DTO fields
      const orderId = String(item['쇼핑몰 주문번호'] || item.orderId || '').trim();

      // Handle SKU mapping (연동코드)
      // Some SKUs might be multiline like "(V_01084)\n(V_01085)"
      // We need to handle this if we want to support split rows,
      // but current backend bulk create likely expects one SKU per object.
      // For now, let's take the first one or assume single SKU if simple mapping.
      // Actually, the excel data showed simple mapping in most rows but one row had multiline.
      // Let's clean the SKU.
      let sku = String(item['연동코드'] || item['상품명 / 매핑수량'] || item.sku || '').trim();

      // If SKU contains parenthesis like (V_01084), we might want to strip them if the system uses clean SKUs
      // But looking at product list, product names are "이로_ 25생일_티셔츠" etc.
      // The order list has '연동코드' like (V_01084).
      // If the product registration uses product names as SKU (as we did in ProductManager),
      // then we have a mismatch. The user said "use Name as SKU" for products.
      // But orders use '연동코드' or '주문서 상품명'.
      // Let's try to map '주문서 상품명' to SKU first as that matches Product Name better

      const productName = String(item['주문서 상품명'] || '').trim();
      if (productName && productSkus.has(productName)) {
        sku = productName;
      } else {
        // Fallback to whatever else is there, but it might fail validation
      }

      const quantity = Number(item['주문수량'] || item.quantity || 1);

      if (!orderId || !sku) {
         // Skip empty rows
         return;
      }

      if (!productSkus.has(sku)) {
        newErrors.push(`Row ${index + 1}: Product "${sku}" not found in registry.`);
      } else {
        validData.push({
          orderId,
          sku,
          quantity,
          projectId,
          // Add shipping info
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
            headerRow={0}
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
              <li>order_id (쇼핑몰 주문번호)</li>
              <li>sku (연동코드 or 주문서 상품명)</li>
              <li>quantity (주문수량)</li>
              <li>recipientName (수취인)</li>
              <li>zipCode (우편번호)</li>
              <li>address (주소)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentOutbound.map((o, i) => (
                  <tr key={`${o.orderId}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{o.orderId}</td>
                    <td className="px-4 py-3 font-mono">{o.sku} <span className="text-gray-400 text-xs">x{o.quantity}</span></td>
                    <td className="px-4 py-3">{o.recipientName}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]" title={`${o.address} ${o.detailAddress || ''}`}>
                      {o.address} {o.detailAddress}
                    </td>
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
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      No outbound orders imported yet.
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

export default OutboundManager;
