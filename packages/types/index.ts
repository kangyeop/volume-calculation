export interface Dimensions {
  width: number; // cm
  length: number; // cm
  height: number; // cm
}

export interface SKU extends Dimensions {
  id: string;
  name: string;
  quantity: number;
}

export enum PackingGroupingOption {
  ORDER = 'ORDER',
  RECIPIENT = 'RECIPIENT',
  ORDER_RECIPIENT = 'ORDER_RECIPIENT',
}

export interface Box extends Dimensions {
  id: string;
  name: string; // e.g., "Post Office #1"
  price?: number; // Optional: for cost calculation
}

export interface PackingResult {
  id: string;
  projectId: string;
  boxId: string;
  boxName: string;
  packedCount: number; // How many items packed in this box
  remainingQuantity: number; // How many items left to pack
  efficiency: number; // 0-1 (percentage of volume used)
  totalCBM: number;
  groupLabel?: string; // e.g. "Order: #123"
  createdAt: Date | string;
}

export interface PackingGroup {
  groupLabel: string;
  boxes: {
    box: Box;
    count: number;
    packedSKUs: { skuId: string; name?: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface PackingRecommendation {
  groups: PackingGroup[];
  totalCBM: number;
  totalEfficiency: number;
  unpackedItems?: { skuId: string; name?: string; quantity: number; reason?: string }[];
}

export interface PackingCalculationResult {
  boxes: {
    box: Box;
    count: number;
    packedSKUs: { skuId: string; quantity: number }[];
  }[];
  unpackedItems: { skuId: string; quantity: number; reason?: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Product {
  id: string;
  projectId: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Outbound {
  id: string;
  projectId: string;
  orderId: string;
  sku: string;
  quantity: number;
  recipientName?: string;
  batchId?: string;
  batchName?: string;
  createdAt: Date | string;
}

export type UploadType = 'outbound' | 'product';

export interface ColumnMapping {
  columnName: string;
  confidence: number;
}

export interface MappingResult {
  confidence: number;
  mapping: Record<string, ColumnMapping | null>;
  unmappedColumns: string[];
  notes?: string;
}

export interface ParseUploadResponse {
  success: boolean;
  data: {
    sessionId: string;
    headers: string[];
    rowCount: number;
    sampleRows: Record<string, unknown>[];
    mapping: MappingResult;
    fileName: string;
  };
}

export interface ConfirmUploadRequest {
  sessionId: string;
  mapping: Record<string, string | null>;
}

export interface ConfirmUploadResponse {
  success: boolean;
  data: {
    imported: number;
    batchId?: string;
  };
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadRemapRequest {
  sessionId: string;
  forceAI?: boolean;
}

export interface AlternativeMatch {
  id: string;
  sku: string;
  name: string;
  confidence: number;
}

export interface ProductMatchResult {
  outboundItemIndex: number;
  outboundSku: string;
  outboundName?: string;
  matchedProduct?: {
    id: string;
    sku: string;
    name: string;
  };
  confidence: number;
  matchReason: string;
  needsReview: boolean;
  alternativeMatches?: AlternativeMatch[];
}

export interface ProductMappingSession {
  sessionId: string;
  projectId: string;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  needsReview: number;
  results: ProductMatchResult[];
}

export interface ProductMappingData {
  totalItems: number;
  matchedItems: number;
  needsReview: number;
  results: ProductMatchResult[];
}

export interface ParseMappingUploadResponse {
  success: boolean;
  data: {
    sessionId: string;
    headers: string[];
    rowCount: number;
    sampleRows: Record<string, unknown>[];
    columnMapping: MappingResult;
    productMapping?: ProductMappingData;
    fileName: string;
  };
}

export interface ConfirmMappingUploadRequest {
  sessionId: string;
  columnMapping: Record<string, string | null>;
  productMapping?: Record<number, string | null>;
}

export interface ConfirmMappingUploadResponse {
  success: boolean;
  data: {
    imported: number;
    batchId?: string;
    mappedCount: number;
    unmappedCount: number;
  };
}

export interface OutboundWithProduct extends Outbound {
  productId?: string | null;
  mappingConfidence?: number | null;
  product?: Product;
}

export type Rotation = 'none' | '90' | '180' | '270';

export interface ItemPlacement {
  x: number;
  y: number;
  z: number;
  rotation: Rotation;
}

export interface PackedItem3D {
  skuId: string;
  name?: string;
  quantity: number;
  placements: ItemPlacement[];
}

export interface PackedBox3D {
  boxId: string;
  boxName: string;
  boxNumber: number;
  width: number;
  length: number;
  height: number;
  items: PackedItem3D[];
  totalCBM: number;
  efficiency: number;
  usedVolume: number;
  availableVolume: number;
}

export interface PackingResult3D {
  orderId: string;
  groupLabel?: string;
  boxes: PackedBox3D[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason: string }[];
  totalCBM: number;
  totalEfficiency: number;
}
