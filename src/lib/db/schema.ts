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
export const uploadTypeEnum = pgEnum('upload_type', ['outbound', 'product']);

export const productGroups = pgTable('product_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  productGroupId: uuid('product_group_id').notNull().references(() => productGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('products_sku_unique').on(table.sku),
]);

export const boxGroups = pgTable('box_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const boxes = pgTable('boxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  boxGroupId: uuid('box_group_id').notNull().references(() => boxGroups.id, { onDelete: 'cascade' }),
  width: numeric('width', { precision: 10, scale: 2 }).notNull(),
  length: numeric('length', { precision: 10, scale: 2 }).notNull(),
  height: numeric('height', { precision: 10, scale: 2 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const outboundBatches = pgTable('outbound_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  packingRecommendation: jsonb('packing_recommendation'),
  lastBoxGroupId: uuid('last_box_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  address: text('address'),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  outboundBatchId: uuid('outbound_batch_id').notNull().references(() => outboundBatches.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('orders_batch_order_unique').on(table.outboundBatchId, table.orderId),
]);

export const outboundItems = pgTable('outbound_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  outboundBatchId: uuid('outbound_batch_id').notNull().references(() => outboundBatches.id),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  orderIdentifier: varchar('order_identifier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('outbound_items_batch_product_idx').on(table.outboundBatchId, table.productId),
  index('outbound_items_batch_order_idx').on(table.outboundBatchId, table.orderId),
]);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
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
  boxId: varchar('box_id', { length: 255 }),
  boxName: varchar('box_name', { length: 255 }),
  packedCount: integer('packed_count').notNull(),
  efficiency: numeric('efficiency', { precision: 10, scale: 4 }).notNull(),
  totalCBM: numeric('total_cbm', { precision: 10, scale: 4 }).notNull(),
  groupLabel: varchar('group_label', { length: 255 }),
  orderId: varchar('order_id', { length: 255 }),
  boxNumber: integer('box_number'),
  outboundBatchId: uuid('outbound_batch_id').notNull().references(() => outboundBatches.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const packingResultDetails = pgTable('packing_result_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  outboundBatchId: uuid('outbound_batch_id').notNull().references(() => outboundBatches.id),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  sku: varchar('sku', { length: 255 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  boxName: varchar('box_name', { length: 255 }).notNull(),
  boxNumber: integer('box_number').notNull(),
  boxIndex: integer('box_index').notNull(),
  boxCBM: numeric('box_cbm', { precision: 10, scale: 4 }).notNull(),
  efficiency: numeric('efficiency', { precision: 10, scale: 4 }).notNull(),
  unpacked: boolean('unpacked'),
  unpackedReason: text('unpacked_reason'),
  placements: jsonb('placements'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const uploadTemplates = pgTable('upload_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: uploadTypeEnum('type').notNull(),
  headers: jsonb('headers').notNull().$type<string[]>(),
  columnMapping: jsonb('column_mapping').notNull().$type<Record<string, string>>(),
  rowStructure: varchar('row_structure', { length: 50 }).default('single').notNull(),
  compoundPattern: varchar('compound_pattern', { length: 255 }),
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const productGroupsRelations = relations(productGroups, ({ many }) => ({
  products: many(products),
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

export const boxesRelations = relations(boxes, ({ one }) => ({
  boxGroup: one(boxGroups, {
    fields: [boxes.boxGroupId],
    references: [boxGroups.id],
  }),
}));

export const outboundBatchesRelations = relations(outboundBatches, ({ many }) => ({
  orders: many(orders),
  outboundItems: many(outboundItems),
  packingResults: many(packingResults),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  outboundBatch: one(outboundBatches, {
    fields: [orders.outboundBatchId],
    references: [outboundBatches.id],
  }),
  outboundItems: many(outboundItems),
}));

export const outboundItemsRelations = relations(outboundItems, ({ one }) => ({
  outboundBatch: one(outboundBatches, {
    fields: [outboundItems.outboundBatchId],
    references: [outboundBatches.id],
  }),
  product: one(products, {
    fields: [outboundItems.productId],
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
  outboundBatch: one(outboundBatches, {
    fields: [packingResults.outboundBatchId],
    references: [outboundBatches.id],
  }),
}));

export const packingResultDetailsRelations = relations(packingResultDetails, ({ one }) => ({
  outboundBatch: one(outboundBatches, {
    fields: [packingResultDetails.outboundBatchId],
    references: [outboundBatches.id],
  }),
}));
