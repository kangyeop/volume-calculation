import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'PROCESSING', 'COMPLETED']);
export const shipmentStatusEnum = pgEnum('shipment_status', ['PACKING', 'CONFIRMED']);
export const shipmentTypeEnum = pgEnum('shipment_type', ['SHIPMENT', 'SETTLEMENT']);
export const stockChangeTypeEnum = pgEnum('stock_change_type', ['INBOUND', 'OUTBOUND', 'INITIAL', 'ADJUSTMENT']);

export const productGroups = pgTable('product_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  boxGroupId: uuid('box_group_id').notNull().references(() => boxGroups.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('product_groups_user_id_idx').on(table.userId),
]).enableRLS();

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  barcode: boolean('barcode').default(false).notNull(),
  aircap: boolean('aircap').default(false).notNull(),
  productGroupId: uuid('product_group_id').notNull().references(() => productGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('products_user_sku_unique').on(table.userId, table.sku),
  index('products_user_id_idx').on(table.userId),
]).enableRLS();

export const boxGroups = pgTable('box_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('box_groups_user_id_idx').on(table.userId),
]).enableRLS();

export const boxes = pgTable('boxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  boxGroupId: uuid('box_group_id').references(() => boxGroups.id, { onDelete: 'set null' }),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('boxes_user_id_idx').on(table.userId),
  index('boxes_box_group_id_idx').on(table.boxGroupId),
]).enableRLS();

export const boxStockHistories = pgTable('box_stock_histories', {
  id: uuid('id').defaultRandom().primaryKey(),
  boxId: uuid('box_id').notNull().references(() => boxes.id, { onDelete: 'cascade' }),
  type: stockChangeTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  resultStock: integer('result_stock').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('box_stock_histories_box_id_idx').on(table.boxId),
]).enableRLS();

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: shipmentStatusEnum('status').default('PACKING').notNull(),
  type: shipmentTypeEnum('type').default('SHIPMENT').notNull(),
  note: text('note'),
  lastBoxGroupId: uuid('last_box_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('shipments_user_id_idx').on(table.userId),
  index('shipments_user_type_idx').on(table.userId, table.type),
]).enableRLS();

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('orders_shipment_order_unique').on(table.shipmentId, table.orderId),
  index('orders_order_id_idx').on(table.orderId),
  index('orders_shipment_id_idx').on(table.shipmentId),
]).enableRLS();

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  orderIdentifier: varchar('order_identifier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('order_items_shipment_product_idx').on(table.shipmentId, table.productId),
  index('order_items_shipment_order_idx').on(table.shipmentId, table.orderId),
]).enableRLS();

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}).enableRLS();

export const outbounds = pgTable('outbounds', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  orderIdentifier: varchar('order_identifier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('outbounds_project_product_idx').on(table.projectId, table.productId),
  index('outbounds_project_order_idx').on(table.projectId, table.orderId),
]).enableRLS();

export const packingResults = pgTable('packing_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  boxId: uuid('box_id').references(() => boxes.id, { onDelete: 'set null' }),
  packedCount: integer('packed_count').notNull(),
  efficiency: numeric('efficiency', { precision: 10, scale: 4 }).notNull(),
  totalCBM: numeric('total_cbm', { precision: 10, scale: 4 }).notNull(),
  groupLabel: varchar('group_label', { length: 255 }),
  groupIndex: integer('group_index'),
  boxNumber: integer('box_number'),
  items: jsonb('items').$type<import('@/types').PackingResultItem[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('packing_results_order_id_unique').on(table.orderId),
  index('packing_results_shipment_id_idx').on(table.shipmentId),
]).enableRLS();

