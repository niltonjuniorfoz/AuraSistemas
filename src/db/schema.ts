import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, boolean, timestamp, primaryKey, uuid, numeric, serial, unique, uniqueIndex, index, jsonb, AnyPgColumn } from "drizzle-orm/pg-core";

export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name"),
  tradeName: text("trade_name"),
  documentType: text("document_type").default("RUC"),
  documentNumber: text("document_number"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  logoUrl: text("logo_url"),
  whatsappGateway: text("whatsapp_gateway"), // WhatsApp fixo p/ enviar comprovantes de pagamento
  instagramUrl: text("instagram_url"), // perfil público exibido no cabeçalho e rodapé da loja
  defaultCurrency: text("default_currency").default("BRL"),
  defaultIvaPercentage: text("default_iva_percentage").default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const currencies = pgTable("currencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // USD, BRL, PYG
  name: text("name"),
  rateToUsd: numeric("rate_to_usd").notNull().default("1"), // How many units of this currency makes 1 USD. e.g. 1 USD = 5.5 BRL. For BRL, rateToUsd = 5.5
  symbol: text("symbol"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id)
});

export const fiscalSettings = pgTable("fiscal_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ivaEnabled: boolean("iva_enabled").default(true),
  defaultIvaPy: numeric("default_iva_py").default("10"),
  defaultIvaForeign: numeric("default_iva_foreign").default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const printerSettings = pgTable("printer_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptFormat: text("receipt_format").default("80mm"), // 80mm or 58mm
  adminFormat: text("admin_format").default("A4"), // A4 or A5
  printMode: text("print_mode").default("browser"), // browser or agent
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: text("module").notNull(),
  action: text("action").notNull(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  name: text("name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).notNull().default("0"), // % de comissão do vendedor
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const productGroups = pgTable("product_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  storeVisible: boolean("store_visible").notNull().default(true), // aparece na navegação de categorias da loja pública
  // Ícone da categoria na loja pública (ver ICON_KEYS em categoryIcons.tsx).
  // null = mantém o comportamento antigo, adivinha pelo nome da categoria.
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0), // ordem na navegação da loja (editor visual)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Rascunho de categoria pro editor visual da loja (ver docs/superpowers/specs/
// 2026-08-20-editor-visual-loja-design.md §3.5). sourceGroupId null = categoria
// nova, ainda sem equivalente em product_groups. deleted=true = marcada pra
// apagar (soft-archive, igual Groups.tsx já faz) quando publicar.
export const productGroupsDraft = pgTable("product_groups_draft", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceGroupId: uuid("source_group_id").references(() => productGroups.id),
  name: text("name").notNull(),
  icon: text("icon"),
  storeVisible: boolean("store_visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Índice único parcial: garante no máximo um rascunho por categoria real
  // (sourceGroupId != null), sem bloquear múltiplos rascunhos de categoria
  // nova (sourceGroupId null). Sustenta o upsert race-free do PUT
  // /admin/categories/draft/:id em store.ts.
  sourceGroupUnique: uniqueIndex("product_groups_draft_source_group_unique")
    .on(table.sourceGroupId)
    .where(sql`${table.sourceGroupId} IS NOT NULL`),
}));

export const productSubgroups = pgTable("product_subgroups", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => productGroups.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const shelves = pgTable("shelves", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").references((): AnyPgColumn => products.id),
  variantName: text("variant_name"),
  sku: text("sku").notNull().unique(),
  upc: text("upc"),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  brand: text("brand"),
  model: text("model"),
  groupId: uuid("group_id").references(() => productGroups.id),
  subgroupId: uuid("subgroup_id").references(() => productSubgroups.id),
  shelfId: uuid("shelf_id").references(() => shelves.id),
  unitMeasure: text("unit_measure").notNull().default("UN"),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull().default("0"),
  widthCm: numeric("width_cm", { precision: 10, scale: 2 }).notNull().default("0"),
  heightCm: numeric("height_cm", { precision: 10, scale: 2 }).notNull().default("0"),
  lengthCm: numeric("length_cm", { precision: 10, scale: 2 }).notNull().default("0"),
  costPrice: numeric("cost_price", { precision: 15, scale: 4 }).notNull().default("0"),
  salePriceA: numeric("sale_price_a", { precision: 15, scale: 2 }).notNull().default("0"), // A = Varejo
  salePriceB: numeric("sale_price_b", { precision: 15, scale: 2 }).notNull().default("0"), // B = Atacado
  salePriceC: numeric("sale_price_c", { precision: 15, scale: 2 }).notNull().default("0"), // Campo legado. Não exibir ao usuário e não usar em cálculos.
  costCurrency: text("cost_currency").notNull().default("BRL"),
  saleCurrency: text("sale_currency").notNull().default("BRL"),
  ivaPercentage: numeric("iva_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  hasSerialNumber: boolean("has_serial_number").notNull().default(false),
  requiresLot: boolean("requires_lot").notNull().default(false),
  // Oferta/Outlet: subconjuntos do MESMO estoque (não somam quantidade
  // nova), cada um com preço próprio. Ver docs/superpowers/specs/2026-08-21-oferta-outlet-design.md
  ofertaQty: integer("oferta_qty").notNull().default(0),
  ofertaPrice: numeric("oferta_price", { precision: 15, scale: 4 }),
  outletQty: integer("outlet_qty").notNull().default(0),
  outletPrice: numeric("outlet_price", { precision: 15, scale: 4 }),
  minStock: integer("min_stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  storeVisible: boolean("store_visible").notNull().default(true), // aparece na loja online (Fase C)
  storeDescription: text("store_description"), // texto da vitrine (opcional)
  technicalSpecs: jsonb("technical_specs").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  skuIdx: index("products_sku_idx").on(table.sku),
  upcIdx: index("products_upc_idx").on(table.upc),
  nameIdx: index("products_name_idx").on(table.name),
  brandIdx: index("products_brand_idx").on(table.brand),
  modelIdx: index("products_model_idx").on(table.model),
  isActiveIdx: index("products_is_active_idx").on(table.isActive),
}));

// Logo de marca (Apple, Asus, Amazon...) pra seção "Marcas" da home da loja.
// `name` bate com o valor livre já usado em products.brand — a lista de
// marcas mostradas no admin combina o que já existe aqui com toda marca
// distinta encontrada em products.brand ainda sem logo cadastrado.
export const brandLogos = pgTable("brand_logos", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  logoUrl: text("logo_url"), // null = detectada mas sem logo ainda (não aparece na loja)
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  imageUrl: text("image_url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("PERSON"), // PERSON, COMPANY
  nationality: text("nationality").notNull().default("PY"), // PY, FOREIGN
  documentType: text("document_type").default("CPF"), // RUC, CPF, CNPJ, PASSPORT, CI, OTHER
  document: text("document"),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash"), // null = cliente ainda sem senha (conta pra "reivindicar" na loja, ver Minha Conta)
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Brasil"),
  observations: text("observations"),
  isActive: boolean("is_active").notNull().default(true),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }).notNull().default("0"),
  priceTable: text("price_table").notNull().default("A"), // A, B, C
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  nameIdx: index("customers_name_idx").on(table.name),
  documentIdx: index("customers_document_idx").on(table.document),
  phoneIdx: index("customers_phone_idx").on(table.phone),
}));

export const stockBalances = pgTable("stock_balances", {
  productId: uuid("product_id").primaryKey().references(() => products.id),
  physicalStock: integer("physical_stock").notNull().default(0),
  reservedStock: integer("reserved_stock").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saldo de estoque por lote, com validade. Para produtos com requiresLot=true,
// a soma de physicalStock dos lotes deve espelhar o physical de stock_balances.
// O consumo do lote acontece na ENTREGA (saída real), usando a alocação de sale_item_lots.
export const productLots = pgTable("product_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  lotNumber: text("lot_number").notNull(),
  expiryDate: timestamp("expiry_date"),
  physicalStock: integer("physical_stock").notNull().default(0),
  // Quanto DESTE lote está em cada canal — productLots é 1 linha por LOTE
  // (com uma quantidade), não por unidade, então a divisão é por número,
  // não por linha inteira. ofertaQty + outletQty <= physicalStock.
  ofertaQty: integer("oferta_qty").notNull().default(0),
  outletQty: integer("outlet_qty").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.productId, t.lotNumber),
  productIdx: index("product_lots_product_idx").on(t.productId),
  expiryIdx: index("product_lots_expiry_idx").on(t.expiryDate),
}));

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  movementType: text("movement_type").notNull(), 
  referenceId: text("reference_id"), 
  beforePhysical: integer("before_physical").notNull(),
  afterPhysical: integer("after_physical").notNull(),
  beforeReserved: integer("before_reserved").notNull(),
  afterReserved: integer("after_reserved").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), 
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  oldValues: text("old_values"), 
  newValues: text("new_values"), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  series: text("series").default("001"),
  number: integer("number").notNull().generatedAlwaysAsIdentity(),
  customerId: uuid("customer_id").references(() => customers.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  orderStatus: text("order_status").notNull().default("CONFIRMED"), 
  paymentStatus: text("payment_status").notNull().default("PENDING"),
  fulfillmentStatus: text("fulfillment_status").notNull().default("PENDING"),
  deliveryScheduledAt: timestamp("delivery_scheduled_at"),
  deliveryNotes: text("delivery_notes"),
  dueDate: timestamp("due_date"), // Vencimento da venda a prazo (contas a receber)
  lotStatus: text("lot_status").notNull().default("NOT_REQUIRED"),
  priceTable: text("price_table").notNull().default("A"),
  subtotalAmount: numeric("subtotal_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  ivaAmount: numeric("iva_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow(),
  canceledAt: timestamp("canceled_at"),
  canceledBy: uuid("canceled_by").references(() => users.id),
  cancelReason: text("cancel_reason"),
}, (table) => ({
  numberIdx: index("sales_number_idx").on(table.number),
  seriesIdx: index("sales_series_idx").on(table.series),
  createdAtIdx: index("sales_created_at_idx").on(table.createdAt),
  customerIdIdx: index("sales_customer_id_idx").on(table.customerId),
  paymentStatusIdx: index("sales_payment_status_idx").on(table.paymentStatus),
  fulfillmentStatusIdx: index("sales_fulfillment_status_idx").on(table.fulfillmentStatus),
  orderStatusIdx: index("sales_order_status_idx").on(table.orderStatus),
}));

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  unitCostAtSale: numeric("unit_cost_at_sale", { precision: 15, scale: 2 }),
  totalCostAtSale: numeric("total_cost_at_sale", { precision: 15, scale: 2 }),
  profitAmount: numeric("profit_amount", { precision: 15, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  ivaAmount: numeric("iva_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }).notNull(),
  priceTable: text("price_table").notNull().default("A"),
}, (table) => ({
  saleIdIdx: index("sale_items_sale_id_idx").on(table.saleId),
  productIdIdx: index("sale_items_product_id_idx").on(table.productId),
}));


export const saleItemLots = pgTable("sale_item_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("sale_item_lots_sale_id_idx").on(table.saleId),
  saleItemIdIdx: index("sale_item_lots_sale_item_id_idx").on(table.saleItemId),
  productLotIdx: index("sale_item_lots_product_lot_idx").on(table.productId, table.lotNumber),
}));

