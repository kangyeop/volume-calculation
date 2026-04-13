DROP INDEX "global_order_items_order_sku_unique";--> statement-breakpoint
ALTER TABLE "global_order_items" ADD COLUMN "lot_number" varchar(100);--> statement-breakpoint
ALTER TABLE "global_order_items" ADD COLUMN "expiration_date" date;--> statement-breakpoint
ALTER TABLE "global_packing_results" ADD COLUMN "lots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "global_order_items_order_sku_lot_unique" ON "global_order_items" USING btree ("global_order_id","sku","lot_number","expiration_date");