import { DataTransformerService } from './dataTransformer.service';

describe('DataTransformerService', () => {
  let service: DataTransformerService;

  beforeEach(() => {
    service = new DataTransformerService();
  });

  describe('SKU Parsing', () => {
    const testCases = [
      {
        input: '(Product Name / 10ea)',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: '(Product Name / 10ea)',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name / 10ea',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name 10ea',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name x10',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name: 10',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name x5ea',
        expectedName: 'Product Name',
        expectedQuantity: 5,
      },
      {
        input: 'Product Name ×10',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
      {
        input: 'Product Name *10',
        expectedName: 'Product Name',
        expectedQuantity: 10,
      },
    ];

    testCases.forEach(({ input, expectedName, expectedQuantity }) => {
      it(`should parse "${input}" correctly`, () => {
        const result = service.parseSkuItem(input);
        expect(result).not.toBeNull();
        expect(result?.productName).toBe(expectedName);
        expect(result?.quantity).toBe(expectedQuantity);
      });
    });

    it('should return null for invalid formats', () => {
      const result = service.parseSkuItem('Invalid format');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.parseSkuItem('');
      expect(result).toBeNull();
    });

    it('should handle multi-line SKUs', async () => {
      const rows = [
        {
          orderId: 'order-1',
          sku: '(Product A / 10ea)\n(Product B / 5ea)\n(Product C x3)',
          quantity: '1',
        },
      ];

      const columnMapping = { orderId: 'orderId', sku: 'sku', quantity: 'quantity' };
      const result = await service.transformAndMapOutbound(columnMapping, rows);

      expect(result.parsedOrders).toHaveLength(1);
      expect(result.parsedOrders[0].outboundItems).toHaveLength(3);
      expect(result.parsedOrders[0].outboundItems[0].sku).toBe('Product A');
      expect(result.parsedOrders[0].outboundItems[0].quantity).toBe(10);
      expect(result.parsedOrders[0].outboundItems[1].sku).toBe('Product B');
      expect(result.parsedOrders[0].outboundItems[1].quantity).toBe(5);
      expect(result.parsedOrders[0].outboundItems[2].sku).toBe('Product C');
      expect(result.parsedOrders[0].outboundItems[2].quantity).toBe(3);
    });
  });
});
