CREATE TYPE "public"."mapping_type" AS ENUM('shipment', 'settlement', 'product');--> statement-breakpoint
CREATE TABLE "column_mapping_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "mapping_type" NOT NULL,
	"mapping" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "column_mapping_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "column_mapping_templates_user_id_idx" ON "column_mapping_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "column_mapping_templates_user_type_idx" ON "column_mapping_templates" USING btree ("user_id","type");