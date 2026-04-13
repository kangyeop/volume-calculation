/**
 * 2D-footprint pallet packing with exhaustive corner-point DFS search.
 *
 * Enumerates carton placements via bottom-left corner points (x = right edges,
 * y = top edges of placed cartons + {0}). Iterative deepening from the area
 * upper bound `floor(PW*PL / w*l)` down to 0; first feasible n is optimal.
 * Both [w,l] and [l,w] orientations are tried at each candidate, enabling
 * non-guillotine layouts (pinwheel, etc). Symmetry is broken by anchoring the
 * first carton at (0,0). Area-based pruning trims branches that cannot reach
 * the target. Cartons remain upright — no rotation onto the height axis.
 *
 * Step budget is 200,000 nodes per target; on overflow we fall back to the
 * legacy guillotine packer to guarantee at least the previous result.
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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

const STEP_BUDGET = 200_000;

function grid(PW: number, PL: number, w: number, l: number): number {
  if (w <= 0 || l <= 0 || w > PW || l > PL) return 0;
  return Math.floor(PW / w) * Math.floor(PL / l);
}

function bestGrid(PW: number, PL: number, w: number, l: number): number {
  return Math.max(grid(PW, PL, w, l), grid(PW, PL, l, w));
}

function computeGuillotineLayer(PW: number, PL: number, w: number, l: number): number {
  let best = bestGrid(PW, PL, w, l);

  for (const [aw, al] of [
    [w, l],
    [l, w],
  ] as const) {
    const maxCols = Math.floor(PW / aw);
    for (let k = 1; k <= maxCols; k++) {
      const zone1 = k * Math.floor(PL / al);
      const zone2 = bestGrid(PW - k * aw, PL, w, l);
      if (zone1 + zone2 > best) best = zone1 + zone2;
    }
    const maxRows = Math.floor(PL / al);
    for (let k = 1; k <= maxRows; k++) {
      const zone1 = Math.floor(PW / aw) * k;
      const zone2 = bestGrid(PW, PL - k * al, w, l);
      if (zone1 + zone2 > best) best = zone1 + zone2;
    }
  }

  return best;
}

export function maxCartonsInLayer(PW: number, PL: number, w: number, l: number): number {
  if (w <= 0 || l <= 0) return 0;
  if ((w > PW || l > PL) && (l > PW || w > PL)) return 0;

  const cartonArea = w * l;
  const palletArea = PW * PL;
  const upperBound = Math.floor(palletArea / cartonArea);
  if (upperBound === 0) return 0;

  const guillotineFallback = computeGuillotineLayer(PW, PL, w, l);

  let steps = 0;
  let budgetExceeded = false;

  function overlaps(a: Rect, placed: Rect[]): boolean {
    for (const b of placed) {
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        return true;
      }
    }
    return false;
  }

  function candidates(placed: Rect[]): Array<[number, number]> {
    const xs = new Set<number>([0]);
    const ys = new Set<number>([0]);
    for (const r of placed) {
      xs.add(r.x + r.w);
      ys.add(r.y + r.h);
    }
    const out: Array<[number, number]> = [];
    for (const y of ys) {
      for (const x of xs) {
        if (x < PW && y < PL) out.push([x, y]);
      }
    }
    out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return out;
  }

  const orientations: Array<[number, number]> = [
    [w, l],
    [l, w],
  ];

  function search(placed: Rect[], usedArea: number, target: number): boolean {
    if (placed.length === target) return true;
    if (steps++ > STEP_BUDGET) {
      budgetExceeded = true;
      return false;
    }
    const remaining = target - placed.length;
    if (remaining * cartonArea > palletArea - usedArea) return false;

    const points: Array<[number, number]> =
      placed.length === 0 ? [[0, 0]] : candidates(placed);

    for (const [x, y] of points) {
      for (const [cw, ch] of orientations) {
        if (x + cw > PW || y + ch > PL) continue;
        const rect: Rect = { x, y, w: cw, h: ch };
        if (overlaps(rect, placed)) continue;
        placed.push(rect);
        if (search(placed, usedArea + cw * ch, target)) return true;
        placed.pop();
        if (budgetExceeded) return false;
      }
    }
    return false;
  }

  let bestFound = 0;
  for (let n = upperBound; n >= 1; n--) {
    steps = 0;
    budgetExceeded = false;
    if (search([], 0, n)) {
      bestFound = n;
      break;
    }
    if (budgetExceeded) {
      console.warn(
        `[pallet] maxCartonsInLayer step budget exceeded for PW=${PW} PL=${PL} w=${w} l=${l} target=${n}; falling back to guillotine`,
      );
      return Math.max(bestFound, guillotineFallback);
    }
  }

  return Math.max(bestFound, guillotineFallback);
}

export function calculatePalletization(
  sku: CartonDimensions,
  totalUnits: number,
): PalletizationResult {
  const { width: W, length: L, height: H, innerQuantity } = sku;
  const cartonCount = Math.ceil(totalUnits / innerQuantity);

  if (W > EXPORT_PALLET.width || L > EXPORT_PALLET.length || H > EXPORT_PALLET.height) {
    return { cartonCount, ...UNPACKABLE };
  }

  const itemsPerLayer = maxCartonsInLayer(EXPORT_PALLET.width, EXPORT_PALLET.length, W, L);
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
