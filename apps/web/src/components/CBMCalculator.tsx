import React, { useState } from 'react';
import { SKU, PackingRecommendation } from '@wms/types';
import { STANDARD_BOXES } from '../constants/boxes';
import { recommendPacking, calculateCBM } from '../lib/packing';

export const CBMCalculator: React.FC = () => {
  const [skus, setSkus] = useState<SKU[]>([
    {
      id: 'sku-1',
      name: 'Item 1',
      width: 0,
      length: 0,
      height: 0,
      quantity: 1,
    }
  ]);

  const [result, setResult] = useState<PackingRecommendation | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>(STANDARD_BOXES.map(b => b.id));

  const addSku = () => {
    setSkus([
      ...skus,
      {
        id: `sku-${Date.now()}`,
        name: `Item ${skus.length + 1}`,
        width: 0,
        length: 0,
        height: 0,
        quantity: 1,
      },
    ]);
  };

  const removeSku = (id: string) => {
    if (skus.length > 1) {
      setSkus(skus.filter((s) => s.id !== id));
    }
  };

  const updateSku = (id: string, field: keyof SKU, value: string | number) => {
    setSkus(
      skus.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  const handleCalculate = () => {
    // Validate
    const isValid = skus.every(s => s.width > 0 && s.length > 0 && s.height > 0 && s.quantity > 0);
    if (!isValid) {
      alert('Please enter valid dimensions and quantity for all items.');
      return;
    }

    const availableBoxes = STANDARD_BOXES.filter(b => selectedBoxIds.includes(b.id));
    if (availableBoxes.length === 0) {
      alert('Please select at least one box type.');
      return;
    }

    const recommendation = recommendPacking(skus, availableBoxes);
    setResult(recommendation);
  };

  const toggleBox = (boxId: string) => {
    setSelectedBoxIds(prev =>
      prev.includes(boxId) ? prev.filter(id => id !== boxId) : [...prev, boxId]
    );
  };

  const selectAllBoxes = () => setSelectedBoxIds(STANDARD_BOXES.map(b => b.id));
  const deselectAllBoxes = () => setSelectedBoxIds([]);

  const resetForm = () => {
    setSkus([{
      id: 'sku-1',
      name: 'Item 1',
      width: 0,
      length: 0,
      height: 0,
      quantity: 1,
    }]);
    setResult(null);
  };

  const calculateTotalVolume = () => {
    return skus.reduce((acc, s) => acc + calculateCBM(s.width, s.length, s.height) * s.quantity, 0);
  };

  const calculateTotalCost = () => {
    if (!result) return 0;
    return result.boxes.reduce((total, item) => total + (item.box.price || 0) * item.count, 0);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">CBM Calculator & Packing Simulator</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-gray-700">Product List</h3>
             <div className="space-x-2">
               <button onClick={resetForm} className="text-sm text-gray-500 hover:text-red-500 underline">
                 Reset
               </button>
               <button onClick={addSku} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium">
                 + Add Item
               </button>
             </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {skus.map((sku) => (
              <div key={sku.id} className="p-4 border rounded-lg bg-gray-50 relative group">
                {skus.length > 1 && (
                  <button
                    onClick={() => removeSku(sku.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    title="Remove Item"
                  >
                    ✕
                  </button>
                )}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Name</label>
                  <input
                    type="text"
                    value={sku.name}
                    onChange={(e) => updateSku(sku.id, 'name', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">W (cm)</label>
                    <input
                      type="number"
                      value={sku.width}
                      onChange={(e) => updateSku(sku.id, 'width', Number(e.target.value))}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">L (cm)</label>
                    <input
                      type="number"
                      value={sku.length}
                      onChange={(e) => updateSku(sku.id, 'length', Number(e.target.value))}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">H (cm)</label>
                    <input
                      type="number"
                      value={sku.height}
                      onChange={(e) => updateSku(sku.id, 'height', Number(e.target.value))}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Qty</label>
                    <input
                      type="number"
                      value={sku.quantity}
                      onChange={(e) => updateSku(sku.id, 'quantity', Number(e.target.value))}
                      className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 flex justify-between items-center">
            <span className="font-medium">Total Volume:</span>
            <span className="font-bold">{calculateTotalVolume().toFixed(4)} m³</span>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Available Boxes</h3>
              <div className="text-xs space-x-2">
                <button onClick={selectAllBoxes} className="text-indigo-600 hover:underline">All</button>
                <span className="text-gray-300">|</span>
                <button onClick={deselectAllBoxes} className="text-gray-500 hover:underline">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STANDARD_BOXES.map(box => (
                <label key={box.id} className={`
                  flex flex-col p-2 border rounded cursor-pointer text-xs transition-colors
                  ${selectedBoxIds.includes(box.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200 opacity-60'}
                `}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800">{box.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedBoxIds.includes(box.id)}
                      onChange={() => toggleBox(box.id)}
                      className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <span className="text-gray-500">{box.width}x{box.length}x{box.height}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Calculate Packing
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Packing Recommendation</h3>

          {result ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded shadow-sm border border-gray-200 grid grid-cols-3 gap-4 text-center">
                <div>
                   <div className="text-sm font-medium text-gray-500">Total Volume</div>
                   <div className="text-lg font-bold text-indigo-600">{result.totalCBM.toFixed(4)} m³</div>
                </div>
                <div>
                   <div className="text-sm font-medium text-gray-500">Space Efficiency</div>
                   <div className="text-lg font-bold text-green-600">{(result.totalEfficiency * 100).toFixed(1)}%</div>
                </div>
                <div>
                   <div className="text-sm font-medium text-gray-500">Est. Box Cost</div>
                   <div className="text-lg font-bold text-gray-800">₩{calculateTotalCost().toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Required Boxes:</h4>
                {result.boxes.length === 0 ? (
                  <p className="text-red-500 text-sm">Items are too large for standard boxes.</p>
                ) : (
                  result.boxes.map((boxRec, idx) => {
                    return (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-800">{boxRec.box.name}</p>
                          <p className="text-xs text-gray-500">
                            {boxRec.box.width}x{boxRec.box.length}x{boxRec.box.height}cm
                            {boxRec.box.price && ` • ₩${boxRec.box.price.toLocaleString()}`}
                          </p>
                        </div>
                        <div className="text-right">
                           <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded">x {boxRec.count}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Contents per box:</p>
                        <ul className="space-y-1 mb-2">
                          {boxRec.packedSKUs.map((ps, pIdx) => {
                            const skuDetails = skus.find(s => s.id === ps.skuId);
                            return (
                              <li key={pIdx} className="text-xs text-gray-700 flex justify-between">
                                <span>{skuDetails?.name || ps.skuId}</span>
                                <span className="font-mono">Qty: {ps.quantity}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <p>Enter details and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
