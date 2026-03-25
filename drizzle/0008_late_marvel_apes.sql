ALTER TABLE "boxes" DROP CONSTRAINT "boxes_box_group_id_box_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "boxes" ALTER COLUMN "box_group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_box_group_id_box_groups_id_fk" FOREIGN KEY ("box_group_id") REFERENCES "public"."box_groups"("id") ON DELETE set null ON UPDATE no action;