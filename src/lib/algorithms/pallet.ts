/**
 * Conservative 2D-footprint lower bound for pallet packing.
 *
 * Computes the better of two whole-layer orientations (W×L rotation) on a
 * single-orientation grid. Does NOT consider mixed-orientation shelf packing,
 * so results may overestimate pallet count versus an optimal packer by up to
 * ~30% for some dimensions. Cartons are assumed upright — no rotation onto the
 * height axis. Acceptable for v1 export planning; revisit if users report
 * inflated counts.
 */

export const EXPORT_PALLET = {
  width: 110,
  length: 110,
  height: 165,
} as const;

export interface CartonDimensions {
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
}

export interface PalletizationResult {
  cartonCount: number;
  itemsPerLayer: number;
  layersPerPallet: number;
  cartonsPerPallet: number;
  palletCount: number;
  lastPalletCartons: number;
  lastPalletIsFull: boolean;
  unpackable: boolean;
}

const UNPACKABLE: Omit<PalletizationResult, 'cartonCount'> = {
  itemsPerLayer: 0,
  layersPerPallet: 0,
  cartonsPerPallet: 0,
  palletCount: 0,
  lastPalletCartons: 0,
  lastPalletIsFull: false,
  unpackable: true,
};

export function calculatePalletization(
  sku: CartonDimensions,
  totalUnits: number,
): PalletizationResult {
  const { width: W, length: L, height: H, innerQuantity } = sku;
  const cartonCount = Math.ceil(totalUnits / innerQuantity);

  if (W > EXPORT_PALLET.width || L > EXPORT_PALLET.length || H > EXPORT_PALLET.height) {
    return { cartonCount, ...UNPACKABLE };
  }

  const itemsPerLayer = Math.max(
    Math.floor(EXPORT_PALLET.width / W) * Math.floor(EXPORT_PALLET.length / L),
    Math.floor(EXPORT_PALLET.width / L) * Math.floor(EXPORT_PALLET.length / W),
  );
  const layersPerPallet = Math.floor(EXPORT_PALLET.height / H);
  const cartonsPerPallet = itemsPerLayer * layersPerPallet;

  if (cartonsPerPallet === 0) {
    return { cartonCount, ...UNPACKABLE };
  }

  const palletCount = Math.ceil(cartonCount / cartonsPerPallet);
  const lastPalletCartons =
    palletCount === 0 ? 0 : cartonCount - (palletCount - 1) * cartonsPerPallet;
  const lastPalletIsFull = lastPalletCartons === cartonsPerPallet;

  return {
    cartonCount,
    itemsPerLayer,
    layersPerPallet,
    cartonsPerPallet,
    palletCount,
    lastPalletCartons,
    lastPalletIsFull,
    unpackable: false,
  };
}