export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("ACTIVE"), 
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("stock_reservations_sale_id_idx").on(table.saleId),
  productIdIdx: index("stock_reservations_product_id_idx").on(table.productId),
  statusIdx: index("stock_reservations_status_idx").on(table.status),
}));

export const cashRegisters = pgTable("cash_registers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("OPEN"), // OPEN, CLOSED
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  openingAmountUsd: numeric("opening_amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
  declaredClosingAmountUsd: numeric("declared_closing_amount_usd", { precision: 15, scale: 2 }),
  expectedClosingAmountUsd: numeric("expected_closing_amount_usd", { precision: 15, scale: 2 }),
  differenceAmountUsd: numeric("difference_amount_usd", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saldo de caixa por moeda — uma linha por moeda usada naquele turno (moeda
// sem movimento não gera linha). cashRegisters mantém as 4 colunas *Usd como
// "total equivalente convertido" (soma destas linhas pela cotação do dia) —
// dashboards antigos que já leem essas colunas continuam funcionando.
export const cashRegisterBalances = pgTable("cash_register_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  registerId: uuid("register_id").notNull().references(() => cashRegisters.id),
  currency: text("currency").notNull(), // BRL, USD, PYG, USDT
  openingAmount: numeric("opening_amount", { precision: 15, scale: 4 }).notNull().default("0"),
  declaredClosingAmount: numeric("declared_closing_amount", { precision: 15, scale: 4 }),
  expectedClosingAmount: numeric("expected_closing_amount", { precision: 15, scale: 4 }),
  differenceAmount: numeric("difference_amount", { precision: 15, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  registerCurrencyUq: unique("cash_register_balances_register_currency_uq").on(t.registerId, t.currency),
  registerIdx: index("cash_register_balances_register_idx").on(t.registerId),
}));

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  cashRegisterId: uuid("cash_register_id").notNull().references(() => cashRegisters.id),
  paymentMethod: text("payment_method").notNull(), // CASH, PIX, CREDIT_CARD, DEBIT_CARD, TRANSFER
  currency: text("currency").notNull().default("USD"), // USD, BRL, PYG
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 15, scale: 4 }).notNull().default("1"),
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("COMPLETED"), // COMPLETED, REFUNDED, CANCELED
  receivedBy: uuid("received_by").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("payments_sale_id_idx").on(table.saleId),
  cashRegisterIdIdx: index("payments_cash_register_id_idx").on(table.cashRegisterId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  cashRegisterId: uuid("cash_register_id").notNull().references(() => cashRegisters.id),
  type: text("type").notNull(), // OPENING, SALE_PAYMENT, SUPPLY, WITHDRAWAL, REFUND, CLOSING_ADJUSTMENT
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: text("reference_id"), // Can be saleId, paymentId
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  cashRegisterCreatedIdx: index("cash_movements_register_created_idx").on(table.cashRegisterId, table.createdAt),
  referenceIdIdx: index("cash_movements_reference_id_idx").on(table.referenceId),
}));

