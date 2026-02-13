import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { api } from '@/lib/api';
import { PackingRecommendation, Product, Outbound } from '@wms/types';
import { FileText, Loader2, Package, Search, X, Info, Printer } from 'lucide-react';

interface GuideItem extends Outbound {
  product?: Product;
  recommendedBox: string;
}

const OutboundGuide: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { products, fetchProducts, fetchOutbounds, outbounds } = useApp();
  const [recommendation, setRecommendation] = useState<PackingRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<GuideItem | null>(null);

  // Fetch all necessary data
  useEffect(() => {
    if (projectId) {
      const loadData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            fetchProducts(projectId),
            fetchOutbounds(projectId),
          ]);
          const res = await api.packing.calculate(projectId);
          setRecommendation(res);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [projectId]);

  const currentProducts = products[projectId || ''] || [];
  const currentOutbounds = outbounds[projectId || ''] || [];

  // Map product details to outbounds
  const guideData = currentOutbounds.map(o => {
    const product = currentProducts.find(p => p.sku === o.sku);
    // Find packing info for this SKU
    let recommendedBox = 'N/A';
    if (recommendation) {
      // Find which box contains this SKU
      // iterate groups -> boxes -> packedSKUs
      outerLoop:
      for (const group of recommendation.groups) {
        for (const box of group.boxes) {
          if (box.packedSKUs.some(s => s.skuId === product?.id)) {
              recommendedBox = box.box.name;
              break outerLoop;
          }
        }
      }
    }

    return {
      ...o,
      product,
      recommendedBox
    };
  }).filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative print:space-y-0 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outbound Guide</h1>
          <p className="text-muted-foreground">Unified view for packaging and shipping instructions.</p>
        </div>
        <div className="relative print:hidden">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
                type="text"
                placeholder="Search SKU or Name..."
                className="pl-10 pr-4 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button
          onClick={() => window.print()}
          className="ml-3 inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 print:hidden"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-16">No.</th>
                <th className="px-4 py-3">Product Info</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Requirements</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Rec. Box</th>
                <th className="px-4 py-3 w-1/4">Remarks</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guideData.map((item, index) => (
                <tr
                  key={`${item.id}-${index}`}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-4 py-4 text-center text-gray-500">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-900">{item.product?.name || 'Unknown Product'}</div>
                    <div className="text-xs font-mono text-gray-500 mt-1">{item.sku}</div>
                    {item.product && (
                        <div className="text-xs text-gray-400 mt-0.5">
                            {item.product.length}x{item.product.width}x{item.product.height}cm / {item.product.weight}kg
                        </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center h-8 w-12 bg-indigo-100 text-indigo-700 font-bold text-lg rounded-md border border-indigo-200 shadow-sm">
                        [{item.quantity}]
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                        {item.product?.barcode && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 w-fit">
                                Barcode Required
                            </span>
                        )}
                        {item.product?.aircap && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 w-fit">
                                Aircap Required
                            </span>
                        )}
                        {!item.product?.barcode && !item.product?.aircap && (
                            <span className="text-gray-400 text-xs">-</span>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    <div className="flex flex-col gap-1">
                        <div>In: <span className="text-gray-700">{item.product?.inboundDate ? new Date(item.product.inboundDate).toLocaleDateString() : '-'}</span></div>
                        <div>Out: <span className="text-gray-700">{item.product?.outboundDate ? new Date(item.product.outboundDate).toLocaleDateString() : '-'}</span></div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-500" />
                        <span className="font-bold text-gray-700">{item.recommendedBox}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 bg-gray-50/50 rounded-sm m-1">
                    {item.product?.remarks || '-'}
                  </td>
                  <td className="px-4 py-4 text-center">
                     <Info className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
              {guideData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>No outbound data found for this project.</p>
                    <p className="text-xs mt-1">Upload outbound orders to see the guide.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Item Detail</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-4 items-start">
                 <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-10 w-10 text-gray-400" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedItem.product?.name}</h3>
                    <p className="text-sm font-mono text-gray-500 mt-1">{selectedItem.sku}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 border-b pb-2">Packing Info</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-gray-500">Dimensions</span>
                            <span className="font-medium">
                                {selectedItem.product?.length}x{selectedItem.product?.width}x{selectedItem.product?.height} cm
                            </span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Weight</span>
                            <span className="font-medium">{selectedItem.product?.weight} kg</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Recommended Box</span>
                            <span className="font-bold text-orange-600">{selectedItem.recommendedBox}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500">Quantity to Pack</span>
                            <span className="font-bold text-indigo-600 text-lg">[{selectedItem.quantity}]</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 border-b pb-2">Requirements</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Barcode Label</span>
                            {selectedItem.product?.barcode ? (
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">REQUIRED</span>
                            ) : (
                                <span className="text-xs text-gray-400">Not required</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Aircap / Bubble Wrap</span>
                            {selectedItem.product?.aircap ? (
                                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">REQUIRED</span>
                            ) : (
                                <span className="text-xs text-gray-400">Not required</span>
                            )}
                        </div>
                    </div>
                </div>
              </div>

              <div>
                 <h4 className="font-semibold text-gray-900 border-b pb-2 mb-3">Schedule & Remarks</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                        <span className="block text-gray-500">Inbound Date</span>
                        <span>{selectedItem.product?.inboundDate ? new Date(selectedItem.product.inboundDate).toLocaleDateString() : '-'}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500">Outbound Date</span>
                        <span>{selectedItem.product?.outboundDate ? new Date(selectedItem.product.outboundDate).toLocaleDateString() : '-'}</span>
                    </div>
                 </div>
                 <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                    <span className="block text-xs font-bold text-yellow-800 uppercase mb-1">Special Remarks</span>
                    <p className="text-sm text-gray-800">{selectedItem.product?.remarks || 'No special remarks.'}</p>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboundGuide;
