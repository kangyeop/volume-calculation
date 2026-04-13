import { describe, expect, it } from 'vitest';
import { calculatePalletization, EXPORT_PALLET } from '../pallet';

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
    expect(r.itemsPerLayer).toBe(2);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(6);
    expect(r.palletCount).toBe(1);
    expect(r.lastPalletCartons).toBe(1);
    expect(r.lastPalletIsFull).toBe(false);
  });

  it('innerQuantity coverage: 60×40×55 innerQty=10 total=250 → 5 pallets, last=1', () => {
    const r = calculatePalletization({ width: 60, length: 40, height: 55, innerQuantity: 10 }, 250);
    expect(r.cartonCount).toBe(25);
    expect(r.itemsPerLayer).toBe(2);
    expect(r.layersPerPallet).toBe(3);
    expect(r.cartonsPerPallet).toBe(6);
    expect(r.palletCount).toBe(5);
    expect(r.lastPalletCartons).toBe(1);
    expect(r.lastPalletIsFull).toBe(false);
  });
});