export const saleReturns = pgTable("sale_returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  returnedBy: uuid("returned_by").notNull().references(() => users.id),
  authorizedBy: uuid("authorized_by").notNull().references(() => users.id),
  notes: text("notes"),
  totalAmountUsd: numeric("total_amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("COMPLETED"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("sale_returns_sale_id_idx").on(table.saleId),
}));

export const separationTasks = pgTable("separation_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, DIVERGENT
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("separation_tasks_sale_id_idx").on(table.saleId),
  statusIdx: index("separation_tasks_status_idx").on(table.status),
}));

export const separationItems = pgTable("separation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  separationTaskId: uuid("separation_task_id").notNull().references(() => separationTasks.id),
  saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantityExpected: integer("quantity_expected").notNull(),
  quantitySeparated: integer("quantity_separated").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING, SEPARATED, DIVERGENT
  checkedBy: uuid("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  notes: text("notes"),
});

export const deliveryTasks = pgTable("delivery_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, DIVERGENT
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("delivery_tasks_sale_id_idx").on(table.saleId),
  statusIdx: index("delivery_tasks_status_idx").on(table.status),
}));

export const deliveryItems = pgTable("delivery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryTaskId: uuid("delivery_task_id").notNull().references(() => deliveryTasks.id),
  saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantityExpected: integer("quantity_expected").notNull(),
  quantityDelivered: integer("quantity_delivered").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING, DELIVERED, DIVERGENT
  checkedBy: uuid("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  notes: text("notes"),
});

