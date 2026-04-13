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

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayerLayout {
  count: number;
  rects: Rect[];
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

function gridRects(
  PW: number,
  PL: number,
  w: number,
  l: number,
  offsetX = 0,
  offsetY = 0,
): Rect[] {
  if (w <= 0 || l <= 0 || w > PW || l > PL) return [];
  const cols = Math.floor(PW / w);
  const rows = Math.floor(PL / l);
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: offsetX + c * w, y: offsetY + r * l, w, h: l });
    }
  }
  return out;
}

function bestGridLayout(PW: number, PL: number, w: number, l: number): Rect[] {
  const a = gridRects(PW, PL, w, l);
  const b = gridRects(PW, PL, l, w);
  return a.length >= b.length ? a : b;
}

function computeGuillotineLayout(PW: number, PL: number, w: number, l: number): LayerLayout {
  let best: Rect[] = bestGridLayout(PW, PL, w, l);

  for (const [aw, al] of [
    [w, l],
    [l, w],
  ] as const) {
    const maxCols = Math.floor(PW / aw);
    for (let k = 1; k <= maxCols; k++) {
      const zone1 = gridRects(k * aw, PL, aw, al);
      const zone2 = bestGridLayout(PW - k * aw, PL, w, l).map((r) => ({
        ...r,
        x: r.x + k * aw,
      }));
      if (zone1.length + zone2.length > best.length) best = [...zone1, ...zone2];
    }
    const maxRows = Math.floor(PL / al);
    for (let k = 1; k <= maxRows; k++) {
      const zone1 = gridRects(PW, k * al, aw, al);
      const zone2 = bestGridLayout(PW, PL - k * al, w, l).map((r) => ({
        ...r,
        y: r.y + k * al,
      }));
      if (zone1.length + zone2.length > best.length) best = [...zone1, ...zone2];
    }
  }

  return { count: best.length, rects: best };
}

export function computeLayerLayout(
  PW: number,
  PL: number,
  w: number,
  l: number,
): LayerLayout {
  if (w <= 0 || l <= 0) return { count: 0, rects: [] };
  if ((w > PW || l > PL) && (l > PW || w > PL)) return { count: 0, rects: [] };

  const cartonArea = w * l;
  const palletArea = PW * PL;
  const upperBound = Math.floor(palletArea / cartonArea);
  if (upperBound === 0) return { count: 0, rects: [] };

  const guillotineFallback = computeGuillotineLayout(PW, PL, w, l);

  let steps = 0;
  let budgetExceeded = false;
  let bestLayout: Rect[] = [];

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
    if (placed.length === target) {
      bestLayout = placed.map((r) => ({ ...r }));
      return true;
    }
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

  for (let n = upperBound; n >= 1; n--) {
    steps = 0;
    budgetExceeded = false;
    if (search([], 0, n)) {
      break;
    }
    if (budgetExceeded) {
      console.warn(
        `[pallet] computeLayerLayout step budget exceeded for PW=${PW} PL=${PL} w=${w} l=${l} target=${n}; falling back to guillotine`,
      );
      if (guillotineFallback.count > bestLayout.length) return guillotineFallback;
      return { count: bestLayout.length, rects: bestLayout };
    }
  }

  if (guillotineFallback.count > bestLayout.length) return guillotineFallback;
  return { count: bestLayout.length, rects: bestLayout };
}

export function maxCartonsInLayer(PW: number, PL: number, w: number, l: number): number {
  return computeLayerLayout(PW, PL, w, l).count;
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
