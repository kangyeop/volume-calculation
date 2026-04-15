import { EXPORT_PALLET } from '@/lib/algorithms/pallet';

export interface LeftoverCarton {
  sku: string;
  productName: string;
  w: number;
  l: number;
  h: number;
  count: number;
}

export interface PlacedCarton {
  sku: string;
  productName: string;
  cartonIndex: number;
  x: number;
  y: number;
  z: number;
  w: number;
  l: number;
  h: number;
  rotated: boolean;
}

export interface MixedPallet {
  items: PlacedCarton[];
}

export interface MixedPackResult {
  pallets: MixedPallet[];
  unplacedCartons: LeftoverCarton[];
}

interface ExtremePoint {
  x: number;
  y: number;
  z: number;
}

interface Bin {
  placed: PlacedCarton[];
  extremePoints: ExtremePoint[];
}

interface Instance {
  sku: string;
  productName: string;
  w: number;
  l: number;
  h: number;
  volume: number;
  cartonIndex: number;
}

const PW = EXPORT_PALLET.width;
const PL = EXPORT_PALLET.length;
const PH = EXPORT_PALLET.height;
const SUPPORT_THRESHOLD = 0.7;
const EPSILON = 0.01;
const STEP_BUDGET = 300_000;

function overlaps3D(
  ax: number,
  ay: number,
  az: number,
  aw: number,
  al: number,
  ah: number,
  b: PlacedCarton,
): boolean {
  return (
    ax < b.x + b.w - EPSILON &&
    ax + aw > b.x + EPSILON &&
    ay < b.y + b.l - EPSILON &&
    ay + al > b.y + EPSILON &&
    az < b.z + b.h - EPSILON &&
    az + ah > b.z + EPSILON
  );
}

function isSupported(
  x: number,
  y: number,
  z: number,
  cw: number,
  cl: number,
  placed: PlacedCarton[],
): boolean {
  if (z < EPSILON) return true;
  const baseArea = cw * cl;
  if (baseArea <= 0) return false;
  let supported = 0;
  for (const p of placed) {
    const topZ = p.z + p.h;
    if (Math.abs(topZ - z) > EPSILON) continue;
    const ox = Math.max(x, p.x);
    const oy = Math.max(y, p.y);
    const ex = Math.min(x + cw, p.x + p.w);
    const ey = Math.min(y + cl, p.y + p.l);
    if (ex <= ox || ey <= oy) continue;
    supported += (ex - ox) * (ey - oy);
  }
  return supported / baseArea >= SUPPORT_THRESHOLD - EPSILON;
}

function tryPlaceInBin(
  bin: Bin,
  inst: Instance,
): { placement: PlacedCarton; epIndex: number } | null {
  let best: { placement: PlacedCarton; epIndex: number; score: [number, number, number] } | null =
    null;

  const orientations: Array<[number, number, boolean]> = [
    [inst.w, inst.l, false],
    [inst.l, inst.w, true],
  ];

  for (let epIdx = 0; epIdx < bin.extremePoints.length; epIdx++) {
    const ep = bin.extremePoints[epIdx];
    for (const [cw, cl, rotated] of orientations) {
      if (ep.x + cw > PW + EPSILON) continue;
      if (ep.y + cl > PL + EPSILON) continue;
      if (ep.z + inst.h > PH + EPSILON) continue;

      let collision = false;
      for (const p of bin.placed) {
        if (overlaps3D(ep.x, ep.y, ep.z, cw, cl, inst.h, p)) {
          collision = true;
          break;
        }
      }
      if (collision) continue;

      if (!isSupported(ep.x, ep.y, ep.z, cw, cl, bin.placed)) continue;

      const score: [number, number, number] = [ep.z, ep.y, ep.x];
      if (
        best === null ||
        score[0] < best.score[0] ||
        (score[0] === best.score[0] && score[1] < best.score[1]) ||
        (score[0] === best.score[0] && score[1] === best.score[1] && score[2] < best.score[2])
      ) {
        best = {
          placement: {
            sku: inst.sku,
            productName: inst.productName,
            cartonIndex: inst.cartonIndex,
            x: ep.x,
            y: ep.y,
            z: ep.z,
            w: cw,
            l: cl,
            h: inst.h,
            rotated,
          },
          epIndex: epIdx,
          score,
        };
      }
    }
  }

  if (best === null) return null;
  return { placement: best.placement, epIndex: best.epIndex };
}

