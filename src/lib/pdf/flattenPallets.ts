import type { GlobalPackingResultRow } from '@/hooks/queries';

export interface FlatPalletLot {
  lotNumber: string | null;
  expirationDate: string | null;
  quantity: number;
}

export interface FlatPalletItem {
  sku: string;
  productName: string;
  cartons: number;
  lots: FlatPalletLot[];
}

export interface FlatPallet {
  no: number;
  items: FlatPalletItem[];
}

export function flattenPallets(rows: GlobalPackingResultRow[]): FlatPallet[] {
  const result: FlatPallet[] = [];
  let no = 1;
  for (const row of rows) {
    if (row.unpackable) continue;
    for (let i = 1; i <= row.palletCount; i++) {
      const isLast = i === row.palletCount;
      const cartons =
        isLast && row.lastPalletCartons > 0 ? row.lastPalletCartons : row.cartonsPerPallet;
      result.push({
        no: no++,
        items: [
          {
            sku: row.sku,
            productName: row.productName,
            cartons,
            lots: row.lots ?? [],
          },
        ],
      });
    }
  }
  return result;
}

export function totalCartons(pallet: FlatPallet): number {
  return pallet.items.reduce((sum, item) => sum + item.cartons, 0);
}
