CREATE TYPE "public"."shipment_status" AS ENUM('PACKING', 'CONFIRMED');--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "status" "shipment_status" DEFAULT 'PACKING' NOT NULL;