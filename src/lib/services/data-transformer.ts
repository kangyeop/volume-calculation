type OrderItemDto = {
  orderId: string;
  sku: string;
  quantity: number;
  productId: string;
};

type CreateProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
};

function safeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val.toString();
  return '';
}

export function mapRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [field, columnName] of Object.entries(columnMapping)) {
    if (columnName) {
      result[field] = row[columnName] ?? '';
    }
  }
  return result;
}

export function transformOrderItemRows(
  rows: Record<string, unknown>[],
  columnMapping: Record<string, string>,
): OrderItemDto[] {
  return rows
    .filter((row) => {
      const mapped = mapRow(row, columnMapping);
      return mapped.orderId && mapped.sku;
    })
    .flatMap((row) => {
      const mapped = mapRow(row, columnMapping);
      const quantity = parseInt(safeString(mapped.quantity ?? '1'), 10) || 1;

      return [
        {
          orderId: safeString(mapped.orderId ?? ''),
          sku: safeString(mapped.sku ?? ''),
          quantity,
          productId: mapped.productId ? safeString(mapped.productId) : '',
        },
      ];
    });
}

export async function transformAndMapOrderItems(
  columnMapping: Record<string, string>,
  rows: Record<string, unknown>[],
): Promise<{
  parsedOrders: Array<{
    orderId: string;
    orderItems: Array<{
      sku: string;
      quantity: number;
      productId?: string | null;
    }>;
  }>;
}> {
  const transformed = transformOrderItemRows(rows, columnMapping);

  const orderMap = new Map<
    string,
    {
      orderId: string;
      orderItems: Array<{
        sku: string;
        quantity: number;
        productId?: string | null;
      }>;
    }
  >();

  for (const item of transformed) {
    const orderId = item.orderId;

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        orderId,
        orderItems: [],
      });
    }

    const order = orderMap.get(orderId)!;
    order.orderItems.push({
      sku: item.sku.trim(),
      quantity: item.quantity || 1,
      productId: item.productId || null,
    });
  }

  return {
    parsedOrders: Array.from(orderMap.values()),
  };
}

export function transformProductRows(
  rows: Record<string, unknown>[],
  separator: string = 'x',
): CreateProductDto[] {
  return rows
    .filter((row) => row.sku && row.name)
    .map((row) => {
      let width = 0;
      let length = 0;
      let height = 0;

      if (row.dimensions) {
        const dims = safeString(row.dimensions).trim();
        const cleaned = dims.replace(/(cm|mm|m|in|inch)$/i, '').trim();
        const parts = cleaned.split(separator).map((p) => parseFloat(p.trim()));

        if (parts.length >= 2) {
          width = parts[0] || 0;
          length = parts[1] || 0;
          height = parts[2] ?? 1;
        }
      }

      return {
        sku: safeString(row.sku || ''),
        name: safeString(row.name || ''),
        width,
        length,
        height,
      };
    });
}
