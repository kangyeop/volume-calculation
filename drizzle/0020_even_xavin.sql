CREATE TABLE "global_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_order_id" uuid NOT NULL,
	"sku" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"global_shipment_id" uuid NOT NULL,
	"global_product_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "global_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"global_shipment_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "global_packing_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_shipment_id" uuid NOT NULL,
	"sku" varchar(255) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"global_product_id" uuid,
	"total_units" integer NOT NULL,
	"inner_quantity" integer NOT NULL,
	"carton_count" integer NOT NULL,
	"items_per_layer" integer NOT NULL,
	"layers_per_pallet" integer NOT NULL,
	"cartons_per_pallet" integer NOT NULL,
	"pallet_count" integer NOT NULL,
	"last_pallet_cartons" integer NOT NULL,
	"unpackable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_packing_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "global_product_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_product_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "global_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sku" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"width" numeric(10, 2) NOT NULL,
	"length" numeric(10, 2) NOT NULL,
	"height" numeric(10, 2) NOT NULL,
	"inner_quantity" integer NOT NULL,
	"global_product_group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "global_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "shipment_status" DEFAULT 'PACKING' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "global_order_items" ADD CONSTRAINT "global_order_items_global_order_id_global_orders_id_fk" FOREIGN KEY ("global_order_id") REFERENCES "public"."global_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_order_items" ADD CONSTRAINT "global_order_items_global_shipment_id_global_shipments_id_fk" FOREIGN KEY ("global_shipment_id") REFERENCES "public"."global_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_order_items" ADD CONSTRAINT "global_order_items_global_product_id_global_products_id_fk" FOREIGN KEY ("global_product_id") REFERENCES "public"."global_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_orders" ADD CONSTRAINT "global_orders_global_shipment_id_global_shipments_id_fk" FOREIGN KEY ("global_shipment_id") REFERENCES "public"."global_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_packing_results" ADD CONSTRAINT "global_packing_results_global_shipment_id_global_shipments_id_fk" FOREIGN KEY ("global_shipment_id") REFERENCES "public"."global_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_packing_results" ADD CONSTRAINT "global_packing_results_global_product_id_global_products_id_fk" FOREIGN KEY ("global_product_id") REFERENCES "public"."global_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_products" ADD CONSTRAINT "global_products_global_product_group_id_global_product_groups_id_fk" FOREIGN KEY ("global_product_group_id") REFERENCES "public"."global_product_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "global_order_items_order_sku_unique" ON "global_order_items" USING btree ("global_order_id","sku");--> statement-breakpoint
CREATE INDEX "global_order_items_shipment_sku_idx" ON "global_order_items" USING btree ("global_shipment_id","sku");--> statement-breakpoint
CREATE INDEX "global_order_items_shipment_product_idx" ON "global_order_items" USING btree ("global_shipment_id","global_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_orders_shipment_order_unique" ON "global_orders" USING btree ("global_shipment_id","order_number");--> statement-breakpoint
CREATE INDEX "global_orders_shipment_id_idx" ON "global_orders" USING btree ("global_shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_packing_results_shipment_sku_unique" ON "global_packing_results" USING btree ("global_shipment_id","sku");--> statement-breakpoint
CREATE INDEX "global_packing_results_shipment_id_idx" ON "global_packing_results" USING btree ("global_shipment_id");--> statement-breakpoint
CREATE INDEX "global_product_groups_user_id_idx" ON "global_product_groups" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_products_user_sku_unique" ON "global_products" USING btree ("user_id","sku");--> statement-breakpoint
CREATE INDEX "global_products_user_id_idx" ON "global_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "global_shipments_user_id_idx" ON "global_shipments" USING btree ("user_id");