import { DataTransformerService } from './dataTransformer.service';

describe('DataTransformerService', () => {
  let service: DataTransformerService;

  beforeEach(() => {
    service = new DataTransformerService();
  });

  describe('transformAndMapOutbound', () => {
    it('should use SKU value as-is for product name', async () => {
      const rows = [
        { orderId: 'order-1', sku: '아이폰 케이스', quantity: '2' },
      ];
      const columnMapping = { orderId: 'orderId', sku: 'sku', quantity: 'quantity' };

      const result = await service.transformAndMapOutbound(columnMapping, rows);

      expect(result.parsedOrders).toHaveLength(1);
      expect(result.parsedOrders[0].outboundItems).toHaveLength(1);
      expect(result.parsedOrders[0].outboundItems[0].sku).toBe('아이폰 케이스');
      expect(result.parsedOrders[0].outboundItems[0].quantity).toBe(2);
    });

    it('should group items by orderId', async () => {
      const rows = [
        { orderId: 'order-1', sku: 'Product A', quantity: '1' },
        { orderId: 'order-1', sku: 'Product B', quantity: '3' },
        { orderId: 'order-2', sku: 'Product C', quantity: '1' },
      ];
      const columnMapping = { orderId: 'orderId', sku: 'sku', quantity: 'quantity' };

      const result = await service.transformAndMapOutbound(columnMapping, rows);

      expect(result.parsedOrders).toHaveLength(2);

      const order1 = result.parsedOrders.find((o) => o.orderId === 'order-1')!;
      expect(order1.outboundItems).toHaveLength(2);
      expect(order1.outboundItems[0].sku).toBe('Product A');
      expect(order1.outboundItems[1].sku).toBe('Product B');
      expect(order1.outboundItems[1].quantity).toBe(3);

      const order2 = result.parsedOrders.find((o) => o.orderId === 'order-2')!;
      expect(order2.outboundItems).toHaveLength(1);
    });

    it('should default quantity to 1 when not provided', async () => {
      const rows = [
        { orderId: 'order-1', sku: 'Product A' },
      ];
      const columnMapping = { orderId: 'orderId', sku: 'sku' };

      const result = await service.transformAndMapOutbound(columnMapping, rows);

      expect(result.parsedOrders[0].outboundItems[0].quantity).toBe(1);
    });

    it('should skip rows without orderId or sku', async () => {
      const rows = [
        { orderId: 'order-1', sku: 'Product A', quantity: '1' },
        { orderId: '', sku: 'Product B', quantity: '1' },
        { orderId: 'order-2', sku: '', quantity: '1' },
      ];
      const columnMapping = { orderId: 'orderId', sku: 'sku', quantity: 'quantity' };

      const result = await service.transformAndMapOutbound(columnMapping, rows);

      expect(result.parsedOrders).toHaveLength(1);
      expect(result.parsedOrders[0].orderId).toBe('order-1');
    });
  });
});
