ALTER TABLE "products" ADD COLUMN "aircap" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "products" SET "aircap" = true WHERE "aircap_type" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "aircap_type";--> statement-breakpoint
DROP TYPE "public"."aircap_type";