CREATE TABLE "delivery_payment_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"authorized_by" uuid NOT NULL,
	"authorized_at" timestamp DEFAULT now(),
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'FIXED' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"description" text NOT NULL,
	"expense_date" timestamp DEFAULT now() NOT NULL,
	"amount_usd" numeric(15, 2) NOT NULL,
	"payment_method" text,
	"notes" text,
	"is_fixed" boolean DEFAULT false,
	"due_day" integer,
	"is_active" boolean DEFAULT true,
	"recurrence" text DEFAULT 'NONE' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"total_deleted" integer DEFAULT 0 NOT NULL,
	"executed_at" timestamp DEFAULT now(),
	"executed_by" uuid,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "purchase_ocr_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text,
	"file_type" text,
	"file_size" integer,
	"file_path" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"raw_text" text,
	"parsed_json" text,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "ocr_job_id" uuid;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "unit_cost_at_sale" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "total_cost_at_sale" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "profit_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "canceled_by" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "delivery_payment_overrides" ADD CONSTRAINT "delivery_payment_overrides_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_payment_overrides" ADD CONSTRAINT "delivery_payment_overrides_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_payment_overrides" ADD CONSTRAINT "delivery_payment_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_ocr_jobs" ADD CONSTRAINT "purchase_ocr_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_canceled_by_users_id_fk" FOREIGN KEY ("canceled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_document_idx" ON "customers" USING btree ("document");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_upc_idx" ON "products" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_model_idx" ON "products" USING btree ("model");--> statement-breakpoint
CREATE INDEX "products_is_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sales_number_idx" ON "sales" USING btree ("number");--> statement-breakpoint
CREATE INDEX "sales_series_idx" ON "sales" USING btree ("series");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_customer_id_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_payment_status_idx" ON "sales" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "sales_fulfillment_status_idx" ON "sales" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "sales_order_status_idx" ON "sales" USING btree ("order_status");