export const productSerials = pgTable("product_serials", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  serialNumber: text("serial_number").notNull(),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE, RESERVED, SOLD, RETURNED, WARRANTY, DEFECT
  saleItemId: uuid("sale_item_id").references(() => saleItems.id),
  // null = estoque normal, 'OFERTA' | 'OUTLET' = alocada pro canal.
  // Ortogonal ao `status` (disponível/vendido) — uma série AVAILABLE
  // ainda pode estar em qualquer um dos 3 estados de canal.
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.productId, t.serialNumber)
}));

export const deliverySerials = pgTable("delivery_serials", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryItemId: uuid("delivery_item_id").notNull().references(() => deliveryItems.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
  serialNumber: text("serial_number").notNull(),
  scannedBy: uuid("scanned_by").references(() => users.id),
  scannedAt: timestamp("scanned_at").defaultNow(),
});

export const emailSettings = pgTable("email_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  user: text("user").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  useTls: boolean("use_tls").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // SENT, FAILED
  errorMessage: text("error_message"),
  sentBy: uuid("sent_by").references(() => users.id),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const printLogs = pgTable("print_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  format: text("format").notNull(), // A4, THERMAL
  printedBy: uuid("printed_by").references(() => users.id),
  printedAt: timestamp("printed_at").defaultNow(),
  status: text("status").notNull().default("SUCCESS"),
  notes: text("notes"),
});

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  document: text("document"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  observations: text("observations"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  invoiceNumber: text("invoice_number"),
  invoiceDate: timestamp("invoice_date"),
  paymentDueDate: timestamp("payment_due_date"), // Vencimento do pagamento ao fornecedor (contas a pagar)
  currency: text("currency").default("USD"), // moeda da compra: BRL, USD, PYG
  fxRateToBrl: numeric("fx_rate_to_brl", { precision: 18, scale: 6 }), // câmbio moeda→BRL congelado na data da compra
  freightAmount: numeric("freight_amount", { precision: 15, scale: 2 }).notNull().default("0"), // frete/despesas na moeda da compra (rateado no custo)
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).default("0"),
  status: text("status").notNull().default("DRAFT"), // DRAFT, IN_REVIEW, APPROVED, CANCELED
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  ocrJobId: uuid("ocr_job_id"),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: uuid("product_id").references(() => products.id),
  sku: text("sku"),
  upc: text("upc"),
  productName: text("product_name"),
  quantity: integer("quantity").notNull(),
  lotNumber: text("lot_number"),
  expiryDate: timestamp("expiry_date"),
  costPrice: numeric("cost_price", { precision: 15, scale: 4 }).notNull().default("0"),
  salePriceA: numeric("sale_price_a", { precision: 15, scale: 2 }).default("0"), // A = Varejo
  salePriceB: numeric("sale_price_b", { precision: 15, scale: 2 }).default("0"), // B = Atacado
  salePriceC: numeric("sale_price_c", { precision: 15, scale: 2 }).default("0"), // Campo legado. Não exibir ao usuário e não usar em cálculos.
  shelfId: uuid("shelf_id").references(() => shelves.id),
  groupId: uuid("group_id").references(() => productGroups.id),
  subgroupId: uuid("subgroup_id").references(() => productSubgroups.id),
  hasSerialNumber: boolean("has_serial_number").default(false),
  updateCost: boolean("update_cost").default(true),
  updatePriceA: boolean("update_price_a").default(true),
  updatePriceB: boolean("update_price_b").default(false),
  updatePriceC: boolean("update_price_c").default(false),
  status: text("status").notNull().default("NEW_PRODUCT"), // MAPPED, NEW_PRODUCT, IGNORED
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrderSerials = pgTable("purchase_order_serials", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderItemId: uuid("purchase_order_item_id").notNull().references(() => purchaseOrderItems.id),
  productId: uuid("product_id").references(() => products.id),
  serialNumber: text("serial_number").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, IMPORTED
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryPaymentOverrides = pgTable("delivery_payment_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  authorizedBy: uuid("authorized_by").notNull().references(() => users.id),
  authorizedAt: timestamp("authorized_at").defaultNow(),
  reason: text("reason").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  totalDeleted: integer("total_deleted").notNull().default(0),
  executedAt: timestamp("executed_at").defaultNow(),
  executedBy: uuid("executed_by").references(() => users.id),
  details: text("details"),
});

// Contas financeiras (carteiras): onde o dinheiro fica. Caixa (gaveta), bancos,
// cartão a receber (maquininha). Saldo mantido em current_balance.
export const financialAccounts = pgTable("financial_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("BANK"), // CASH, BANK, CARD_RECEIVABLE, OTHER
  currency: text("currency").notNull().default("BRL"), // BRL, USD, PYG — moeda nativa da conta (saldo é nesta moeda)
  scope: text("scope").notNull().default("BUSINESS"), // BUSINESS (empresa) | PERSONAL (pessoal)
  feePercent: numeric("fee_percent", { precision: 5, scale: 2 }).notNull().default("0"), // taxa do adquirente (CARD_RECEIVABLE)
  settlementDays: integer("settlement_days").notNull().default(0), // prazo D+X (CARD_RECEIVABLE)
  openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  typeIdx: index("financial_accounts_type_idx").on(t.type),
  activeIdx: index("financial_accounts_active_idx").on(t.isActive),
}));

