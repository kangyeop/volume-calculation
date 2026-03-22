ALTER TABLE "packing_results" ADD COLUMN "box_width" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "box_length" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "box_height" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "box_group_id" varchar(255);--> statement-breakpoint
ALTER TABLE "packing_results" ADD COLUMN "group_index" integer;--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "packing_recommendation";