function addExtremePoints(bin: Bin, p: PlacedCarton): void {
  const newPoints: ExtremePoint[] = [
    { x: p.x + p.w, y: p.y, z: p.z },
    { x: p.x, y: p.y + p.l, z: p.z },
    { x: p.x, y: p.y, z: p.z + p.h },
  ];
  for (const np of newPoints) {
    if (np.x >= PW - EPSILON) continue;
    if (np.y >= PL - EPSILON) continue;
    if (np.z >= PH - EPSILON) continue;
    const exists = bin.extremePoints.some(
      (ep) =>
        Math.abs(ep.x - np.x) < EPSILON &&
        Math.abs(ep.y - np.y) < EPSILON &&
        Math.abs(ep.z - np.z) < EPSILON,
    );
    if (!exists) bin.extremePoints.push(np);
  }
}

export function packMixedPallets(leftovers: LeftoverCarton[]): MixedPackResult {
  if (leftovers.length === 0) {
    return { pallets: [], unplacedCartons: [] };
  }

  const instances: Instance[] = [];
  for (const lo of leftovers) {
    if (lo.count <= 0) continue;
    for (let i = 0; i < lo.count; i++) {
      instances.push({
        sku: lo.sku,
        productName: lo.productName,
        w: lo.w,
        l: lo.l,
        h: lo.h,
        volume: lo.w * lo.l * lo.h,
        cartonIndex: i + 1,
      });
    }
  }

  instances.sort((a, b) => {
    if (b.volume !== a.volume) return b.volume - a.volume;
    return b.h - a.h;
  });

  const bins: Bin[] = [{ placed: [], extremePoints: [{ x: 0, y: 0, z: 0 }] }];
  const unplaced: PlacedCarton[] = [];
  let ops = 0;
  let budgetExceeded = false;

  for (const inst of instances) {
    let placedOk = false;

    for (const bin of bins) {
      ops += bin.extremePoints.length * 2;
      if (ops > STEP_BUDGET) {
        budgetExceeded = true;
        break;
      }
      const result = tryPlaceInBin(bin, inst);
      if (result) {
        bin.placed.push(result.placement);
        bin.extremePoints.splice(result.epIndex, 1);
        addExtremePoints(bin, result.placement);
        placedOk = true;
        break;
      }
    }

    if (budgetExceeded) {
      unplaced.push({
        sku: inst.sku,
        productName: inst.productName,
        cartonIndex: inst.cartonIndex,
        x: 0,
        y: 0,
        z: 0,
        w: inst.w,
        l: inst.l,
        h: inst.h,
        rotated: false,
      });
      continue;
    }

    if (placedOk) continue;

    const newBin: Bin = { placed: [], extremePoints: [{ x: 0, y: 0, z: 0 }] };
    const result = tryPlaceInBin(newBin, inst);
    if (result) {
      newBin.placed.push(result.placement);
      newBin.extremePoints.splice(result.epIndex, 1);
      addExtremePoints(newBin, result.placement);
      bins.push(newBin);
    } else {
      unplaced.push({
        sku: inst.sku,
        productName: inst.productName,
        cartonIndex: inst.cartonIndex,
        x: 0,
        y: 0,
        z: 0,
        w: inst.w,
        l: inst.l,
        h: inst.h,
        rotated: false,
      });
    }
  }

  if (budgetExceeded) {
    console.warn(
      `[mixed-pallet] step budget ${STEP_BUDGET} exceeded with ${instances.length} cartons; returning partial result`,
    );
  }

  const pallets: MixedPallet[] = bins
    .filter((b) => b.placed.length > 0)
    .map((b) => ({ items: b.placed }));

  const unplacedBySku = new Map<string, LeftoverCarton>();
  for (const u of unplaced) {
    const key = `${u.sku}|${u.w}x${u.l}x${u.h}`;
    const existing = unplacedBySku.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      unplacedBySku.set(key, {
        sku: u.sku,
        productName: u.productName,
        w: u.w,
        l: u.l,
        h: u.h,
        count: 1,
      });
    }
  }

  return { pallets, unplacedCartons: Array.from(unplacedBySku.values()) };
}
