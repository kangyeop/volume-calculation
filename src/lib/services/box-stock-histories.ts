import { db } from '@/lib/db';
import { boxes, boxStockHistories } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { StockChangeType } from '@/types';

type CreateStockHistoryDto = {
  boxId: string;
  type: StockChangeType;
  quantity: number;
  note?: string;
};

export async function create(dto: CreateStockHistoryDto) {
  return db.transaction(async (tx) => {
    const box = await tx.query.boxes.findFirst({
      where: eq(boxes.id, dto.boxId),
    });
    if (!box) throw new Error('박스를 찾을 수 없습니다.');

    const currentStock = box.stock;
    let delta: number;
    let resultStock: number;

    switch (dto.type) {
      case 'INBOUND':
        delta = dto.quantity;
        resultStock = currentStock + dto.quantity;
        break;
      case 'OUTBOUND':
        delta = -dto.quantity;
        resultStock = currentStock - dto.quantity;
        break;
      case 'INITIAL':
      case 'ADJUSTMENT':
        resultStock = dto.quantity;
        delta = dto.quantity - currentStock;
        break;
    }

    if (resultStock < 0) {
      throw new Error(`재고가 부족합니다. (현재: ${currentStock}, 출고: ${dto.quantity})`);
    }

    const [history] = await tx
      .insert(boxStockHistories)
      .values({
        boxId: dto.boxId,
        type: dto.type,
        quantity: delta,
        resultStock,
        note: dto.note ?? null,
      })
      .returning();

    await tx.update(boxes).set({ stock: resultStock }).where(eq(boxes.id, dto.boxId));

    return history;
  });
}

export async function findByBoxId(boxId: string) {
  return db.query.boxStockHistories.findMany({
    where: eq(boxStockHistories.boxId, boxId),
    orderBy: [desc(boxStockHistories.createdAt)],
  });
}
