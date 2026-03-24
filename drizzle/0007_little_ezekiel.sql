CREATE TYPE "public"."aircap_type" AS ENUM('INDIVIDUAL', 'PER_ORDER', 'BOTH');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aircap_type" "aircap_type";--> statement-breakpoint
UPDATE "products" SET "aircap_type" = 'BOTH' WHERE "aircap_type" IS NULL;