ALTER TABLE "purchase_order_items" ADD COLUMN "update_cost" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "update_price_a" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "update_price_b" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD COLUMN "update_price_c" boolean DEFAULT false;