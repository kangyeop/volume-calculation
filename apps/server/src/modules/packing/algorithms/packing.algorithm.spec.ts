import { calculatePacking, calculateOrderPackingUnified } from './packing.algorithm';
import { SKU, Box } from '@wms/types';

describe('Packing Algorithm', () => {
  const boxes: Box[] = [
    {
      id: 'box-small',
      name: 'Small Box',
      width: 10,
      length: 10,
      height: 10,
    },
    {
      id: 'box-medium',
      name: 'Medium Box',
      width: 20,
      length: 20,
      height: 20,
    },
    {
      id: 'box-large',
      name: 'Large Box',
      width: 30,
      length: 30,
      height: 30,
    },
  ];

  describe('Single box packing', () => {
    it('should pack all items in smallest box when they fit', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 2,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('box-small');
      expect(result.unpackedItems).toHaveLength(0);
      expect(result.totalEfficiency).toBeGreaterThan(0);
    });

    it('should pack items in medium box when they do not fit in small', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 15,
          length: 15,
          height: 15,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('box-medium');
      expect(result.unpackedItems).toHaveLength(0);
    });
  });

  describe('Multi-box packing', () => {
    it('should pack items across multiple boxes when they do not fit in largest box', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 25,
          length: 25,
          height: 25,
          quantity: 3,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes.length).toBeGreaterThan(1);
      expect(result.unpackedItems).toHaveLength(0);
    });

    it('should pack large items in largest box and remaining in smallest', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 25,
          length: 25,
          height: 25,
          quantity: 1,
        },
        {
          id: 'item-2',
          name: 'Item 2',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes.length).toBeGreaterThanOrEqual(1);
      expect(result.unpackedItems).toHaveLength(0);
    });
  });

  describe('Box merging', () => {
    it('should NOT merge identical boxes in result structure', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 25,
          length: 25,
          height: 25,
          quantity: 3,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes.length).toBeGreaterThan(1);
      expect(result.unpackedItems).toHaveLength(0);
    });
  });

  describe('Unpacked items handling', () => {
    it('should mark items as unpacked when they do not fit in any box', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 50,
          length: 50,
          height: 50,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(0);
      expect(result.unpackedItems).toHaveLength(1);
      expect(result.unpackedItems[0].skuId).toBe('item-1');
      expect(result.unpackedItems[0].reason).toBe('Too large for any box');
    });

    it('should pack valid items and leave oversized items unpacked', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
        {
          id: 'item-2',
          name: 'Item 2',
          width: 50,
          length: 50,
          height: 50,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.unpackedItems).toHaveLength(1);
      expect(result.unpackedItems[0].skuId).toBe('item-2');
    });
  });

  describe('Empty input', () => {
    it('should return empty result when no items', () => {
      const result = calculatePacking([], boxes);

      expect(result.boxes).toHaveLength(0);
      expect(result.unpackedItems).toHaveLength(0);
      expect(result.totalCBM).toBe(0);
      expect(result.totalEfficiency).toBe(0);
    });

    it('should return empty result when no boxes', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, []);

      expect(result.boxes).toHaveLength(0);
      expect(result.unpackedItems).toHaveLength(1);
      expect(result.unpackedItems[0].reason).toBe('Too large for any box');
    });
  });

  describe('Single item, single box', () => {
    it('should pack single item in appropriate box', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 8,
          length: 8,
          height: 8,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('box-small');
      expect(result.boxes[0].packedSKUs).toHaveLength(1);
      expect(result.boxes[0].packedSKUs[0].skuId).toBe('item-1');
      expect(result.boxes[0].packedSKUs[0].quantity).toBe(1);
    });
  });

  describe('Volume efficiency', () => {
    it('should calculate correct efficiency', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      const itemVolume = 5 * 5 * 5;
      const boxVolume = 10 * 10 * 10;
      const expectedEfficiency = itemVolume / boxVolume;

      expect(result.totalEfficiency).toBeCloseTo(expectedEfficiency);
    });
  });

  describe('CBM calculation', () => {
    it('should calculate correct CBM for boxes', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      const expectedCBM = (10 * 10 * 10) / 1000000;
      expect(result.totalCBM).toBeCloseTo(expectedCBM);
    });
  });

  describe('calculateOrderPackingUnified', () => {
    it('should set orderId in result', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculateOrderPackingUnified('order-123', items, boxes);

      expect(result.orderId).toBe('order-123');
    });

    it('should set groupLabel when provided', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculateOrderPackingUnified('order-123', items, boxes, 'Test Group');

      expect(result.orderId).toBe('order-123');
      expect(result.groupLabel).toBe('Test Group');
    });

    it('should not set groupLabel when not provided', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculateOrderPackingUnified('order-123', items, boxes);

      expect(result.orderId).toBe('order-123');
      expect(result.groupLabel).toBeUndefined();
    });

    it('should return sequential box numbers for multiple boxes', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 25,
          length: 25,
          height: 25,
          quantity: 3,
        },
      ];

      const result = calculateOrderPackingUnified('order-123', items, boxes);

      expect(result.boxes).toHaveLength(3);
      expect(result.boxes[0].boxNumber).toBe(1);
      expect(result.boxes[1].boxNumber).toBe(2);
      expect(result.boxes[2].boxNumber).toBe(3);
    });
  });

  describe('Multiple items of same SKU', () => {
    it('should pack items with same SKU', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 5,
          length: 5,
          height: 5,
          quantity: 3,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].packedSKUs).toHaveLength(1);
      expect(result.boxes[0].packedSKUs[0].skuId).toBe('item-1');
      expect(result.boxes[0].packedSKUs[0].quantity).toBe(3);
    });
  });

  describe('Rotation support', () => {
    it('should allow rotation by sorting dimensions', () => {
      const items: SKU[] = [
        {
          id: 'item-1',
          name: 'Item 1',
          width: 10,
          length: 5,
          height: 5,
          quantity: 1,
        },
      ];

      const result = calculatePacking(items, boxes);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].box.id).toBe('box-small');
      expect(result.unpackedItems).toHaveLength(0);
    });
  });
});
