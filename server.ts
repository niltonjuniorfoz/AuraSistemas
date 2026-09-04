import express from "express";
import cors, { type CorsOptions } from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "./src/db";
import { roles, users } from "./src/db/schema";

import authRouter from "./src/server/auth";
import usersRouter from "./src/server/users";
import productsRouter from "./src/server/products";
import customersRouter from "./src/server/customers";
import groupsRouter from "./src/server/groups";
import shelvesRouter from "./src/server/shelves";
import auditRouter from "./src/server/auditRouter";
import salesRouter from "./src/server/sales";
import reportsRouter from "./src/server/reports";
import healthRouter from "./src/server/health";
import archivedRouter from "./src/server/archived";
import cashRouter from "./src/server/cash";
import { separationRouter } from "./src/server/separation";
import { deliveryRouter } from "./src/server/delivery";
import { serialsRouter } from "./src/server/serials";
import settingsRouter from "./src/server/settings";
import receiptsRouter from "./src/server/receipts";
import suppliersRouter from "./src/server/suppliers";
import purchasesRouter from "./src/server/purchases";
import expensesRouter from "./src/server/expenses";
import dashboardRouter from "./src/server/dashboard";
import notificationsRouter from "./src/server/notifications";
import analyticsRouter from "./src/server/analytics";
import transfersRouter from "./src/server/transfers";
import aiReportsRouter from "./src/server/aiReports";
import masterRouter from "./src/server/master";
import lotsRouter from "./src/server/lots";
import receivablesRouter from "./src/server/receivables";
import payablesRouter from "./src/server/payables";
import financeRouter from "./src/server/finance";
import fxRouter from "./src/server/fx";
import costLayersRouter from "./src/server/costLayers";
import personalRouter from "./src/server/personal";
import storeRouter from "./src/server/store";
import customerAuthRouter from "./src/server/customerAuth";
import intelligenceRouter from "./src/server/intelligence";
import statementsRouter from "./src/server/statements";
import { initAutomaticBackupSchedule, checkPendingAutomaticBackupNow } from "./src/server/backupService";
import { router as maintenanceRouter, purgeOldCanceledSales, purgeOldOcrJobs } from "./src/server/maintenance";
import { apiPerformanceLogger, markResponseStart } from "./src/server/performance";

function buildCorsOptions(): CorsOptions {
  if (process.env.NODE_ENV !== "production") {
    return {};
  }

  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return { origin: false };
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
}

function applyProductionSecurityHeaders(app: express.Express) {
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "microphone=(), geolocation=(), payment=()");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

    if (req.path.endsWith(".map")) {
      res.status(404).end();
      return;
    }

    next();
  });
}

async function runRuntimeDbTask(label: string, task: () => Promise<unknown>) {
  const startedAt = Date.now();
  try {
    await task();
    const duration = Date.now() - startedAt;
    if (duration >= 250) {
      console.log(`[PERF][DB-BOOT] ${label} ${duration}ms`);
    }
  } catch (err: any) {
    console.warn(`[PERF][DB-BOOT][SKIP] ${label}: ${err?.message || err}`);
  }
}

