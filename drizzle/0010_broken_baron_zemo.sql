CREATE TYPE "public"."stock_change_type" AS ENUM('INBOUND', 'OUTBOUND', 'INITIAL', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "box_stock_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"box_id" uuid NOT NULL,
	"type" "stock_change_type" NOT NULL,
	"quantity" integer NOT NULL,
	"result_stock" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "box_stock_histories" ADD CONSTRAINT "box_stock_histories_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "box_stock_histories_box_id_idx" ON "box_stock_histories" USING btree ("box_id");