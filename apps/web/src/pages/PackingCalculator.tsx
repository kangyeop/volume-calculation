import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Package, History } from 'lucide-react';
import { api } from '@/lib/api';
import { PackingRecommendation, PackingResult } from '@wms/types';

const PackingCalculator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingRecommendation | null>(null);
  const [history, setHistory] = useState<PackingResult[]>([]);

  useEffect(() => {
    if (id) {
      loadHistory();
    }
  }, [id]);

  const loadHistory = async () => {
    try {
      const data = await api.packing.history(id!);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleCalculate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.packing.calculate(id);
      setResult(data);
      loadHistory();
    } catch (error) {
      console.error('Calculation failed:', error);
      alert('Failed to calculate packing. Please ensure products and outbound orders are registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packing / CBM Calculator</h1>
          <p className="text-muted-foreground">Calculate the optimal box configuration for your outbound orders.</p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {loading ? 'Calculating...' : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Packing
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between pb-2">
                <h3 className="font-semibold text-lg">Total Volume</h3>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold">{result.totalCBM.toFixed(4)} CBM</div>
                <p className="text-sm text-muted-foreground">Combined volume of all boxes</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between pb-2">
                <h3 className="font-semibold text-lg">Packing Efficiency</h3>
                <div className="text-lg font-bold">{(result.totalEfficiency * 100).toFixed(1)}%</div>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden bg-gray-100">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${result.totalEfficiency * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-right">Volume utilization</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recommended Boxes</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.boxes.map((boxGroup, idx) => (
                <div key={idx} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{boxGroup.box.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {boxGroup.box.length} x {boxGroup.box.width} x {boxGroup.box.height} cm
                      </p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100">
                      x{boxGroup.count}
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider border-b pb-1">Contents per box</p>
                    <ul className="space-y-2 text-sm overflow-y-auto max-h-40 pr-1">
                      {boxGroup.packedSKUs.map((sku, sIdx) => (
                        <li key={sIdx} className="flex justify-between items-center group">
                          <span className="truncate mr-2 font-mono text-gray-700 group-hover:text-indigo-600 transition-colors" title={sku.skuId}>
                            {sku.skuId}
                          </span>
                          <span className="font-medium whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600">
                            qty: {sku.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && !result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Results
          </h2>
          <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Box Type</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Efficiency</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Total CBM</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Packed Count</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{item.boxName}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.efficiency > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {(item.efficiency * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">{item.totalCBM.toFixed(4)}</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">{item.packedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingCalculator;
