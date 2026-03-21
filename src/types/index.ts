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

export interface Box extends Dimensions {
  id: string;
  name: string;
  price?: number;
  boxGroupId: string;
  boxGroup?: BoxGroup;
}

export interface BoxGroup {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  boxes?: Box[];
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

export interface ProductGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  products?: Product[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  productGroupId: string;
  productGroup?: ProductGroup;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderId: string;
  recipient?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
  outboundBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundItem {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  outboundBatchId: string;
  productId?: string;
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundBatch {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
  outboundItems?: OutboundItem[];
  packingResults?: PackingResult[];
}

export interface Outbound {
  id: string;
  orderId: string;
  orderIdentifier?: string;
  sku: string;
  quantity: number;
  projectId: string;
  productId?: string;
  product?: Product;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export enum PackingGroupingOption {
  ORDER = 'ORDER',
  RECIPIENT = 'RECIPIENT',
  ORDER_RECIPIENT = 'ORDER_RECIPIENT',
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

export interface PackingResult3D {
  orderId: string;
  groupLabel?: string;
  boxes: PackedBox3D[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface PackingResultDetail {
  id: string;
  outboundBatchId: string;
  orderId: string;
  recipientName?: string;
  sku: string;
  productName: string;
  quantity: number;
  boxName: string;
  boxNumber: number;
  boxCBM: number;
  efficiency: number;
  unpacked?: boolean;
  unpackedReason?: string;
  createdAt: string;
  placements?: Placement3D[];
}

export interface Placement3D {
  x: number;
  y: number;
  z: number;
  rotation: string;
}

export interface ParseUploadData {
  headers: string[];
  rows: Record<string, unknown>[];
  suggestedMapping?: Record<string, string>;
  confidence?: number;
}

export interface UnmatchedItem {
  sku?: string;
  rawValue?: string;
  quantity?: number;
  reason?: string;
}

export interface OutboundUploadResult {
  imported: number;
  unmatched: UnmatchedItem[];
  batchName: string;
  batchId: string;
  totalRows: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalBatches: number;
  totalBoxesUsed: number;
  batches: BatchStats[];
}

export interface BatchStats {
  batchId: string;
  batchName: string;
  boxCount: number;
  lastCalculatedAt: string;
}

export interface PackingResult {
  id: string;
  outboundBatchId: string;
  boxId?: string;
  boxName?: string;
  packedCount: number;
  efficiency: number;
  totalCBM: number;
  groupLabel?: string;
  createdAt: Date | string;
}

export type UploadType = 'outbound' | 'product';

export interface UploadTemplate {
  id: string;
  name: string;
  type: 'outbound' | 'product';
  headers: string[];
  columnMapping: Record<string, string>;
  rowStructure: 'single' | 'compound';
  compoundPattern: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParseOutboundResponse {
  sessionId: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
  fileName: string;
  suggestedMapping: MappingResult;
  matchedTemplate: { id: string; name: string; similarity: number } | null;
  source: 'template' | 'ai';
}

export interface ProcessOutboundRequest {
  sessionId: string;
  columnMapping: Record<string, string>;
  saveAsTemplate?: boolean;
  templateName?: string;
  matchedTemplateId?: string;
}

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

export interface ParseUploadDataLegacy {
  sessionId: string;
  headers: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  mapping: MappingResult;
  fileName: string;
}

export interface ParseUploadResponse {
  success: boolean;
  data: ParseUploadDataLegacy;
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

export interface OutboundWithProduct extends OutboundItem {
  productId?: string;
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

export interface PackingResult3DLegacy {
  orderId: string;
  groupLabel?: string;
  boxes: PackedBox3D[];
  unpackedItems: { skuId: string; name?: string; quantity: number; reason: string }[];
  totalCBM: number;
  totalEfficiency: number;
}

export interface PackingResultDetailLegacy {
  id: string;
  outboundBatchId: string;
  orderId: string;
  recipientName?: string;
  sku: string;
  productName: string;
  quantity: number;
  boxName: string;
  boxNumber: number;
  boxCBM: number;
  efficiency: number;
  unpacked?: boolean;
  unpackedReason?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export interface ProjectBoxStat {
  boxName: string;
  boxCount: number;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  createdAt: string;
  boxes: ProjectBoxStat[];
}
