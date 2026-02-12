import { describe, it, expect } from 'vitest';
import { canSkuFitInBox, calculateVolumePacking } from './volume-calculator';
import { calculateCBM } from './packing';
import { Box, SKU } from '@wms/types';
import { STANDARD_BOXES } from '../constants/boxes';

// Define some standard boxes for testing
const BOX_S: Box = { id: 'S', name: 'Small', width: 10, length: 10, height: 10, price: 10 }; // Vol 1000, Eff 900
const BOX_M: Box = { id: 'M', name: 'Medium', width: 20, length: 20, height: 10, price: 30 }; // Vol 4000, Eff 3600
const BOX_L: Box = { id: 'L', name: 'Large', width: 30, length: 30, height: 10, price: 60 }; // Vol 9000, Eff 8100
const TEST_BOXES = [BOX_L, BOX_M, BOX_S];

describe('Volume Calculator', () => {
  describe('canSkuFitInBox', () => {
    const box: Box = { id: 'b1', name: 'Box 1', width: 10, length: 10, height: 10 };

    it('should return true if SKU fits exactly', () => {
      const sku: SKU = { id: 's1', name: 'Item 1', width: 10, length: 10, height: 10, quantity: 1 };
      expect(canSkuFitInBox(sku, box)).toBe(true);
    });

    it('should return true if SKU is smaller', () => {
      const sku: SKU = { id: 's2', name: 'Item 2', width: 5, length: 5, height: 5, quantity: 1 };
      expect(canSkuFitInBox(sku, box)).toBe(true);
    });

    it('should return false if SKU is larger in one dimension', () => {
      const sku: SKU = { id: 's3', name: 'Item 3', width: 11, length: 5, height: 5, quantity: 1 };
      expect(canSkuFitInBox(sku, box)).toBe(false);
    });

    it('should handle rotation (dimensions are sorted)', () => {
      const boxRect: Box = { id: 'b2', name: 'Box 2', width: 20, length: 10, height: 5 };
      // SKU matches dimensions but in different order: 5, 20, 10
      const sku: SKU = { id: 's4', name: 'Item 4', width: 5, length: 20, height: 10, quantity: 1 };
      expect(canSkuFitInBox(sku, boxRect)).toBe(true);
    });
  });

  describe('calculateVolumePacking - Basic', () => {
    it('should return empty result for empty SKUs', () => {
      const result = calculateVolumePacking([], STANDARD_BOXES);
      expect(result.boxes).toHaveLength(0);
      expect(result.totalCBM).toBe(0);
    });

    it('should return empty result if SKU is too large for any box', () => {
      const hugeSku: SKU = { id: 'huge', name: 'Huge', width: 1000, length: 1000, height: 1000, quantity: 1 };
      const result = calculateVolumePacking([hugeSku], STANDARD_BOXES);
      expect(result.boxes).toHaveLength(0);
      expect(result.totalCBM).toBe(0);
    });

    it('should pack a single small item in the smallest sufficient box', () => {
      const sku: SKU = { id: 's1', name: 'Small', width: 10, length: 10, height: 10, quantity: 1 };
      const result = calculateVolumePacking([sku], STANDARD_BOXES);
      expect(result.boxes.length).toBeGreaterThan(0);
      expect(result.boxes[0].box.id).toBe('post-2');
    });

    it('should find a box even if the largest volume box cannot fit the item (Aspect Ratio check)', () => {
      const boxA: Box = { id: 'boxA', name: 'Large Flat', width: 100, length: 10, height: 10 };
      const boxB: Box = { id: 'boxB', name: 'Small Cube', width: 20, length: 20, height: 20 };
      const boxes = [boxA, boxB];
      const sku: SKU = { id: 'cube', name: 'Cube Item', width: 15, length: 15, height: 15, quantity: 1 };

      const result = calculateVolumePacking([sku], boxes);
      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('boxB');
    });

    it('should NOT pack if item volume > 90% of box volume even if dimensions fit', () => {
      const box: Box = { id: 'b1', name: 'Exact Box', width: 10, length: 10, height: 10 };
      const sku: SKU = { id: 's1', name: 'Almost Exact', width: 9.8, length: 9.8, height: 9.8, quantity: 1 };
      const result = calculateVolumePacking([sku], [box]);
      expect(result.boxes).toHaveLength(0);
    });

    it('should handle items that exactly match the 90% volume limit', () => {
      const box: Box = { id: 'b1', name: 'Exact Box', width: 10, length: 10, height: 10 };
      const sku: SKU = { id: 's1', name: 'Exact', width: 9, length: 10, height: 10, quantity: 1 };
      const result = calculateVolumePacking([sku], [box]);
      expect(result.boxes).toHaveLength(1);
    });
  });

  describe('calculateVolumePacking - Cost Optimization', () => {
    it('should prefer a larger box that fits ALL items over multiple smaller boxes', () => {
      const sku: SKU = { id: 'item', name: 'Item', width: 10, length: 10, height: 10, quantity: 20 };
      const result = calculateVolumePacking([sku], STANDARD_BOXES);
      const totalPrice = result.boxes.reduce((sum, entry) => sum + ((entry.box.price || 0) * entry.count), 0);
      expect(totalPrice).toBeLessThanOrEqual(1100);
    });

    it('should pick the cheaper box when two boxes have same volume but different prices', () => {
      const box1: Box = { id: 'b1', name: 'Box 1', width: 10, length: 10, height: 10, price: 20 };
      const box2: Box = { id: 'b2', name: 'Box 2', width: 10, length: 10, height: 10, price: 10 };
      const sku: SKU = { id: 'item', name: 'Item', width: 5, length: 5, height: 5, quantity: 1 };
      const result = calculateVolumePacking([sku], [box1, box2]);
      expect(result.boxes[0].box.id).toBe('b2');
    });

    it('should pick the box with more volume when two boxes have same price', () => {
      const box1: Box = { id: 'b1', name: 'Box 1', width: 10, length: 10, height: 10, price: 10 };
      const box2: Box = { id: 'b2', name: 'Box 2', width: 11, length: 11, height: 11, price: 10 };
      const sku: SKU = { id: 'item', name: 'Item', width: 5, length: 5, height: 5, quantity: 1 };
      const result = calculateVolumePacking([sku], [box1, box2]);
      expect(result.boxes[0].box.id).toBe('b2');
    });

    it('should not be misled by volume-only cost estimation when dimensions restrict cheap boxes', () => {
      const boxCheap: Box = { id: 'Cheap', name: 'Cheap', width: 10, length: 10, height: 10, price: 10 };
      const boxExp: Box = { id: 'Exp', name: 'Exp', width: 60, length: 10, height: 10, price: 100 };
      const skuCube: SKU = { id: 'cube', name: 'Cube', width: 8, length: 8, height: 8, quantity: 1 };
      const skuLong: SKU = { id: 'long', name: 'Long', width: 50, length: 2, height: 2, quantity: 1 };
      const result = calculateVolumePacking([skuCube, skuLong], [boxCheap, boxExp]);
      const totalPrice = result.boxes.reduce((sum, b) => sum + (b.box.price || 0) * b.count, 0);
      expect(totalPrice).toBeLessThanOrEqual(100);
      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('Exp');
    });

    it('should handle large quantities by picking the best bulk price-to-volume ratio', () => {
      const boxM: Box = { id: 'M', name: 'M', width: 20, length: 20, height: 10, price: 35 };
      const sku: SKU = { id: 'item', name: 'Item', width: 5, length: 5, height: 5, quantity: 100 };
      const result = calculateVolumePacking([sku], [BOX_L, boxM, BOX_S]);
      expect(result.boxes[0].box.id).toBe('L');
    });
  });

  describe('calculateVolumePacking - Advanced Scenarios', () => {
    it('should split items into multiple identical boxes and group them', () => {
      const sku: SKU = { id: 'item1', name: 'Cube', width: 5, length: 5, height: 5, quantity: 20 };
      const result = calculateVolumePacking([sku], [BOX_S]);
      const totalBoxes = result.boxes.reduce((sum, b) => sum + b.count, 0);
      expect(totalBoxes).toBe(3);
      expect(result.boxes.some(b => b.count === 2)).toBe(true);
      expect(result.boxes.some(b => b.count === 1)).toBe(true);
    });

    it('should pack a mix of large and small items in a single box if possible', () => {
      const skuLarge: SKU = { id: 'large', name: 'Large', width: 15, length: 15, height: 10, quantity: 1 };
      const skuSmall: SKU = { id: 'small', name: 'Small', width: 5, length: 5, height: 5, quantity: 10 };
      const result = calculateVolumePacking([skuLarge, skuSmall], TEST_BOXES);
      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('M');
    });

    it('should handle floating point precision', () => {
      const box: Box = { id: 'b1', name: 'B1', width: 4.108, length: 10, height: 1, price: 10 };
      const sku: SKU = { id: 's1', name: 'S1', width: 3.333, length: 3.333, height: 3.333, quantity: 1 };
      const result = calculateVolumePacking([sku], [box]);
      expect(result.boxes).toHaveLength(0);
    });
  });

  describe('calculateVolumePacking - Stress', () => {
    it('should handle 100 random SKUs quickly', () => {
      const skus: SKU[] = [];
      for (let i = 0; i < 100; i++) {
        skus.push({
          id: `sku-${i}`,
          name: `SKU ${i}`,
          width: Math.floor(Math.random() * 20) + 1,
          length: Math.floor(Math.random() * 20) + 1,
          height: Math.floor(Math.random() * 20) + 1,
          quantity: Math.floor(Math.random() * 5) + 1
        });
      }
      const start = performance.now();
      const result = calculateVolumePacking(skus, STANDARD_BOXES);
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
      const totalPacked = result.boxes.reduce((sum, b) => sum + b.packedSKUs.reduce((s, p) => s + p.quantity, 0) * b.count, 0);
      const totalRequested = skus.reduce((sum, s) => sum + s.quantity, 0);
      expect(totalPacked).toBe(totalRequested);
    });
  });

  describe('calculateCBM', () => {
    it('should calculate CBM correctly', () => {
      expect(calculateCBM(100, 100, 100)).toBe(1);
      expect(calculateCBM(50, 40, 20)).toBe(0.04);
    });
  });
});
