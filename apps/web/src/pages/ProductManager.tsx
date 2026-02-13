import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import ExcelUpload from '@/components/ExcelUpload';

const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, fetchProducts, createProducts } = useApp();

  useEffect(() => {
    if (projectId) {
      fetchProducts(projectId);
    }
  }, [projectId]);

  const currentProducts = products[projectId || ''] || [];

  const handleUpload = async (rawData: any[]) => {
    if (projectId) {
      try {
        const processedData = rawData.map((item) => ({
          sku: item.sku ? String(item.sku) : '',
          name: item.name,
          width: Number(item.width),
          length: Number(item.length),
          height: Number(item.height),
          weight: Number(item.weight),
          // Handle Date fields (assuming standard formats or strings)
          inboundDate: item.inboundDate,
          outboundDate: item.outboundDate,
          // Handle Boolean fields (support "O", "X", "TRUE", "FALSE", etc.)
          barcode: ['o', 'true', 'yes', 'y'].includes(String(item.barcode).toLowerCase()),
          aircap: ['o', 'true', 'yes', 'y'].includes(String(item.aircap).toLowerCase()),
          remarks: item.remarks,
        }));

        await createProducts(projectId, processedData);
      } catch (err) {
        // Error is handled in context
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

export default ProductManager;