// Razão (ledger) de cada conta. amount_usd é sinalizado (+ entra, − sai).
export const accountMovements = pgTable("account_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => financialAccounts.id),
  type: text("type").notNull(), // SALE_PAYMENT, EXPENSE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, OPENING, CARD_FEE, CARD_SETTLEMENT, REFUND, WITHDRAWAL, SUPPLY
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }),
  referenceType: text("reference_type"), // sale, expense, transfer, settlement, payable
  referenceId: text("reference_id"),
  expectedSettlementDate: timestamp("expected_settlement_date"), // p/ cartão a receber (D+X)
  settled: boolean("settled").notNull().default(true), // false enquanto o cartão não liquidou
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  accountIdx: index("account_movements_account_idx").on(t.accountId),
  createdIdx: index("account_movements_created_idx").on(t.createdAt),
  settledIdx: index("account_movements_settled_idx").on(t.settled),
}));

// Mapa: forma de pagamento -> conta onde o dinheiro cai.
export const paymentMethodAccounts = pgTable("payment_method_accounts", {
  method: text("method").primaryKey(), // CASH, PIX, CREDIT_CARD, DEBIT_CARD, TRANSFER
  accountId: uuid("account_id").references(() => financialAccounts.id),
});

// CMP por camadas (FIFO): cada entrada de estoque vira uma camada com custo em BRL congelado
// (custo na moeda + frete rateado, × câmbio da data). A venda consome camadas FIFO — a margem
// REAL usa o custo da época da compra, não o custo atual.
export const costLayers = pgTable("cost_layers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  purchaseOrderId: uuid("purchase_order_id"), // null em entrada manual/devolução
  qtyOriginal: integer("qty_original").notNull(),
  qtyRemaining: integer("qty_remaining").notNull(),
  unitCostBrl: numeric("unit_cost_brl", { precision: 15, scale: 4 }).notNull(),
  sourceCurrency: text("source_currency").notNull().default("BRL"), // moeda original da compra
  fxRate: numeric("fx_rate", { precision: 18, scale: 6 }), // câmbio usado na conversão
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  productIdx: index("cost_layers_product_idx").on(t.productId),
  productRemainingIdx: index("cost_layers_product_remaining_idx").on(t.productId, t.qtyRemaining),
}));

