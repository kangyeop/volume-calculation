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
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'PROCESSING', 'COMPLETED']);
export const shipmentStatusEnum = pgEnum('shipment_status', ['PACKING', 'CONFIRMED']);
export const aircapTypeEnum = pgEnum('aircap_type', ['INDIVIDUAL', 'PER_ORDER', 'BOTH']);
export const stockChangeTypeEnum = pgEnum('stock_change_type', ['INBOUND', 'OUTBOUND', 'INITIAL', 'ADJUSTMENT']);

export const productGroups = pgTable('product_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  boxGroupId: uuid('box_group_id').notNull().references(() => boxGroups.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  barcode: boolean('barcode').default(false).notNull(),
  aircapType: aircapTypeEnum('aircap_type'),
  productGroupId: uuid('product_group_id').notNull().references(() => productGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('products_user_sku_unique').on(table.userId, table.sku),
]);

export const boxGroups = pgTable('box_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

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
});

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
]);

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: shipmentStatusEnum('status').default('PACKING').notNull(),
  note: text('note'),
  lastBoxGroupId: uuid('last_box_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('orders_shipment_order_unique').on(table.shipmentId, table.orderId),
]);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  orderIdentifier: varchar('order_identifier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('order_items_shipment_product_idx').on(table.shipmentId, table.productId),
  index('order_items_shipment_order_idx').on(table.shipmentId, table.orderId),
]);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

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
]);

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
]);

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
