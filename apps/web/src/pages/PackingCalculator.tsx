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
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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
            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 pb-2 flex flex-row items-center justify-between">
                <h3 className="font-semibold">Total Volume</h3>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{result.totalCBM.toFixed(4)} CBM</div>
                <p className="text-xs text-muted-foreground">Combined volume of all boxes</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 pb-2 flex flex-row items-center justify-between">
                <h3 className="font-semibold">Packing Efficiency</h3>
                <div className="text-sm font-medium">{(result.totalEfficiency * 100).toFixed(1)}%</div>
              </div>
              <div className="p-6 pt-0 space-y-2">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${result.totalEfficiency * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">Volume utilization</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recommended Boxes</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.boxes.map((boxGroup, idx) => (
                <div key={idx} className="rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{boxGroup.box.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {boxGroup.box.length} x {boxGroup.box.width} x {boxGroup.box.height} cm
                      </p>
                    </div>
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                      x{boxGroup.count}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Contents per box</p>
                    <ul className="space-y-1">
                      {boxGroup.packedSKUs.map((sku, sIdx) => (
                        <li key={sIdx} className="text-sm flex justify-between">
                          <span className="truncate mr-2">{sku.skuId}</span>
                          <span className="font-medium whitespace-nowrap">qty: {sku.quantity}</span>
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
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Box</th>
                  <th className="px-4 py-3 text-right font-medium">Efficiency</th>
                  <th className="px-4 py-3 text-right font-medium">CBM</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.boxName}</td>
                    <td className="px-4 py-3 text-right">{(item.efficiency * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono">{item.totalCBM.toFixed(4)}</td>
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