// Consumo de camadas: registra qual venda (ou saída manual) consumiu quanto de qual camada,
// a que custo. Base do relatório de margem real por venda.
export const costConsumptions = pgTable("cost_consumptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  layerId: uuid("layer_id").references(() => costLayers.id), // null = camada virtual (estoque sem camada, custo atual)
  productId: uuid("product_id").notNull().references(() => products.id),
  saleId: uuid("sale_id"), // null = saída manual/ajuste
  qty: integer("qty").notNull(),
  unitCostBrl: numeric("unit_cost_brl", { precision: 15, scale: 4 }).notNull(),
  reason: text("reason").notNull().default("SALE"), // SALE, MANUAL_EXIT, ADJUSTMENT, RETURN_REVERSAL
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  saleIdx: index("cost_consumptions_sale_idx").on(t.saleId),
  productIdx: index("cost_consumptions_product_idx").on(t.productId),
}));

// ---- Loja online (Fase C) ----

export const abandonedCarts = pgTable("abandoned_carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerPhone: text("customer_phone").notNull().unique(), // Usamos o telefone como chave única para atualizar o carrinho existente
  customerName: text("customer_name"),
  cartData: jsonb("cart_data").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, RECOVERED, IGNORED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pedido feito no site. Ao criar, já gera a venda no ERP (PENDING + reserva de estoque);
// os itens ficam em sale_items. Aqui guardamos os dados do checkout e o comprovante PIX.
export const storeOrders = pgTable("store_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // código curto que o cliente usa para acompanhar
  saleId: uuid("sale_id").references(() => sales.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerDocument: text("customer_document"),
  paymentMethod: text("payment_method").notNull().default("PIX"), // PIX | USDT
  deliveryType: text("delivery_type").notNull().default("PICKUP"), // PICKUP | DELIVERY
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  address: text("address"), // fallback livre
  notes: text("notes"),
  shippingMethod: text("shipping_method"), // PAC, SEDEX, etc
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // NFe / NFCe
  nfeStatus: text("nfe_status").notNull().default("PENDING"), // PENDING, ISSUED, ERROR
  nfeUrl: text("nfe_url"),
  nfeNumber: text("nfe_number"),
  
  // FASE E8: quem paga o PIX (pode ser outra pessoa, com autorização declarada)
  payerIsBuyer: boolean("payer_is_buyer").notNull().default(true),
  payerDeclaredName: text("payer_declared_name"),
  payerDeclaredCpf: text("payer_declared_cpf"),
  // FASE E7: conferência do dinheiro que entrou e prova de entrega
  receivedAmountBrl: numeric("received_amount_brl", { precision: 15, scale: 2 }),
  payerName: text("payer_name"), // titular que apareceu no comprovante PIX
  receiptCheckedAt: timestamp("receipt_checked_at"),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"), // cliente disse "recebi"
  deliveryConfirmedIp: text("delivery_confirmed_ip"),
  deliveryConfirmedUserAgent: text("delivery_confirmed_user_agent"),
  // FASE E6: identificação do comprador e prova de aceite (defesa em MED/contestação)
  customerId: uuid("customer_id").references(() => customers.id),
  clientUserAgent: text("client_user_agent"),
  termsVersion: text("terms_version"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsSnapshot: text("terms_snapshot"), // texto exato que o cliente aceitou naquele dia
  // FASE E4: desconto de cupom e frete por região (total = subtotal - desconto + frete)
  subtotalBrl: numeric("subtotal_brl", { precision: 15, scale: 2 }),
  couponCode: text("coupon_code"),
  discountBrl: numeric("discount_brl", { precision: 15, scale: 2 }),
  shippingZone: text("shipping_zone"),
  shippingFeeBrl: numeric("shipping_fee_brl", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("AWAITING_PAYMENT"), // AWAITING_PAYMENT | PROOF_SENT | CONFIRMED | CANCELED
  proofFileName: text("proof_file_name"),
  proofFileType: text("proof_file_type"),
  proofFileSize: integer("proof_file_size"),
  proofData: text("proof_data"), // base64 do comprovante enviado pelo cliente
  proofSentAt: timestamp("proof_sent_at"),
  confirmedBy: uuid("confirmed_by").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  canceledReason: text("canceled_reason"),
  clientIp: text("client_ip"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  statusIdx: index("store_orders_status_idx").on(t.status),
  createdIdx: index("store_orders_created_idx").on(t.createdAt),
}));

// ---- Minha Conta (loja pública) ----
// Endereços salvos do cliente — mesmos campos que store_orders já usa pra endereço de entrega.
export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  label: text("label").notNull().default("Endereço"), // "Casa", "Trabalho"...
  cep: text("cep"),
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  customerIdx: index("customer_addresses_customer_idx").on(t.customerId),
}));

