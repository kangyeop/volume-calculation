DROP INDEX "products_sku_unique";--> statement-breakpoint
ALTER TABLE "box_groups" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "product_groups" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "products_user_sku_unique" ON "products" USING btree ("user_id","sku");