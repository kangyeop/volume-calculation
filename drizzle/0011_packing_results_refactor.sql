TRUNCATE TABLE "packing_result_details";--> statement-breakpoint
TRUNCATE TABLE "packing_results";--> statement-breakpoint
DROP TABLE "packing_result_details";--> statement-breakpoint
ALTER TABLE "packing_results" DROP CONSTRAINT "packing_results_shipment_id_shipments_id_fk";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_id";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_name";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_width";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_length";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_height";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "box_group_id";--> statement-breakpoint
ALTER TABLE "packing_results" DROP COLUMN "order_id";--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "order_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "box_id" uuid;--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "items" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "packing_results" ADD CONSTRAINT "packing_results_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_results" ADD CONSTRAINT "packing_results_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_results" ADD CONSTRAINT "packing_results_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "packing_results_order_id_unique" ON "packing_results" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "packing_results_shipment_id_idx" ON "packing_results" USING btree ("shipment_id");