export const customerWishlist = pgTable("customer_wishlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  customerIdx: index("customer_wishlist_customer_idx").on(t.customerId),
  uniqueItem: unique("customer_wishlist_customer_product_uq").on(t.customerId, t.productId),
}));

// ---- Uso pessoal (Fase B) ----
// Categorias de gasto pessoal com orçamento mensal na moeda escolhida (PYG por padrão — custo de vida no Paraguai).
export const personalCategories = pgTable("personal_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  monthlyBudget: numeric("monthly_budget", { precision: 15, scale: 2 }).notNull().default("0"),
  budgetCurrency: text("budget_currency").notNull().default("PYG"), // BRL, USD, PYG
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gasto pessoal: lançado na moeda da conta de onde saiu (ou moeda escolhida, sem conta).
// amount_brl é congelado na cotação do dia do lançamento — base do custo de vida e do runway.
export const personalExpenses = pgTable("personal_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => personalCategories.id),
  accountId: uuid("account_id").references(() => financialAccounts.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("PYG"),
  amountBrl: numeric("amount_brl", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  expenseDate: timestamp("expense_date").notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  dateIdx: index("personal_expenses_date_idx").on(t.expenseDate),
  categoryIdx: index("personal_expenses_category_idx").on(t.categoryId),
}));

// Regras de distribuição de lucro (ex.: 70% reposição USD / 30% vida PYG). percent soma ≤ 100.
export const profitDistributionRules = pgTable("profit_distribution_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
  accountId: uuid("account_id").references(() => financialAccounts.id),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cotações de câmbio por dia e par. Uma linha API (AwesomeAPI) e/ou uma MANUAL por dia/par;
// a MANUAL (taxa real conseguida na casa de câmbio) sempre prevalece sobre a API na resolução.
export const fxRates = pgTable("fx_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  day: text("day").notNull(), // YYYY-MM-DD
  pair: text("pair").notNull(), // USDBRL, USDPYG, BRLPYG
  rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
  source: text("source").notNull().default("API"), // API | MANUAL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  dayPairSourceUq: unique("fx_rates_day_pair_source_uq").on(t.day, t.pair, t.source),
  dayIdx: index("fx_rates_day_idx").on(t.day),
}));

// Contas a pagar: títulos gerados por compras aprovadas ou lançados manualmente.
export const payables = pgTable("payables", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull().default("MANUAL"), // PURCHASE, MANUAL
  referenceId: uuid("reference_id"), // purchaseOrderId quando source=PURCHASE
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  description: text("description").notNull(),
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("PENDING"), // PENDING, PARTIAL, PAID
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  statusIdx: index("payables_status_idx").on(t.status),
  dueIdx: index("payables_due_idx").on(t.dueDate),
  supplierIdx: index("payables_supplier_idx").on(t.supplierId),
}));

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("FIXED"), // FIXED, VARIABLE
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => expenseCategories.id), // Category is now optional
  description: text("description").notNull(),
  expenseDate: timestamp("expense_date").notNull().defaultNow(),
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  isFixed: boolean("is_fixed").default(false),
  dueDay: integer("due_day"),
  isActive: boolean("is_active").default(true),
  recurrence: text("recurrence").notNull().default("NONE"), // NONE, MONTHLY
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const purchaseOcrJobs = pgTable("purchase_ocr_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  filePath: text("file_path"),
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
  rawText: text("raw_text"),
  parsedJson: text("parsed_json"), // Store Structured JSON response
  errorMessage: text("error_message"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const supplierInvoiceFiles = pgTable("supplier_invoice_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  ocrJobId: uuid("ocr_job_id").references(() => purchaseOcrJobs.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  filePath: text("file_path").notNull(),
  invoiceNumber: text("invoice_number"),
  invoiceDate: timestamp("invoice_date"),
  observations: text("observations"),
  source: text("source").notNull().default("MANUAL"), // MANUAL, OCR
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  supplierIdIdx: index("supplier_invoice_files_supplier_id_idx").on(table.supplierId),
  purchaseOrderIdIdx: index("supplier_invoice_files_purchase_order_id_idx").on(table.purchaseOrderId),
  ocrJobIdIdx: index("supplier_invoice_files_ocr_job_id_idx").on(table.ocrJobId),
  createdAtIdx: index("supplier_invoice_files_created_at_idx").on(table.createdAt),
}));


