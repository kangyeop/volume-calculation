import type { GlobalPackingResultRow, GlobalMixedPalletRow } from '@/hooks/queries';

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
  kind: 'solo' | 'mixed';
  items: FlatPalletItem[];
}

export interface FlattenPalletsInput {
  rows: GlobalPackingResultRow[];
  mixedPallets?: GlobalMixedPalletRow[];
}

export function flattenPallets(input: FlattenPalletsInput): FlatPallet[] {
  const { rows, mixedPallets = [] } = input;
  const result: FlatPallet[] = [];
  let no = 1;

  const lotsBySku = new Map<string, FlatPalletLot[]>();
  const nameBySku = new Map<string, string>();
  for (const row of rows) {
    lotsBySku.set(row.sku, row.lots ?? []);
    nameBySku.set(row.sku, row.productName);
  }

  for (const row of rows) {
    if (row.unpackable) continue;
    for (let i = 0; i < row.soloPalletCount; i++) {
      const cartons =
        i < row.fullPalletCount ? row.cartonsPerPallet : row.lastPalletCartons;
      result.push({
        no: no++,
        kind: 'solo',
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

  for (const mp of mixedPallets) {
    const bySku = new Map<string, number>();
    for (const it of mp.items) {
      bySku.set(it.sku, (bySku.get(it.sku) ?? 0) + 1);
    }
    const items: FlatPalletItem[] = Array.from(bySku.entries()).map(([sku, cartons]) => ({
      sku,
      productName: nameBySku.get(sku) ?? sku,
      cartons,
      lots: lotsBySku.get(sku) ?? [],
    }));
    result.push({ no: no++, kind: 'mixed', items });
  }

  return result;
}

export function totalCartons(pallet: FlatPallet): number {
  return pallet.items.reduce((sum, item) => sum + item.cartons, 0);
}
