ALTER TABLE "product_groups" ADD COLUMN "box_group_id" uuid;--> statement-breakpoint
UPDATE "product_groups" SET "box_group_id" = (SELECT "id" FROM "box_groups" ORDER BY "created_at" ASC LIMIT 1) WHERE "box_group_id" IS NULL;--> statement-breakpoint
ALTER TABLE "product_groups" ALTER COLUMN "box_group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_box_group_id_box_groups_id_fk" FOREIGN KEY ("box_group_id") REFERENCES "public"."box_groups"("id") ON DELETE no action ON UPDATE no action;