// Transferências simples para conferência de mercadorias entre locais.
// Este módulo é apenas um checklist e não altera o estoque real.
export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title"),
  origin: text("origin").notNull().default("Paraguai"),
  destination: text("destination").notNull(),
  carrier: text("carrier"),
  status: text("status").notNull().default("IN_TRANSIT"), // IN_TRANSIT, RECEIVED, PARTIAL, DIVERGENT, CANCELED
  departureAt: timestamp("departure_at"),
  expectedAt: timestamp("expected_at"),
  receivedAt: timestamp("received_at"),
  notes: text("notes"),
  receiptNotes: text("receipt_notes"),
  invoiceFileName: text("invoice_file_name"),
  invoiceFileType: text("invoice_file_type"),
  invoiceFileSize: integer("invoice_file_size"),
  invoiceFilePath: text("invoice_file_path"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  receivedBy: uuid("received_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("stock_transfers_status_idx").on(table.status),
  createdAtIdx: index("stock_transfers_created_at_idx").on(table.createdAt),
  expectedAtIdx: index("stock_transfers_expected_at_idx").on(table.expectedAt),
}));

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id),
  productId: uuid("product_id").references(() => products.id),
  productName: text("product_name").notNull().default(""),
  lotSent: text("lot_sent"),
  lotReceived: text("lot_received"),
  quantitySent: integer("quantity_sent").notNull(),
  quantityReceived: integer("quantity_received").notNull().default(0),
  quantityDamaged: integer("quantity_damaged").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  transferIdIdx: index("stock_transfer_items_transfer_id_idx").on(table.transferId),
  productIdIdx: index("stock_transfer_items_product_id_idx").on(table.productId),
  lotIdx: index("stock_transfer_items_lot_idx").on(table.productId, table.lotSent),
}));

// Notificações internas do admin (sino no cabeçalho + página /notifications). Globais — visíveis
// pra qualquer usuário logado, sem alvo por pessoa (equipe pequena, mesmo padrão dos alertas que
// já existem no Painel hoje, que também não são por usuário).
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // ORDER_NEW, PAYMENT_CONFIRMED, PAYMENT_PROOF, PAYMENT_MISMATCH, CUSTOMER_NEW, SALE_RETURNED, MASTER_ACTION
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Uma linha por carregamento de página pública da loja — alimenta "Visualizações de página" no
// Painel e a aba Análises. `visitorId` é um UUID aleatório gerado no navegador (localStorage),
// sem nenhum dado pessoal — só permite agrupar "essas visualizações são do mesmo aparelho" pra
// calcular visitante único/taxa de rejeição/duração de sessão. país/estado/cidade vêm de
// geolocalização por IP (estimativa, não GPS) — não guardamos o IP em si, só o resultado.
export const storePageviews = pgTable("store_pageviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull(),
  visitorId: text("visitor_id"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contatos que pediram ofertas pelo banner da home. É uma lista própria para
// não criar clientes falsos/incompletos no ERP: o cadastro de cliente continua
// exigindo nome, documento e telefone no fluxo de conta/checkout.
export const storeNewsletterSubscribers = pgTable("store_newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  source: text("source").notNull().default("HOME_FIRST_ORDER"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- FASE E3: cupons e frete por região da loja online ----

export const storeCoupons = pgTable("store_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // sempre gravado em MAIÚSCULA
  type: text("type").notNull().default("PERCENT"), // PERCENT | FIXED (R$)
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  minOrderBrl: numeric("min_order_brl", { precision: 12, scale: 2 }), // pedido mínimo (opcional)
  maxUses: integer("max_uses"), // null = ilimitado
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeShippingZones = pgTable("store_shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // cidade/bairro que o cliente escolhe
  feeBrl: numeric("fee_brl", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pagamento do pedido da loja em partes (cliente que faz 2+ PIX por limite do banco).
// Sem parcelas criadas, o pedido segue no fluxo de PIX único.
export const storeOrderPayments = pgTable("store_order_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => storeOrders.id),
  seq: integer("seq").notNull().default(1),
  amountBrl: numeric("amount_brl", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | PROOF_SENT | CONFIRMED
  proofFileName: text("proof_file_name"),
  proofFileType: text("proof_file_type"),
  proofFileSize: integer("proof_file_size"),
  proofData: text("proof_data"),
  proofSentAt: timestamp("proof_sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  orderIdx: index("store_order_payments_order_idx").on(t.orderId),
}));
