import { calculatePacking } from './packing.algorithm';
import { SKU, Box } from '@wms/types';

describe('packingAlgorithm', () => {
  const mockBoxes: Box[] = [
    { id: '1', name: 'Small', width: 10, length: 10, height: 10, createdAt: new Date() },
    { id: '2', name: 'Large', width: 20, length: 20, height: 20, createdAt: new Date() },
  ];

  const mockSKUs: SKU[] = [
    { id: 'p1', name: 'Product 1', width: 5, length: 5, height: 5, quantity: 2 },
  ];

  it('should return empty result when no boxes are provided', () => {
    const result = calculatePacking(mockSKUs, []);
    expect(result.boxes).toHaveLength(0);
    expect(result.totalCBM).toBe(0);
    expect(result.totalEfficiency).toBe(0);
  });

  it('should pack items into the smallest possible box', () => {
    const result = calculatePacking(mockSKUs, mockBoxes);
    expect(result.boxes).toHaveLength(1);
    expect(result.boxes[0].box.name).toBe('Small');
    expect(result.boxes[0].count).toBe(1);
  });

  it('should split items into multiple boxes if they do not fit in one', () => {
    const largeSKUs: SKU[] = [
      { id: 'p1', name: 'Product 1', width: 15, length: 15, height: 15, quantity: 2 },
    ];
    // Each item is 3375cm3. Small box is 1000cm3. Large box is 8000cm3.
    // One item fits in Large box (8000 * 0.9 = 7200 capacity).
    // Two items (6750) also fit in one Large box.
    // Let's make them bigger.
    const veryLargeSKUs: SKU[] = [
      { id: 'p1', name: 'Product 1', width: 18, length: 18, height: 18, quantity: 2 },
    ];
    // 18^3 = 5832. 2 * 5832 = 11664.
    // Large box capacity is 8000 * 0.9 = 7200.
    // So 2 items won't fit in one Large box.
    const result = calculatePacking(veryLargeSKUs, mockBoxes);
    expect(result.boxes).toHaveLength(1);
    expect(result.boxes[0].box.name).toBe('Large');
    expect(result.boxes[0].count).toBe(2);
  });
});
