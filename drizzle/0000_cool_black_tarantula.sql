-- Baseline migration: Rename outbound tables to shipment/order_items
-- All other tables already exist in the DB

ALTER TABLE "outbound_batches" RENAME TO "shipments";--> statement-breakpoint
ALTER TABLE "outbound_items" RENAME TO "order_items";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "outbound_batch_id" TO "shipment_id";--> statement-breakpoint
ALTER TABLE "order_items" RENAME COLUMN "outbound_batch_id" TO "shipment_id";--> statement-breakpoint
ALTER TABLE "packing_results" RENAME COLUMN "outbound_batch_id" TO "shipment_id";--> statement-breakpoint
ALTER TABLE "packing_result_details" RENAME COLUMN "outbound_batch_id" TO "shipment_id";--> statement-breakpoint
ALTER INDEX "orders_batch_order_unique" RENAME TO "orders_shipment_order_unique";--> statement-breakpoint
ALTER INDEX "outbound_items_batch_product_idx" RENAME TO "order_items_shipment_product_idx";--> statement-breakpoint
ALTER INDEX "outbound_items_batch_order_idx" RENAME TO "order_items_shipment_order_idx";
