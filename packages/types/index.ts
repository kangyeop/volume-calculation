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
  weight: number;
  inboundDate?: Date | string;
  outboundDate?: Date | string;
  barcode?: boolean;
  aircap?: boolean;
  remarks?: string;
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
  recipientPhone?: string;
  zipCode?: string;
  address?: string;
  detailAddress?: string;
  shippingMemo?: string;
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
