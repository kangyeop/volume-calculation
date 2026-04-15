CREATE TABLE "global_packing_mixed_pallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_shipment_id" uuid NOT NULL,
	"pallet_index" integer NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_packing_mixed_pallets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "global_packing_mixed_pallets" ADD CONSTRAINT "global_packing_mixed_pallets_global_shipment_id_global_shipments_id_fk" FOREIGN KEY ("global_shipment_id") REFERENCES "public"."global_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "global_packing_mixed_pallets_shipment_pallet_idx" ON "global_packing_mixed_pallets" USING btree ("global_shipment_id","pallet_index");--> statement-breakpoint
CREATE INDEX "global_packing_mixed_pallets_shipment_id_idx" ON "global_packing_mixed_pallets" USING btree ("global_shipment_id");