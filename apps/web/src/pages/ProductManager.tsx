import React from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import ExcelUpload from '@/components/ExcelUpload';
import { Product } from '@wms/types';

const ProductManager: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, setProducts } = useApp();

  const currentProducts = products[projectId || ''] || [];

  const handleUpload = (data: Product[]) => {
    if (projectId) {
      setProducts(projectId, data);
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
          <ExcelUpload<Product>
            onUpload={handleUpload}
            title="Import Products via Excel"
          />
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
            <h4 className="font-bold mb-1">Expected Format:</h4>
            <ul className="list-disc ml-4 space-y-1">
              <li>sku (String)</li>
              <li>name (String)</li>
              <li>width (Number - cm)</li>
              <li>length (Number - cm)</li>
              <li>height (Number - cm)</li>
              <li>weight (Number - kg)</li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Dimensions (L*W*H)</th>
                <th className="px-4 py-3">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentProducts.map((p, i) => (
                <tr key={`${p.sku}-${i}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono">{p.sku}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.length} x {p.width} x {p.height} cm
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.weight} kg</td>
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
  );
};

export default ProductManager;
