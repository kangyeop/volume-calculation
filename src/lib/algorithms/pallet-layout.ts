import {
  EXPORT_PALLET,
  computeLayerLayout,
  type CartonDimensions,
  type Rect,
} from './pallet';

export interface PalletLayout3D {
  pallet: { width: number; length: number; height: number };
  carton: { width: number; length: number; height: number };
  layerRects: Rect[];
  layerCount: number;
  itemsPerLayer: number;
  cartonsPerPallet: number;
}

export function buildPalletLayout3D(sku: CartonDimensions): PalletLayout3D | null {
  const { width: W, length: L, height: H } = sku;
  if (
    W <= 0 ||
    L <= 0 ||
    H <= 0 ||
    W > EXPORT_PALLET.width ||
    L > EXPORT_PALLET.length ||
    H > EXPORT_PALLET.height
  ) {
    return null;
  }

  const layer = computeLayerLayout(EXPORT_PALLET.width, EXPORT_PALLET.length, W, L);
  const layerCount = Math.floor(EXPORT_PALLET.height / H);
  if (layer.count === 0 || layerCount === 0) return null;

  return {
    pallet: { ...EXPORT_PALLET },
    carton: { width: W, length: L, height: H },
    layerRects: layer.rects,
    layerCount,
    itemsPerLayer: layer.count,
    cartonsPerPallet: layer.count * layerCount,
  };
}
