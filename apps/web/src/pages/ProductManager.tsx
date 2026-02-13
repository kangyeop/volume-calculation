import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ExcelUpload } from '@/components/ExcelUpload';

export const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, fetchProducts, createProducts } = useApp();

  useEffect(() => {
    if (projectId) {
      fetchProducts(projectId);
    }
  }, [projectId]);

  const currentProducts = products[projectId || ''] || [];

  const excelDateToISOString = (serial: any): string | undefined => {
    if (!serial) return undefined;
    // If it's already a string looking like a date
    if (typeof serial === 'string' && serial.includes('-')) return serial;
    // If it's a number (Excel serial date)
    if (typeof serial === 'number') {
      // Excel base date: Dec 30, 1899
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return undefined;
  };

  const handleUpload = async (rawData: any[], _fileName: string) => {
    if (projectId) {
      try {
        const processedData = rawData.map((item) => {
          // Parse dimensions from format "가로30*세로37" or "가로10*세로10*높이32"
          let width = 0;
          let length = 0;
          let height = 0;

          const volumeStr = item['체적정보'] || '';
          if (volumeStr) {
            // Extract numbers for width (가로), length (세로), height (높이)
            const widthMatch = volumeStr.match(/가로(\d+(\.\d+)?)/);
            const lengthMatch = volumeStr.match(/세로(\d+(\.\d+)?)/);
            const heightMatch = volumeStr.match(/높이(\d+(\.\d+)?)/);

            if (widthMatch) width = parseFloat(widthMatch[1]);
            if (lengthMatch) length = parseFloat(lengthMatch[1]);
            if (heightMatch) height = parseFloat(heightMatch[1]);
          }

          return {
            sku: String(item['상품명'] || item.name || ''),
            name: String(item['상품명'] || item.name || ''),
            width: width || Number(item.width) || 0,
            length: length || Number(item.length) || 0,
            height: height || Number(item.height) || 1, // Default to 1 if height is missing (for flat items)
            weight: 0, // Weight is not in the excel, defaulting to 0

            // Handle Dates - Convert to ISO string for backend validation
            inboundDate: excelDateToISOString(item['입고일'] || item.inboundDate),
            outboundDate: excelDateToISOString(item['출고일'] || item.outboundDate),

            // Handle Booleans (ㅇ/x mapping)
            barcode: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(String(item['바코드'] || item.barcode).toLowerCase()),
            aircap: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(String(item['에어캡'] || item.aircap).toLowerCase()),

            remarks: item['비고'] || item.remarks,
          };
        });

        await createProducts(projectId, processedData);
      } catch (err) {
        // Error is handled in context
        console.error('Upload failed:', err);
        alert('Failed to upload products. Please checks the console for details.');
      }
    }
  };

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
          <ExcelUpload<any>
            onUpload={handleUpload}
            title="Import Products via Excel"
            headerRow={2}
          />
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
                      {p.length}x{p.width}x{p.height}
                      <div className="text-xs text-gray-400">{p.weight}kg</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                       <div>In: {p.inboundDate ? new Date(p.inboundDate).toLocaleDateString() : '-'}</div>
                       <div>Out: {p.outboundDate ? new Date(p.outboundDate).toLocaleDateString() : '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        {p.barcode && <span className="bg-blue-100 text-blue-800 px-1 rounded w-fit">Barcode</span>}
                        {p.aircap && <span className="bg-purple-100 text-purple-800 px-1 rounded w-fit">Aircap</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]" title={p.remarks}>
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

