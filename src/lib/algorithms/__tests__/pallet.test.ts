import { describe, expect, it } from 'vitest';
import { calculatePalletization, EXPORT_PALLET, maxCartonsInLayer } from '../pallet';

describe('calculatePalletization', () => {
  it('exposes the export pallet constant', () => {
    expect(EXPORT_PALLET).toEqual({ width: 110, length: 110, height: 165 });
  });

  it('exact fit: 50×50×55 innerQty=1 total=24 → 2 full pallets', () => {
    const r = calculatePalletization({ width: 50, length: 50, height: 55, innerQuantity: 1 }, 24);
    expect(r.unpackable).toBe(false);
    expect(r.cartonCount).toBe(24);
    expect(r.itemsPerLayer).toBe(4);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(12);
    expect(r.palletCount).toBe(2);
    expect(r.lastPalletCartons).toBe(12);
    expect(r.lastPalletIsFull).toBe(true);
  });

  it('partial last pallet: same carton, total=13 → 2 pallets, last has 1', () => {
    const r = calculatePalletization({ width: 50, length: 50, height: 55, innerQuantity: 1 }, 13);
    expect(r.cartonCount).toBe(13);
    expect(r.palletCount).toBe(2);
    expect(r.lastPalletCartons).toBe(1);
    expect(r.lastPalletIsFull).toBe(false);
  });

  it('oversize width (W > 110) marks SKU unpackable', () => {
    const r = calculatePalletization({ width: 120, length: 40, height: 50, innerQuantity: 1 }, 10);
    expect(r.unpackable).toBe(true);
    expect(r.palletCount).toBe(0);
    expect(r.itemsPerLayer).toBe(0);
    expect(r.layersPerPallet).toBe(0);
    expect(r.cartonsPerPallet).toBe(0);
    expect(r.lastPalletCartons).toBe(0);
  });

  it('oversize length (L > 110) marks SKU unpackable', () => {
    const r = calculatePalletization({ width: 40, length: 120, height: 50, innerQuantity: 1 }, 10);
    expect(r.unpackable).toBe(true);
    expect(r.palletCount).toBe(0);
  });

  it('oversize height (H > 165) marks SKU unpackable', () => {
    const r = calculatePalletization({ width: 40, length: 40, height: 200, innerQuantity: 1 }, 10);
    expect(r.unpackable).toBe(true);
    expect(r.palletCount).toBe(0);
  });

  it('single carton: 60×40×55 innerQty=100 total=50 → 1 pallet with 1 carton', () => {
    const r = calculatePalletization({ width: 60, length: 40, height: 55, innerQuantity: 100 }, 50);
    expect(r.cartonCount).toBe(1);
    expect(r.itemsPerLayer).toBe(4);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(12);
    expect(r.palletCount).toBe(1);
    expect(r.lastPalletCartons).toBe(1);
    expect(r.lastPalletIsFull).toBe(false);
  });

  it('mixed-orientation beats uniform grid: 40×30×50 fits 8 per layer (not 6)', () => {
    const r = calculatePalletization({ width: 40, length: 30, height: 50, innerQuantity: 1 }, 24);
    expect(r.itemsPerLayer).toBe(8);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(24);
    expect(r.palletCount).toBe(1);
    expect(r.lastPalletIsFull).toBe(true);
  });

  describe('maxCartonsInLayer', () => {
    it('falls back to uniform grid when no strip split helps', () => {
      expect(maxCartonsInLayer(110, 110, 50, 50)).toBe(4);
    });

    it('finds mixed layout when strip split adds cartons', () => {
      expect(maxCartonsInLayer(110, 110, 40, 30)).toBe(8);
    });

    it('returns 0 when carton does not fit in pallet', () => {
      expect(maxCartonsInLayer(110, 110, 120, 40)).toBe(0);
    });

    it('finds pinwheel layout: 59×46 on 110×110 returns 4', () => {
      expect(maxCartonsInLayer(110, 110, 59, 46)).toBe(4);
    });
  });

  it('finds pinwheel layout: 59×46×36 on 110×110 fits 4 per layer', () => {
    const r = calculatePalletization({ width: 59, length: 46, height: 36, innerQuantity: 1 }, 152);
    expect(r.itemsPerLayer).toBe(4);
    expect(r.layersPerPallet).toBe(4);
    expect(r.cartonsPerPallet).toBe(16);
    expect(r.palletCount).toBe(10);
  });

  it('innerQuantity coverage: 60×40×55 innerQty=10 total=250 → 3 pallets, last=1', () => {
    const r = calculatePalletization({ width: 60, length: 40, height: 55, innerQuantity: 10 }, 250);
    expect(r.cartonCount).toBe(25);
    expect(r.itemsPerLayer).toBe(4);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(12);
    expect(r.palletCount).toBe(3);
    expect(r.lastPalletCartons).toBe(1);
    expect(r.lastPalletIsFull).toBe(false);
  });
});
