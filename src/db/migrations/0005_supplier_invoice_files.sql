CREATE TABLE IF NOT EXISTS "supplier_invoice_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id"),
  "purchase_order_id" uuid REFERENCES "purchase_orders"("id"),
  "ocr_job_id" uuid REFERENCES "purchase_ocr_jobs"("id"),
  "file_name" text NOT NULL,
  "file_type" text,
  "file_size" integer,
  "file_path" text NOT NULL,
  "invoice_number" text,
  "invoice_date" timestamp,
  "observations" text,
  "source" text NOT NULL DEFAULT 'MANUAL',
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "supplier_invoice_files_supplier_id_idx" ON "supplier_invoice_files" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_invoice_files_purchase_order_id_idx" ON "supplier_invoice_files" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "supplier_invoice_files_ocr_job_id_idx" ON "supplier_invoice_files" ("ocr_job_id");
CREATE INDEX IF NOT EXISTS "supplier_invoice_files_created_at_idx" ON "supplier_invoice_files" ("created_at");
