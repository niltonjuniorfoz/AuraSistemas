CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "origin" text DEFAULT 'Paraguai' NOT NULL,
  "destination" text NOT NULL,
  "carrier" text,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "departure_at" timestamp,
  "expected_at" timestamp,
  "received_at" timestamp,
  "notes" text,
  "receipt_notes" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "received_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transfer_id" uuid NOT NULL REFERENCES "stock_transfers"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "lot_sent" text,
  "lot_received" text,
  "quantity_sent" integer NOT NULL,
  "quantity_received" integer DEFAULT 0 NOT NULL,
  "quantity_damaged" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stock_transfers_status_idx" ON "stock_transfers" ("status");
CREATE INDEX IF NOT EXISTS "stock_transfers_created_at_idx" ON "stock_transfers" ("created_at");
CREATE INDEX IF NOT EXISTS "stock_transfers_expected_at_idx" ON "stock_transfers" ("expected_at");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items" ("transfer_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_product_id_idx" ON "stock_transfer_items" ("product_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_lot_idx" ON "stock_transfer_items" ("product_id", "lot_sent");
