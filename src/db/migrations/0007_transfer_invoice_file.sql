ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "invoice_file_name" text;
ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "invoice_file_type" text;
ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "invoice_file_size" integer;
ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "invoice_file_path" text;
