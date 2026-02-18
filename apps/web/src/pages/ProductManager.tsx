import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ExcelUpload } from '@/components/ExcelUpload';
import { Product } from '@wms/types';
import { AlertCircle } from 'lucide-react';

export const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, fetchProducts, createProducts } = useApp();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (projectId) {
      fetchProducts(projectId);
    }
  }, [projectId, fetchProducts]);

  const currentProducts = products[projectId || ''] || [];

  const excelDateToISOString = (serial: string | number | undefined | null): string | undefined => {
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

  const handleUpload = async (rawData: Record<string, unknown>[]) => {
    if (projectId) {
      setErrors([]);
      const newErrors: string[] = [];
      const validData: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

      try {
        rawData.forEach((item, index) => {
          const rowNum = index + 1;
          const productName = String(item['상품명'] || item.name || '').trim();

          if (!productName) {
            // Skip empty rows
            return;
          }

          // Parse dimensions from format "가로30*세로37" or "가로10*세로10*높이32"
          let width = 0;
          let length = 0;
          let height = 0;

          // 1. Try explicit columns first (Korean/English)
          // Handle various possible column names
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

          // 2. If dimensions are missing, try parsing '체적정보'
          const volumeStr = String(item['체적정보'] || '');
          if ((!width || !length || !height) && volumeStr) {
            // Extract numbers for width (가로), length (세로), height (높이)
            // Support formats like: "가로30", "가로 30", "가로:30", "W30", "Width: 30"
            const widthMatch = volumeStr.match(/(?:가로|Width|W)\s*[:-]?\s*(\d+(\.\d+)?)/i);
            const lengthMatch = volumeStr.match(
              /(?:세로|Length|L|Depth|D)\s*[:-]?\s*(\d+(\.\d+)?)/i,
            );
            const heightMatch = volumeStr.match(/(?:높이|Height|H)\s*[:-]?\s*(\d+(\.\d+)?)/i);

            // Only overwrite if not already found from explicit columns
            if (!width && widthMatch) width = parseFloat(widthMatch[1]);
            if (!length && lengthMatch) length = parseFloat(lengthMatch[1]);
            if (!height && heightMatch) height = parseFloat(heightMatch[1]);

            // Fallback: if no labels found but string looks like "10*20*30" or "10x20x30"
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

          // Validation
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
              sku: productName, // Using name as SKU for now if SKU not explicit
              name: productName,
              width,
              length,
              height,
              weight: weight || 0,

              // Handle Dates - Convert to ISO string for backend validation
              inboundDate: excelDateToISOString(
                (item['입고일'] as string | number | undefined) ??
                  (item.inboundDate as string | number | undefined),
              ),
              outboundDate: excelDateToISOString(
                (item['출고일'] as string | number | undefined) ??
                  (item.outboundDate as string | number | undefined),
              ),

              // Handle Booleans (ㅇ/x mapping)
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
          await createProducts(projectId, validData);
          alert(`Successfully imported ${validData.length} products.`);
        }
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
          <ExcelUpload<Record<string, unknown>>
            onUpload={handleUpload}
            title="Import Products via Excel"
            headerRow={2}
            headerKey="상품명"
          />
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
