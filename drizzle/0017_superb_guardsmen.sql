CREATE INDEX "box_groups_user_id_idx" ON "box_groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "boxes_user_id_idx" ON "boxes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "boxes_box_group_id_idx" ON "boxes" USING btree ("box_group_id");--> statement-breakpoint
CREATE INDEX "orders_shipment_id_idx" ON "orders" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "product_groups_user_id_idx" ON "product_groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_user_id_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shipments_user_id_idx" ON "shipments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shipments_user_type_idx" ON "shipments" USING btree ("user_id","type");