export const productGroupsRelations = relations(productGroups, ({ one, many }) => ({
  products: many(products),
  boxGroup: one(boxGroups, {
    fields: [productGroups.boxGroupId],
    references: [boxGroups.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  productGroup: one(productGroups, {
    fields: [products.productGroupId],
    references: [productGroups.id],
  }),
}));

export const boxGroupsRelations = relations(boxGroups, ({ many }) => ({
  boxes: many(boxes),
}));

export const boxesRelations = relations(boxes, ({ one, many }) => ({
  boxGroup: one(boxGroups, {
    fields: [boxes.boxGroupId],
    references: [boxGroups.id],
  }),
  stockHistories: many(boxStockHistories),
  packingResults: many(packingResults),
}));

export const boxStockHistoriesRelations = relations(boxStockHistories, ({ one }) => ({
  box: one(boxes, {
    fields: [boxStockHistories.boxId],
    references: [boxes.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ many }) => ({
  orders: many(orders),
  orderItems: many(orderItems),
  packingResults: many(packingResults),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [orders.shipmentId],
    references: [shipments.id],
  }),
  orderItems: many(orderItems),
  packingResult: one(packingResults),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [orderItems.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  outbounds: many(outbounds),
}));

export const outboundsRelations = relations(outbounds, ({ one }) => ({
  project: one(projects, {
    fields: [outbounds.projectId],
    references: [projects.id],
  }),
  product: one(products, {
    fields: [outbounds.productId],
    references: [products.id],
  }),
}));

export const estimates = pgTable('estimates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  storagePath: text('storage_path').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('estimates_user_id_idx').on(table.userId),
]).enableRLS();

export const packingResultsRelations = relations(packingResults, ({ one }) => ({
  shipment: one(shipments, {
    fields: [packingResults.shipmentId],
    references: [shipments.id],
  }),
  order: one(orders, {
    fields: [packingResults.orderId],
    references: [orders.id],
  }),
  box: one(boxes, {
    fields: [packingResults.boxId],
    references: [boxes.id],
  }),
}));

export const globalProductGroups = pgTable('global_product_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('global_product_groups_user_id_idx').on(table.userId),
]).enableRLS();

export const globalProducts = pgTable('global_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  innerQuantity: integer('inner_quantity').notNull(),
  globalProductGroupId: uuid('global_product_group_id').notNull().references(() => globalProductGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('global_products_user_sku_unique').on(table.userId, table.sku),
  index('global_products_user_id_idx').on(table.userId),
]).enableRLS();

export const globalShipments = pgTable('global_shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: shipmentStatusEnum('status').default('PACKING').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('global_shipments_user_id_idx').on(table.userId),
]).enableRLS();

export const globalOrders = pgTable('global_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 255 }).notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  globalShipmentId: uuid('global_shipment_id').notNull().references(() => globalShipments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('global_orders_shipment_order_unique').on(table.globalShipmentId, table.orderNumber),
  index('global_orders_shipment_id_idx').on(table.globalShipmentId),
]).enableRLS();

export const globalOrderItems = pgTable('global_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  globalOrderId: uuid('global_order_id').notNull().references(() => globalOrders.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  lotNumber: varchar('lot_number', { length: 100 }),
  expirationDate: date('expiration_date'),
  globalShipmentId: uuid('global_shipment_id').notNull().references(() => globalShipments.id, { onDelete: 'cascade' }),
  globalProductId: uuid('global_product_id').references(() => globalProducts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('global_order_items_order_sku_lot_unique').on(
    table.globalOrderId,
    table.sku,
    table.lotNumber,
    table.expirationDate,
  ),
  index('global_order_items_shipment_sku_idx').on(table.globalShipmentId, table.sku),
  index('global_order_items_shipment_product_idx').on(table.globalShipmentId, table.globalProductId),
]).enableRLS();

export const globalPackingResults = pgTable('global_packing_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  globalShipmentId: uuid('global_shipment_id').notNull().references(() => globalShipments.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 255 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  globalProductId: uuid('global_product_id').references(() => globalProducts.id, { onDelete: 'set null' }),
  totalUnits: integer('total_units').notNull(),
  innerQuantity: integer('inner_quantity').notNull(),
  cartonCount: integer('carton_count').notNull(),
  itemsPerLayer: integer('items_per_layer').notNull(),
  layersPerPallet: integer('layers_per_pallet').notNull(),
  cartonsPerPallet: integer('cartons_per_pallet').notNull(),
  palletCount: integer('pallet_count').notNull(),
  lastPalletCartons: integer('last_pallet_cartons').notNull(),
  unpackable: boolean('unpackable').default(false).notNull(),
  lots: jsonb('lots')
    .$type<Array<{ lotNumber: string | null; expirationDate: string | null; quantity: number }>>()
    .default([])
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('global_packing_results_shipment_sku_unique').on(table.globalShipmentId, table.sku),
  index('global_packing_results_shipment_id_idx').on(table.globalShipmentId),
]).enableRLS();

export const globalPackingMixedPallets = pgTable('global_packing_mixed_pallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  globalShipmentId: uuid('global_shipment_id').notNull().references(() => globalShipments.id, { onDelete: 'cascade' }),
  palletIndex: integer('pallet_index').notNull(),
  items: jsonb('items')
    .$type<import('@/lib/algorithms/mixed-pallet').PlacedCarton[]>()
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('global_packing_mixed_pallets_shipment_pallet_idx').on(table.globalShipmentId, table.palletIndex),
  index('global_packing_mixed_pallets_shipment_id_idx').on(table.globalShipmentId),
]).enableRLS();

export const globalPackingMixedPalletsRelations = relations(globalPackingMixedPallets, ({ one }) => ({
  shipment: one(globalShipments, {
    fields: [globalPackingMixedPallets.globalShipmentId],
    references: [globalShipments.id],
  }),
}));

export const globalProductGroupsRelations = relations(globalProductGroups, ({ many }) => ({
  products: many(globalProducts),
}));

export const globalProductsRelations = relations(globalProducts, ({ one }) => ({
  productGroup: one(globalProductGroups, {
    fields: [globalProducts.globalProductGroupId],
    references: [globalProductGroups.id],
  }),
}));

export const globalShipmentsRelations = relations(globalShipments, ({ many }) => ({
  orders: many(globalOrders),
  orderItems: many(globalOrderItems),
  packingResults: many(globalPackingResults),
  mixedPallets: many(globalPackingMixedPallets),
}));

export const globalOrdersRelations = relations(globalOrders, ({ one, many }) => ({
  shipment: one(globalShipments, {
    fields: [globalOrders.globalShipmentId],
    references: [globalShipments.id],
  }),
  orderItems: many(globalOrderItems),
}));

export const globalOrderItemsRelations = relations(globalOrderItems, ({ one }) => ({
  order: one(globalOrders, {
    fields: [globalOrderItems.globalOrderId],
    references: [globalOrders.id],
  }),
  shipment: one(globalShipments, {
    fields: [globalOrderItems.globalShipmentId],
    references: [globalShipments.id],
  }),
  product: one(globalProducts, {
    fields: [globalOrderItems.globalProductId],
    references: [globalProducts.id],
  }),
}));

export const globalPackingResultsRelations = relations(globalPackingResults, ({ one }) => ({
  shipment: one(globalShipments, {
    fields: [globalPackingResults.globalShipmentId],
    references: [globalShipments.id],
  }),
  product: one(globalProducts, {
    fields: [globalPackingResults.globalProductId],
    references: [globalProducts.id],
  }),
}));
