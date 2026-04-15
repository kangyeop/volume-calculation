import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { globalPacking } from './queryKeys';

export interface GlobalPackingResultRow {
  id: string;
  globalShipmentId: string;
  sku: string;
  productName: string;
  globalProductId: string | null;
  totalUnits: number;
  innerQuantity: number;
  cartonCount: number;
  itemsPerLayer: number;
  layersPerPallet: number;
  cartonsPerPallet: number;
  palletCount: number;
  lastPalletCartons: number;
  unpackable: boolean;
  lots: Array<{ lotNumber: string | null; expirationDate: string | null; quantity: number }>;
  width: number | null;
  length: number | null;
  height: number | null;
  fullPalletCount: number;
  soloPalletCount: number;
  lastPalletInMixed: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface GlobalMixedPalletRow {
  id: string;
  globalShipmentId: string;
  palletIndex: number;
  items: PlacedCarton[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobalPackingCalculateResult {
  totalPallets: number;
  mixedPalletCount: number;
  unpackableSkus: GlobalPackingResultRow[];
  unmatched: string[];
  rows: GlobalPackingResultRow[];
  mixedPallets: GlobalMixedPalletRow[];
}

async function fetchRecommendation(
  shipmentId: string,
): Promise<GlobalPackingCalculateResult | null> {
  const res = await fetch(`/api/global/shipments/${shipmentId}/packing/recommendation`);
  if (!res.ok) {
    throw new Error('Failed to fetch global packing recommendation');
  }
  return res.json();
}

async function calculate(shipmentId: string): Promise<GlobalPackingCalculateResult> {
  const res = await fetch(`/api/global/shipments/${shipmentId}/packing/calculate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to calculate global packing');
  }
  return res.json();
}

export function useGlobalPackingRecommendation(shipmentId: string) {
  return useQuery({
    queryKey: globalPacking.recommendation(shipmentId).queryKey,
    queryFn: () => fetchRecommendation(shipmentId),
    enabled: !!shipmentId,
  });
}

export function useCalculateGlobalPacking(
  shipmentId: string,
): UseMutationResult<GlobalPackingCalculateResult, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calculate(shipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: globalPacking.recommendation(shipmentId).queryKey,
      });
    },
  });
}
