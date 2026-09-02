ALTER TABLE "stock_transfers"
  ADD COLUMN IF NOT EXISTS "title" text;

ALTER TABLE "stock_transfer_items"
  ADD COLUMN IF NOT EXISTS "product_name" text DEFAULT '' NOT NULL;

UPDATE "stock_transfer_items" AS item
SET "product_name" = product."name"
FROM "products" AS product
WHERE item."product_id" = product."id"
  AND COALESCE(item."product_name", '') = '';

ALTER TABLE "stock_transfer_items"
  ALTER COLUMN "product_id" DROP NOT NULL;

UPDATE "stock_transfers"
SET "status" = 'IN_TRANSIT',
    "departure_at" = COALESCE("departure_at", "created_at", now())
WHERE "status" = 'DRAFT';

ALTER TABLE "stock_transfers"
  ALTER COLUMN "status" SET DEFAULT 'IN_TRANSIT';
