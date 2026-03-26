UPDATE "product_groups" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "products" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "box_groups" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "boxes" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "shipments" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "projects" SET "user_id" = '22f3fb10-db5d-419c-8426-ad93aedaa69b' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "product_groups" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "box_groups" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "user_id" SET NOT NULL;