async function ensureRuntimeSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS abandoned_carts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_phone text NOT NULL UNIQUE,
        customer_name text,
        cart_data jsonb NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS store_pageviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        path text NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS store_pageviews_created_idx ON store_pageviews (created_at);`);
    await db.execute(sql`ALTER TABLE store_pageviews ADD COLUMN IF NOT EXISTS visitor_id text;`);
    await db.execute(sql`ALTER TABLE store_pageviews ADD COLUMN IF NOT EXISTS country text;`);
    await db.execute(sql`ALTER TABLE store_pageviews ADD COLUMN IF NOT EXISTS region text;`);
    await db.execute(sql`ALTER TABLE store_pageviews ADD COLUMN IF NOT EXISTS city text;`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS store_pageviews_visitor_idx ON store_pageviews (visitor_id);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        link text,
        read boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read);`);
    
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES products(id);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_name text;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3) NOT NULL DEFAULT '0';`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm numeric(10,2) NOT NULL DEFAULT '0';`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm numeric(10,2) NOT NULL DEFAULT '0';`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm numeric(10,2) NOT NULL DEFAULT '0';`);
    
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS cep text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS street text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS number text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS neighborhood text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS city text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS state text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS shipping_method text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS nfe_status text NOT NULL DEFAULT 'PENDING';`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS nfe_url text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS nfe_number text;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sale_returns (
        id uuid PRIMARY KEY,
        sale_id uuid NOT NULL REFERENCES sales(id),
        returned_by uuid NOT NULL REFERENCES users(id),
        authorized_by uuid NOT NULL REFERENCES users(id),
        notes text,
        total_amount_usd numeric(15,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'COMPLETED',
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sale_returns_sale_id_idx ON sale_returns(sale_id);`);

    await db.execute(sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'RUC';`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_lot boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_scheduled_at timestamp;`);
    await db.execute(sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_notes text;`);
    await db.execute(sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS lot_status text NOT NULL DEFAULT 'NOT_REQUIRED';`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sale_item_lots (
        id uuid PRIMARY KEY,
        sale_id uuid NOT NULL REFERENCES sales(id),
        sale_item_id uuid NOT NULL REFERENCES sale_items(id),
        product_id uuid NOT NULL REFERENCES products(id),
        lot_number text NOT NULL,
        quantity integer NOT NULL,
        created_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sale_item_lots_sale_id_idx ON sale_item_lots(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sale_item_lots_sale_item_id_idx ON sale_item_lots(sale_item_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sale_item_lots_product_lot_idx ON sale_item_lots(product_id, lot_number);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supplier_invoice_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id uuid NOT NULL REFERENCES suppliers(id),
        purchase_order_id uuid REFERENCES purchase_orders(id),
        ocr_job_id uuid REFERENCES purchase_ocr_jobs(id),
        file_name text NOT NULL,
        file_type text,
        file_size integer,
        file_path text NOT NULL,
        invoice_number text,
        invoice_date timestamp,
        observations text,
        source text NOT NULL DEFAULT 'MANUAL',
        created_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS supplier_invoice_files_supplier_id_idx ON supplier_invoice_files(supplier_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS supplier_invoice_files_purchase_order_id_idx ON supplier_invoice_files(purchase_order_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS supplier_invoice_files_ocr_job_id_idx ON supplier_invoice_files(ocr_job_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS supplier_invoice_files_created_at_idx ON supplier_invoice_files(created_at DESC);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        origin text NOT NULL DEFAULT 'Paraguai',
        destination text NOT NULL,
        carrier text,
        status text NOT NULL DEFAULT 'DRAFT',
        departure_at timestamp,
        expected_at timestamp,
        received_at timestamp,
        notes text,
        receipt_notes text,
        invoice_file_name text,
        invoice_file_type text,
        invoice_file_size integer,
        invoice_file_path text,
        created_by uuid NOT NULL REFERENCES users(id),
        received_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stock_transfer_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_id uuid NOT NULL REFERENCES stock_transfers(id),
        product_id uuid NOT NULL REFERENCES products(id),
        lot_sent text,
        lot_received text,
        quantity_sent integer NOT NULL,
        quantity_received integer NOT NULL DEFAULT 0,
        quantity_damaged integer NOT NULL DEFAULT 0,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_name text;`);
    await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_type text;`);
    await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_size integer;`);
    await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_path text;`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_status_idx ON stock_transfers(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_created_at_idx ON stock_transfers(created_at DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_expected_at_idx ON stock_transfers(expected_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfer_items_transfer_id_idx ON stock_transfer_items(transfer_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfer_items_product_id_idx ON stock_transfer_items(product_id);`);


    // Índices de runtime para manter filas, vendas, caixa e relatórios rápidos no Neon/Render.
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sales_fulfillment_created_at_idx ON sales(fulfillment_status, created_at DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sales_payment_created_at_idx ON sales(payment_status, created_at DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS separation_tasks_sale_id_idx ON separation_tasks(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS delivery_tasks_sale_id_idx ON delivery_tasks(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_reservations_sale_id_idx ON stock_reservations(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_reservations_product_id_idx ON stock_reservations(product_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_sale_id_idx ON payments(sale_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cash_movements_register_created_idx ON cash_movements(cash_register_id, created_at DESC);`);

    // Índices adicionais para reduzir latência nas telas mais usadas.
    await runRuntimeDbTask("sales_customer_created_at_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS sales_customer_created_at_idx ON sales(customer_id, created_at DESC);`));
    await runRuntimeDbTask("sales_order_created_at_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS sales_order_created_at_idx ON sales(order_status, created_at DESC);`));
    await runRuntimeDbTask("payments_sale_status_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS payments_sale_status_idx ON payments(sale_id, status);`));
    await runRuntimeDbTask("payments_created_status_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS payments_created_status_idx ON payments(created_at DESC, status);`));
    await runRuntimeDbTask("cash_registers_user_status_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS cash_registers_user_status_idx ON cash_registers(user_id, status, opened_at DESC);`));
    await runRuntimeDbTask("separation_tasks_status_created_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS separation_tasks_status_created_idx ON separation_tasks(status, created_at DESC);`));
    await runRuntimeDbTask("delivery_tasks_status_created_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS delivery_tasks_status_created_idx ON delivery_tasks(status, created_at DESC);`));
    await runRuntimeDbTask("stock_movements_product_created_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx ON stock_movements(product_id, created_at DESC);`));
    await runRuntimeDbTask("product_serials_serial_status_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS product_serials_serial_status_idx ON product_serials(serial_number, status);`));

    // Busca com ILIKE %texto% fica muito mais rápida com pg_trgm.
    // Se o banco não permitir extensão/GIN, o app continua subindo normalmente.
    await runRuntimeDbTask("pg_trgm_extension", () => db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`));
    await runRuntimeDbTask("products_name_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);`));
    await runRuntimeDbTask("products_sku_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS products_sku_trgm_idx ON products USING gin (sku gin_trgm_ops);`));
    await runRuntimeDbTask("products_upc_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS products_upc_trgm_idx ON products USING gin (upc gin_trgm_ops);`));
    await runRuntimeDbTask("products_brand_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON products USING gin (brand gin_trgm_ops);`));
    await runRuntimeDbTask("products_model_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS products_model_trgm_idx ON products USING gin (model gin_trgm_ops);`));
    await runRuntimeDbTask("customers_name_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS customers_name_trgm_idx ON customers USING gin (name gin_trgm_ops);`));
    await runRuntimeDbTask("customers_document_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS customers_document_trgm_idx ON customers USING gin (document gin_trgm_ops);`));
    await runRuntimeDbTask("suppliers_name_trgm_idx", () => db.execute(sql`CREATE INDEX IF NOT EXISTS suppliers_name_trgm_idx ON suppliers USING gin (name gin_trgm_ops);`));

    // FASE E3 — cupons e frete por região da loja online.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS store_coupons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        type text NOT NULL DEFAULT 'PERCENT',
        value numeric(12,2) NOT NULL,
        min_order_brl numeric(12,2),
        max_uses integer,
        used_count integer NOT NULL DEFAULT 0,
        valid_from timestamp,
        valid_until timestamp,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS store_order_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES store_orders(id),
        seq integer NOT NULL DEFAULT 1,
        amount_brl numeric(15,2) NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        proof_file_name text,
        proof_file_type text,
        proof_file_size integer,
        proof_data text,
        proof_sent_at timestamp,
        confirmed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS store_order_payments_order_idx ON store_order_payments(order_id);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payer_is_buyer boolean NOT NULL DEFAULT true;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payer_declared_name text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payer_declared_cpf text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS received_amount_brl numeric(15,2);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payer_name text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS receipt_checked_at timestamp;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamp;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_confirmed_ip text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_confirmed_user_agent text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS client_user_agent text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS terms_version text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS terms_snapshot text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS subtotal_brl numeric(15,2);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS coupon_code text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS discount_brl numeric(15,2);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS shipping_zone text;`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS shipping_fee_brl numeric(15,2);`);
    await db.execute(sql`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'PIX';`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS store_shipping_zones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        fee_brl numeric(12,2) NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS store_visible boolean NOT NULL DEFAULT true;`);
    await db.execute(sql`ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS icon text;`);
    await db.execute(sql`ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_groups_draft (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_group_id uuid REFERENCES product_groups(id),
        name text NOT NULL,
        icon text,
        store_visible boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        deleted boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS product_groups_draft_source_idx ON product_groups_draft (source_group_id);`);
    // Único parcial: no máximo um rascunho por categoria real, sem bloquear várias
    // categorias novas (source_group_id null) — sustenta o upsert race-free do PUT
    // /admin/categories/draft/:id.
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS product_groups_draft_source_group_unique ON product_groups_draft (source_group_id) WHERE source_group_id IS NOT NULL;`);

    // Minha Conta (loja pública)
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash text;`);
    // Login agora é por e-mail — precisa ser único pra achar a conta certa (parcial: ignora
    // quem não tem e-mail, que é a maioria dos clientes cadastrados antes dessa feature existir).
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON customers (lower(email)) WHERE email IS NOT NULL AND email <> '';`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL REFERENCES customers(id),
        label text NOT NULL DEFAULT 'Endereço',
        cep text,
        street text,
        number text,
        neighborhood text,
        city text,
        state text,
        is_default boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON customer_addresses (customer_id);`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_wishlist (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL REFERENCES customers(id),
        product_id uuid NOT NULL REFERENCES products(id),
        created_at timestamp DEFAULT now(),
        UNIQUE (customer_id, product_id)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS customer_wishlist_customer_idx ON customer_wishlist (customer_id);`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON customers (lower(email)) WHERE email IS NOT NULL AND email != '';`);

    // UPC de produto e documento de cliente (CPF/RUC/CNPJ) só tinham índice normal, não
    // restrição única — duas criações concorrentes com o mesmo valor passavam as duas
    // (achado da auditoria de banco de dados). Parcial: ignora vazio/nulo, igual o de e-mail.
    // Try/catch isolado: se algum dia existir duplicata real na base (import antigo, etc.), essa
    // statement falha sozinha sem derrubar os índices de performance que vêm depois dela.
    try {
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS products_upc_unique_idx ON products (upc) WHERE upc IS NOT NULL AND upc != '';`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_document_unique_idx ON customers (document) WHERE document IS NOT NULL AND document != '';`);
    } catch (err) {
      console.error("Não foi possível criar índice único de upc/document (provável duplicata existente):", err);
    }

    // Índices pra consultas frequentes sem índice (Painel, Caixa, POS, Compras) — table scan
    // completo a cada carregamento, piora conforme a tabela cresce.
    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS expenses_date_fixed_idx ON expenses (expense_date, is_fixed);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cash_registers_user_status_idx ON cash_registers (user_id, status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS product_serials_product_status_idx ON product_serials (product_id, status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS delivery_items_task_idx ON delivery_items (delivery_task_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS separation_items_task_idx ON separation_items (separation_task_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS purchase_order_items_order_idx ON purchase_order_items (purchase_order_id);`);

    // Oferta/Outlet por produto (subconjunto do mesmo estoque, com preço
    // próprio) — ver docs/superpowers/specs/2026-08-21-oferta-outlet-design.md
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS oferta_qty integer NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS oferta_price numeric(15,4);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS outlet_qty integer NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS outlet_price numeric(15,4);`);
    await db.execute(sql`ALTER TABLE product_serials ADD COLUMN IF NOT EXISTS channel text;`);
    await db.execute(sql`ALTER TABLE product_lots ADD COLUMN IF NOT EXISTS oferta_qty integer NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE product_lots ADD COLUMN IF NOT EXISTS outlet_qty integer NOT NULL DEFAULT 0;`);

    // Saldo de caixa por moeda (fundação para USDT como 4a moeda) — ver
    // Task 9 do plano de multi-moeda.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cash_register_balances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        register_id uuid NOT NULL REFERENCES cash_registers(id),
        currency text NOT NULL,
        opening_amount numeric(15,4) NOT NULL DEFAULT 0,
        declared_closing_amount numeric(15,4),
        expected_closing_amount numeric(15,4),
        difference_amount numeric(15,4),
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now(),
        UNIQUE (register_id, currency)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cash_register_balances_register_idx ON cash_register_balances(register_id);`);

    // Logo de marca pra secao "Marcas" da home da loja — ver
    // docs/superpowers/specs/2026-08-22-marcas-loja-design.md
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brand_logos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        logo_url text,
        sort_order integer NOT NULL DEFAULT 0,
        visible boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
  } catch (err) {
    console.error("Error ensuring runtime schema:", err);
  }
}

async function resetMasterPasswordFromEnv() {
  const newPassword = String(
    process.env.AURA_MASTER_RESET_PASSWORD || process.env.ORIGIN_MASTER_RESET_PASSWORD || "",
  ).trim();
  if (!newPassword) return;

  if (newPassword.length < 8) {
    console.error("[MASTER RESET] AURA_MASTER_RESET_PASSWORD precisa ter pelo menos 8 caracteres. Senha nao alterada.");
    return;
  }

  const masterRoleRows = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "Master")).limit(1);
  const masterRoleId = masterRoleRows[0]?.id;
  if (!masterRoleId) {
    console.error("[MASTER RESET] Funcao Master nao encontrada. Senha nao alterada.");
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  const updated = await db.update(users)
    .set({
      passwordHash: hash,
      roleId: masterRoleId,
      isActive: true,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.username, "master"))
    .returning({ id: users.id });

  if (!updated.length) {
    console.error("[MASTER RESET] Usuario master nao encontrado. Senha nao alterada.");
    return;
  }

  console.warn("[MASTER RESET] Senha do usuario master foi redefinida. Remova AURA_MASTER_RESET_PASSWORD do ambiente e faca novo deploy.");
}


async function ensureTransferChecklistSchema() {
  // Migração de compatibilidade executada no próprio servidor.
  // No Render o banco de produção não recebe `npm run db:push` automaticamente,
  // então estas instruções mantêm instalações antigas compatíveis com a versão atual.
  // try/catch própria (igual ensureRuntimeSchema já faz) — sem isso, uma falha em qualquer
  // statement aqui derrubava o boot do servidor inteiro em vez de só pular esta migração.
  try {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      title text,
      origin text NOT NULL DEFAULT 'Paraguai',
      destination text NOT NULL,
      carrier text,
      status text NOT NULL DEFAULT 'IN_TRANSIT',
      departure_at timestamp,
      expected_at timestamp,
      received_at timestamp,
      notes text,
      receipt_notes text,
      invoice_file_name text,
      invoice_file_type text,
      invoice_file_size integer,
      invoice_file_path text,
      created_by uuid NOT NULL REFERENCES users(id),
      received_by uuid REFERENCES users(id),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      transfer_id uuid NOT NULL REFERENCES stock_transfers(id),
      product_id uuid REFERENCES products(id),
      product_name text NOT NULL DEFAULT '',
      lot_sent text,
      lot_received text,
      quantity_sent integer NOT NULL,
      quantity_received integer NOT NULL DEFAULT 0,
      quantity_damaged integer NOT NULL DEFAULT 0,
      notes text,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);

  // Colunas acrescentadas nas versões mais novas do checklist de transferências.
  await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS title text;`);
  await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_name text;`);
  await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_type text;`);
  await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_size integer;`);
  await db.execute(sql`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS invoice_file_path text;`);
  await db.execute(sql`ALTER TABLE stock_transfer_items ADD COLUMN IF NOT EXISTS product_name text;`);

  // Preenche o nome dos itens antigos antes de tornar o campo obrigatório.
  await db.execute(sql`
    UPDATE stock_transfer_items AS item
    SET product_name = product.name
    FROM products AS product
    WHERE item.product_id = product.id
      AND COALESCE(item.product_name, '') = '';
  `);
  await db.execute(sql`
    UPDATE stock_transfer_items
    SET product_name = 'Produto sem nome'
    WHERE product_name IS NULL OR btrim(product_name) = '';
  `);

  // Produto manual não possui product_id e não deve ser cadastrado no estoque.
  await db.execute(sql`ALTER TABLE stock_transfer_items ALTER COLUMN product_id DROP NOT NULL;`);
  await db.execute(sql`ALTER TABLE stock_transfer_items ALTER COLUMN product_name SET DEFAULT '';`);
  await db.execute(sql`ALTER TABLE stock_transfer_items ALTER COLUMN product_name SET NOT NULL;`);

  // A interface atual registra a saída diretamente como Em trânsito.
  await db.execute(sql`
    UPDATE stock_transfers
    SET status = 'IN_TRANSIT',
        departure_at = COALESCE(departure_at, created_at, now())
    WHERE status = 'DRAFT';
  `);
  await db.execute(sql`ALTER TABLE stock_transfers ALTER COLUMN status SET DEFAULT 'IN_TRANSIT';`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_status_idx ON stock_transfers(status);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_created_at_idx ON stock_transfers(created_at DESC);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfers_expected_at_idx ON stock_transfers(expected_at);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfer_items_transfer_id_idx ON stock_transfer_items(transfer_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS stock_transfer_items_product_id_idx ON stock_transfer_items(product_id);`);
  } catch (err) {
    console.error("Error ensuring transfer checklist schema:", err);
  }
}

async function startServer() {
  const schemaStartedAt = Date.now();
  await ensureRuntimeSchema();
  await ensureTransferChecklistSchema();
  await resetMasterPasswordFromEnv();
  console.log(`[PERF][DB-BOOT] runtime schema checked in ${Date.now() - schemaStartedAt}ms`);
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  applyProductionSecurityHeaders(app);

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "4mb" }));
  app.use("/api", markResponseStart, apiPerformanceLogger);

  // Render Free pode acordar apenas quando alguém abre o sistema.
  // Essa checagem não bloqueia a requisição e garante backup pendente após reativação.
  app.use((req, _res, next) => {
    if (req.method === "GET" || req.path.startsWith("/api/")) {
      checkPendingAutomaticBackupNow(`${req.method} ${req.path}`).catch(() => {});
    }
    next();
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/shelves", shelvesRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/sales", receiptsRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/archived", archivedRouter);
  app.use("/api/cash", cashRouter);
  app.use("/api/separation", separationRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/serials", serialsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/suppliers", suppliersRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/lots", lotsRouter);
  app.use("/api/receivables", receivablesRouter);
  app.use("/api/payables", payablesRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/fx", fxRouter);
  app.use("/api/cost", costLayersRouter);
  app.use("/api/personal", personalRouter);
  // Loja online: /api/store/* tem rotas publicas (catalogo/pedido) e /admin/* protegidas.
  app.use("/api/store", storeRouter);
  // Minha Conta (cliente da loja) — mundo de auth separado do admin, ver customerAuth.ts.
  app.use("/api/store/account", customerAuthRouter);
  app.use("/api/intel", intelligenceRouter);
  app.use("/api/statements", statementsRouter);
  app.use("/api/ai-reports", aiReportsRouter);
  app.use("/api/maintenance", maintenanceRouter);
  app.use("/api/master", masterRouter);

  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      index: false,
      dotfiles: 'deny',
      setHeaders(res, filePath) {
        if (/\/assets\//.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    
    // Purge jobs on startup
    purgeOldCanceledSales().catch(err => console.error("Error purging canceled sales on startup:", err));
    purgeOldOcrJobs().catch(err => console.error("Error purging OCR jobs on startup:", err));
    
    initAutomaticBackupSchedule();

    // Run daily
    setInterval(() => {
       purgeOldCanceledSales().catch(() => {});
       purgeOldOcrJobs().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  });
}

startServer();
