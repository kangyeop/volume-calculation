CREATE TYPE "public"."shipment_type" AS ENUM('SHIPMENT', 'SETTLEMENT');--> statement-breakpoint
ALTER TABLE "box_groups" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_groups" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "type" "shipment_type" DEFAULT 'SHIPMENT' NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_order_id_idx" ON "orders" USING btree ("order_id");