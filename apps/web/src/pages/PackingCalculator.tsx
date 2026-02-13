import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Package, History, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { PackingRecommendation, PackingResult, PackingGroupingOption } from '@wms/types';

const PackingCalculator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingRecommendation | null>(null);
  const [history, setHistory] = useState<PackingResult[]>([]);
  const [groupingOption, setGroupingOption] = useState<PackingGroupingOption>(PackingGroupingOption.ORDER);
  const [batches, setBatches] = useState<{ batchId: string; batchName: string; count: number; createdAt: string }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadHistory();
      loadBatches();
    }
  }, [id]);

  const loadBatches = async () => {
    try {
      const data = await api.outbound.listBatches(id!);
      setBatches(data);
      if (data.length > 0) {
        setSelectedBatchId(data[0].batchId);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

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
      const data = await api.packing.calculate(id, groupingOption, selectedBatchId || undefined);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packing / CBM Calculator</h1>
          <p className="text-muted-foreground">Calculate the optimal box configuration for your outbound orders.</p>
        </div>

        <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
            {batches.length > 0 && (
              <div className="flex items-center gap-2 px-2 border-r pr-4 mr-2">
                <span className="text-sm font-medium">Batch:</span>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Batches</option>
                  {batches.map((batch) => (
                    <option key={batch.batchId} value={batch.batchId}>
                      {batch.batchName} ({batch.count} items)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 px-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Grouping:</span>
            </div>
            <select
                value={groupingOption}
                onChange={(e) => setGroupingOption(e.target.value as PackingGroupingOption)}
                className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                <option value={PackingGroupingOption.ORDER}>By Order Number</option>
                <option value={PackingGroupingOption.RECIPIENT}>By Recipient</option>
                <option value={PackingGroupingOption.ORDER_RECIPIENT}>By Order + Recipient</option>
            </select>
            <button
            onClick={handleCalculate}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 transition-colors"
            >
            {loading ? 'Calculating...' : (
                <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate
                </>
            )}
            </button>
        </div>
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

          <div className="space-y-8">
            <h2 className="text-2xl font-bold border-b pb-2">Recommended Packing by Shipment</h2>

            {result.groups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-200 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900">{group.groupLabel}</h3>
                    <p className="text-sm text-muted-foreground">Result for this shipment</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Volume</p>
                      <p className="font-mono font-bold text-indigo-700">{group.totalCBM.toFixed(4)} CBM</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Efficiency</p>
                      <p className="font-mono font-bold text-indigo-700">{(group.totalEfficiency * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.boxes.map((boxGroup, idx) => (
                    <div key={idx} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col h-full relative overflow-hidden hover:shadow-md transition-shadow">
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
            ))}
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
