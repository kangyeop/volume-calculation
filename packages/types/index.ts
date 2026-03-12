export interface Dimensions {
  width: number;
  length: number;
  height: number;
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
  name: string;
  price?: number;
}

export interface PackingResult {
  id: string;
  projectId: string;
  boxId: string;
  boxName: string;
  packedCount: number;
  efficiency: number;
  totalCBM: number;
  groupLabel?: string;
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

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export interface Order {
  id: string;
  projectId: string;
  orderId: string;
  quantity: number;
  recipientName?: string;
  address?: string;
  status: OrderStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Outbound {
  id: string;
  projectId: string;
  orderId: string;
  orderIdentifier?: string;
  sku: string;
  quantity: number;
  productId?: string | null;
  createdAt: Date | string;
}

export type UploadType = 'outbound' | 'product';

export interface ColumnMapping {
  columnName: string;
}

export interface MappingResult {
  mapping: Record<string, ColumnMapping | null>;
  unmappedColumns: string[];
  notes?: string;
}

export interface ProductColumnMappingResult {
  mapping: {
    sku: ColumnMapping | null;
    name: ColumnMapping | null;
    dimensions: ColumnMapping | null;
  };
  unmappedColumns: string[];
  dimensionFormat?: 'combined' | 'separate';
}

export interface ParseProductUploadData {
  sessionId: string;
  headers: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  mapping: ProductColumnMappingResult;
  fileName: string;
}

export interface ParseProductUploadResponse {
  success: boolean;
  data: ParseProductUploadData;
}

export interface ParseUploadData {
  sessionId: string;
  headers: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  mapping: MappingResult;
  fileName: string;
}

export interface ParseUploadResponse {
  success: boolean;
  data: ParseUploadData;
}

export interface ConfirmUploadRequest {
  sessionId: string;
  mapping: Record<string, string | null>;
}

export interface ConfirmUploadData {
  imported: number;
}

export interface ConfirmUploadResponse {
  success: boolean;
  data: ConfirmUploadData;
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

export interface ProductMatchResult {
  outboundItemIndex: number;
  orderId?: string;
  productIds?: string[] | null;
  sku?: string;
  rawValue?: string;
  quantity?: number;
}

export interface ProductMappingData {
  results: ProductMatchResult[];
}

export interface ParseMappingUploadData {
  sessionId: string;
  headers: string[];
  rowCount: number;
  columnMapping: MappingResult;
  fileName: string;
  orderId?: string;
}

export interface ParseMappingUploadResponse {
  success: boolean;
  data: ParseMappingUploadData;
}

export interface ConfirmMappingUploadRequest {
  sessionId: string;
  columnMapping: Record<string, string | null>;
  productMapping?: Record<number, string[] | null>;
}

export interface ConfirmMappingUploadData {
  imported: number;
  mappedCount: number;
  unmappedCount: number;
  orderIds?: string[];
}

export interface ConfirmMappingUploadResponse {
  success: boolean;
  data: ConfirmMappingUploadData;
}

export interface OutboundWithProduct extends Outbound {
  productId?: string | null;
  mappingConfidence?: number | null;
  product?: Product;
}

export interface OutboundUploadResult {
  imported: number;
  unmatched: {
    sku: string;
    rawValue?: string;
    quantity: number;
    reason?: string;
  }[];
  totalRows: number;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}
