import { db } from '@/lib/db';
import { boxes, boxStockHistories } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { StockChangeType } from '@/types';
import { getUserId } from '@/lib/auth';
import { AppError } from '@/lib/api-error';

type CreateStockHistoryDto = {
  boxId: string;
  type: StockChangeType;
  quantity: number;
  note?: string;
};

export async function create(dto: CreateStockHistoryDto) {
  const userId = await getUserId();
  return db.transaction(async (tx) => {
    const box = await tx.query.boxes.findFirst({
      where: and(eq(boxes.id, dto.boxId), eq(boxes.userId, userId)),
    });
    if (!box) throw new AppError('박스를 찾을 수 없습니다.', 404);

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
      throw new AppError(`재고가 부족합니다. (현재: ${currentStock}, 출고: ${dto.quantity})`, 400);
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
  const userId = await getUserId();
  const box = await db.query.boxes.findFirst({
    where: and(eq(boxes.id, boxId), eq(boxes.userId, userId)),
  });
  if (!box) throw new Error('Box not found');
  return db.query.boxStockHistories.findMany({
    where: eq(boxStockHistories.boxId, boxId),
    orderBy: [desc(boxStockHistories.createdAt)],
  });
}
