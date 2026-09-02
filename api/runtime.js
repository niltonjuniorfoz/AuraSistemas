var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  abandonedCarts: () => abandonedCarts,
  accountMovements: () => accountMovements,
  auditLogs: () => auditLogs,
  brandLogos: () => brandLogos,
  cashMovements: () => cashMovements,
  cashRegisterBalances: () => cashRegisterBalances,
  cashRegisters: () => cashRegisters,
  companySettings: () => companySettings,
  costConsumptions: () => costConsumptions,
  costLayers: () => costLayers,
  currencies: () => currencies,
  customerAddresses: () => customerAddresses,
  customerWishlist: () => customerWishlist,
  customers: () => customers,
  deliveryItems: () => deliveryItems,
  deliveryPaymentOverrides: () => deliveryPaymentOverrides,
  deliverySerials: () => deliverySerials,
  deliveryTasks: () => deliveryTasks,
  emailLogs: () => emailLogs,
  emailSettings: () => emailSettings,
  expenseCategories: () => expenseCategories,
  expenses: () => expenses,
  financialAccounts: () => financialAccounts,
  fiscalSettings: () => fiscalSettings,
  fxRates: () => fxRates,
  maintenanceLogs: () => maintenanceLogs,
  notifications: () => notifications,
  payables: () => payables,
  paymentMethodAccounts: () => paymentMethodAccounts,
  payments: () => payments,
  permissions: () => permissions,
  personalCategories: () => personalCategories,
  personalExpenses: () => personalExpenses,
  printLogs: () => printLogs,
  printerSettings: () => printerSettings,
  productGroups: () => productGroups,
  productGroupsDraft: () => productGroupsDraft,
  productImages: () => productImages,
  productLots: () => productLots,
  productSerials: () => productSerials,
  productSubgroups: () => productSubgroups,
  products: () => products,
  profitDistributionRules: () => profitDistributionRules,
  purchaseOcrJobs: () => purchaseOcrJobs,
  purchaseOrderItems: () => purchaseOrderItems,
  purchaseOrderSerials: () => purchaseOrderSerials,
  purchaseOrders: () => purchaseOrders,
  rolePermissions: () => rolePermissions,
  roles: () => roles,
  saleItemLots: () => saleItemLots,
  saleItems: () => saleItems,
  saleReturns: () => saleReturns,
  sales: () => sales,
  separationItems: () => separationItems,
  separationTasks: () => separationTasks,
  shelves: () => shelves,
  stockBalances: () => stockBalances,
  stockMovements: () => stockMovements,
  stockReservations: () => stockReservations,
  stockTransferItems: () => stockTransferItems,
  stockTransfers: () => stockTransfers,
  storeCoupons: () => storeCoupons,
  storeNewsletterSubscribers: () => storeNewsletterSubscribers,
  storeOrderPayments: () => storeOrderPayments,
  storeOrders: () => storeOrders,
  storePageviews: () => storePageviews,
  storeShippingZones: () => storeShippingZones,
  supplierInvoiceFiles: () => supplierInvoiceFiles,
  suppliers: () => suppliers,
  systemSettings: () => systemSettings,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, primaryKey, uuid, numeric, unique, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
var companySettings, currencies, fiscalSettings, printerSettings, roles, permissions, rolePermissions, users, productGroups, productGroupsDraft, productSubgroups, shelves, products, brandLogos, productImages, customers, stockBalances, productLots, stockMovements, auditLogs, sales, saleItems, saleItemLots, stockReservations, cashRegisters, cashRegisterBalances, payments, cashMovements, saleReturns, separationTasks, separationItems, deliveryTasks, deliveryItems, productSerials, deliverySerials, emailSettings, emailLogs, printLogs, systemSettings, suppliers, purchaseOrders, purchaseOrderItems, purchaseOrderSerials, deliveryPaymentOverrides, maintenanceLogs, financialAccounts, accountMovements, paymentMethodAccounts, costLayers, costConsumptions, abandonedCarts, storeOrders, customerAddresses, customerWishlist, personalCategories, personalExpenses, profitDistributionRules, fxRates, payables, expenseCategories, expenses, purchaseOcrJobs, supplierInvoiceFiles, stockTransfers, stockTransferItems, notifications, storePageviews, storeNewsletterSubscribers, storeCoupons, storeShippingZones, storeOrderPayments;
var init_schema = __esm({
  "src/db/schema.ts"() {
    companySettings = pgTable("company_settings", {
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
      whatsappGateway: text("whatsapp_gateway"),
      // WhatsApp fixo p/ enviar comprovantes de pagamento
      instagramUrl: text("instagram_url"),
      // perfil público exibido no cabeçalho e rodapé da loja
      defaultCurrency: text("default_currency").default("BRL"),
      defaultIvaPercentage: text("default_iva_percentage").default("0"),
      updatedAt: timestamp("updated_at").defaultNow(),
      updatedBy: uuid("updated_by").references(() => users.id)
    });
    currencies = pgTable("currencies", {
      id: uuid("id").primaryKey().defaultRandom(),
      code: text("code").notNull().unique(),
      // USD, BRL, PYG
      name: text("name"),
      rateToUsd: numeric("rate_to_usd").notNull().default("1"),
      // How many units of this currency makes 1 USD. e.g. 1 USD = 5.5 BRL. For BRL, rateToUsd = 5.5
      symbol: text("symbol"),
      updatedAt: timestamp("updated_at").defaultNow(),
      updatedBy: uuid("updated_by").references(() => users.id)
    });
    fiscalSettings = pgTable("fiscal_settings", {
      id: uuid("id").primaryKey().defaultRandom(),
      ivaEnabled: boolean("iva_enabled").default(true),
      defaultIvaPy: numeric("default_iva_py").default("10"),
      defaultIvaForeign: numeric("default_iva_foreign").default("0"),
      updatedAt: timestamp("updated_at").defaultNow(),
      updatedBy: uuid("updated_by").references(() => users.id)
    });
    printerSettings = pgTable("printer_settings", {
      id: uuid("id").primaryKey().defaultRandom(),
      receiptFormat: text("receipt_format").default("80mm"),
      // 80mm or 58mm
      adminFormat: text("admin_format").default("A4"),
      // A4 or A5
      printMode: text("print_mode").default("browser"),
      // browser or agent
      updatedAt: timestamp("updated_at").defaultNow(),
      updatedBy: uuid("updated_by").references(() => users.id)
    });
    roles = pgTable("roles", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull().unique(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    permissions = pgTable("permissions", {
      id: uuid("id").primaryKey().defaultRandom(),
      module: text("module").notNull(),
      action: text("action").notNull(),
      description: text("description")
    });
    rolePermissions = pgTable("role_permissions", {
      roleId: uuid("role_id").notNull().references(() => roles.id),
      permissionId: uuid("permission_id").notNull().references(() => permissions.id)
    }, (t) => ({
      pk: primaryKey({ columns: [t.roleId, t.permissionId] })
    }));
    users = pgTable("users", {
      id: uuid("id").primaryKey().defaultRandom(),
      username: text("username").unique(),
      name: text("name").notNull(),
      email: text("email"),
      passwordHash: text("password_hash").notNull(),
      roleId: uuid("role_id").notNull().references(() => roles.id),
      commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).notNull().default("0"),
      // % de comissão do vendedor
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    });
    productGroups = pgTable("product_groups", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      description: text("description"),
      isActive: boolean("is_active").notNull().default(true),
      storeVisible: boolean("store_visible").notNull().default(true),
      // aparece na navegação de categorias da loja pública
      // Ícone da categoria na loja pública (ver ICON_KEYS em categoryIcons.tsx).
      // null = mantém o comportamento antigo, adivinha pelo nome da categoria.
      icon: text("icon"),
      sortOrder: integer("sort_order").notNull().default(0),
      // ordem na navegação da loja (editor visual)
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    });
    productGroupsDraft = pgTable("product_groups_draft", {
      id: uuid("id").primaryKey().defaultRandom(),
      sourceGroupId: uuid("source_group_id").references(() => productGroups.id),
      name: text("name").notNull(),
      icon: text("icon"),
      storeVisible: boolean("store_visible").notNull().default(true),
      sortOrder: integer("sort_order").notNull().default(0),
      deleted: boolean("deleted").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      // Índice único parcial: garante no máximo um rascunho por categoria real
      // (sourceGroupId != null), sem bloquear múltiplos rascunhos de categoria
      // nova (sourceGroupId null). Sustenta o upsert race-free do PUT
      // /admin/categories/draft/:id em store.ts.
      sourceGroupUnique: uniqueIndex("product_groups_draft_source_group_unique").on(table.sourceGroupId).where(sql`${table.sourceGroupId} IS NOT NULL`)
    }));
    productSubgroups = pgTable("product_subgroups", {
      id: uuid("id").primaryKey().defaultRandom(),
      groupId: uuid("group_id").notNull().references(() => productGroups.id),
      name: text("name").notNull(),
      description: text("description"),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    });
    shelves = pgTable("shelves", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull().unique(),
      description: text("description"),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    });
    products = pgTable("products", {
      id: uuid("id").primaryKey().defaultRandom(),
      parentId: uuid("parent_id").references(() => products.id),
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
      salePriceA: numeric("sale_price_a", { precision: 15, scale: 2 }).notNull().default("0"),
      // A = Varejo
      salePriceB: numeric("sale_price_b", { precision: 15, scale: 2 }).notNull().default("0"),
      // B = Atacado
      salePriceC: numeric("sale_price_c", { precision: 15, scale: 2 }).notNull().default("0"),
      // Campo legado. Não exibir ao usuário e não usar em cálculos.
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
      storeVisible: boolean("store_visible").notNull().default(true),
      // aparece na loja online (Fase C)
      storeDescription: text("store_description"),
      // texto da vitrine (opcional)
      technicalSpecs: jsonb("technical_specs").default([]),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    }, (table) => ({
      skuIdx: index("products_sku_idx").on(table.sku),
      upcIdx: index("products_upc_idx").on(table.upc),
      nameIdx: index("products_name_idx").on(table.name),
      brandIdx: index("products_brand_idx").on(table.brand),
      modelIdx: index("products_model_idx").on(table.model),
      isActiveIdx: index("products_is_active_idx").on(table.isActive)
    }));
    brandLogos = pgTable("brand_logos", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull().unique(),
      logoUrl: text("logo_url"),
      // null = detectada mas sem logo ainda (não aparece na loja)
      sortOrder: integer("sort_order").notNull().default(0),
      visible: boolean("visible").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    productImages = pgTable("product_images", {
      id: uuid("id").primaryKey().defaultRandom(),
      productId: uuid("product_id").notNull().references(() => products.id),
      imageUrl: text("image_url").notNull(),
      isPrimary: boolean("is_primary").notNull().default(false),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customers = pgTable("customers", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      type: text("type").notNull().default("PERSON"),
      // PERSON, COMPANY
      nationality: text("nationality").notNull().default("PY"),
      // PY, FOREIGN
      documentType: text("document_type").default("CPF"),
      // RUC, CPF, CNPJ, PASSPORT, CI, OTHER
      document: text("document"),
      phone: text("phone"),
      email: text("email"),
      passwordHash: text("password_hash"),
      // null = cliente ainda sem senha (conta pra "reivindicar" na loja, ver Minha Conta)
      marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
      address: text("address"),
      city: text("city"),
      country: text("country").default("Brasil"),
      observations: text("observations"),
      isActive: boolean("is_active").notNull().default(true),
      creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }).notNull().default("0"),
      priceTable: text("price_table").notNull().default("A"),
      // A, B, C
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    }, (table) => ({
      nameIdx: index("customers_name_idx").on(table.name),
      documentIdx: index("customers_document_idx").on(table.document),
      phoneIdx: index("customers_phone_idx").on(table.phone)
    }));
    stockBalances = pgTable("stock_balances", {
      productId: uuid("product_id").primaryKey().references(() => products.id),
      physicalStock: integer("physical_stock").notNull().default(0),
      reservedStock: integer("reserved_stock").notNull().default(0),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    productLots = pgTable("product_lots", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      unq: unique().on(t.productId, t.lotNumber),
      productIdx: index("product_lots_product_idx").on(t.productId),
      expiryIdx: index("product_lots_expiry_idx").on(t.expiryDate)
    }));
    stockMovements = pgTable("stock_movements", {
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
      createdAt: timestamp("created_at").defaultNow()
    });
    auditLogs = pgTable("audit_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id").notNull().references(() => users.id),
      action: text("action").notNull(),
      tableName: text("table_name").notNull(),
      recordId: text("record_id").notNull(),
      oldValues: text("old_values"),
      newValues: text("new_values"),
      createdAt: timestamp("created_at").defaultNow()
    });
    sales = pgTable("sales", {
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
      dueDate: timestamp("due_date"),
      // Vencimento da venda a prazo (contas a receber)
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
      cancelReason: text("cancel_reason")
    }, (table) => ({
      numberIdx: index("sales_number_idx").on(table.number),
      seriesIdx: index("sales_series_idx").on(table.series),
      createdAtIdx: index("sales_created_at_idx").on(table.createdAt),
      customerIdIdx: index("sales_customer_id_idx").on(table.customerId),
      paymentStatusIdx: index("sales_payment_status_idx").on(table.paymentStatus),
      fulfillmentStatusIdx: index("sales_fulfillment_status_idx").on(table.fulfillmentStatus),
      orderStatusIdx: index("sales_order_status_idx").on(table.orderStatus)
    }));
    saleItems = pgTable("sale_items", {
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
      priceTable: text("price_table").notNull().default("A")
    }, (table) => ({
      saleIdIdx: index("sale_items_sale_id_idx").on(table.saleId),
      productIdIdx: index("sale_items_product_id_idx").on(table.productId)
    }));
    saleItemLots = pgTable("sale_item_lots", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      lotNumber: text("lot_number").notNull(),
      quantity: integer("quantity").notNull(),
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("sale_item_lots_sale_id_idx").on(table.saleId),
      saleItemIdIdx: index("sale_item_lots_sale_item_id_idx").on(table.saleItemId),
      productLotIdx: index("sale_item_lots_product_lot_idx").on(table.productId, table.lotNumber)
    }));
    stockReservations = pgTable("stock_reservations", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      quantity: integer("quantity").notNull(),
      status: text("status").notNull().default("ACTIVE"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("stock_reservations_sale_id_idx").on(table.saleId),
      productIdIdx: index("stock_reservations_product_id_idx").on(table.productId),
      statusIdx: index("stock_reservations_status_idx").on(table.status)
    }));
    cashRegisters = pgTable("cash_registers", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id").notNull().references(() => users.id),
      status: text("status").notNull().default("OPEN"),
      // OPEN, CLOSED
      openedAt: timestamp("opened_at").defaultNow(),
      closedAt: timestamp("closed_at"),
      openingAmountUsd: numeric("opening_amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
      declaredClosingAmountUsd: numeric("declared_closing_amount_usd", { precision: 15, scale: 2 }),
      expectedClosingAmountUsd: numeric("expected_closing_amount_usd", { precision: 15, scale: 2 }),
      differenceAmountUsd: numeric("difference_amount_usd", { precision: 15, scale: 2 }),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    cashRegisterBalances = pgTable("cash_register_balances", {
      id: uuid("id").primaryKey().defaultRandom(),
      registerId: uuid("register_id").notNull().references(() => cashRegisters.id),
      currency: text("currency").notNull(),
      // BRL, USD, PYG, USDT
      openingAmount: numeric("opening_amount", { precision: 15, scale: 4 }).notNull().default("0"),
      declaredClosingAmount: numeric("declared_closing_amount", { precision: 15, scale: 4 }),
      expectedClosingAmount: numeric("expected_closing_amount", { precision: 15, scale: 4 }),
      differenceAmount: numeric("difference_amount", { precision: 15, scale: 4 }),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      registerCurrencyUq: unique("cash_register_balances_register_currency_uq").on(t.registerId, t.currency),
      registerIdx: index("cash_register_balances_register_idx").on(t.registerId)
    }));
    payments = pgTable("payments", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      cashRegisterId: uuid("cash_register_id").notNull().references(() => cashRegisters.id),
      paymentMethod: text("payment_method").notNull(),
      // CASH, PIX, CREDIT_CARD, DEBIT_CARD, TRANSFER
      currency: text("currency").notNull().default("USD"),
      // USD, BRL, PYG
      amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
      exchangeRate: numeric("exchange_rate", { precision: 15, scale: 4 }).notNull().default("1"),
      amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
      status: text("status").notNull().default("COMPLETED"),
      // COMPLETED, REFUNDED, CANCELED
      receivedBy: uuid("received_by").notNull().references(() => users.id),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("payments_sale_id_idx").on(table.saleId),
      cashRegisterIdIdx: index("payments_cash_register_id_idx").on(table.cashRegisterId),
      statusIdx: index("payments_status_idx").on(table.status)
    }));
    cashMovements = pgTable("cash_movements", {
      id: uuid("id").primaryKey().defaultRandom(),
      cashRegisterId: uuid("cash_register_id").notNull().references(() => cashRegisters.id),
      type: text("type").notNull(),
      // OPENING, SALE_PAYMENT, SUPPLY, WITHDRAWAL, REFUND, CLOSING_ADJUSTMENT
      amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
      description: text("description"),
      referenceId: text("reference_id"),
      // Can be saleId, paymentId
      createdBy: uuid("created_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      cashRegisterCreatedIdx: index("cash_movements_register_created_idx").on(table.cashRegisterId, table.createdAt),
      referenceIdIdx: index("cash_movements_reference_id_idx").on(table.referenceId)
    }));
    saleReturns = pgTable("sale_returns", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      returnedBy: uuid("returned_by").notNull().references(() => users.id),
      authorizedBy: uuid("authorized_by").notNull().references(() => users.id),
      notes: text("notes"),
      totalAmountUsd: numeric("total_amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
      status: text("status").notNull().default("COMPLETED"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("sale_returns_sale_id_idx").on(table.saleId)
    }));
    separationTasks = pgTable("separation_tasks", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      assignedTo: uuid("assigned_to").references(() => users.id),
      status: text("status").notNull().default("PENDING"),
      // PENDING, IN_PROGRESS, COMPLETED, DIVERGENT
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("separation_tasks_sale_id_idx").on(table.saleId),
      statusIdx: index("separation_tasks_status_idx").on(table.status)
    }));
    separationItems = pgTable("separation_items", {
      id: uuid("id").primaryKey().defaultRandom(),
      separationTaskId: uuid("separation_task_id").notNull().references(() => separationTasks.id),
      saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      quantityExpected: integer("quantity_expected").notNull(),
      quantitySeparated: integer("quantity_separated").notNull().default(0),
      status: text("status").notNull().default("PENDING"),
      // PENDING, SEPARATED, DIVERGENT
      checkedBy: uuid("checked_by").references(() => users.id),
      checkedAt: timestamp("checked_at"),
      notes: text("notes")
    });
    deliveryTasks = pgTable("delivery_tasks", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      assignedTo: uuid("assigned_to").references(() => users.id),
      status: text("status").notNull().default("PENDING"),
      // PENDING, IN_PROGRESS, COMPLETED, DIVERGENT
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      saleIdIdx: index("delivery_tasks_sale_id_idx").on(table.saleId),
      statusIdx: index("delivery_tasks_status_idx").on(table.status)
    }));
    deliveryItems = pgTable("delivery_items", {
      id: uuid("id").primaryKey().defaultRandom(),
      deliveryTaskId: uuid("delivery_task_id").notNull().references(() => deliveryTasks.id),
      saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      quantityExpected: integer("quantity_expected").notNull(),
      quantityDelivered: integer("quantity_delivered").notNull().default(0),
      status: text("status").notNull().default("PENDING"),
      // PENDING, DELIVERED, DIVERGENT
      checkedBy: uuid("checked_by").references(() => users.id),
      checkedAt: timestamp("checked_at"),
      notes: text("notes")
    });
    productSerials = pgTable("product_serials", {
      id: uuid("id").primaryKey().defaultRandom(),
      productId: uuid("product_id").notNull().references(() => products.id),
      serialNumber: text("serial_number").notNull(),
      status: text("status").notNull().default("AVAILABLE"),
      // AVAILABLE, RESERVED, SOLD, RETURNED, WARRANTY, DEFECT
      saleItemId: uuid("sale_item_id").references(() => saleItems.id),
      // null = estoque normal, 'OFERTA' | 'OUTLET' = alocada pro canal.
      // Ortogonal ao `status` (disponível/vendido) — uma série AVAILABLE
      // ainda pode estar em qualquer um dos 3 estados de canal.
      channel: text("channel"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      unq: unique().on(t.productId, t.serialNumber)
    }));
    deliverySerials = pgTable("delivery_serials", {
      id: uuid("id").primaryKey().defaultRandom(),
      deliveryItemId: uuid("delivery_item_id").notNull().references(() => deliveryItems.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      saleItemId: uuid("sale_item_id").notNull().references(() => saleItems.id),
      serialNumber: text("serial_number").notNull(),
      scannedBy: uuid("scanned_by").references(() => users.id),
      scannedAt: timestamp("scanned_at").defaultNow()
    });
    emailSettings = pgTable("email_settings", {
      id: uuid("id").primaryKey().defaultRandom(),
      host: text("host").notNull(),
      port: integer("port").notNull().default(587),
      user: text("user").notNull(),
      password: text("password").notNull(),
      fromEmail: text("from_email").notNull(),
      fromName: text("from_name").notNull(),
      useTls: boolean("use_tls").default(true),
      updatedAt: timestamp("updated_at").defaultNow(),
      updatedBy: uuid("updated_by").references(() => users.id)
    });
    emailLogs = pgTable("email_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      recipientEmail: text("recipient_email").notNull(),
      subject: text("subject").notNull(),
      status: text("status").notNull(),
      // SENT, FAILED
      errorMessage: text("error_message"),
      sentBy: uuid("sent_by").references(() => users.id),
      sentAt: timestamp("sent_at").defaultNow()
    });
    printLogs = pgTable("print_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      format: text("format").notNull(),
      // A4, THERMAL
      printedBy: uuid("printed_by").references(() => users.id),
      printedAt: timestamp("printed_at").defaultNow(),
      status: text("status").notNull().default("SUCCESS"),
      notes: text("notes")
    });
    systemSettings = pgTable("system_settings", {
      id: uuid("id").primaryKey().defaultRandom(),
      key: text("key").notNull().unique(),
      value: jsonb("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    suppliers = pgTable("suppliers", {
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
      deletedAt: timestamp("deleted_at")
    });
    purchaseOrders = pgTable("purchase_orders", {
      id: uuid("id").primaryKey().defaultRandom(),
      supplierId: uuid("supplier_id").references(() => suppliers.id),
      invoiceNumber: text("invoice_number"),
      invoiceDate: timestamp("invoice_date"),
      paymentDueDate: timestamp("payment_due_date"),
      // Vencimento do pagamento ao fornecedor (contas a pagar)
      currency: text("currency").default("USD"),
      // moeda da compra: BRL, USD, PYG
      fxRateToBrl: numeric("fx_rate_to_brl", { precision: 18, scale: 6 }),
      // câmbio moeda→BRL congelado na data da compra
      freightAmount: numeric("freight_amount", { precision: 15, scale: 2 }).notNull().default("0"),
      // frete/despesas na moeda da compra (rateado no custo)
      totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).default("0"),
      status: text("status").notNull().default("DRAFT"),
      // DRAFT, IN_REVIEW, APPROVED, CANCELED
      notes: text("notes"),
      createdBy: uuid("created_by").references(() => users.id),
      approvedBy: uuid("approved_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      approvedAt: timestamp("approved_at"),
      updatedAt: timestamp("updated_at").defaultNow(),
      ocrJobId: uuid("ocr_job_id")
    });
    purchaseOrderItems = pgTable("purchase_order_items", {
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
      salePriceA: numeric("sale_price_a", { precision: 15, scale: 2 }).default("0"),
      // A = Varejo
      salePriceB: numeric("sale_price_b", { precision: 15, scale: 2 }).default("0"),
      // B = Atacado
      salePriceC: numeric("sale_price_c", { precision: 15, scale: 2 }).default("0"),
      // Campo legado. Não exibir ao usuário e não usar em cálculos.
      shelfId: uuid("shelf_id").references(() => shelves.id),
      groupId: uuid("group_id").references(() => productGroups.id),
      subgroupId: uuid("subgroup_id").references(() => productSubgroups.id),
      hasSerialNumber: boolean("has_serial_number").default(false),
      updateCost: boolean("update_cost").default(true),
      updatePriceA: boolean("update_price_a").default(true),
      updatePriceB: boolean("update_price_b").default(false),
      updatePriceC: boolean("update_price_c").default(false),
      status: text("status").notNull().default("NEW_PRODUCT"),
      // MAPPED, NEW_PRODUCT, IGNORED
      createdAt: timestamp("created_at").defaultNow()
    });
    purchaseOrderSerials = pgTable("purchase_order_serials", {
      id: uuid("id").primaryKey().defaultRandom(),
      purchaseOrderItemId: uuid("purchase_order_item_id").notNull().references(() => purchaseOrderItems.id),
      productId: uuid("product_id").references(() => products.id),
      serialNumber: text("serial_number").notNull(),
      status: text("status").notNull().default("PENDING"),
      // PENDING, IMPORTED
      createdAt: timestamp("created_at").defaultNow()
    });
    deliveryPaymentOverrides = pgTable("delivery_payment_overrides", {
      id: uuid("id").primaryKey().defaultRandom(),
      saleId: uuid("sale_id").notNull().references(() => sales.id),
      authorizedBy: uuid("authorized_by").notNull().references(() => users.id),
      authorizedAt: timestamp("authorized_at").defaultNow(),
      reason: text("reason").notNull(),
      createdBy: uuid("created_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    });
    maintenanceLogs = pgTable("maintenance_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      action: text("action").notNull(),
      totalDeleted: integer("total_deleted").notNull().default(0),
      executedAt: timestamp("executed_at").defaultNow(),
      executedBy: uuid("executed_by").references(() => users.id),
      details: text("details")
    });
    financialAccounts = pgTable("financial_accounts", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      type: text("type").notNull().default("BANK"),
      // CASH, BANK, CARD_RECEIVABLE, OTHER
      currency: text("currency").notNull().default("BRL"),
      // BRL, USD, PYG — moeda nativa da conta (saldo é nesta moeda)
      scope: text("scope").notNull().default("BUSINESS"),
      // BUSINESS (empresa) | PERSONAL (pessoal)
      feePercent: numeric("fee_percent", { precision: 5, scale: 2 }).notNull().default("0"),
      // taxa do adquirente (CARD_RECEIVABLE)
      settlementDays: integer("settlement_days").notNull().default(0),
      // prazo D+X (CARD_RECEIVABLE)
      openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).notNull().default("0"),
      currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
      isActive: boolean("is_active").notNull().default(true),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      typeIdx: index("financial_accounts_type_idx").on(t.type),
      activeIdx: index("financial_accounts_active_idx").on(t.isActive)
    }));
    accountMovements = pgTable("account_movements", {
      id: uuid("id").primaryKey().defaultRandom(),
      accountId: uuid("account_id").notNull().references(() => financialAccounts.id),
      type: text("type").notNull(),
      // SALE_PAYMENT, EXPENSE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, OPENING, CARD_FEE, CARD_SETTLEMENT, REFUND, WITHDRAWAL, SUPPLY
      amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
      balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }),
      referenceType: text("reference_type"),
      // sale, expense, transfer, settlement, payable
      referenceId: text("reference_id"),
      expectedSettlementDate: timestamp("expected_settlement_date"),
      // p/ cartão a receber (D+X)
      settled: boolean("settled").notNull().default(true),
      // false enquanto o cartão não liquidou
      description: text("description"),
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      accountIdx: index("account_movements_account_idx").on(t.accountId),
      createdIdx: index("account_movements_created_idx").on(t.createdAt),
      settledIdx: index("account_movements_settled_idx").on(t.settled)
    }));
    paymentMethodAccounts = pgTable("payment_method_accounts", {
      method: text("method").primaryKey(),
      // CASH, PIX, CREDIT_CARD, DEBIT_CARD, TRANSFER
      accountId: uuid("account_id").references(() => financialAccounts.id)
    });
    costLayers = pgTable("cost_layers", {
      id: uuid("id").primaryKey().defaultRandom(),
      productId: uuid("product_id").notNull().references(() => products.id),
      purchaseOrderId: uuid("purchase_order_id"),
      // null em entrada manual/devolução
      qtyOriginal: integer("qty_original").notNull(),
      qtyRemaining: integer("qty_remaining").notNull(),
      unitCostBrl: numeric("unit_cost_brl", { precision: 15, scale: 4 }).notNull(),
      sourceCurrency: text("source_currency").notNull().default("BRL"),
      // moeda original da compra
      fxRate: numeric("fx_rate", { precision: 18, scale: 6 }),
      // câmbio usado na conversão
      note: text("note"),
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      productIdx: index("cost_layers_product_idx").on(t.productId),
      productRemainingIdx: index("cost_layers_product_remaining_idx").on(t.productId, t.qtyRemaining)
    }));
    costConsumptions = pgTable("cost_consumptions", {
      id: uuid("id").primaryKey().defaultRandom(),
      layerId: uuid("layer_id").references(() => costLayers.id),
      // null = camada virtual (estoque sem camada, custo atual)
      productId: uuid("product_id").notNull().references(() => products.id),
      saleId: uuid("sale_id"),
      // null = saída manual/ajuste
      qty: integer("qty").notNull(),
      unitCostBrl: numeric("unit_cost_brl", { precision: 15, scale: 4 }).notNull(),
      reason: text("reason").notNull().default("SALE"),
      // SALE, MANUAL_EXIT, ADJUSTMENT, RETURN_REVERSAL
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      saleIdx: index("cost_consumptions_sale_idx").on(t.saleId),
      productIdx: index("cost_consumptions_product_idx").on(t.productId)
    }));
    abandonedCarts = pgTable("abandoned_carts", {
      id: uuid("id").primaryKey().defaultRandom(),
      customerPhone: text("customer_phone").notNull().unique(),
      // Usamos o telefone como chave única para atualizar o carrinho existente
      customerName: text("customer_name"),
      cartData: jsonb("cart_data").notNull(),
      status: text("status").notNull().default("PENDING"),
      // PENDING, RECOVERED, IGNORED
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    storeOrders = pgTable("store_orders", {
      id: uuid("id").primaryKey().defaultRandom(),
      code: text("code").notNull().unique(),
      // código curto que o cliente usa para acompanhar
      saleId: uuid("sale_id").references(() => sales.id),
      customerName: text("customer_name").notNull(),
      customerPhone: text("customer_phone").notNull(),
      customerDocument: text("customer_document"),
      deliveryType: text("delivery_type").notNull().default("PICKUP"),
      // PICKUP | DELIVERY
      cep: text("cep"),
      street: text("street"),
      number: text("number"),
      neighborhood: text("neighborhood"),
      city: text("city"),
      state: text("state"),
      address: text("address"),
      // fallback livre
      notes: text("notes"),
      shippingMethod: text("shipping_method"),
      // PAC, SEDEX, etc
      totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
      // NFe / NFCe
      nfeStatus: text("nfe_status").notNull().default("PENDING"),
      // PENDING, ISSUED, ERROR
      nfeUrl: text("nfe_url"),
      nfeNumber: text("nfe_number"),
      // FASE E8: quem paga o PIX (pode ser outra pessoa, com autorização declarada)
      payerIsBuyer: boolean("payer_is_buyer").notNull().default(true),
      payerDeclaredName: text("payer_declared_name"),
      payerDeclaredCpf: text("payer_declared_cpf"),
      // FASE E7: conferência do dinheiro que entrou e prova de entrega
      receivedAmountBrl: numeric("received_amount_brl", { precision: 15, scale: 2 }),
      payerName: text("payer_name"),
      // titular que apareceu no comprovante PIX
      receiptCheckedAt: timestamp("receipt_checked_at"),
      deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
      // cliente disse "recebi"
      deliveryConfirmedIp: text("delivery_confirmed_ip"),
      deliveryConfirmedUserAgent: text("delivery_confirmed_user_agent"),
      // FASE E6: identificação do comprador e prova de aceite (defesa em MED/contestação)
      customerId: uuid("customer_id").references(() => customers.id),
      clientUserAgent: text("client_user_agent"),
      termsVersion: text("terms_version"),
      termsAcceptedAt: timestamp("terms_accepted_at"),
      termsSnapshot: text("terms_snapshot"),
      // texto exato que o cliente aceitou naquele dia
      // FASE E4: desconto de cupom e frete por região (total = subtotal - desconto + frete)
      subtotalBrl: numeric("subtotal_brl", { precision: 15, scale: 2 }),
      couponCode: text("coupon_code"),
      discountBrl: numeric("discount_brl", { precision: 15, scale: 2 }),
      shippingZone: text("shipping_zone"),
      shippingFeeBrl: numeric("shipping_fee_brl", { precision: 15, scale: 2 }),
      status: text("status").notNull().default("AWAITING_PAYMENT"),
      // AWAITING_PAYMENT | PROOF_SENT | CONFIRMED | CANCELED
      proofFileName: text("proof_file_name"),
      proofFileType: text("proof_file_type"),
      proofFileSize: integer("proof_file_size"),
      proofData: text("proof_data"),
      // base64 do comprovante enviado pelo cliente
      proofSentAt: timestamp("proof_sent_at"),
      confirmedBy: uuid("confirmed_by").references(() => users.id),
      confirmedAt: timestamp("confirmed_at"),
      canceledReason: text("canceled_reason"),
      clientIp: text("client_ip"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      statusIdx: index("store_orders_status_idx").on(t.status),
      createdIdx: index("store_orders_created_idx").on(t.createdAt)
    }));
    customerAddresses = pgTable("customer_addresses", {
      id: uuid("id").primaryKey().defaultRandom(),
      customerId: uuid("customer_id").notNull().references(() => customers.id),
      label: text("label").notNull().default("Endere\xE7o"),
      // "Casa", "Trabalho"...
      cep: text("cep"),
      street: text("street"),
      number: text("number"),
      neighborhood: text("neighborhood"),
      city: text("city"),
      state: text("state"),
      isDefault: boolean("is_default").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      customerIdx: index("customer_addresses_customer_idx").on(t.customerId)
    }));
    customerWishlist = pgTable("customer_wishlist", {
      id: uuid("id").primaryKey().defaultRandom(),
      customerId: uuid("customer_id").notNull().references(() => customers.id),
      productId: uuid("product_id").notNull().references(() => products.id),
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      customerIdx: index("customer_wishlist_customer_idx").on(t.customerId),
      uniqueItem: unique("customer_wishlist_customer_product_uq").on(t.customerId, t.productId)
    }));
    personalCategories = pgTable("personal_categories", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      monthlyBudget: numeric("monthly_budget", { precision: 15, scale: 2 }).notNull().default("0"),
      budgetCurrency: text("budget_currency").notNull().default("PYG"),
      // BRL, USD, PYG
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    personalExpenses = pgTable("personal_expenses", {
      id: uuid("id").primaryKey().defaultRandom(),
      categoryId: uuid("category_id").references(() => personalCategories.id),
      accountId: uuid("account_id").references(() => financialAccounts.id),
      amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
      currency: text("currency").notNull().default("PYG"),
      amountBrl: numeric("amount_brl", { precision: 15, scale: 2 }).notNull().default("0"),
      description: text("description"),
      expenseDate: timestamp("expense_date").notNull().defaultNow(),
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    }, (t) => ({
      dateIdx: index("personal_expenses_date_idx").on(t.expenseDate),
      categoryIdx: index("personal_expenses_category_idx").on(t.categoryId)
    }));
    profitDistributionRules = pgTable("profit_distribution_rules", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
      accountId: uuid("account_id").references(() => financialAccounts.id),
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    fxRates = pgTable("fx_rates", {
      id: uuid("id").primaryKey().defaultRandom(),
      day: text("day").notNull(),
      // YYYY-MM-DD
      pair: text("pair").notNull(),
      // USDBRL, USDPYG, BRLPYG
      rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
      source: text("source").notNull().default("API"),
      // API | MANUAL
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      dayPairSourceUq: unique("fx_rates_day_pair_source_uq").on(t.day, t.pair, t.source),
      dayIdx: index("fx_rates_day_idx").on(t.day)
    }));
    payables = pgTable("payables", {
      id: uuid("id").primaryKey().defaultRandom(),
      source: text("source").notNull().default("MANUAL"),
      // PURCHASE, MANUAL
      referenceId: uuid("reference_id"),
      // purchaseOrderId quando source=PURCHASE
      supplierId: uuid("supplier_id").references(() => suppliers.id),
      description: text("description").notNull(),
      amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull().default("0"),
      paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
      dueDate: timestamp("due_date"),
      status: text("status").notNull().default("PENDING"),
      // PENDING, PARTIAL, PAID
      paidAt: timestamp("paid_at"),
      notes: text("notes"),
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      statusIdx: index("payables_status_idx").on(t.status),
      dueIdx: index("payables_due_idx").on(t.dueDate),
      supplierIdx: index("payables_supplier_idx").on(t.supplierId)
    }));
    expenseCategories = pgTable("expense_categories", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      type: text("type").notNull().default("FIXED"),
      // FIXED, VARIABLE
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    expenses = pgTable("expenses", {
      id: uuid("id").primaryKey().defaultRandom(),
      categoryId: uuid("category_id").references(() => expenseCategories.id),
      // Category is now optional
      description: text("description").notNull(),
      expenseDate: timestamp("expense_date").notNull().defaultNow(),
      amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }).notNull(),
      paymentMethod: text("payment_method"),
      notes: text("notes"),
      isFixed: boolean("is_fixed").default(false),
      dueDay: integer("due_day"),
      isActive: boolean("is_active").default(true),
      recurrence: text("recurrence").notNull().default("NONE"),
      // NONE, MONTHLY
      createdBy: uuid("created_by").notNull().references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deletedAt: timestamp("deleted_at")
    });
    purchaseOcrJobs = pgTable("purchase_ocr_jobs", {
      id: uuid("id").primaryKey().defaultRandom(),
      fileName: text("file_name"),
      fileType: text("file_type"),
      fileSize: integer("file_size"),
      filePath: text("file_path"),
      status: text("status").notNull().default("PENDING"),
      // PENDING, PROCESSING, COMPLETED, FAILED
      rawText: text("raw_text"),
      parsedJson: text("parsed_json"),
      // Store Structured JSON response
      errorMessage: text("error_message"),
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      completedAt: timestamp("completed_at")
    });
    supplierInvoiceFiles = pgTable("supplier_invoice_files", {
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
      source: text("source").notNull().default("MANUAL"),
      // MANUAL, OCR
      createdBy: uuid("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      supplierIdIdx: index("supplier_invoice_files_supplier_id_idx").on(table.supplierId),
      purchaseOrderIdIdx: index("supplier_invoice_files_purchase_order_id_idx").on(table.purchaseOrderId),
      ocrJobIdIdx: index("supplier_invoice_files_ocr_job_id_idx").on(table.ocrJobId),
      createdAtIdx: index("supplier_invoice_files_created_at_idx").on(table.createdAt)
    }));
    stockTransfers = pgTable("stock_transfers", {
      id: uuid("id").primaryKey().defaultRandom(),
      code: text("code").notNull().unique(),
      title: text("title"),
      origin: text("origin").notNull().default("Paraguai"),
      destination: text("destination").notNull(),
      carrier: text("carrier"),
      status: text("status").notNull().default("IN_TRANSIT"),
      // IN_TRANSIT, RECEIVED, PARTIAL, DIVERGENT, CANCELED
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      statusIdx: index("stock_transfers_status_idx").on(table.status),
      createdAtIdx: index("stock_transfers_created_at_idx").on(table.createdAt),
      expectedAtIdx: index("stock_transfers_expected_at_idx").on(table.expectedAt)
    }));
    stockTransferItems = pgTable("stock_transfer_items", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      transferIdIdx: index("stock_transfer_items_transfer_id_idx").on(table.transferId),
      productIdIdx: index("stock_transfer_items_product_id_idx").on(table.productId),
      lotIdx: index("stock_transfer_items_lot_idx").on(table.productId, table.lotSent)
    }));
    notifications = pgTable("notifications", {
      id: uuid("id").primaryKey().defaultRandom(),
      type: text("type").notNull(),
      // ORDER_NEW, PAYMENT_CONFIRMED, PAYMENT_PROOF, PAYMENT_MISMATCH, CUSTOMER_NEW, SALE_RETURNED, MASTER_ACTION
      title: text("title").notNull(),
      message: text("message").notNull(),
      link: text("link"),
      read: boolean("read").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    storePageviews = pgTable("store_pageviews", {
      id: uuid("id").primaryKey().defaultRandom(),
      path: text("path").notNull(),
      visitorId: text("visitor_id"),
      country: text("country"),
      region: text("region"),
      city: text("city"),
      createdAt: timestamp("created_at").defaultNow()
    });
    storeNewsletterSubscribers = pgTable("store_newsletter_subscribers", {
      id: uuid("id").primaryKey().defaultRandom(),
      email: text("email").notNull().unique(),
      isActive: boolean("is_active").notNull().default(true),
      source: text("source").notNull().default("HOME_FIRST_ORDER"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    storeCoupons = pgTable("store_coupons", {
      id: uuid("id").primaryKey().defaultRandom(),
      code: text("code").notNull().unique(),
      // sempre gravado em MAIÚSCULA
      type: text("type").notNull().default("PERCENT"),
      // PERCENT | FIXED (R$)
      value: numeric("value", { precision: 12, scale: 2 }).notNull(),
      minOrderBrl: numeric("min_order_brl", { precision: 12, scale: 2 }),
      // pedido mínimo (opcional)
      maxUses: integer("max_uses"),
      // null = ilimitado
      usedCount: integer("used_count").notNull().default(0),
      validFrom: timestamp("valid_from"),
      validUntil: timestamp("valid_until"),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    storeShippingZones = pgTable("store_shipping_zones", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      // cidade/bairro que o cliente escolhe
      feeBrl: numeric("fee_brl", { precision: 12, scale: 2 }).notNull().default("0"),
      isActive: boolean("is_active").notNull().default(true),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    storeOrderPayments = pgTable("store_order_payments", {
      id: uuid("id").primaryKey().defaultRandom(),
      orderId: uuid("order_id").notNull().references(() => storeOrders.id),
      seq: integer("seq").notNull().default(1),
      amountBrl: numeric("amount_brl", { precision: 15, scale: 2 }).notNull(),
      status: text("status").notNull().default("PENDING"),
      // PENDING | PROOF_SENT | CONFIRMED
      proofFileName: text("proof_file_name"),
      proofFileType: text("proof_file_type"),
      proofFileSize: integer("proof_file_size"),
      proofData: text("proof_data"),
      proofSentAt: timestamp("proof_sent_at"),
      confirmedAt: timestamp("confirmed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (t) => ({
      orderIdx: index("store_order_payments_order_idx").on(t.orderId)
    }));
  }
});

// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import "dotenv/config";
var connectionString, configuredMax, maxConnections, client, sqlClient, db;
var init_db = __esm({
  "src/db/index.ts"() {
    init_schema();
    connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    configuredMax = Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 10));
    maxConnections = Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : 1;
    client = postgres(connectionString, {
      prepare: false,
      max: maxConnections,
      idle_timeout: 20,
      connect_timeout: 10
    });
    sqlClient = client;
    db = drizzle(client, { schema: schema_exports });
  }
});

// src/server/audit.ts
import { v4 as uuidv4 } from "uuid";
async function logAction(userId, action, tableName, recordId, oldValues, newValues, executor = db) {
  try {
    await executor.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      action,
      tableName,
      recordId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null
    });
  } catch (err) {
    console.error("Failed to log audit action:", err);
  }
}
var init_audit = __esm({
  "src/server/audit.ts"() {
    init_db();
    init_schema();
  }
});

// src/server/authMiddleware.ts
import jwt2 from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import { and, eq as eq2 } from "drizzle-orm";
function getPermissionCacheTtlMs() {
  const parsed = Number(process.env.PERMISSION_CACHE_TTL_MS || "120000");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 12e4;
}
function getCachedPermission(key) {
  const cached = permissionCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    permissionCache.delete(key);
    return null;
  }
  return cached.allowed;
}
function isPrivilegedRole(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "admin", "administrador", "administrator", "super admin", "super_admin"].includes(normalized);
}
function setCachedPermission(key, allowed) {
  const ttl = getPermissionCacheTtlMs();
  if (ttl <= 0) return;
  if (permissionCache.size >= PERMISSION_CACHE_MAX_SIZE) {
    const firstKey = permissionCache.keys().next().value;
    if (firstKey) permissionCache.delete(firstKey);
  }
  permissionCache.set(key, {
    allowed,
    expiresAt: Date.now() + ttl
  });
}
async function findMasterByPassword(password) {
  const candidates = await db.select({
    id: users.id,
    name: users.name,
    passwordHash: users.passwordHash,
    isActive: users.isActive,
    roleName: roles.name
  }).from(users).leftJoin(roles, eq2(users.roleId, roles.id)).where(eq2(users.isActive, true));
  for (const c of candidates) {
    if (String(c.roleName || "").trim().toLowerCase() !== "master") continue;
    const valid = await bcrypt2.compare(password, c.passwordHash);
    if (valid) return c;
  }
  return null;
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token not provided" });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt2.verify(token, SECRET2);
    if (payload?.kind === "customer") {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function requirePermission(moduleName, actionName) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      if (isPrivilegedRole(req.user.roleName)) {
        return next();
      }
      const cacheKey = `${req.user.roleId}:${moduleName}:${actionName}`;
      const cachedPermission = getCachedPermission(cacheKey);
      if (cachedPermission === true) {
        return next();
      }
      if (cachedPermission === false) {
        return res.status(403).json({ error: "Forbidden: Missing permission" });
      }
      let permissionPromise = permissionInflight.get(cacheKey);
      if (!permissionPromise) {
        permissionPromise = db.select().from(rolePermissions).innerJoin(permissions, eq2(rolePermissions.permissionId, permissions.id)).where(
          and(
            eq2(rolePermissions.roleId, req.user.roleId),
            eq2(permissions.module, moduleName),
            eq2(permissions.action, actionName)
          )
        ).limit(1).then((hasPerm) => {
          const allowed2 = hasPerm.length > 0;
          setCachedPermission(cacheKey, allowed2);
          return allowed2;
        }).finally(() => {
          permissionInflight.delete(cacheKey);
        });
        permissionInflight.set(cacheKey, permissionPromise);
      }
      const allowed = await permissionPromise;
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden: Missing permission" });
      }
      next();
    } catch (err) {
      console.error("Error checking permissions:", err);
      return res.status(500).json({ error: "Server error" });
    }
  };
}
var SECRET2, PERMISSION_CACHE_MAX_SIZE, permissionCache, permissionInflight;
var init_authMiddleware = __esm({
  "src/server/authMiddleware.ts"() {
    init_db();
    init_schema();
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from environment variables.");
    }
    SECRET2 = process.env.JWT_SECRET;
    PERMISSION_CACHE_MAX_SIZE = 1e3;
    permissionCache = /* @__PURE__ */ new Map();
    permissionInflight = /* @__PURE__ */ new Map();
  }
});

// src/server/fx.ts
var fx_exports = {};
__export(fx_exports, {
  FX_PAIRS: () => FX_PAIRS,
  default: () => fx_default,
  fetchApiRates: () => fetchApiRates,
  resolveRates: () => resolveRates,
  toBrl: () => toBrl,
  toUsd: () => toUsd
});
import { Router as Router4 } from "express";
import { and as and4, desc, eq as eq5, gte, inArray } from "drizzle-orm";
async function fetchApiRates() {
  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,USD-PYG,BRL-PYG", {
    signal: AbortSignal.timeout(8e3)
  });
  if (!res.ok) throw new Error(`AwesomeAPI ${res.status}`);
  const data = await res.json();
  const out = {};
  for (const pair of FX_PAIRS) {
    const bid = Number(data?.[pair]?.bid);
    if (Number.isFinite(bid) && bid > 0) out[pair] = bid;
  }
  if (!out.BRLPYG && out.USDPYG && out.USDBRL) out.BRLPYG = out.USDPYG / out.USDBRL;
  if (!out.USDPYG && out.BRLPYG && out.USDBRL) out.USDPYG = out.BRLPYG * out.USDBRL;
  try {
    const btRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL", {
      signal: AbortSignal.timeout(8e3)
    });
    if (btRes.ok) {
      const btData = await btRes.json();
      const price = Number(btData?.price);
      if (Number.isFinite(price) && price > 0) out.USDTBRL = price;
    }
  } catch (e) {
    console.error("[FX] Binance USDTBRL falhou:", e.message);
  }
  const day = todayStr();
  for (const [pair, rate] of Object.entries(out)) {
    await db.insert(fxRates).values({ day, pair, rate: rate.toFixed(6), source: "API" }).onConflictDoUpdate({
      target: [fxRates.day, fxRates.pair, fxRates.source],
      set: { rate: rate.toFixed(6), updatedAt: /* @__PURE__ */ new Date() }
    });
  }
  return out;
}
async function resolveRates(day) {
  const d = day || todayStr();
  const rows = await db.select().from(fxRates).where(eq5(fxRates.day, d));
  const map = {};
  for (const r of rows) {
    const cur = map[r.pair];
    if (!cur || r.source === "MANUAL") map[r.pair] = { rate: Number(r.rate), source: r.source, day: r.day };
  }
  const missing = FX_PAIRS.filter((p) => !map[p]);
  if (missing.length) {
    const prev = await db.select().from(fxRates).where(inArray(fxRates.pair, missing)).orderBy(desc(fxRates.day), desc(fxRates.updatedAt)).limit(50);
    for (const r of prev) {
      if (!map[r.pair] || map[r.pair].day === r.day && r.source === "MANUAL") {
        if (!map[r.pair] || r.source === "MANUAL") map[r.pair] = { rate: Number(r.rate), source: r.source, day: r.day };
      }
    }
  }
  return map;
}
async function toBrl(amount, currency, day) {
  if (currency === "BRL" || !currency) return amount;
  const rates = await resolveRates(day);
  if (currency === "USD") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USD/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount * r;
  }
  if (currency === "PYG") {
    const r = rates.BRLPYG?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o BRL/PYG \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount / r;
  }
  if (currency === "USDT") {
    const r = rates.USDTBRL?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USDT/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount * r;
  }
  throw new Error(`Moeda desconhecida: ${currency}`);
}
async function toUsd(amount, currency, day) {
  if (currency === "USD" || !currency) return amount;
  const rates = await resolveRates(day);
  if (currency === "BRL") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USD/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount / r;
  }
  if (currency === "PYG") {
    const r = rates.USDPYG?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USD/PYG \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount / r;
  }
  if (currency === "USDT") {
    const usdtBrl = rates.USDTBRL?.rate;
    const usdBrl = rates.USDBRL?.rate;
    if (!usdtBrl || !usdBrl) throw new Error("Sem cota\xE7\xE3o USDT/BRL ou USD/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio.");
    return amount * (usdtBrl / usdBrl);
  }
  throw new Error(`Moeda desconhecida: ${currency}`);
}
var router4, FX_PAIRS, todayStr, fx_default;
var init_fx = __esm({
  "src/server/fx.ts"() {
    init_db();
    init_schema();
    init_authMiddleware();
    init_audit();
    router4 = Router4();
    router4.use(requireAuth);
    FX_PAIRS = ["USDBRL", "USDPYG", "BRLPYG", "USDTBRL"];
    todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    router4.get("/today", requirePermission("cash", "view"), async (_req, res) => {
      try {
        const day = todayStr();
        const existing = await db.select({ id: fxRates.id }).from(fxRates).where(and4(eq5(fxRates.day, day), eq5(fxRates.source, "API"))).limit(1);
        if (!existing.length) {
          try {
            await fetchApiRates();
          } catch (e) {
            console.error("[FX] AwesomeAPI falhou:", e.message);
          }
        }
        const rates = await resolveRates(day);
        res.json({ day, rates });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    router4.post("/refresh", requirePermission("cash", "view"), async (_req, res) => {
      try {
        const fetched = await fetchApiRates();
        res.json({ success: true, fetched, rates: await resolveRates() });
      } catch (err) {
        res.status(502).json({ error: `Falha ao buscar c\xE2mbio: ${err.message}` });
      }
    });
    router4.post("/override", requirePermission("cash", "manage_accounts"), async (req, res) => {
      try {
        const { pair, rate } = req.body || {};
        if (!FX_PAIRS.includes(pair)) return res.status(400).json({ error: `Par inv\xE1lido (${FX_PAIRS.join(", ")}).` });
        const r = Number(rate);
        if (!Number.isFinite(r) || r <= 0) return res.status(400).json({ error: "Taxa inv\xE1lida." });
        const day = todayStr();
        await db.insert(fxRates).values({ day, pair, rate: r.toFixed(6), source: "MANUAL" }).onConflictDoUpdate({
          target: [fxRates.day, fxRates.pair, fxRates.source],
          set: { rate: r.toFixed(6), updatedAt: /* @__PURE__ */ new Date() }
        });
        await logAction(req.user.userId, "FX_OVERRIDE", "fx_rates", pair, null, { day, pair, rate: r });
        res.json({ success: true, rates: await resolveRates(day) });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });
    router4.delete("/override/:pair", requirePermission("cash", "manage_accounts"), async (req, res) => {
      try {
        const pair = String(req.params.pair);
        await db.delete(fxRates).where(and4(eq5(fxRates.day, todayStr()), eq5(fxRates.pair, pair), eq5(fxRates.source, "MANUAL")));
        res.json({ success: true, rates: await resolveRates() });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });
    router4.get("/history", requirePermission("cash", "view"), async (req, res) => {
      try {
        const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 1), 365);
        const from = /* @__PURE__ */ new Date();
        from.setDate(from.getDate() - days);
        const rows = await db.select().from(fxRates).where(gte(fxRates.day, from.toISOString().slice(0, 10))).orderBy(fxRates.day);
        res.json({ data: rows });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    fx_default = router4;
  }
});

// src/lib/version.ts
var version_exports = {};
__export(version_exports, {
  APP_VERSION: () => APP_VERSION
});
var APP_VERSION;
var init_version = __esm({
  "src/lib/version.ts"() {
    APP_VERSION = "1.0.0282";
  }
});

// src/lib/pix.ts
var pix_exports = {};
__export(pix_exports, {
  buildPixPayload: () => buildPixPayload
});
function buildPixPayload({
  pixKey,
  amount,
  merchantName,
  merchantCity,
  txid
}) {
  const key = onlyAscii(pixKey);
  if (!key) throw new Error("Chave PIX n\xE3o configurada.");
  const gui = field("00", "BR.GOV.BCB.PIX");
  const keyField = field("01", key);
  const merchantAccount = field("26", gui + keyField);
  const name = onlyAscii(merchantName || "SUA LOJA").slice(0, 25) || "SUA LOJA";
  const city = onlyAscii(merchantCity || "CIUDAD DEL ESTE").slice(0, 15) || "CIUDAD DEL ESTE";
  const safeTxid = onlyAscii(txid || "***").slice(0, 25) || "***";
  const additional = field("62", field("05", safeTxid));
  let payload = "";
  payload += field("00", "01");
  payload += field("01", "12");
  payload += merchantAccount;
  payload += field("52", "0000");
  payload += field("53", "986");
  if (amount && amount > 0) payload += field("54", amount.toFixed(2));
  payload += field("58", "BR");
  payload += field("59", name);
  payload += field("60", city);
  payload += additional;
  payload += "6304";
  return payload + crc16(payload);
}
var onlyAscii, field, crc16;
var init_pix = __esm({
  "src/lib/pix.ts"() {
    onlyAscii = (value) => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").trim();
    field = (id, value) => {
      const v = value || "";
      return `${id}${String(v.length).padStart(2, "0")}${v}`;
    };
    crc16 = (payload) => {
      let crc = 65535;
      for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          crc = crc & 32768 ? crc << 1 ^ 4129 : crc << 1;
          crc &= 65535;
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, "0");
    };
  }
});

// api/handler.ts
import express from "express";
import cors from "cors";

// src/server/auth.ts
init_db();
init_schema();
init_audit();
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
var router = Router();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}
var SECRET = process.env.JWT_SECRET;
var meCache = /* @__PURE__ */ new Map();
var ME_CACHE_TTL_MS = Number(process.env.AUTH_ME_CACHE_TTL_MS || "300000");
var LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || "8");
var LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || "900000");
var loginAttempts = /* @__PURE__ */ new Map();
function loginKey(req, username) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = Array.isArray(fwd) ? fwd[0] : String(fwd || req.socket?.remoteAddress || "").split(",")[0].trim();
  return `${ip}:${String(username || "").toLowerCase()}`;
}
function checkLoginBlocked(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return 0;
  const now = Date.now();
  if (entry.blockedUntil > now) return Math.ceil((entry.blockedUntil - now) / 1e3);
  if (now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return 0;
  }
  return 0;
}
function registerLoginFailure(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) entry.blockedUntil = now + LOGIN_WINDOW_MS;
}
function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}
function getCachedMe(userId) {
  const cached = meCache.get(userId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    meCache.delete(userId);
    return null;
  }
  return cached.value;
}
function setCachedMe(userId, value) {
  if (!Number.isFinite(ME_CACHE_TTL_MS) || ME_CACHE_TTL_MS <= 0) return;
  if (meCache.size > 1e3) meCache.clear();
  meCache.set(userId, { value, expiresAt: Date.now() + ME_CACHE_TTL_MS });
}
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const attemptKey = loginKey(req, username);
    const blockedFor = checkLoginBlocked(attemptKey);
    if (blockedFor > 0) {
      return res.status(429).json({ error: `Muitas tentativas de login. Tente novamente em ${Math.ceil(blockedFor / 60)} min.` });
    }
    const usersResult = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      roleId: users.roleId,
      roleName: roles.name
    }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).where(eq(users.username, username)).limit(1);
    const user = usersResult[0];
    if (!user) {
      registerLoginFailure(attemptKey);
      return res.status(401).json({ error: "Credenciais inv\xE1lidas" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Usu\xE1rio inativo" });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      registerLoginFailure(attemptKey);
      return res.status(401).json({ error: "Credenciais inv\xE1lidas" });
    }
    clearLoginAttempts(attemptKey);
    const token = jwt.sign(
      { userId: user.id, roleId: user.roleId, roleName: user.roleName },
      SECRET,
      { expiresIn: "8h" }
    );
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || req.socket.remoteAddress || "").split(",")[0].trim();
    const userAgent = String(req.headers["user-agent"] || "");
    const deviceInfo = req.body?.deviceInfo || {};
    const responseUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.roleName,
      roleName: user.roleName,
      roleKey: user.roleName?.toLowerCase()
    };
    setCachedMe(user.id, responseUser);
    res.json({
      token,
      user: responseUser
    });
    logAction(user.id, "LOGIN", "users", user.id, null, {
      username: user.username,
      ip,
      deviceLabel: deviceInfo.deviceLabel,
      platform: deviceInfo.platform,
      timezone: deviceInfo.timezone,
      userAgent
    }).catch((error) => console.error("Erro ao registrar auditoria de login:", error));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "N\xE3o autorizado" });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET);
    const cached = getCachedMe(payload.userId);
    if (cached) {
      return res.json(cached);
    }
    const usersResult = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isActive: users.isActive,
      roleName: roles.name,
      roleKey: roles.name
    }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).where(eq(users.id, payload.userId)).limit(1);
    const user = usersResult[0];
    if (!user) return res.status(401).json({ error: "Usu\xE1rio n\xE3o encontrado" });
    if (!user.isActive) return res.status(403).json({ error: "Usu\xE1rio inativo" });
    const responseUser = {
      ...user,
      role: user.roleName,
      roleKey: user.roleName?.toLowerCase()
    };
    setCachedMe(payload.userId, responseUser);
    res.json(responseUser);
  } catch (err) {
    return res.status(401).json({ error: "Token inv\xE1lido ou expirado" });
  }
});
var auth_default = router;

// src/server/users.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router2 } from "express";
import { eq as eq3, isNull, sql as sql2, and as and2, ne } from "drizzle-orm";
import { v4 as uuidv42 } from "uuid";
import bcrypt3 from "bcryptjs";

// src/server/utils.ts
function toUpperText(value) {
  if (typeof value !== "string") return value;
  if (!value) return void 0;
  return value.trim().toUpperCase();
}
function toLowerText(value) {
  if (typeof value !== "string") return value;
  if (!value) return void 0;
  return value.trim().toLowerCase();
}
function handleDbError(e, customMessages = {}) {
  if (e?.code === "23505") {
    const match = e.detail?.match(/Key \(([^)]+)\)=\(/);
    const field2 = match ? match[1] : "field";
    let msg = `O valor informado para ${field2} j\xE1 est\xE1 em uso.`;
    if (customMessages[field2]) {
      msg = customMessages[field2];
    } else {
      if (field2 === "sku") msg = "J\xE1 existe um produto cadastrado com este SKU. Se estiver arquivado, restaure ou exclua-o definitivamente.";
      if (field2 === "upc") msg = "J\xE1 existe um produto cadastrado com este UPC.";
      if (field2 === "document") msg = "J\xE1 existe um cliente com este documento.";
      if (field2 === "username") msg = "Este nome de usu\xE1rio j\xE1 est\xE1 em uso.";
      if (field2 === "email") msg = "Este e-mail j\xE1 est\xE1 em uso.";
    }
    return { error: "Dados inv\xE1lidos.", fields: { [field2]: msg } };
  }
  return { error: e.message || "Erro interno do servidor." };
}

// src/server/cache.ts
var cache = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
function getTtlMs(defaultTtlMs) {
  const parsed = Number(process.env.API_CACHE_TTL_MS || String(defaultTtlMs));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultTtlMs;
}
function clearApiCache(prefix) {
  if (!prefix) {
    cache.clear();
    inflight.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}
async function withApiCache(key, ttlMs, loader) {
  const effectiveTtl = getTtlMs(ttlMs);
  if (effectiveTtl <= 0) return loader();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  if (cached) cache.delete(key);
  const running = inflight.get(key);
  if (running) return running;
  const promise = loader().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + effectiveTtl });
    inflight.delete(key);
    return value;
  }).catch((error) => {
    inflight.delete(key);
    throw error;
  });
  inflight.set(key, promise);
  return promise;
}

// src/server/users.ts
var router2 = Router2();
router2.use(requireAuth);
function isMasterRole(roleName) {
  return String(roleName || "").toLowerCase() === "master";
}
function clampCommission(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.min(Math.max(n, 0), 100).toFixed(2);
}
function nonMasterUserFilter(req) {
  return isMasterRole(req.user?.roleName) ? and2(eq3(users.isActive, true), isNull(users.deletedAt)) : and2(eq3(users.isActive, true), isNull(users.deletedAt), ne(roles.name, "Master"));
}
async function isTargetMaster(userId) {
  const target = await db.select({ roleName: roles.name }).from(users).leftJoin(roles, eq3(users.roleId, roles.id)).where(eq3(users.id, userId)).limit(1);
  return String(target[0]?.roleName || "").toLowerCase() === "master";
}
function isPrivilegedRoleName(roleName) {
  return ["master", "admin", "administrador", "administrator"].includes(String(roleName || "").trim().toLowerCase());
}
async function roleNameById(roleId) {
  if (!roleId) return null;
  const row = await db.select({ name: roles.name }).from(roles).where(eq3(roles.id, roleId)).limit(1);
  return row[0]?.name || null;
}
router2.get("/", requirePermission("user", "manage"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const filter = nonMasterUserFilter(req);
    const [list, countResult] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        roleName: roles.name,
        roleId: users.roleId,
        commissionPercent: users.commissionPercent,
        createdAt: users.createdAt
      }).from(users).leftJoin(roles, eq3(users.roleId, roles.id)).where(filter).limit(limit).offset(offset),
      db.select({ count: sql2`count(*)` }).from(users).leftJoin(roles, eq3(users.roleId, roles.id)).where(filter)
    ]);
    const total = Number(countResult[0].count);
    res.json({ data: list, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
router2.get("/roles", requirePermission("user", "manage"), async (req, res) => {
  try {
    const includeMaster = isMasterRole(req.user?.roleName);
    const list = await withApiCache(`users:roles:${includeMaster ? "all" : "no-master"}`, 5 * 60 * 1e3, async () => {
      const query = db.select({ id: roles.id, name: roles.name, description: roles.description }).from(roles);
      return includeMaster ? await query : await query.where(ne(roles.name, "Master"));
    });
    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router2.post("/", requirePermission("user", "manage"), async (req, res) => {
  try {
    const id = uuidv42();
    const { name: rawName, username: rawUsername, email: rawEmail, password, roleId } = req.body;
    const name = toUpperText(rawName);
    const username = toLowerText(rawUsername);
    const email = toLowerText(rawEmail);
    const fields = {};
    if (!name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!username) fields.username = "Username \xE9 obrigat\xF3rio.";
    if (!password) fields.password = "Senha \xE9 obrigat\xF3ria ao criar.";
    if (!roleId) fields.roleId = "Perfil \xE9 obrigat\xF3rio.";
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        fields.email = "Formato de e-mail inv\xE1lido.";
      }
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (isPrivilegedRoleName(await roleNameById(roleId)) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Apenas o Master pode criar usu\xE1rios com perfil administrativo.", fields: { roleId: "Perfil n\xE3o permitido." } });
    }
    if (username) {
      const oldUser = await db.select().from(users).where(eq3(users.username, username)).limit(1);
      if (oldUser.length > 0) {
        if (oldUser[0].isActive) {
          return res.status(409).json({ error: "J\xE1 existe um usu\xE1rio com este username.", fields: { username: "Username j\xE1 est\xE1 em uso." } });
        } else {
          return res.status(409).json({ error: "J\xE1 existe um usu\xE1rio arquivado com este username. Restaure ou exclua definitivamente o usu\xE1rio antigo.", fields: { username: "Username em uso por usu\xE1rio arquivado." } });
        }
      }
    }
    const passwordHash = await bcrypt3.hash(password, 10);
    const commissionPercent = clampCommission(req.body?.commissionPercent);
    await db.insert(users).values({ id, name, username, email, passwordHash, roleId, commissionPercent });
    await logAction(req.user.userId, "CREATE", "users", id, null, { name, username, email, roleId, commissionPercent });
    res.status(201).json({ id });
  } catch (error) {
    res.status(400).json(handleDbError(error, { username: "Nome de usu\xE1rio j\xE1 existe.", email: "Email j\xE1 est\xE1 em uso." }));
  }
});
router2.put("/:id", requirePermission("user", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usu\xE1rio protegido n\xE3o pode ser alterado." });
    }
    const { name: rawName, username: rawUsername, email: rawEmail, roleId, isActive, password } = req.body;
    const name = toUpperText(rawName);
    const username = toLowerText(rawUsername);
    const email = toLowerText(rawEmail);
    const fields = {};
    if (!name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!username) fields.username = "Username \xE9 obrigat\xF3rio.";
    if (!roleId) fields.roleId = "Perfil \xE9 obrigat\xF3rio.";
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        fields.email = "Formato de e-mail inv\xE1lido.";
      }
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (isPrivilegedRoleName(await roleNameById(roleId)) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Apenas o Master pode atribuir perfil administrativo.", fields: { roleId: "Perfil n\xE3o permitido." } });
    }
    const oldRec = await db.select().from(users).where(eq3(users.id, id)).limit(1);
    if (username && username !== oldRec[0].username) {
      const dupUser = await db.select().from(users).where(eq3(users.username, username)).limit(1);
      if (dupUser.length > 0) {
        if (dupUser[0].isActive) {
          return res.status(409).json({ error: "J\xE1 existe um usu\xE1rio com este username.", fields: { username: "Username j\xE1 est\xE1 em uso." } });
        } else {
          return res.status(409).json({ error: "J\xE1 existe um usu\xE1rio arquivado com este username. Restaure ou exclua definitivamente o usu\xE1rio antigo.", fields: { username: "Username em uso por usu\xE1rio arquivado." } });
        }
      }
    }
    let updates = { name, username, email, roleId, isActive, commissionPercent: clampCommission(req.body?.commissionPercent), updatedAt: /* @__PURE__ */ new Date() };
    if (password) {
      updates.passwordHash = await bcrypt3.hash(password, 10);
    }
    await db.update(users).set(updates).where(eq3(users.id, id));
    const { passwordHash: _oldHash, ...oldRecSafe } = oldRec[0];
    await logAction(req.user.userId, "UPDATE", "users", id, oldRecSafe, { name, username, email, roleId, isActive });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(handleDbError(error, { username: "Nome de usu\xE1rio j\xE1 existe.", email: "Email j\xE1 est\xE1 em uso." }));
  }
});
router2.delete("/:id", requirePermission("user", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usu\xE1rio protegido n\xE3o pode ser arquivado." });
    }
    if (id === req.user?.userId) {
      return res.status(400).json({ error: "Voc\xEA n\xE3o pode arquivar seu pr\xF3prio usu\xE1rio." });
    }
    await db.update(users).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, id));
    await logAction(req.user.userId, "ARCHIVE", "users", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router2.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id)) {
      return res.status(403).json({ error: "Este usu\xE1rio protegido n\xE3o pode ser exclu\xEDdo definitivamente." });
    }
    const usedInSales = await db.select({ count: sql2`count(*)` }).from(sales).where(eq3(sales.userId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este usu\xE1rio possui hist\xF3rico de vendas e n\xE3o pode ser exclu\xEDdo definitivamente. Use a op\xE7\xE3o Arquivar." });
    }
    const usedInMovements = await db.select({ count: sql2`count(*)` }).from(stockMovements).where(eq3(stockMovements.userId, id));
    if (Number(usedInMovements[0].count) > 0) {
      return res.status(400).json({ error: "Este usu\xE1rio possui hist\xF3rico de movimenta\xE7\xF5es e n\xE3o pode ser exclu\xEDdo. Use a op\xE7\xE3o Arquivar." });
    }
    await db.delete(users).where(eq3(users.id, id));
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "users", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "users", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});
router2.patch("/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    if (await isTargetMaster(id) && !isMasterRole(req.user?.roleName)) {
      return res.status(403).json({ error: "Este usu\xE1rio protegido n\xE3o pode ser restaurado." });
    }
    await db.update(users).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, id));
    await logAction(req.user.userId, "RESTORE", "users", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
var users_default = router2;

// src/server/products.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router6 } from "express";
import { eq as eq7, ilike, or, sql as sql5, and as and6, isNull as isNull2, desc as desc3, inArray as inArray3 } from "drizzle-orm";

// src/server/lots.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router3 } from "express";
import { and as and3, asc, eq as eq4, gt, isNotNull, lte } from "drizzle-orm";
var router3 = Router3();
router3.use(requireAuth);
function asExpiryDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
async function addLotStock(tx, productId, lotNumber, quantity, expiryDate) {
  const lot = String(lotNumber || "").trim().toUpperCase();
  const qty = Math.floor(Number(quantity) || 0);
  if (!lot || qty <= 0) return;
  const existing = await tx.select().from(productLots).where(and3(eq4(productLots.productId, productId), eq4(productLots.lotNumber, lot))).limit(1);
  if (existing.length === 0) {
    await tx.insert(productLots).values({
      productId,
      lotNumber: lot,
      expiryDate: expiryDate || null,
      physicalStock: qty
    });
  } else {
    await tx.update(productLots).set({
      physicalStock: Number(existing[0].physicalStock) + qty,
      expiryDate: expiryDate || existing[0].expiryDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(productLots.id, existing[0].id));
  }
}
async function consumeLotStock(tx, productId, lotNumber, quantity) {
  const lot = String(lotNumber || "").trim().toUpperCase();
  const qty = Math.floor(Number(quantity) || 0);
  if (!lot || qty <= 0) return;
  const existing = await tx.select().from(productLots).where(and3(eq4(productLots.productId, productId), eq4(productLots.lotNumber, lot))).limit(1);
  if (existing.length === 0) return;
  const next = Math.max(0, Number(existing[0].physicalStock) - qty);
  await tx.update(productLots).set({ physicalStock: next, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(productLots.id, existing[0].id));
}
async function consumeLotsFEFO(tx, productId, quantity) {
  let remaining = Math.floor(Number(quantity) || 0);
  if (remaining <= 0) return 0;
  const lots = await tx.select().from(productLots).where(and3(eq4(productLots.productId, productId), gt(productLots.physicalStock, 0))).orderBy(asc(productLots.expiryDate), asc(productLots.lotNumber));
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(lot.physicalStock));
    await tx.update(productLots).set({ physicalStock: Number(lot.physicalStock) - take, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(productLots.id, lot.id));
    remaining -= take;
  }
  return remaining;
}
async function consumeSaleLots(tx, saleId) {
  const allocs = await tx.select({
    productId: saleItemLots.productId,
    lotNumber: saleItemLots.lotNumber,
    quantity: saleItemLots.quantity
  }).from(saleItemLots).where(eq4(saleItemLots.saleId, saleId));
  for (const a of allocs) {
    await consumeLotStock(tx, a.productId, a.lotNumber, Number(a.quantity || 0));
  }
}
async function restoreSaleLots(tx, saleId) {
  const allocs = await tx.select({
    productId: saleItemLots.productId,
    lotNumber: saleItemLots.lotNumber,
    quantity: saleItemLots.quantity
  }).from(saleItemLots).where(eq4(saleItemLots.saleId, saleId));
  for (const a of allocs) {
    await addLotStock(tx, a.productId, a.lotNumber, Number(a.quantity || 0), null);
  }
}
router3.get("/product/:productId", async (req, res) => {
  try {
    const rows = await db.select({
      id: productLots.id,
      lotNumber: productLots.lotNumber,
      expiryDate: productLots.expiryDate,
      physicalStock: productLots.physicalStock
    }).from(productLots).where(and3(eq4(productLots.productId, req.params.productId), gt(productLots.physicalStock, 0))).orderBy(asc(productLots.expiryDate), asc(productLots.lotNumber));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.get("/expiring", requirePermission("product", "view"), async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "90"), 10) || 90, 1), 365);
    const limit = /* @__PURE__ */ new Date();
    limit.setDate(limit.getDate() + days);
    const rows = await db.select({
      id: productLots.id,
      productId: productLots.productId,
      productName: products.name,
      sku: products.sku,
      lotNumber: productLots.lotNumber,
      expiryDate: productLots.expiryDate,
      physicalStock: productLots.physicalStock
    }).from(productLots).innerJoin(products, eq4(productLots.productId, products.id)).where(and3(
      gt(productLots.physicalStock, 0),
      isNotNull(productLots.expiryDate),
      lte(productLots.expiryDate, limit)
    )).orderBy(asc(productLots.expiryDate));
    const now = Date.now();
    const data = rows.map((r) => {
      const exp = r.expiryDate ? new Date(r.expiryDate).getTime() : 0;
      const daysLeft = Math.ceil((exp - now) / (1e3 * 60 * 60 * 24));
      return { ...r, daysLeft, expired: daysLeft < 0 };
    });
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router3.patch("/:lotId", requirePermission("product", "manage"), async (req, res) => {
  try {
    const ofertaQty = Math.max(0, parseInt(req.body?.ofertaQty) || 0);
    const outletQty = Math.max(0, parseInt(req.body?.outletQty) || 0);
    const [lot] = await db.select().from(productLots).where(eq4(productLots.id, req.params.lotId)).limit(1);
    if (!lot) return res.status(404).json({ error: "Lote n\xE3o encontrado." });
    if (ofertaQty + outletQty > Number(lot.physicalStock)) {
      return res.status(400).json({ error: `Oferta + Outlet (${ofertaQty + outletQty}) n\xE3o pode passar do saldo do lote (${lot.physicalStock}).` });
    }
    await db.update(productLots).set({ ofertaQty, outletQty, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(productLots.id, req.params.lotId));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var lots_default = router3;

// src/server/costLayers.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router5 } from "express";
import { and as and5, asc as asc2, desc as desc2, eq as eq6, gt as gt2, gte as gte2, lte as lte2, inArray as inArray2, sql as sql4 } from "drizzle-orm";

// src/lib/dateRange.ts
function dayStartUtc(dateStr) {
  return /* @__PURE__ */ new Date(`${dateStr}T00:00:00.000Z`);
}
function dayEndUtc(dateStr) {
  return /* @__PURE__ */ new Date(`${dateStr}T23:59:59.999Z`);
}

// src/server/costLayers.ts
var router5 = Router5();
router5.use(requireAuth);
var round4 = (n) => Math.round(n * 1e4) / 1e4;
var round2 = (n) => Math.round(n * 100) / 100;
async function addCostLayer(tx, opts) {
  const qty = Math.floor(Number(opts.qty) || 0);
  if (qty <= 0) return;
  await tx.insert(costLayers).values({
    productId: opts.productId,
    purchaseOrderId: opts.purchaseOrderId || null,
    qtyOriginal: qty,
    qtyRemaining: qty,
    unitCostBrl: round4(Number(opts.unitCostBrl) || 0).toFixed(4),
    sourceCurrency: opts.sourceCurrency || "BRL",
    fxRate: opts.fxRate ? Number(opts.fxRate).toFixed(6) : null,
    note: opts.note || null
  });
}
async function consumeFifo(tx, productId, qty, ref) {
  let remaining = Math.floor(Number(qty) || 0);
  if (remaining <= 0) return 0;
  const reason = ref.reason || "SALE";
  let totalCost = 0;
  const layers = await tx.select().from(costLayers).where(and5(eq6(costLayers.productId, productId), gt2(costLayers.qtyRemaining, 0))).orderBy(asc2(costLayers.createdAt), asc2(costLayers.id)).for("update");
  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(layer.qtyRemaining));
    const unitCost = Number(layer.unitCostBrl);
    await tx.update(costLayers).set({ qtyRemaining: Number(layer.qtyRemaining) - take }).where(eq6(costLayers.id, layer.id));
    await tx.insert(costConsumptions).values({
      layerId: layer.id,
      productId,
      saleId: ref.saleId || null,
      qty: take,
      unitCostBrl: unitCost.toFixed(4),
      reason
    });
    totalCost += take * unitCost;
    remaining -= take;
  }
  if (remaining > 0) {
    const [prod] = await tx.select({ costPrice: products.costPrice }).from(products).where(eq6(products.id, productId)).limit(1);
    const unitCost = Number(prod?.costPrice || 0);
    await tx.insert(costConsumptions).values({
      layerId: null,
      productId,
      saleId: ref.saleId || null,
      qty: remaining,
      unitCostBrl: unitCost.toFixed(4),
      reason
    });
    totalCost += remaining * unitCost;
  }
  return round2(totalCost);
}
async function restoreSaleLayers(tx, saleId) {
  const cons = await tx.select().from(costConsumptions).where(and5(eq6(costConsumptions.saleId, saleId), eq6(costConsumptions.reason, "SALE")));
  if (!cons.length) return;
  const byProduct = /* @__PURE__ */ new Map();
  for (const c of cons) {
    const cur = byProduct.get(c.productId) || { qty: 0, cost: 0 };
    cur.qty += Number(c.qty);
    cur.cost += Number(c.qty) * Number(c.unitCostBrl);
    byProduct.set(c.productId, cur);
  }
  for (const [productId, agg] of byProduct.entries()) {
    if (agg.qty <= 0) continue;
    const avg = agg.cost / agg.qty;
    await addCostLayer(tx, { productId, qty: agg.qty, unitCostBrl: avg, note: `Devolu\xE7\xE3o da venda ${saleId.slice(0, 8)}` });
    await tx.insert(costConsumptions).values({
      layerId: null,
      productId,
      saleId,
      qty: -agg.qty,
      unitCostBrl: round4(avg).toFixed(4),
      reason: "RETURN_REVERSAL"
    });
  }
}
router5.get("/real-margin", requirePermission("reports", "financial"), async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date(Date.now() - 30 * 864e5);
    const dateTo = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : /* @__PURE__ */ new Date();
    const saleRows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      createdAt: sales.createdAt,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      currency: sales.currency,
      paymentStatus: sales.paymentStatus
    }).from(sales).leftJoin(customers, eq6(sales.customerId, customers.id)).where(and5(gte2(sales.createdAt, dateFrom), lte2(sales.createdAt, dateTo))).orderBy(desc2(sales.createdAt)).limit(500);
    const { resolveRates: resolveRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
    const marginRates = await resolveRates2().catch(() => ({}));
    const toBrlSync2 = (amount, currency) => {
      const cur = String(currency || "BRL");
      if (cur === "BRL" || !amount) return amount;
      if (cur === "USD") {
        const r = marginRates.USDBRL?.rate;
        return r ? amount * r : amount;
      }
      if (cur === "PYG") {
        const r = marginRates.BRLPYG?.rate;
        return r ? amount / r : amount;
      }
      return amount;
    };
    const ids = saleRows.map((s) => s.id);
    const costBySale = /* @__PURE__ */ new Map();
    if (ids.length) {
      const consRows = await db.select({
        saleId: costConsumptions.saleId,
        total: sql4`sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric))`
      }).from(costConsumptions).where(and5(inArray2(costConsumptions.saleId, ids), eq6(costConsumptions.reason, "SALE"))).groupBy(costConsumptions.saleId);
      for (const r of consRows) if (r.saleId) costBySale.set(r.saleId, Number(r.total) || 0);
    }
    const data = saleRows.filter((s) => costBySale.has(s.id)).map((s) => {
      const total = toBrlSync2(Number(s.totalAmount) || 0, String(s.currency || "BRL"));
      const realCost = round2(costBySale.get(s.id) || 0);
      const margin = round2(total - realCost);
      return { ...s, totalAmountBrl: round2(total), realCost, realMargin: margin, realMarginPercent: total > 0 ? round2(margin / total * 100) : 0 };
    });
    const totals = data.reduce((a, s) => ({
      sales: round2(a.sales + s.totalAmountBrl),
      cost: round2(a.cost + s.realCost),
      margin: round2(a.margin + s.realMargin)
    }), { sales: 0, cost: 0, margin: 0 });
    res.json({ data, totals: { ...totals, marginPercent: totals.sales > 0 ? round2(totals.margin / totals.sales * 100) : 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var costLayers_default = router5;

// src/server/products.ts
import { v4 as uuidv43 } from "uuid";

// src/lib/currency.ts
var CURRENCIES = ["BRL", "USD", "PYG", "USDT"];
function isValidCurrency(value) {
  return typeof value === "string" && CURRENCIES.includes(value);
}

// src/server/ollama.ts
var OllamaRequestError = class extends Error {
  constructor(message, status = 0, code = "OLLAMA_ERROR", retryAfterSeconds) {
    super(message);
    this.name = "OllamaRequestError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
};
function normalizeBaseUrl(raw) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}
function getOllamaBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.OLLAMA_BASE_URL || "");
  if (explicit) return explicit;
  if (process.env.OLLAMA_API_KEY) return "https://ollama.com/api";
  return "http://127.0.0.1:11434/api";
}
function getOllamaModel(kind = "text") {
  if (kind === "vision") {
    return process.env.OLLAMA_VISION_MODEL || process.env.OLLAMA_MODEL || "mistral-small3.2";
  }
  return process.env.OLLAMA_MODEL || "mistral-small3.2";
}
function isOllamaConfigured() {
  if (process.env.OLLAMA_BASE_URL) return true;
  if (process.env.OLLAMA_API_KEY) return true;
  return !process.env.VERCEL;
}
function parseRetryAfter(value) {
  if (!value) return void 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : void 0;
}
function getOllamaErrorInfo(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || "");
  const code = String(error?.code || "OLLAMA_ERROR");
  const rateLimited = status === 429 || /rate.?limit|too many requests|quota/i.test(message);
  const unavailable = status === 503 || status >= 500 || /ECONNREFUSED|fetch failed|temporarily unavailable|service unavailable|timeout|timed out/i.test(message);
  const notConfigured = code === "OLLAMA_NOT_CONFIGURED";
  return {
    status,
    message,
    code,
    rateLimited,
    unavailable,
    notConfigured,
    retryAfterSeconds: error?.retryAfterSeconds
  };
}
async function requestOnce(options) {
  if (!isOllamaConfigured()) {
    throw new OllamaRequestError(
      "Ollama n\xE3o configurado para este ambiente. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL.",
      0,
      "OLLAMA_NOT_CONFIGURED"
    );
  }
  const baseUrl = getOllamaBaseUrl();
  const apiKey = String(process.env.OLLAMA_API_KEY || "").trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5e3, options.timeoutMs || 55e3));
  try {
    const body = {
      model: options.model || getOllamaModel("text"),
      messages: options.messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2
      }
    };
    if (options.json && !/https:\/\/ollama\.com\/api$/i.test(baseUrl)) {
      body.format = "json";
    }
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text2 = await response.text();
    let data = {};
    try {
      data = text2 ? JSON.parse(text2) : {};
    } catch {
      data = {};
    }
    if (!response.ok) {
      const message = String(data?.error || data?.message || text2 || `Ollama HTTP ${response.status}`);
      throw new OllamaRequestError(
        message.slice(0, 600),
        response.status,
        response.status === 429 ? "OLLAMA_RATE_LIMIT" : "OLLAMA_HTTP_ERROR",
        parseRetryAfter(response.headers.get("retry-after"))
      );
    }
    const content = String(data?.message?.content || data?.response || "").trim();
    if (!content) {
      throw new OllamaRequestError("Ollama respondeu sem conte\xFAdo.", 502, "OLLAMA_EMPTY_RESPONSE");
    }
    return content;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new OllamaRequestError("Tempo limite ao consultar o Ollama.", 504, "OLLAMA_TIMEOUT");
    }
    if (error instanceof OllamaRequestError) throw error;
    throw new OllamaRequestError(String(error?.message || error || "Falha ao consultar o Ollama."), 0, "OLLAMA_NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}
async function ollamaChat(options) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOnce(options);
    } catch (error) {
      lastError = error;
      const info = getOllamaErrorInfo(error);
      const retryable = info.rateLimited || info.unavailable;
      if (attempt === 0 && retryable) {
        const delayMs = Math.min(4e3, Math.max(800, (info.retryAfterSeconds || 1) * 1e3));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    }
  }
  throw lastError;
}
function extractJsonObject(text2) {
  const cleaned = String(text2 || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  throw new Error("Resposta da IA n\xE3o cont\xE9m JSON v\xE1lido.");
}

// src/server/products.ts
var router6 = Router6();
router6.use(requireAuth);
function sendFriendlyAiError(res, error, operation) {
  const info = getOllamaErrorInfo(error);
  if (info.notConfigured) {
    return res.status(400).json({
      code: "AI_NOT_CONFIGURED",
      error: "Ollama n\xE3o configurado. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL no ambiente do sistema."
    });
  }
  if (info.rateLimited) {
    const waitText = info.retryAfterSeconds ? ` Aguarde cerca de ${info.retryAfterSeconds} segundos e tente novamente.` : " Aguarde um momento e tente novamente.";
    return res.status(429).json({
      code: "AI_RATE_LIMIT",
      error: `Limite tempor\xE1rio da IA atingido.${waitText}`,
      retryAfterSeconds: info.retryAfterSeconds || null
    });
  }
  if (info.unavailable) {
    return res.status(503).json({
      code: "AI_UNAVAILABLE",
      error: "O Ollama est\xE1 temporariamente indispon\xEDvel. Verifique o host/modelo configurado e tente novamente."
    });
  }
  console.error(`Ollama ${operation} error:`, info.message);
  return res.status(500).json({
    code: "AI_ERROR",
    error: `N\xE3o foi poss\xEDvel ${operation} com a IA agora. Tente novamente ou preencha o campo manualmente.`
  });
}
function validateExtraImages(images) {
  if (images == null) return null;
  if (!Array.isArray(images)) return "Formato das fotos extras inv\xE1lido.";
  if (images.length > 4) return "M\xE1ximo de 4 fotos extras.";
  for (const img of images) {
    const url = String(img?.imageUrl || "");
    if (url.startsWith("data:") && !url.startsWith("data:image/")) return "Arquivo de foto extra inv\xE1lido (s\xF3 imagem).";
    if (url.startsWith("data:image/") && url.length > 2e5) return "Foto extra muito grande. Limite ~150KB (o envio pela tela j\xE1 comprime sozinho).";
  }
  return null;
}
router6.get("/check-sku", async (req, res) => {
  try {
    const sku = toUpperText(req.query.sku);
    const excludeId = req.query.excludeId;
    if (!sku) return res.json({ exists: false, archived: false });
    let conditions = [eq7(products.sku, sku)];
    if (excludeId) {
      conditions.push(sql5`id != ${excludeId}`);
    }
    const p = await db.select({ isActive: products.isActive }).from(products).where(and6(...conditions)).limit(1);
    if (p.length > 0) {
      if (p[0].isActive) {
        return res.json({ exists: true, archived: false, message: "J\xE1 existe um produto cadastrado com este SKU." });
      } else {
        return res.json({ exists: true, archived: true, message: "J\xE1 existe um produto arquivado com este SKU. V\xE1 em Configura\xE7\xF5es > Arquivados para restaurar ou excluir definitivamente antes de reutilizar." });
      }
    }
    res.json({ exists: false, archived: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router6.get("/check-upc", async (req, res) => {
  try {
    const upc = toUpperText(req.query.upc);
    const excludeId = req.query.excludeId;
    if (!upc) return res.json({ exists: false, archived: false });
    let conditions = [eq7(products.upc, upc)];
    if (excludeId) {
      conditions.push(sql5`id != ${excludeId}`);
    }
    const p = await db.select({ isActive: products.isActive }).from(products).where(and6(...conditions)).limit(1);
    if (p.length > 0) {
      if (p[0].isActive) {
        return res.json({ exists: true, archived: false, message: "J\xE1 existe um produto cadastrado com este UPC." });
      } else {
        return res.json({ exists: true, archived: true, message: "J\xE1 existe um produto arquivado com este UPC. V\xE1 em Configura\xE7\xF5es > Arquivados para restaurar ou excluir definitivamente antes de reutilizar." });
      }
    }
    res.json({ exists: false, archived: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router6.get("/search", async (req, res) => {
  try {
    const search = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    let baseWhere = and6(eq7(products.isActive, true), isNull2(products.deletedAt));
    if (search) {
      const searchWhere = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.upc, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.model, `%${search}%`)
      );
      baseWhere = and6(baseWhere, searchWhere);
    }
    const list = await db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      brand: products.brand,
      model: products.model,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      ivaPercentage: products.ivaPercentage,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock,
      shelfCode: shelves.name
    }).from(products).leftJoin(stockBalances, eq7(products.id, stockBalances.productId)).leftJoin(shelves, eq7(products.shelfId, shelves.id)).where(baseWhere).orderBy(products.name, products.sku).limit(limit);
    const serialControlledIds = list.filter((item) => item.hasSerialNumber).map((item) => item.id);
    const serialSummaryRows = serialControlledIds.length > 0 ? await db.select({
      productId: productSerials.productId,
      availableCount: sql5`count(*)`,
      firstSerial: sql5`min(${productSerials.serialNumber})`
    }).from(productSerials).where(and6(
      inArray3(productSerials.productId, serialControlledIds),
      eq7(productSerials.status, "AVAILABLE")
    )).groupBy(productSerials.productId) : [];
    const serialSummaryByProduct = new Map(
      serialSummaryRows.map((row) => [row.productId, {
        availableCount: Number(row.availableCount || 0),
        firstSerial: row.firstSerial || null
      }])
    );
    const formattedData = list.map((item) => {
      const phys = item.physicalStock || 0;
      const resStock = item.reservedStock || 0;
      const serialSummary = serialSummaryByProduct.get(item.id);
      return {
        id: item.id,
        sku: item.sku,
        upc: item.upc,
        name: item.name,
        brand: item.brand,
        model: item.model,
        salePriceA: Number(item.salePriceA || 0),
        salePriceB: Number(item.salePriceB || 0),
        freightAmount: Number(item.ivaPercentage || 0),
        ivaPercentage: Number(item.ivaPercentage || 0),
        hasSerialNumber: !!item.hasSerialNumber,
        requiresLot: !!item.requiresLot,
        serialSummary: item.hasSerialNumber ? {
          firstSerial: serialSummary?.firstSerial || null,
          availableCount: serialSummary?.availableCount || 0
        } : null,
        stock: {
          physical: phys,
          reserved: resStock,
          available: phys - resStock
        },
        shelf: {
          code: item.shelfCode || ""
        }
      };
    });
    res.json({ data: formattedData, total: formattedData.length, page: 1, limit });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});
router6.get("/", async (req, res) => {
  try {
    const search = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const groupId = req.query.groupId;
    const subgroupId = req.query.subgroupId;
    const shelfId = req.query.shelfId;
    const stockStatus = req.query.stockStatus;
    const hasImage = req.query.hasImage;
    const hasSerialNumber = req.query.hasSerialNumber;
    let baseWhere = and6(eq7(products.isActive, true), isNull2(products.deletedAt));
    if (groupId) baseWhere = and6(baseWhere, eq7(products.groupId, groupId));
    if (subgroupId) baseWhere = and6(baseWhere, eq7(products.subgroupId, subgroupId));
    if (shelfId) baseWhere = and6(baseWhere, eq7(products.shelfId, shelfId));
    if (hasSerialNumber === "true") baseWhere = and6(baseWhere, eq7(products.hasSerialNumber, true));
    else if (hasSerialNumber === "false") baseWhere = and6(baseWhere, eq7(products.hasSerialNumber, false));
    if (stockStatus === "in-stock") {
      baseWhere = and6(baseWhere, sql5`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) > 0`);
    } else if (stockStatus === "out-of-stock") {
      baseWhere = and6(baseWhere, sql5`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) <= 0`);
    } else if (stockStatus === "low-stock") {
      baseWhere = and6(baseWhere, sql5`(COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) > 0 AND (COALESCE(${stockBalances.physicalStock}, 0) - COALESCE(${stockBalances.reservedStock}, 0)) <= COALESCE(${products.minStock}, 0)`);
    }
    if (hasImage === "true") {
      baseWhere = and6(baseWhere, sql5`length(${products.imageUrl}) > 0`);
    } else if (hasImage === "false") {
      baseWhere = and6(baseWhere, or(isNull2(products.imageUrl), eq7(products.imageUrl, "")));
    }
    if (search) {
      const searchWhere = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.upc, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.model, `%${search}%`)
      );
      baseWhere = and6(baseWhere, searchWhere);
    }
    let baseQuery = db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      description: products.description,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      subgroupId: products.subgroupId,
      shelfId: products.shelfId,
      unitMeasure: products.unitMeasure,
      costPrice: products.costPrice,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      salePriceC: products.salePriceC,
      costCurrency: products.costCurrency,
      saleCurrency: products.saleCurrency,
      ivaPercentage: products.ivaPercentage,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      minStock: products.minStock,
      imageUrl: products.imageUrl,
      isActive: products.isActive,
      groupName: productGroups.name,
      subgroupName: productSubgroups.name,
      shelfName: shelves.name,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock
    }).from(products).leftJoin(productGroups, eq7(products.groupId, productGroups.id)).leftJoin(productSubgroups, eq7(products.subgroupId, productSubgroups.id)).leftJoin(shelves, eq7(products.shelfId, shelves.id)).leftJoin(stockBalances, eq7(products.id, stockBalances.productId)).where(baseWhere);
    let countQuery = db.select({ count: sql5`count(*)` }).from(products).leftJoin(stockBalances, eq7(products.id, stockBalances.productId)).where(baseWhere);
    let [list, countResult] = await Promise.all([
      baseQuery.orderBy(products.name, products.sku).limit(limit).offset(offset),
      countQuery
    ]);
    const total = Number(countResult[0].count);
    let isPrivileged = (req.user?.roleName || "").toLowerCase().includes("admin");
    if (!isPrivileged && req.user) {
      const hasPerm = await db.select().from(rolePermissions).innerJoin(permissions, eq7(rolePermissions.permissionId, permissions.id)).where(and6(eq7(rolePermissions.roleId, req.user.roleId), eq7(permissions.module, "reports"), eq7(permissions.action, "profit"))).limit(1);
      if (hasPerm.length > 0) isPrivileged = true;
    }
    if (!isPrivileged) {
      list = list.map((item) => ({ ...item, costPrice: "0" }));
    }
    res.json({
      data: list,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
router6.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const rows = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      minStock: products.minStock,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock
    }).from(products).leftJoin(stockBalances, eq7(products.id, stockBalances.productId)).where(and6(
      eq7(products.isActive, true),
      isNull2(products.deletedAt),
      sql5`${products.minStock} > 0`,
      sql5`coalesce(${stockBalances.physicalStock}, 0) <= ${products.minStock}`
    )).orderBy(sql5`coalesce(${stockBalances.physicalStock}, 0) - ${products.minStock} asc`).limit(limit);
    const data = rows.map((r) => ({
      ...r,
      physicalStock: Number(r.physicalStock || 0),
      available: Number(r.physicalStock || 0) - Number(r.reservedStock || 0),
      out: Number(r.physicalStock || 0) <= 0
    }));
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router6.get("/next-sku", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    const subgroupId = req.query.subgroupId;
    let prefix = "ZW";
    let targetGroupOrSub = null;
    if (subgroupId) {
      const sub = await db.select({ name: productSubgroups.name }).from(productSubgroups).where(eq7(productSubgroups.id, subgroupId)).limit(1);
      if (sub.length > 0) targetGroupOrSub = sub[0];
    }
    if (!targetGroupOrSub && groupId) {
      const group = await db.select({ name: productGroups.name }).from(productGroups).where(eq7(productGroups.id, groupId)).limit(1);
      if (group.length > 0) targetGroupOrSub = group[0];
    }
    if (targetGroupOrSub) {
      const rawName = targetGroupOrSub.name || "";
      const lettersOnly = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
      if (lettersOnly.length >= 3) {
        prefix = lettersOnly.slice(0, 3);
      } else {
        prefix = lettersOnly.padEnd(3, "X");
      }
    }
    const p = await db.select({ sku: products.sku }).from(products).where(ilike(products.sku, `${prefix}-%`)).orderBy(desc3(products.sku)).limit(100);
    let nextNum = 1;
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    for (const prodItem of p) {
      const itemSku = prodItem.sku || "";
      const m = itemSku.match(regex);
      if (m) {
        const num4 = parseInt(m[1], 10);
        if (num4 >= nextNum) {
          nextNum = num4 + 1;
        }
      }
    }
    res.json({ sku: `${prefix}-${nextNum.toString().padStart(4, "0")}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router6.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const prod = await db.select({
      id: products.id,
      sku: products.sku,
      upc: products.upc,
      name: products.name,
      description: products.description,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      subgroupId: products.subgroupId,
      shelfId: products.shelfId,
      unitMeasure: products.unitMeasure,
      costPrice: products.costPrice,
      salePriceA: products.salePriceA,
      salePriceB: products.salePriceB,
      salePriceC: products.salePriceC,
      ivaPercentage: products.ivaPercentage,
      hasSerialNumber: products.hasSerialNumber,
      requiresLot: products.requiresLot,
      ofertaQty: products.ofertaQty,
      ofertaPrice: products.ofertaPrice,
      outletQty: products.outletQty,
      outletPrice: products.outletPrice,
      minStock: products.minStock,
      imageUrl: products.imageUrl,
      technicalSpecs: products.technicalSpecs,
      isActive: products.isActive,
      groupName: productGroups.name,
      shelfName: shelves.name,
      physicalStock: stockBalances.physicalStock,
      reservedStock: stockBalances.reservedStock
    }).from(products).leftJoin(productGroups, eq7(products.groupId, productGroups.id)).leftJoin(shelves, eq7(products.shelfId, shelves.id)).leftJoin(stockBalances, eq7(products.id, stockBalances.productId)).where(eq7(products.id, id)).limit(1);
    if (prod.length === 0) return res.status(404).json({ error: "Produto n\xE3o encontrado" });
    let isPrivileged = (req.user?.roleName || "").toLowerCase().includes("admin");
    if (!isPrivileged && req.user) {
      const hasPerm = await db.select().from(rolePermissions).innerJoin(permissions, eq7(rolePermissions.permissionId, permissions.id)).where(and6(eq7(rolePermissions.roleId, req.user.roleId), eq7(permissions.module, "reports"), eq7(permissions.action, "profit"))).limit(1);
      if (hasPerm.length > 0) isPrivileged = true;
    }
    const productData = { ...prod[0] };
    if (!isPrivileged) {
      productData.costPrice = "0";
    }
    const { productImages: productImages2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const images = await db.select().from(productImages2).where(eq7(productImages2.productId, id)).orderBy(productImages2.sortOrder);
    res.json({ ...productData, images });
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar produto" });
  }
});
function normalizeProductInput(rawData, technicalSpecs) {
  return {
    ...rawData,
    name: toUpperText(rawData.name),
    sku: toUpperText(rawData.sku),
    upc: toUpperText(rawData.upc),
    brand: toUpperText(rawData.brand),
    model: toUpperText(rawData.model),
    description: toUpperText(rawData.description),
    unitMeasure: toUpperText(rawData.unitMeasure),
    imageUrl: rawData.imageUrl || "",
    technicalSpecs: technicalSpecs || [],
    hasSerialNumber: !!rawData.hasSerialNumber,
    requiresLot: !!rawData.requiresLot,
    storeVisible: rawData.storeVisible === void 0 ? true : rawData.storeVisible === true || rawData.storeVisible === "true",
    ofertaQty: Math.max(0, parseInt(rawData.ofertaQty) || 0),
    ofertaPrice: rawData.ofertaPrice ? String(rawData.ofertaPrice) : null,
    outletQty: Math.max(0, parseInt(rawData.outletQty) || 0),
    outletPrice: rawData.outletPrice ? String(rawData.outletPrice) : null,
    // Campos opcionais de FK/uuid: "" (select sem seleção) quebra o insert/update
    // ("invalid input syntax for type uuid") — normaliza pra null.
    groupId: rawData.groupId || null,
    subgroupId: rawData.subgroupId || null,
    shelfId: rawData.shelfId || null,
    parentId: rawData.parentId || null
  };
}
function validateProductRequiredFields(data) {
  const fields = {};
  if (!data.name) fields.name = "Nome do produto \xE9 obrigat\xF3rio.";
  if (!data.sku) fields.sku = "SKU \xE9 obrigat\xF3rio.";
  if (!data.groupId) fields.groupId = "Grupo \xE9 obrigat\xF3rio.";
  if (!data.salePriceA || parseFloat(data.salePriceA) <= 0) fields.salePriceA = "Pre\xE7o A precisa ser maior que zero.";
  return fields;
}
function validateOfertaOutletQty(data, physicalStock) {
  const fields = {};
  const total = (data.ofertaQty || 0) + (data.outletQty || 0);
  if (total > physicalStock) {
    fields.ofertaQty = `Oferta + Outlet (${total}) n\xE3o pode passar do estoque f\xEDsico (${physicalStock}).`;
  }
  return fields;
}
async function findSkuUpcConflict(field2, value, excludeId) {
  if (!value) return null;
  const col = field2 === "sku" ? products.sku : products.upc;
  const rows = await db.select({ id: products.id, isActive: products.isActive }).from(products).where(eq7(col, value)).limit(1);
  if (rows.length === 0 || excludeId && rows[0].id === excludeId) return null;
  const label = field2.toUpperCase();
  return rows[0].isActive ? { error: `J\xE1 existe um produto cadastrado com este ${label}.`, fields: { [field2]: `${label} j\xE1 est\xE1 em uso.` } } : { error: `J\xE1 existe um produto arquivado com este ${label}. Restaure ou exclua definitivamente o produto antigo para reutilizar esse ${label}.`, fields: { [field2]: `${label} em uso por produto arquivado.` } };
}
router6.post("/", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = uuidv43();
    const { initialPhysicalStock, entryReason, serials, images, technicalSpecs, ...rawData } = req.body;
    const data = normalizeProductInput(rawData, technicalSpecs);
    const fields = validateProductRequiredFields(data);
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (!data.salePriceB || parseFloat(data.salePriceB) <= 0) data.salePriceB = data.salePriceA;
    if (!data.salePriceC || parseFloat(data.salePriceC) <= 0) data.salePriceC = data.salePriceA;
    if (data.imageUrl && data.imageUrl.startsWith("data:image/") && data.imageUrl.length > 2e5) {
      return res.status(400).json({ error: "Imagem muito grande.", fields: { imageUrl: "Limite sugerido 150KB." } });
    }
    {
      const imgErr = validateExtraImages(images);
      if (imgErr) return res.status(400).json({ error: imgErr });
    }
    const skuConflict = await findSkuUpcConflict("sku", data.sku);
    if (skuConflict) return res.status(409).json(skuConflict);
    const upcConflict = await findSkuUpcConflict("upc", data.upc);
    if (upcConflict) return res.status(409).json(upcConflict);
    const initialStock = parseInt(initialPhysicalStock) || 0;
    if (initialStock < 0) {
      return res.status(400).json({ error: "Estoque inicial n\xE3o pode ser negativo.", fields: { initialPhysicalStock: "Quantidade precisa ser maior ou igual a zero." } });
    }
    const ofertaOutletErr = validateOfertaOutletQty(data, initialStock);
    if (Object.keys(ofertaOutletErr).length > 0) {
      return res.status(400).json({ error: "Oferta/Outlet inv\xE1lidos.", fields: ofertaOutletErr });
    }
    if (data.hasSerialNumber && initialStock > 0) {
      if (!Array.isArray(serials) || serials.length !== initialStock) {
        return res.status(400).json({ error: "Erro de n\xFAmeros de s\xE9rie.", fields: { serials: `O produto exige controle de S/N. Forne\xE7a exatamente ${initialStock} n\xFAmeros de s\xE9rie.` } });
      }
      const uniqueSerials = new Set(serials.map((s) => toUpperText(s)));
      if (uniqueSerials.size !== serials.length) {
        return res.status(400).json({ error: "N\xFAmeros de s\xE9rie duplicados.", fields: { serials: "S/N n\xE3o pode ser duplicado na listagem." } });
      }
    }
    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        ...data,
        id,
        costPrice: data.costPrice || "0",
        costCurrency: isValidCurrency(data.costCurrency) ? data.costCurrency : "BRL",
        salePriceA: data.salePriceA || "0",
        salePriceB: data.salePriceB || "0",
        salePriceC: data.salePriceC || "0",
        ivaPercentage: data.ivaPercentage || "0"
      });
      const { productImages: productImages2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      if (images && Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await tx.insert(productImages2).values({
            productId: id,
            imageUrl: images[i].imageUrl,
            isPrimary: !!images[i].isPrimary,
            sortOrder: i
          });
        }
      }
      await tx.insert(stockBalances).values({
        productId: id,
        physicalStock: initialStock,
        reservedStock: 0
      });
      if (initialStock > 0) {
        await tx.insert(stockMovements).values({
          id: uuidv43(),
          productId: id,
          quantity: initialStock,
          userId: req.user.userId,
          movementType: "INITIAL_ENTRY",
          beforePhysical: 0,
          afterPhysical: initialStock,
          beforeReserved: 0,
          afterReserved: 0,
          reason: entryReason || "Estoque inicial"
        });
        if (data.hasSerialNumber && serials && serials.length > 0) {
          for (const sn of serials) {
            await tx.insert(productSerials).values({
              id: uuidv43(),
              productId: id,
              serialNumber: toUpperText(sn),
              status: "AVAILABLE"
            });
          }
        }
      }
      await logAction(req.user.userId, "CREATE", "products", id, null, data, tx);
    });
    res.status(201).json({ id });
  } catch (error) {
    console.error(error);
    const dbErr = handleDbError(error);
    res.status(400).json(dbErr);
  }
});
router6.put("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const { initialPhysicalStock, entryReason, serials, images, technicalSpecs, ...rawData } = req.body;
    const data = normalizeProductInput(rawData, technicalSpecs);
    const fields = validateProductRequiredFields(data);
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (!data.salePriceB || parseFloat(data.salePriceB) <= 0) data.salePriceB = data.salePriceA;
    if (!data.salePriceC || parseFloat(data.salePriceC) <= 0) data.salePriceC = data.salePriceA;
    if (data.imageUrl && data.imageUrl.startsWith("data:image/") && data.imageUrl.length > 2e5) {
      return res.status(400).json({ error: "Imagem muito grande.", fields: { imageUrl: "Limite sugerido 150KB." } });
    }
    {
      const imgErr = validateExtraImages(images);
      if (imgErr) return res.status(400).json({ error: imgErr });
    }
    const oldProduct = await db.select().from(products).where(eq7(products.id, id)).limit(1);
    const [balance] = await db.select({ physicalStock: stockBalances.physicalStock }).from(stockBalances).where(eq7(stockBalances.productId, id)).limit(1);
    const ofertaOutletErr = validateOfertaOutletQty(data, Number(balance?.physicalStock) || 0);
    if (Object.keys(ofertaOutletErr).length > 0) {
      return res.status(400).json({ error: "Oferta/Outlet inv\xE1lidos.", fields: ofertaOutletErr });
    }
    const skuConflict = await findSkuUpcConflict("sku", data.sku, id);
    if (skuConflict) return res.status(409).json(skuConflict);
    const upcConflict = await findSkuUpcConflict("upc", data.upc, id);
    if (upcConflict) return res.status(409).json(upcConflict);
    await db.transaction(async (tx) => {
      await tx.update(products).set({
        ...data,
        costCurrency: isValidCurrency(data.costCurrency) ? data.costCurrency : "BRL",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(products.id, id));
      const { productImages: productImages2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await tx.delete(productImages2).where(eq7(productImages2.productId, id));
      if (images && Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await tx.insert(productImages2).values({
            productId: id,
            imageUrl: images[i].imageUrl,
            isPrimary: !!images[i].isPrimary,
            sortOrder: i
          });
        }
      }
    });
    await logAction(req.user.userId, "UPDATE", "products", id, oldProduct[0], data);
    res.json({ success: true });
  } catch (error) {
    const dbErr = handleDbError(error);
    res.status(400).json(dbErr);
  }
});
router6.delete("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(products).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq7(products.id, id));
    await logAction(req.user.userId, "ARCHIVE", "products", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router6.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const usedInSales = await db.select({ count: sql5`count(*)` }).from(saleItems).where(eq7(saleItems.productId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este registro possui hist\xF3rico de vendas e n\xE3o pode ser exclu\xEDdo definitivamente. Use a op\xE7\xE3o Arquivar." });
    }
    const usedInReservations = await db.select({ count: sql5`count(*)` }).from(stockReservations).where(eq7(stockReservations.productId, id));
    if (Number(usedInReservations[0].count) > 0) {
      return res.status(400).json({ error: "Este registro possui hist\xF3rico de reservas de estoque e n\xE3o pode ser exclu\xEDdo definitivamente. Use a op\xE7\xE3o Arquivar." });
    }
    const serialsList = await db.select().from(productSerials).where(eq7(productSerials.productId, id));
    const hasUnavailability = serialsList.some((s) => s.status !== "AVAILABLE");
    if (hasUnavailability) {
      return res.status(400).json({ error: "Este produto possui n\xFAmeros de s\xE9rie com hist\xF3rico e n\xE3o pode ser exclu\xEDdo definitivamente. Use Arquivar." });
    }
    const { productImages: productImages2, costLayers: costLayers2, costConsumptions: costConsumptions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    await db.transaction(async (tx) => {
      await tx.delete(productSerials).where(eq7(productSerials.productId, id));
      await tx.delete(stockMovements).where(eq7(stockMovements.productId, id));
      await tx.delete(stockBalances).where(eq7(stockBalances.productId, id));
      await tx.delete(productImages2).where(eq7(productImages2.productId, id));
      await tx.delete(costConsumptions2).where(eq7(costConsumptions2.productId, id));
      await tx.delete(costLayers2).where(eq7(costLayers2.productId, id));
      await tx.delete(products).where(eq7(products.id, id));
    });
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "products", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "products", req.params.id, null, { error: error.message });
    res.status(500).json({ error: error.message || "Erro interno ao excluir registro." });
  }
});
router6.patch("/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(products).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(products.id, id));
    await logAction(req.user.userId, "RESTORE", "products", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router6.get("/:id/stock/balance", async (req, res) => {
  try {
    const balance = await db.select().from(stockBalances).where(eq7(stockBalances.productId, req.params.id)).limit(1);
    if (!balance.length) return res.status(404).json({ error: "Estoque n\xE3o encontrado" });
    const b = balance[0];
    res.json({ physicalStock: b.physicalStock, reservedStock: b.reservedStock, availableStock: b.physicalStock - b.reservedStock });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar saldo de estoque." });
  }
});
router6.post("/:id/stock/move", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes } = req.body;
    const qty = parseInt(quantity);
    if (!qty || isNaN(qty)) return res.status(400).json({ error: "Quantidade inv\xE1lida." });
    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq7(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque n\xE3o encontrado.");
      const bal = balanceRes[0];
      if (qty < 0 && bal.physicalStock - Math.abs(qty) < bal.reservedStock) {
        throw new Error("N\xE3o \xE9 poss\xEDvel remover. A quantidade ultrapassa o estoque reservado.");
      }
      await tx.update(stockBalances).set({ physicalStock: bal.physicalStock + qty, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(stockBalances.productId, productId));
      await tx.insert(stockMovements).values({
        id: uuidv43(),
        productId,
        quantity: Math.abs(qty),
        userId: req.user.userId,
        movementType: qty > 0 ? "MANUAL_ENTRY" : "MANUAL_EXIT",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock + qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || (qty > 0 ? "Entrada manual" : "Sa\xEDda manual"),
        notes
      });
    });
    await logAction(req.user.userId, "STOCK_MOVE", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router6.post("/:id/stock/add", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes, costPrice, serials, lotNumber, expiryDate } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Quantidade inv\xE1lida." });
    await db.transaction(async (tx) => {
      const productObj = await tx.select({ hasSerialNumber: products.hasSerialNumber, requiresLot: products.requiresLot }).from(products).where(eq7(products.id, productId)).limit(1);
      if (productObj.length === 0) throw new Error("Produto n\xE3o encontrado.");
      if (productObj[0].hasSerialNumber) {
        if (!Array.isArray(serials) || serials.length !== qty) {
          throw new Error(`Para este produto, voc\xEA deve fornecer exatamente ${qty} n\xFAmeros de s\xE9rie.`);
        }
      }
      if (productObj[0].requiresLot && !String(lotNumber || "").trim()) {
        throw new Error("Este produto \xE9 controlado por lote. Informe o n\xFAmero do lote na entrada.");
      }
      const balanceRes = await tx.select().from(stockBalances).where(eq7(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque n\xE3o encontrado.");
      const bal = balanceRes[0];
      await tx.update(stockBalances).set({ physicalStock: bal.physicalStock + qty, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(stockBalances.productId, productId));
      await tx.insert(stockMovements).values({
        id: uuidv43(),
        productId,
        quantity: qty,
        userId: req.user.userId,
        movementType: "MANUAL_ENTRY",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock + qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Entrada de estoque",
        notes
      });
      if (productObj[0].hasSerialNumber && serials) {
        const normalizedSerials = serials.map((s) => toUpperText(String(s))).filter(Boolean);
        if (normalizedSerials.length !== serials.length) throw new Error("A lista cont\xE9m n\xFAmero de s\xE9rie vazio ou inv\xE1lido.");
        const uniqueSerials = [...new Set(normalizedSerials)];
        if (uniqueSerials.length !== normalizedSerials.length) throw new Error("N\xFAmeros de s\xE9rie duplicados na lista informada.");
        const existing = await tx.select({ id: productSerials.id }).from(productSerials).where(and6(eq7(productSerials.productId, productId), inArray3(productSerials.serialNumber, uniqueSerials)));
        if (existing.length > 0) throw new Error("Um ou mais n\xFAmeros de s\xE9rie j\xE1 constam neste produto.");
        for (const sn of uniqueSerials) {
          await tx.insert(productSerials).values({
            id: uuidv43(),
            productId,
            serialNumber: sn,
            status: "AVAILABLE"
          });
        }
      }
      if (String(lotNumber || "").trim()) {
        await addLotStock(tx, productId, String(lotNumber), qty, asExpiryDate(expiryDate));
      }
      if (costPrice) {
        await tx.update(products).set({ costPrice: String(costPrice) }).where(eq7(products.id, productId));
      }
      const [pNow] = await tx.select({ costPrice: products.costPrice }).from(products).where(eq7(products.id, productId)).limit(1);
      await addCostLayer(tx, { productId, qty, unitCostBrl: Number(costPrice || pNow?.costPrice || 0), note: reason || "Entrada manual" });
    });
    await logAction(req.user.userId, "STOCK_ADD", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router6.post("/:id/stock/remove", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, reason, notes } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Quantidade inv\xE1lida." });
    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq7(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque n\xE3o encontrado.");
      const bal = balanceRes[0];
      if (bal.physicalStock - qty < bal.reservedStock) throw new Error("N\xE3o \xE9 poss\xEDvel remover. A quantidade ultrapassa o estoque reservado.");
      await tx.update(stockBalances).set({ physicalStock: bal.physicalStock - qty, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(stockBalances.productId, productId));
      const prodRow = await tx.select({ requiresLot: products.requiresLot }).from(products).where(eq7(products.id, productId)).limit(1);
      if (prodRow[0]?.requiresLot) await consumeLotsFEFO(tx, productId, qty);
      await consumeFifo(tx, productId, qty, { reason: "MANUAL_EXIT" });
      await tx.insert(stockMovements).values({
        id: uuidv43(),
        productId,
        quantity: qty,
        userId: req.user.userId,
        movementType: "MANUAL_EXIT",
        beforePhysical: bal.physicalStock,
        afterPhysical: bal.physicalStock - qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Sa\xEDda manual",
        notes
      });
    });
    await logAction(req.user.userId, "STOCK_REMOVE", "products", productId, null, { quantity: qty });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router6.post("/:id/stock/adjust", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const productId = req.params.id;
    const { newQty, reason, notes } = req.body;
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ error: "Quantidade inv\xE1lida." });
    await db.transaction(async (tx) => {
      const balanceRes = await tx.select().from(stockBalances).where(eq7(stockBalances.productId, productId)).limit(1).for("update");
      if (balanceRes.length === 0) throw new Error("Estoque n\xE3o encontrado.");
      const bal = balanceRes[0];
      const diff = qty - bal.physicalStock;
      if (diff === 0) throw new Error("A quantidade informada \xE9 igual ao estoque atual.");
      if (qty < bal.reservedStock) throw new Error("N\xE3o \xE9 poss\xEDvel ajustar o estoque f\xEDsico para abaixo do estoque reservado.");
      await tx.update(stockBalances).set({ physicalStock: qty, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(stockBalances.productId, productId));
      const adjProd = await tx.select({ requiresLot: products.requiresLot, costPrice: products.costPrice }).from(products).where(eq7(products.id, productId)).limit(1);
      if (adjProd[0]?.requiresLot) {
        if (diff < 0) await consumeLotsFEFO(tx, productId, Math.abs(diff));
        else throw new Error("Produto com lote obrigat\xF3rio: para AUMENTAR o estoque use a Entrada de lote (informando lote e validade), n\xE3o o ajuste.");
      }
      if (diff < 0) await consumeFifo(tx, productId, Math.abs(diff), { reason: "ADJUSTMENT" });
      else await addCostLayer(tx, { productId, qty: diff, unitCostBrl: Number(adjProd[0]?.costPrice || 0), note: reason || "Ajuste de estoque" });
      await tx.insert(stockMovements).values({
        id: uuidv43(),
        productId,
        quantity: Math.abs(diff),
        userId: req.user.userId,
        movementType: "MANUAL_ADJUSTMENT",
        beforePhysical: bal.physicalStock,
        afterPhysical: qty,
        beforeReserved: bal.reservedStock,
        afterReserved: bal.reservedStock,
        reason: reason || "Ajuste de estoque",
        notes
      });
    });
    await logAction(req.user.userId, "STOCK_ADJUST", "products", productId, null, { newQty: qty });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router6.get("/:id/stock/history", async (req, res) => {
  try {
    const history = await db.select().from(stockMovements).where(eq7(stockMovements.productId, req.params.id)).orderBy(desc3(stockMovements.createdAt));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar hist\xF3rico." });
  }
});
router6.get("/:id/cost-history", async (req, res) => {
  try {
    const productId = req.params.id;
    const rawLayers = await db.select({
      qtyRemaining: costLayers.qtyRemaining,
      unitCostBrl: costLayers.unitCostBrl
    }).from(costLayers).where(eq7(costLayers.productId, productId));
    const totalQtyRemaining = rawLayers.reduce((a, r) => a + r.qtyRemaining, 0);
    const avgCostBrl = totalQtyRemaining > 0 ? rawLayers.reduce((a, r) => a + r.qtyRemaining * Number(r.unitCostBrl), 0) / totalQtyRemaining : null;
    const layers = await db.select({
      id: costLayers.id,
      createdAt: costLayers.createdAt,
      qtyOriginal: costLayers.qtyOriginal,
      qtyRemaining: costLayers.qtyRemaining,
      unitCostBrl: costLayers.unitCostBrl,
      sourceCurrency: costLayers.sourceCurrency,
      fxRate: costLayers.fxRate,
      note: costLayers.note,
      invoiceNumber: purchaseOrders.invoiceNumber,
      invoiceDate: purchaseOrders.invoiceDate,
      supplierName: suppliers.name,
      originalUnitCost: purchaseOrderItems.costPrice
    }).from(costLayers).leftJoin(purchaseOrders, eq7(purchaseOrders.id, costLayers.purchaseOrderId)).leftJoin(suppliers, eq7(suppliers.id, purchaseOrders.supplierId)).leftJoin(purchaseOrderItems, and6(
      eq7(purchaseOrderItems.purchaseOrderId, costLayers.purchaseOrderId),
      eq7(purchaseOrderItems.productId, costLayers.productId)
    )).where(eq7(costLayers.productId, productId)).orderBy(desc3(costLayers.createdAt));
    res.json({ layers, avgCostBrl, totalQtyRemaining });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar hist\xF3rico de custo." });
  }
});
router6.post("/ai/description", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { name, brand, model, group, subgroup, upc } = req.body;
    const prompt = `Escreva uma descri\xE7\xE3o curta, clara e objetiva para cadastro interno do produto abaixo.
Use portugu\xEAs do Brasil. M\xE1ximo de 3 a 5 linhas. N\xE3o use markdown, n\xE3o invente caracter\xEDsticas e evite texto publicit\xE1rio exagerado.
Nome: ${name || ""}
Marca: ${brand || ""}
Modelo: ${model || ""}
Grupo: ${group || ""}
Subgrupo: ${subgroup || ""}
UPC: ${upc || ""}`;
    const description = await ollamaChat({
      messages: [
        { role: "system", content: "Voc\xEA auxilia no cadastro de produtos de um ERP. Seja preciso, curto e n\xE3o invente dados." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });
    res.json({ description });
  } catch (error) {
    return sendFriendlyAiError(res, error, "gerar a descri\xE7\xE3o");
  }
});
router6.post("/ai/specs", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { name, brand, model, group, subgroup, upc } = req.body;
    const prompt = `Gere uma descri\xE7\xE3o curta e uma lista de especifica\xE7\xF5es t\xE9cnicas para o produto abaixo.
Retorne APENAS JSON v\xE1lido no formato: {"description":"...","specs":[{"label":"...","value":"..."}]}.
N\xE3o invente detalhes. Quando n\xE3o houver certeza, use "N\xE3o informado" ou "A confirmar".
Se parecer medicamento, n\xE3o invente dosagens e inclua aviso de consulta \xE0 bula/fornecedor.
Produto: ${name || ""}
Marca: ${brand || ""}
Modelo: ${model || ""}
Grupo: ${group || ""}
Subgrupo: ${subgroup || ""}
UPC: ${upc || ""}`;
    const text2 = await ollamaChat({
      messages: [
        { role: "system", content: "Voc\xEA auxilia no cadastro t\xE9cnico de produtos de um ERP. Responda somente o JSON solicitado e n\xE3o invente dados." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      json: true
    });
    let parsed;
    try {
      parsed = extractJsonObject(text2);
    } catch {
      console.error("Failed to parse Ollama response:", text2.slice(0, 1e3));
      return res.status(502).json({ code: "AI_INVALID_RESPONSE", error: "A IA respondeu em um formato inesperado. Tente novamente." });
    }
    const specs = Array.isArray(parsed?.specs) ? parsed.specs.filter((item) => item && typeof item.label === "string" && typeof item.value === "string").slice(0, 30) : [];
    const description = typeof parsed?.description === "string" ? parsed.description : "";
    const warning = name?.toLowerCase().match(/comprimido|xarope|mg|gotas|pomada|gel|medicamento/) ? "Cuidado com informa\xE7\xF5es m\xE9dicas geradas." : "";
    res.json({ description, specs, warning });
  } catch (error) {
    return sendFriendlyAiError(res, error, "gerar as especifica\xE7\xF5es");
  }
});
var products_default = router6;

// src/server/customers.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router8 } from "express";
import { eq as eq9, ilike as ilike2, or as or2, sql as sql7, and as and8, isNull as isNull3 } from "drizzle-orm";

// src/server/notifications.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router7 } from "express";
import { desc as desc4, eq as eq8, sql as sql6 } from "drizzle-orm";
var router7 = Router7();
router7.use(requireAuth);
async function createNotification(executor, data) {
  try {
    await executor.insert(notifications).values({
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || null
    });
  } catch (err) {
    console.error("Erro ao criar notifica\xE7\xE3o:", err);
  }
}
router7.get("/", async (req, res) => {
  try {
    const filter = String(req.query.filter || "all");
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const where = filter === "unread" ? eq8(notifications.read, false) : filter === "read" ? eq8(notifications.read, true) : void 0;
    const rows = await db.select().from(notifications).where(where).orderBy(desc4(notifications.createdAt)).limit(limit);
    const [{ count: unreadCount }] = await db.select({ count: sql6`count(*)` }).from(notifications).where(eq8(notifications.read, false));
    res.json({ data: rows, unreadCount: Number(unreadCount || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router7.get("/unread-count", async (_req, res) => {
  try {
    const [{ count }] = await db.select({ count: sql6`count(*)` }).from(notifications).where(eq8(notifications.read, false));
    res.json({ count: Number(count || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router7.post("/:id/read", async (req, res) => {
  try {
    await db.update(notifications).set({ read: true }).where(eq8(notifications.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router7.post("/mark-all-read", async (_req, res) => {
  try {
    await db.update(notifications).set({ read: true }).where(eq8(notifications.read, false));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var notifications_default = router7;

// src/server/customers.ts
import { v4 as uuidv44 } from "uuid";
var router8 = Router8();
router8.use(requireAuth);
router8.get("/", async (req, res) => {
  try {
    const search = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    let baseWhere = and8(eq9(customers.isActive, true), isNull3(customers.deletedAt));
    let baseQuery = db.select().from(customers).where(baseWhere);
    let countQuery = db.select({ count: sql7`count(*)` }).from(customers).where(baseWhere);
    if (search) {
      const searchWhere = or2(
        ilike2(customers.name, `%${search}%`),
        ilike2(customers.document, `%${search}%`),
        ilike2(customers.phone, `%${search}%`),
        ilike2(customers.email, `%${search}%`)
      );
      baseQuery = db.select().from(customers).where(and8(baseWhere, searchWhere));
      countQuery = db.select({ count: sql7`count(*)` }).from(customers).where(and8(baseWhere, searchWhere));
    }
    const [list, countResult] = await Promise.all([
      baseQuery.orderBy(customers.name).limit(limit).offset(offset),
      countQuery
    ]);
    const total = Number(countResult[0].count);
    res.json({
      data: list,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
router8.post("/quick-pos", requirePermission("sales", "create"), async (req, res) => {
  try {
    const id = uuidv44();
    const rawData = req.body || {};
    const nationality = rawData.nationality === "PY" ? "PY" : "FOREIGN";
    const data = {
      name: toUpperText(rawData.name),
      type: rawData.type === "COMPANY" ? "COMPANY" : "PERSON",
      nationality,
      documentType: rawData.documentType || (nationality === "PY" ? "CI" : "PASSPORT"),
      document: toUpperText(rawData.document),
      phone: rawData.phone || null,
      email: toLowerText(rawData.email),
      address: "",
      city: "",
      country: nationality === "PY" ? "PARAGUAY" : toUpperText(rawData.country),
      observations: "CRIADO PELO PDV",
      priceTable: rawData.priceTable === "B" ? "B" : "A"
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!data.nationality) fields.nationality = "Tipo do cliente \xE9 obrigat\xF3rio.";
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) fields.email = "Formato de e-mail inv\xE1lido.";
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (data.document) {
      const existingDoc = await db.select({ id: customers.id, isActive: customers.isActive }).from(customers).where(eq9(customers.document, data.document)).limit(1);
      if (existingDoc.length > 0) {
        return res.status(409).json({
          error: existingDoc[0].isActive ? "J\xE1 existe um cliente cadastrado com este documento." : "J\xE1 existe um cliente arquivado com este documento.",
          fields: { document: "Documento j\xE1 est\xE1 em uso." }
        });
      }
    }
    const inserted = await db.insert(customers).values({ ...data, id }).returning();
    await logAction(req.user.userId, "CREATE_POS_QUICK", "customers", id, null, data);
    res.status(201).json({ id, customer: inserted[0] });
  } catch (error) {
    res.status(400).json(handleDbError(error, { document: "J\xE1 existe cliente com este documento." }));
  }
});
router8.post("/", requirePermission("customer", "manage"), async (req, res) => {
  try {
    const id = uuidv44();
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      document: toUpperText(rawData.document),
      address: toUpperText(rawData.address),
      city: toUpperText(rawData.city),
      country: toUpperText(rawData.country),
      notes: toUpperText(rawData.notes),
      email: toLowerText(rawData.email)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!data.type) fields.type = "Tipo \xE9 obrigat\xF3rio.";
    if (!data.nationality) fields.nationality = "Nacionalidade \xE9 obrigat\xF3ria.";
    if (!data.documentType) fields.documentType = "Tipo de documento \xE9 obrigat\xF3rio.";
    if (!data.document) fields.document = "N\xFAmero do documento \xE9 obrigat\xF3rio.";
    if (!data.priceTable) fields.priceTable = "Tabela de pre\xE7o padr\xE3o \xE9 obrigat\xF3ria.";
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        fields.email = "Formato de e-mail inv\xE1lido.";
      }
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    if (data.document) {
      const existingDoc = await db.select({ isActive: customers.isActive }).from(customers).where(eq9(customers.document, data.document)).limit(1);
      if (existingDoc.length > 0) {
        if (existingDoc[0].isActive) {
          return res.status(409).json({ error: "J\xE1 existe um cliente cadastrado com este documento.", fields: { document: "Documento j\xE1 est\xE1 em uso." } });
        } else {
          return res.status(409).json({ error: "J\xE1 existe um cliente arquivado com este documento. Restaure ou exclua definitivamente o cliente antigo para reutilizar esse documento.", fields: { document: "Documento em uso por cliente arquivado." } });
        }
      }
    }
    await db.insert(customers).values({ ...data, id });
    await logAction(req.user.userId, "CREATE", "customers", id, null, data);
    await createNotification(db, {
      type: "CUSTOMER_NEW",
      title: "Novo cliente cadastrado",
      message: `${data.name} foi cadastrado(a) como cliente.`,
      link: "/customers"
    });
    res.status(201).json({ id });
  } catch (error) {
    res.status(400).json(handleDbError(error, { document: "J\xE1 existe cliente com este documento." }));
  }
});
router8.put("/:id", requirePermission("customer", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      document: toUpperText(rawData.document),
      address: toUpperText(rawData.address),
      city: toUpperText(rawData.city),
      country: toUpperText(rawData.country),
      notes: toUpperText(rawData.notes),
      email: toLowerText(rawData.email)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!data.type) fields.type = "Tipo \xE9 obrigat\xF3rio.";
    if (!data.nationality) fields.nationality = "Nacionalidade \xE9 obrigat\xF3ria.";
    if (!data.documentType) fields.documentType = "Tipo de documento \xE9 obrigat\xF3rio.";
    if (!data.document) fields.document = "N\xFAmero do documento \xE9 obrigat\xF3rio.";
    if (!data.priceTable) fields.priceTable = "Tabela de pre\xE7o padr\xE3o \xE9 obrigat\xF3ria.";
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        fields.email = "Formato de e-mail inv\xE1lido.";
      }
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    const oldRec = await db.select().from(customers).where(eq9(customers.id, id)).limit(1);
    if (data.document && data.document !== oldRec[0].document) {
      const existingDoc = await db.select({ isActive: customers.isActive }).from(customers).where(eq9(customers.document, data.document)).limit(1);
      if (existingDoc.length > 0) {
        if (existingDoc[0].isActive) {
          return res.status(409).json({ error: "J\xE1 existe um cliente cadastrado com este documento.", fields: { document: "Documento j\xE1 est\xE1 em uso." } });
        } else {
          return res.status(409).json({ error: "J\xE1 existe um cliente arquivado com este documento. Restaure ou exclua definitivamente o cliente antigo para reutilizar esse documento.", fields: { document: "Documento em uso por cliente arquivado." } });
        }
      }
    }
    await db.update(customers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(customers.id, id));
    await logAction(req.user.userId, "UPDATE", "customers", id, oldRec[0], data);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(handleDbError(error, { document: "J\xE1 existe cliente com este documento." }));
  }
});
router8.delete("/:id", requirePermission("customer", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(customers).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq9(customers.id, id));
    await logAction(req.user.userId, "ARCHIVE", "customers", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router8.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const usedInSales = await db.select({ count: sql7`count(*)` }).from(sales).where(eq9(sales.customerId, id));
    if (Number(usedInSales[0].count) > 0) {
      return res.status(400).json({ error: "Este cliente possui hist\xF3rico de vendas e n\xE3o pode ser exclu\xEDdo definitivamente. Use a op\xE7\xE3o Arquivar." });
    }
    await db.delete(customers).where(eq9(customers.id, id));
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "customers", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "customers", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});
router8.patch("/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(customers).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(customers.id, id));
    await logAction(req.user.userId, "RESTORE", "customers", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
var customers_default = router8;

// src/server/groups.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router9 } from "express";
import { eq as eq10, sql as sql8, and as and9, isNull as isNull4 } from "drizzle-orm";
import { v4 as uuidv45 } from "uuid";
var router9 = Router9();
router9.use(requireAuth);
router9.get("/", async (req, res) => {
  try {
    const result = await withApiCache(`groups:list:${req.originalUrl}`, 5 * 60 * 1e3, async () => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;
      const [list, subgroups, countResult] = await Promise.all([
        db.select().from(productGroups).where(and9(eq10(productGroups.isActive, true), isNull4(productGroups.deletedAt))).orderBy(productGroups.name).limit(limit).offset(offset),
        db.select().from(productSubgroups).where(and9(eq10(productSubgroups.isActive, true), isNull4(productSubgroups.deletedAt))).orderBy(productSubgroups.name),
        db.select({ count: sql8`count(*)` }).from(productGroups).where(and9(eq10(productGroups.isActive, true), isNull4(productGroups.deletedAt)))
      ]);
      const groupsWithSubgroups = list.map((g) => ({
        ...g,
        subgroups: subgroups.filter((s) => s.groupId === g.id)
      }));
      const total = Number(countResult[0].count);
      return { data: groupsWithSubgroups, total, page, limit };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
router9.get("/subgroups", async (req, res) => {
  try {
    const result = await withApiCache(`groups:subgroups:${req.originalUrl}`, 5 * 60 * 1e3, async () => {
      const list = await db.select({
        id: productSubgroups.id,
        name: productSubgroups.name,
        description: productSubgroups.description,
        groupId: productSubgroups.groupId,
        groupName: productGroups.name
      }).from(productSubgroups).leftJoin(productGroups, eq10(productSubgroups.groupId, productGroups.id)).where(and9(eq10(productSubgroups.isActive, true), isNull4(productSubgroups.deletedAt))).orderBy(productSubgroups.name);
      return { data: list };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
router9.post("/subgroups", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = uuidv45();
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!data.groupId) fields.groupId = "Grupo \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.insert(productSubgroups).values({ ...data, id });
    clearApiCache("groups:");
    await logAction(req.user.userId, "CREATE", "product_subgroups", id, null, data);
    res.status(201).json({ id });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe um subgrupo com este nome." }));
  }
});
router9.put("/subgroups/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (!data.groupId) fields.groupId = "Grupo \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.update(productSubgroups).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "UPDATE", "product_subgroups", id, null, data);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe um subgrupo com este nome." }));
  }
});
router9.delete("/subgroups/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(productSubgroups).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "ARCHIVE", "product_subgroups", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router9.delete("/subgroups/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const usedInProducts = await db.select({ count: sql8`count(*)` }).from(products).where(eq10(products.subgroupId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a este subgrupo. N\xE3o \xE9 poss\xEDvel excluir definitivamente." });
    }
    await db.delete(productSubgroups).where(eq10(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "product_subgroups", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "product_subgroups", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});
router9.patch("/subgroups/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(productSubgroups).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productSubgroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "RESTORE", "product_subgroups", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router9.post("/", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = uuidv45();
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.insert(productGroups).values({ ...data, id });
    clearApiCache("groups:");
    await logAction(req.user.userId, "CREATE", "product_groups", id, null, data);
    res.status(201).json({ id });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe um grupo com este nome." }));
  }
});
router9.put("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.update(productGroups).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "UPDATE", "product_groups", id, null, data);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe um grupo com este nome." }));
  }
});
router9.delete("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(productGroups).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "ARCHIVE", "product_groups", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router9.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const usedInProducts = await db.select({ count: sql8`count(*)` }).from(products).where(eq10(products.groupId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a este grupo. N\xE3o \xE9 poss\xEDvel excluir definitivamente. Use Arquivar." });
    }
    const usedInSubgroups = await db.select({ count: sql8`count(*)` }).from(productSubgroups).where(eq10(productSubgroups.groupId, id));
    if (Number(usedInSubgroups[0].count) > 0) {
      return res.status(400).json({ error: "Existem subgrupos vinculados a este grupo. N\xE3o \xE9 poss\xEDvel excluir definitivamente." });
    }
    const usedInDrafts = await db.select({ count: sql8`count(*)` }).from(productGroupsDraft).where(eq10(productGroupsDraft.sourceGroupId, id));
    if (Number(usedInDrafts[0].count) > 0) {
      return res.status(400).json({ error: "Existem altera\xE7\xF5es de rascunho vinculadas a este grupo. N\xE3o \xE9 poss\xEDvel excluir definitivamente." });
    }
    await db.delete(productGroups).where(eq10(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "product_groups", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "product_groups", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});
router9.patch("/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(productGroups).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(productGroups.id, id));
    clearApiCache("groups:");
    await logAction(req.user.userId, "RESTORE", "product_groups", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
var groups_default = router9;

// src/server/shelves.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router10 } from "express";
import { eq as eq11, sql as sql9, and as and10, isNull as isNull5 } from "drizzle-orm";
import { v4 as uuidv46 } from "uuid";
var router10 = Router10();
router10.use(requireAuth);
router10.get("/", async (req, res) => {
  try {
    const result = await withApiCache(`shelves:list:${req.originalUrl}`, 5 * 60 * 1e3, async () => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;
      const [list, countResult] = await Promise.all([
        db.select().from(shelves).where(and10(eq11(shelves.isActive, true), isNull5(shelves.deletedAt))).orderBy(shelves.name).limit(limit).offset(offset),
        db.select({ count: sql9`count(*)` }).from(shelves).where(and10(eq11(shelves.isActive, true), isNull5(shelves.deletedAt)))
      ]);
      const total = Number(countResult[0].count);
      return { data: list, total, page, limit };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
router10.post("/", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = uuidv46();
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.insert(shelves).values({ ...data, id });
    clearApiCache("shelves:");
    await logAction(req.user.userId, "CREATE", "shelves", id, null, data);
    res.status(201).json({ id });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe uma prateleira com este c\xF3digo/nome." }));
  }
});
router10.put("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const rawData = req.body;
    const data = {
      ...rawData,
      name: toUpperText(rawData.name),
      description: toUpperText(rawData.description)
    };
    const fields = {};
    if (!data.name) fields.name = "Nome \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    await db.update(shelves).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user.userId, "UPDATE", "shelves", id, null, data);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(handleDbError(error, { name: "J\xE1 existe uma prateleira com este c\xF3digo/nome." }));
  }
});
router10.delete("/:id", requirePermission("product", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(shelves).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq11(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user.userId, "ARCHIVE", "shelves", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router10.delete("/:id/hard-delete", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    const usedInProducts = await db.select({ count: sql9`count(*)` }).from(products).where(eq11(products.shelfId, id));
    if (Number(usedInProducts[0].count) > 0) {
      return res.status(400).json({ error: "Existem produtos vinculados a esta prateleira. N\xE3o \xE9 poss\xEDvel excluir definitivamente." });
    }
    await db.delete(shelves).where(eq11(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user.userId, "HARD_DELETE_SUCCESS", "shelves", id);
    res.json({ success: true });
  } catch (error) {
    await logAction(req.user.userId, "HARD_DELETE_BLOCKED", "shelves", req.params.id, null, { error: error.message });
    res.status(500).json({ error: "Erro interno ao excluir registro." });
  }
});
router10.patch("/:id/restore", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(shelves).set({ isActive: true, deletedAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(shelves.id, id));
    clearApiCache("shelves:");
    await logAction(req.user.userId, "RESTORE", "shelves", id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
var shelves_default = router10;

// src/server/auditRouter.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router11 } from "express";
import { eq as eq12, desc as desc5, sql as sql10 } from "drizzle-orm";
var router11 = Router11();
router11.use(requireAuth);
router11.use(requirePermission("user", "manage"));
function isMasterRole2(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "super admin", "super_admin", "superadmin"].includes(normalized);
}
var hideMasterLogsCondition = sql10`lower(coalesce(${roles.name}, '')) not in ('master', 'super admin', 'super_admin', 'superadmin')`;
async function listRecentAuditLogs(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const canSeeMasterLogs = isMasterRole2(req.user?.roleName);
    let query = db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      recordId: auditLogs.recordId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues
    }).from(auditLogs).leftJoin(users, eq12(auditLogs.userId, users.id)).leftJoin(roles, eq12(users.roleId, roles.id)).$dynamic();
    if (!canSeeMasterLogs) {
      query = query.where(hideMasterLogsCondition);
    }
    const logs = await query.orderBy(desc5(auditLogs.createdAt)).limit(limit);
    res.json({ data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
router11.get("/recent", listRecentAuditLogs);
router11.get("/", listRecentAuditLogs);
var auditRouter_default = router11;

// src/server/sales.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router14 } from "express";
import { eq as eq16, desc as desc8, sql as sql13, and as and14, or as or3, gte as gte3, lte as lte3, ilike as ilike3, inArray as inArray6, notInArray as notInArray2 } from "drizzle-orm";

// src/server/finance.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router12 } from "express";
import { and as and11, desc as desc6, eq as eq13 } from "drizzle-orm";
var router12 = Router12();
router12.use(requireAuth);
var round22 = (n) => Math.round(n * 100) / 100;
async function convertBrlToAccountCurrency(amountBrl, accountCurrency) {
  const cur = String(accountCurrency || "BRL");
  if (cur === "BRL") return { amount: round22(amountBrl), fx: 1 };
  const { resolveRates: resolveRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
  const rates = await resolveRates2();
  if (cur === "USD") {
    const r = rates.USDBRL?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USD/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio de hoje.");
    return { amount: round22(amountBrl / r), fx: 1 / r };
  }
  if (cur === "PYG") {
    const r = rates.BRLPYG?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o BRL/PYG \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio de hoje.");
    return { amount: round22(amountBrl * r), fx: r };
  }
  if (cur === "USDT") {
    const r = rates.USDTBRL?.rate;
    if (!r) throw new Error("Sem cota\xE7\xE3o USDT/BRL \u2014 informe o c\xE2mbio em Financeiro > C\xE2mbio de hoje.");
    return { amount: round22(amountBrl / r), fx: 1 / r };
  }
  throw new Error(`Moeda desconhecida: ${cur}`);
}
async function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = String(fromCurrency || "BRL");
  const to = String(toCurrency || "BRL");
  if (from === to) return { amount: round22(amount), fx: 1 };
  const { toBrl: toBrl2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
  const amountBrl = from === "BRL" ? amount : await toBrl2(amount, from);
  const converted = await convertBrlToAccountCurrency(amountBrl, to);
  const fx = amount !== 0 ? converted.amount / amount : converted.fx;
  return { amount: converted.amount, fx };
}
var METHOD_ACCOUNT_TYPES = {
  CASH: ["CASH"],
  PIX: ["BANK"],
  DEBIT_CARD: ["BANK"],
  CREDIT_CARD: ["CARD_RECEIVABLE"],
  TRANSFER: ["BANK", "OTHER"]
};
async function postMovement(tx, accountId, type, amount, opts = {}) {
  const rows = await tx.select().from(financialAccounts).where(eq13(financialAccounts.id, accountId)).limit(1).for("update");
  if (!rows.length) throw new Error("Conta financeira n\xE3o encontrada.");
  const next = round22(Number(rows[0].currentBalance) + Number(amount));
  await tx.update(financialAccounts).set({ currentBalance: next.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq13(financialAccounts.id, accountId));
  await tx.insert(accountMovements).values({
    accountId,
    type,
    amountUsd: Number(amount).toFixed(2),
    balanceAfter: next.toFixed(2),
    referenceType: opts.referenceType || null,
    referenceId: opts.referenceId || null,
    expectedSettlementDate: opts.expectedSettlementDate || null,
    settled: opts.settled !== false,
    description: opts.description || null,
    createdBy: opts.userId || null
  });
  return next;
}
async function routePayment(tx, method, amount, ctx) {
  const explicit = !!ctx.accountId;
  let accountId = ctx.accountId || null;
  if (!accountId) {
    const map = await tx.select().from(paymentMethodAccounts).where(eq13(paymentMethodAccounts.method, method)).limit(1);
    accountId = map[0]?.accountId || null;
  }
  if (!accountId) return null;
  const accRows = await tx.select().from(financialAccounts).where(eq13(financialAccounts.id, accountId)).limit(1);
  if (!accRows.length) return null;
  const account = accRows[0];
  const allowedTypes = METHOD_ACCOUNT_TYPES[method];
  if (explicit && allowedTypes && !allowedTypes.includes(String(account.type))) {
    throw new Error(`Conta "${account.name}" (${account.type}) \xE9 incompat\xEDvel com a forma ${method}.`);
  }
  const accCurrency = String(account.currency || "BRL");
  const sourceCurrency = String(ctx.sourceCurrency || "BRL");
  const conv = await convertCurrency(amount, sourceCurrency, accCurrency);
  const fxNote = accCurrency !== sourceCurrency ? ` - ${sourceCurrency} ${amount.toFixed(2)} -> ${accCurrency} (cambio do dia)` : "";
  if (account.type === "CARD_RECEIVABLE") {
    const fee = round22(conv.amount * (Number(account.feePercent) / 100));
    const net = round22(conv.amount - fee);
    const settlementDate = /* @__PURE__ */ new Date();
    settlementDate.setDate(settlementDate.getDate() + Number(account.settlementDays || 0));
    await postMovement(tx, accountId, "SALE_PAYMENT", net, {
      referenceType: "sale",
      referenceId: ctx.saleId,
      userId: ctx.userId,
      description: `${ctx.saleLabel || "Venda"} \xB7 cart\xE3o (taxa ${Number(account.feePercent).toFixed(2)}% = ${fee.toFixed(2)})${fxNote}`,
      settled: false,
      expectedSettlementDate: settlementDate
    });
    return { accountId, net, fee, settled: false };
  }
  await postMovement(tx, accountId, "SALE_PAYMENT", conv.amount, {
    referenceType: "sale",
    referenceId: ctx.saleId,
    userId: ctx.userId,
    description: (ctx.saleLabel || "Venda") + fxNote,
    settled: true
  });
  return { accountId, net: conv.amount, fee: 0, settled: true };
}
async function reverseSaleMovements(tx, saleId, userId, note) {
  const movs = await tx.select({
    id: accountMovements.id,
    accountId: accountMovements.accountId,
    amountUsd: accountMovements.amountUsd,
    settled: accountMovements.settled,
    accType: financialAccounts.type
  }).from(accountMovements).innerJoin(financialAccounts, eq13(accountMovements.accountId, financialAccounts.id)).where(and11(eq13(accountMovements.referenceType, "sale"), eq13(accountMovements.referenceId, saleId), eq13(accountMovements.type, "SALE_PAYMENT")));
  for (const m of movs) {
    const amt = Number(m.amountUsd);
    if (amt === 0) continue;
    if (m.accType === "CARD_RECEIVABLE" && m.settled === true) {
      throw new Error("Esta venda tem cart\xE3o j\xE1 liquidado (dinheiro movido para o banco). Estorne o valor manualmente na conta do banco antes de registrar a devolu\xE7\xE3o.");
    }
    await postMovement(tx, m.accountId, "REFUND", -amt, {
      referenceType: "sale",
      referenceId: saleId,
      userId,
      description: note ? `Estorno de venda (${note})` : "Estorno de venda",
      settled: m.settled
    });
  }
}
router12.get("/accounts", requirePermission("cash", "view"), async (_req, res) => {
  try {
    const rows = await db.select().from(financialAccounts).where(eq13(financialAccounts.isActive, true)).orderBy(financialAccounts.sortOrder, financialAccounts.name);
    const { resolveRates: resolveRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
    const rates = await resolveRates2().catch(() => ({}));
    const conv = (amount, currency) => {
      if (!currency || currency === "BRL") return amount;
      if (currency === "USD") return rates.USDBRL ? amount * rates.USDBRL.rate : null;
      if (currency === "PYG") return rates.BRLPYG ? amount / rates.BRLPYG.rate : null;
      if (currency === "USDT") return rates.USDTBRL ? amount * rates.USDTBRL.rate : null;
      return null;
    };
    const data = rows.map((a) => ({ ...a, balanceBrl: conv(Number(a.currentBalance), String(a.currency || "BRL")) }));
    const total = data.reduce((s, a) => s + (a.balanceBrl ?? 0), 0);
    const unconverted = data.filter((a) => a.balanceBrl === null).length;
    res.json({ data, totalBalance: round22(total), totalIsBrl: true, unconvertedCount: unconverted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router12.post("/accounts", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const { name, type, feePercent, settlementDays, openingBalance, currency, scope } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio." });
    const t = ["CASH", "BANK", "CARD_RECEIVABLE", "OTHER"].includes(String(type)) ? String(type) : "BANK";
    const cur = isValidCurrency(currency) ? currency : "BRL";
    const sc = ["BUSINESS", "PERSONAL"].includes(String(scope)) ? String(scope) : "BUSINESS";
    const opening = round22(Number(openingBalance) || 0);
    const [row] = await db.insert(financialAccounts).values({
      name: String(name).trim(),
      type: t,
      currency: cur,
      scope: sc,
      feePercent: (Number(feePercent) || 0).toFixed(2),
      settlementDays: Math.max(0, parseInt(String(settlementDays || 0), 10) || 0),
      openingBalance: opening.toFixed(2),
      currentBalance: opening.toFixed(2)
    }).returning();
    if (opening !== 0) {
      await db.insert(accountMovements).values({ accountId: row.id, type: "OPENING", amountUsd: opening.toFixed(2), balanceAfter: opening.toFixed(2), description: "Saldo inicial", createdBy: req.user.userId });
    }
    await logAction(req.user.userId, "CREATE", "financial_accounts", row.id, null, { name, type: t });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router12.put("/accounts/:id", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const { name, type, feePercent, settlementDays, isActive, currency, scope } = req.body || {};
    const [existing] = await db.select().from(financialAccounts).where(eq13(financialAccounts.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Conta n\xE3o encontrada." });
    const hasBalance = Math.abs(Number(existing.currentBalance)) > 5e-3;
    if (currency !== void 0 && String(currency) !== existing.currency && hasBalance) {
      return res.status(400).json({ error: `Esta conta tem saldo (${existing.currency} ${Number(existing.currentBalance).toFixed(2)}) \u2014 zere com uma Transfer\xEAncia antes de trocar a moeda.` });
    }
    if (scope !== void 0 && String(scope) !== existing.scope && hasBalance) {
      return res.status(400).json({ error: `Esta conta tem saldo (${existing.currency} ${Number(existing.currentBalance).toFixed(2)}) \u2014 zere com uma Transfer\xEAncia antes de mudar entre Empresa/Pessoal.` });
    }
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (name !== void 0) updates.name = String(name).trim();
    if (type !== void 0 && ["CASH", "BANK", "CARD_RECEIVABLE", "OTHER"].includes(String(type))) updates.type = String(type);
    if (currency !== void 0 && isValidCurrency(currency)) updates.currency = currency;
    if (scope !== void 0 && ["BUSINESS", "PERSONAL"].includes(String(scope))) updates.scope = String(scope);
    if (feePercent !== void 0) updates.feePercent = (Number(feePercent) || 0).toFixed(2);
    if (settlementDays !== void 0) updates.settlementDays = Math.max(0, parseInt(String(settlementDays), 10) || 0);
    if (isActive !== void 0) updates.isActive = !!isActive;
    await db.update(financialAccounts).set(updates).where(eq13(financialAccounts.id, req.params.id));
    await logAction(req.user.userId, "UPDATE", "financial_accounts", req.params.id, null, updates);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router12.get("/accounts/:id/movements", requirePermission("cash", "view"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 500);
    const rows = await db.select({
      id: accountMovements.id,
      type: accountMovements.type,
      amountUsd: accountMovements.amountUsd,
      balanceAfter: accountMovements.balanceAfter,
      description: accountMovements.description,
      settled: accountMovements.settled,
      expectedSettlementDate: accountMovements.expectedSettlementDate,
      createdAt: accountMovements.createdAt,
      userName: users.name
    }).from(accountMovements).leftJoin(users, eq13(accountMovements.createdBy, users.id)).where(eq13(accountMovements.accountId, req.params.id)).orderBy(desc6(accountMovements.createdAt)).limit(limit);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router12.post("/accounts/:id/adjust", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const { amount, description, masterPassword, referenceId } = req.body || {};
    if (!masterPassword) return res.status(400).json({ error: "Senha do Master \xE9 obrigat\xF3ria." });
    const master = await findMasterByPassword(String(masterPassword));
    if (!master) return res.status(403).json({ error: "Senha inv\xE1lida \u2014 s\xF3 o perfil Master pode lan\xE7ar um ajuste manual." });
    const amt = round22(Number(amount));
    if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: "Valor deve ser diferente de zero (positivo entra, negativo sai)." });
    if (!description || !String(description).trim()) return res.status(400).json({ error: "Descreva o motivo do ajuste." });
    const newBalance = await db.transaction(
      async (tx) => postMovement(tx, req.params.id, "ADJUSTMENT", amt, {
        referenceType: "manual_adjustment",
        referenceId: referenceId ? String(referenceId).trim().slice(0, 100) : null,
        userId: master.id,
        description: `Ajuste manual: ${String(description).trim()}`
      })
    );
    await logAction(master.id, "MANUAL_ADJUSTMENT", "financial_accounts", req.params.id, null, {
      amount: amt,
      description: String(description).trim(),
      referenceId: referenceId || null,
      executedBy: req.user.userId
    });
    const [acc] = await db.select({ name: financialAccounts.name }).from(financialAccounts).where(eq13(financialAccounts.id, req.params.id)).limit(1);
    await createNotification(db, {
      type: "MASTER_ACTION",
      title: "Ajuste manual lan\xE7ado",
      message: `${master.name} lan\xE7ou ${amt > 0 ? "+" : ""}${amt.toFixed(2).replace(".", ",")} na conta ${acc?.name || ""}: ${String(description).trim()}`,
      link: "/finance"
    });
    res.json({ success: true, newBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router12.post("/transfer", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, toAmount, description } = req.body || {};
    const amt = round22(Number(amount));
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return res.status(400).json({ error: "Contas de origem e destino inv\xE1lidas." });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor inv\xE1lido." });
    await db.transaction(async (tx) => {
      const from = await tx.select().from(financialAccounts).where(eq13(financialAccounts.id, fromAccountId)).limit(1);
      if (!from.length) throw new Error("Conta de origem n\xE3o encontrada.");
      const to = await tx.select().from(financialAccounts).where(eq13(financialAccounts.id, toAccountId)).limit(1);
      if (!to.length) throw new Error("Conta de destino n\xE3o encontrada.");
      const fromCur = String(from[0].currency || "BRL");
      const toCur = String(to[0].currency || "BRL");
      let inAmt = amt;
      let descOut = description || "Transfer\xEAncia";
      let descIn = description || "Transfer\xEAncia";
      if (fromCur !== toCur) {
        inAmt = round22(Number(toAmount));
        if (!Number.isFinite(inAmt) || inAmt <= 0) throw new Error(`Informe quanto ENTRA em ${toCur} (valor que o c\xE2mbio entregou).`);
        const implicit = inAmt / amt;
        const rateNote = `cambio efetivo ${fromCur}->${toCur}: ${implicit.toFixed(6)}`;
        descOut = `${description || "Transfer\xEAncia"} - saiu ${fromCur} ${amt.toFixed(2)} -> entrou ${toCur} ${inAmt.toFixed(2)} (${rateNote})`;
        descIn = descOut;
      }
      const ref = `${fromAccountId}->${toAccountId}`;
      await postMovement(tx, fromAccountId, "TRANSFER_OUT", -amt, { referenceType: "transfer", referenceId: ref, userId: req.user.userId, description: descOut });
      await postMovement(tx, toAccountId, "TRANSFER_IN", inAmt, { referenceType: "transfer", referenceId: ref, userId: req.user.userId, description: descIn });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router12.get("/accounts/:id/pending", requirePermission("cash", "view"), async (req, res) => {
  try {
    const rows = await db.select({ amountUsd: accountMovements.amountUsd }).from(accountMovements).where(and11(eq13(accountMovements.accountId, req.params.id), eq13(accountMovements.settled, false)));
    const pending = round22(rows.reduce((s, r) => s + Number(r.amountUsd), 0));
    res.json({ pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router12.post("/accounts/:id/settle", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const { toAccountId } = req.body || {};
    if (!toAccountId) return res.status(400).json({ error: "Escolha a conta de destino (banco)." });
    const result = await db.transaction(async (tx) => {
      const [toAcc] = await tx.select().from(financialAccounts).where(eq13(financialAccounts.id, toAccountId)).limit(1);
      if (!toAcc) throw new Error("Conta de destino n\xE3o encontrada.");
      if (String(toAcc.currency || "BRL") !== "BRL") throw new Error(`A maquininha deposita em R$ \u2014 escolha uma conta em R$ (a "${toAcc.name}" \xE9 ${toAcc.currency}). Depois converta com Transferir.`);
      const pendingRows = await tx.select().from(accountMovements).where(and11(eq13(accountMovements.accountId, req.params.id), eq13(accountMovements.settled, false))).for("update");
      const pending = round22(pendingRows.reduce((s, r) => s + Number(r.amountUsd), 0));
      if (pending <= 0) throw new Error("Nada a liquidar nesta conta.");
      for (const r of pendingRows) {
        await tx.update(accountMovements).set({ settled: true }).where(eq13(accountMovements.id, r.id));
      }
      await postMovement(tx, req.params.id, "CARD_SETTLEMENT", -pending, { referenceType: "settlement", userId: req.user.userId, description: "Liquida\xE7\xE3o da maquininha" });
      await postMovement(tx, toAccountId, "CARD_SETTLEMENT", pending, { referenceType: "settlement", userId: req.user.userId, description: "Recebido da maquininha" });
      return pending;
    });
    await logAction(req.user.userId, "SETTLE_CARD", "financial_accounts", req.params.id, null, { toAccountId, amount: result });
    res.json({ success: true, settled: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router12.get("/method-map", requirePermission("cash", "view"), async (_req, res) => {
  try {
    const rows = await db.select().from(paymentMethodAccounts);
    const map = {};
    for (const r of rows) map[r.method] = r.accountId;
    res.json({ data: map });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router12.put("/method-map", requirePermission("cash", "manage_accounts"), async (req, res) => {
  try {
    const map = req.body?.map || {};
    for (const method of ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"]) {
      const accountId = map[method] || null;
      const existing = await db.select().from(paymentMethodAccounts).where(eq13(paymentMethodAccounts.method, method)).limit(1);
      if (existing.length) await db.update(paymentMethodAccounts).set({ accountId }).where(eq13(paymentMethodAccounts.method, method));
      else await db.insert(paymentMethodAccounts).values({ method, accountId });
    }
    await logAction(req.user.userId, "UPDATE", "payment_method_accounts", "map", null, map);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var finance_default = router12;

// src/server/receivables.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router13 } from "express";
import { and as and12, desc as desc7, eq as eq14, inArray as inArray4, notInArray, sql as sql11 } from "drizzle-orm";
var router13 = Router13();
router13.use(requireAuth);
async function getCustomerOutstanding(tx, customerId, ignoreSaleId) {
  if (!customerId) return 0;
  const conditions = [
    eq14(sales.customerId, customerId),
    inArray4(sales.paymentStatus, ["PENDING", "PARTIAL"]),
    notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])
  ];
  if (ignoreSaleId) conditions.push(sql11`${sales.id} <> ${ignoreSaleId}`);
  const openSales = await tx.select({ id: sales.id, totalAmount: sales.totalAmount }).from(sales).where(and12(...conditions));
  if (openSales.length === 0) return 0;
  const saleIds = openSales.map((s) => s.id);
  const paidRows = await tx.select({
    saleId: payments.saleId,
    paid: sql11`sum(cast(${payments.amountUsd} as numeric))`
  }).from(payments).where(and12(inArray4(payments.saleId, saleIds), eq14(payments.status, "COMPLETED"))).groupBy(payments.saleId);
  const paidBySale = /* @__PURE__ */ new Map();
  for (const r of paidRows) paidBySale.set(r.saleId, Number(r.paid) || 0);
  let outstanding = 0;
  for (const s of openSales) {
    const total = Number(s.totalAmount) || 0;
    const paid = paidBySale.get(s.id) || 0;
    outstanding += Math.max(0, total - paid);
  }
  return Math.round(outstanding * 100) / 100;
}
router13.get("/", requirePermission("cash", "view"), async (req, res) => {
  try {
    const onlyOverdue = String(req.query.overdue || "") === "true";
    const customerId = req.query.customerId ? String(req.query.customerId) : null;
    const conditions = [
      inArray4(sales.paymentStatus, ["PENDING", "PARTIAL"]),
      notInArray(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])
    ];
    if (customerId) conditions.push(eq14(sales.customerId, customerId));
    const rows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerId: sales.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      dueDate: sales.dueDate,
      createdAt: sales.createdAt,
      creditLimit: customers.creditLimit
    }).from(sales).leftJoin(customers, eq14(sales.customerId, customers.id)).where(and12(...conditions)).orderBy(desc7(sales.createdAt)).limit(500);
    const saleIds = rows.map((r) => r.id);
    const paidBySale = /* @__PURE__ */ new Map();
    if (saleIds.length > 0) {
      const paidRows = await db.select({
        saleId: payments.saleId,
        paid: sql11`sum(cast(${payments.amountUsd} as numeric))`
      }).from(payments).where(and12(inArray4(payments.saleId, saleIds), eq14(payments.status, "COMPLETED"))).groupBy(payments.saleId);
      for (const r of paidRows) paidBySale.set(r.saleId, Number(r.paid) || 0);
    }
    const now = Date.now();
    let data = rows.map((r) => {
      const total = Number(r.totalAmount) || 0;
      const paid = paidBySale.get(r.id) || 0;
      const outstanding = Math.round(Math.max(0, total - paid) * 100) / 100;
      const due = r.dueDate ? new Date(r.dueDate).getTime() : null;
      const daysToDue = due !== null ? Math.ceil((due - now) / (1e3 * 60 * 60 * 24)) : null;
      const overdue = due !== null && due < now;
      return { ...r, paidAmount: paid, outstanding, daysToDue, overdue };
    });
    const outstandingByCustomer = /* @__PURE__ */ new Map();
    for (const d of data) {
      if (!d.customerId) continue;
      outstandingByCustomer.set(d.customerId, (outstandingByCustomer.get(d.customerId) || 0) + d.outstanding);
    }
    data = data.map((d) => {
      const limit = Number(d.creditLimit) || 0;
      const customerTotal = d.customerId ? outstandingByCustomer.get(d.customerId) || 0 : 0;
      return { ...d, customerOverLimit: limit > 0 && customerTotal > limit };
    });
    if (onlyOverdue) data = data.filter((d) => d.overdue);
    const summary = data.reduce((acc, d) => {
      acc.totalOutstanding += d.outstanding;
      if (d.overdue) {
        acc.overdueCount += 1;
        acc.overdueAmount += d.outstanding;
      }
      return acc;
    }, { count: data.length, totalOutstanding: 0, overdueCount: 0, overdueAmount: 0 });
    summary.totalOutstanding = Math.round(summary.totalOutstanding * 100) / 100;
    summary.overdueAmount = Math.round(summary.overdueAmount * 100) / 100;
    res.json({ data, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router13.get("/customer/:customerId", requirePermission("cash", "view"), async (req, res) => {
  try {
    const cust = await db.select({ id: customers.id, name: customers.name, creditLimit: customers.creditLimit }).from(customers).where(eq14(customers.id, req.params.customerId)).limit(1);
    if (cust.length === 0) return res.status(404).json({ error: "Cliente n\xE3o encontrado." });
    const outstanding = await getCustomerOutstanding(db, req.params.customerId);
    const creditLimit = Number(cust[0].creditLimit) || 0;
    res.json({
      customerId: cust[0].id,
      name: cust[0].name,
      creditLimit,
      outstanding,
      available: creditLimit > 0 ? Math.round((creditLimit - outstanding) * 100) / 100 : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var receivables_default = router13;

// src/server/storeOrderSync.ts
init_schema();
import { and as and13, eq as eq15, inArray as inArray5, sql as sql12 } from "drizzle-orm";
import { v4 as uuidv47 } from "uuid";
async function cancelSaleTx(tx, sale, reason, userId) {
  const [locked] = await tx.select().from(sales).where(eq15(sales.id, sale.id)).limit(1).for("update");
  if (!locked) throw new Error("Venda n\xE3o encontrada.");
  sale = locked;
  if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus))) {
    throw new Error("Venda j\xE1 est\xE1 cancelada.");
  }
  if (sale.paymentStatus !== "PENDING") {
    throw new Error("Somente vendas pendentes podem ser canceladas. Vendas pagas precisam passar pelo fluxo de estorno/reembolso.");
  }
  if (sale.fulfillmentStatus !== "DELIVERED") {
    const lines = await tx.select().from(saleItems).where(eq15(saleItems.saleId, sale.id));
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const balRows = productIds.length > 0 ? await tx.select().from(stockBalances).where(inArray5(stockBalances.productId, productIds)).for("update") : [];
    const balCursor = new Map(
      balRows.map((b) => [b.productId, { physicalStock: Number(b.physicalStock), reservedStock: Number(b.reservedStock) }])
    );
    const movementsToInsert = [];
    for (const line of lines) {
      const cur = balCursor.get(line.productId);
      if (cur) {
        const oldRes = cur.reservedStock;
        const oldPhys = cur.physicalStock;
        const newRes = Math.max(0, oldRes - Number(line.quantity));
        cur.reservedStock = newRes;
        await tx.update(stockBalances).set({ reservedStock: newRes }).where(eq15(stockBalances.productId, line.productId));
        movementsToInsert.push({
          id: uuidv47(),
          productId: line.productId,
          quantity: -Number(line.quantity),
          userId,
          movementType: "CANCEL_RESERVATION",
          referenceId: sale.id,
          beforePhysical: oldPhys,
          afterPhysical: oldPhys,
          beforeReserved: oldRes,
          afterReserved: newRes,
          notes: "Cancelamento de venda: " + reason
        });
      }
    }
    if (movementsToInsert.length > 0) await tx.insert(stockMovements).values(movementsToInsert);
    await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq15(stockReservations.saleId, sale.id));
    await tx.insert(auditLogs).values({
      id: uuidv47(),
      userId,
      action: "CANCEL_RESERVATION",
      tableName: "stock_reservations",
      recordId: sale.id,
      newValues: JSON.stringify({ reason })
    });
  } else {
    const lines = await tx.select().from(saleItems).where(eq15(saleItems.saleId, sale.id));
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const balRows = productIds.length > 0 ? await tx.select().from(stockBalances).where(inArray5(stockBalances.productId, productIds)).for("update") : [];
    const balCursor = new Map(
      balRows.map((b) => [b.productId, { physicalStock: Number(b.physicalStock), reservedStock: Number(b.reservedStock) }])
    );
    const movementsToInsert = [];
    for (const line of lines) {
      const cur = balCursor.get(line.productId);
      if (cur) {
        const oldRes = cur.reservedStock;
        const oldPhys = cur.physicalStock;
        const newPhys = oldPhys + Number(line.quantity);
        cur.physicalStock = newPhys;
        await tx.update(stockBalances).set({ physicalStock: newPhys }).where(eq15(stockBalances.productId, line.productId));
        movementsToInsert.push({
          id: uuidv47(),
          productId: line.productId,
          quantity: Number(line.quantity),
          userId,
          movementType: "RETURN_CANCEL_SALE",
          referenceId: sale.id,
          beforePhysical: oldPhys,
          afterPhysical: newPhys,
          beforeReserved: oldRes,
          afterReserved: oldRes,
          notes: "Cancelamento de venda: " + reason
        });
      }
    }
    if (movementsToInsert.length > 0) await tx.insert(stockMovements).values(movementsToInsert);
    await restoreSaleLots(tx, sale.id);
    await restoreSaleLayers(tx, sale.id);
    const task = await tx.select().from(deliveryTasks).where(eq15(deliveryTasks.saleId, sale.id)).limit(1);
    if (task.length > 0) {
      const dItems = await tx.select({ id: deliveryItems.id }).from(deliveryItems).where(eq15(deliveryItems.deliveryTaskId, task[0].id));
      const dItemIds = dItems.map((di) => di.id);
      if (dItemIds.length > 0) {
        const dSerials = await tx.select({ serialNumber: deliverySerials.serialNumber }).from(deliverySerials).where(inArray5(deliverySerials.deliveryItemId, dItemIds));
        const serialNumbers = [...new Set(dSerials.map((ds) => ds.serialNumber))];
        if (serialNumbers.length > 0) {
          await tx.update(productSerials).set({ status: "RETURNED" }).where(inArray5(productSerials.serialNumber, serialNumbers));
        }
      }
    }
    await tx.insert(auditLogs).values({
      id: uuidv47(),
      userId,
      action: "RETURN_STOCK_CANCELLED_SALE",
      tableName: "sales",
      recordId: sale.id,
      newValues: JSON.stringify({ reason })
    });
  }
  await tx.update(sales).set({
    orderStatus: "CANCELED",
    paymentStatus: "CANCELED",
    fulfillmentStatus: "CANCELED",
    canceledAt: /* @__PURE__ */ new Date(),
    canceledBy: userId,
    cancelReason: reason
  }).where(eq15(sales.id, sale.id));
  await tx.insert(auditLogs).values({
    id: uuidv47(),
    userId,
    action: "CANCEL_SALE",
    tableName: "sales",
    recordId: sale.id,
    newValues: JSON.stringify({ reason })
  });
  await syncStoreOrderFromSale(tx, sale.id, userId);
}
async function syncStoreOrderFromSale(tx, saleId, actorUserId) {
  const [order] = await tx.select().from(storeOrders).where(eq15(storeOrders.saleId, saleId)).limit(1);
  if (!order) return;
  if (order.status === "CANCELED") return;
  const [sale] = await tx.select().from(sales).where(eq15(sales.id, saleId)).limit(1);
  if (!sale) return;
  const saleIsDead = ["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus)) || sale.paymentStatus === "REFUNDED";
  if (saleIsDead) {
    await tx.update(storeOrders).set({
      status: "CANCELED",
      canceledReason: sale.cancelReason ? `Sincronizado do Caixa: ${sale.cancelReason}` : "Sincronizado do Caixa",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq15(storeOrders.id, order.id));
    if (order.couponCode) {
      await tx.update(storeCoupons).set({ usedCount: sql12`greatest(${storeCoupons.usedCount} - 1, 0)`, updatedAt: /* @__PURE__ */ new Date() }).where(eq15(storeCoupons.code, order.couponCode));
    }
    return;
  }
  if (sale.paymentStatus === "PAID" && order.status !== "CONFIRMED") {
    await tx.update(storeOrders).set({
      status: "CONFIRMED",
      confirmedAt: /* @__PURE__ */ new Date(),
      confirmedBy: actorUserId || null,
      updatedAt: /* @__PURE__ */ new Date()
      // receivedAmountBrl fica como estava: o valor pago no Caixa pode não ter
      // sido em BRL (ver sales.currency), então não dá pra preencher esse campo
      // com confiança aqui sem converter — melhor deixar em branco do que errado.
    }).where(eq15(storeOrders.id, order.id));
    await tx.update(storeOrderPayments).set({ status: "CONFIRMED", confirmedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(and13(eq15(storeOrderPayments.orderId, order.id), eq15(storeOrderPayments.status, "PENDING")));
  }
}

// src/lib/money.ts
var round23 = (n) => Math.round(n * 100) / 100;
var MONEY_EPSILON = 9e-3;
function calcOrderTotal(subtotal, discount, shippingFee) {
  return Math.max(0, round23(subtotal - discount + shippingFee));
}
function formatBrl(v) {
  return `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// src/server/sales.ts
import { v4 as uuidv48 } from "uuid";
import bcrypt4 from "bcryptjs";
var router14 = Router14();
router14.use(requireAuth);
function normalizeFulfillmentStatus(value) {
  const status = String(value || "PENDING").toUpperCase();
  if (["PENDING", "DELIVERING", "DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(status)) return status;
  return "PENDING";
}
function normalizeLotAllocations(input) {
  if (!Array.isArray(input)) return [];
  return input.map((row) => ({
    saleItemId: String(row?.saleItemId || "").trim() || void 0,
    productId: String(row?.productId || "").trim(),
    lotNumber: String(row?.lotNumber || "").trim().toUpperCase(),
    quantity: Math.floor(Number(row?.quantity || 0))
  })).filter((row) => row.productId && row.lotNumber && row.quantity > 0);
}
function calculateLotStatus(requiredByProduct, lots) {
  let requiredTotal = 0;
  let informedTotal = 0;
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    requiredTotal += requiredQty;
    const informed = lots.filter((lot) => lot.productId === productId).reduce((sum, lot) => sum + lot.quantity, 0);
    if (informed > requiredQty) throw new Error(`Quantidade de lote maior que a quantidade vendida para um produto.`);
    informedTotal += informed;
  }
  if (requiredTotal <= 0) return "NOT_REQUIRED";
  if (informedTotal <= 0) return "PENDING";
  if (informedTotal < requiredTotal) return "PARTIAL";
  return "COMPLETE";
}
async function recalculateSaleLotStatus(tx, saleId) {
  const items = await tx.select({
    id: saleItems.id,
    productId: saleItems.productId,
    quantity: saleItems.quantity,
    requiresLot: products.requiresLot
  }).from(saleItems).innerJoin(products, eq16(saleItems.productId, products.id)).where(eq16(saleItems.saleId, saleId));
  const lots = await tx.select({
    saleItemId: saleItemLots.saleItemId,
    productId: saleItemLots.productId,
    quantity: saleItemLots.quantity
  }).from(saleItemLots).where(eq16(saleItemLots.saleId, saleId));
  let requiredTotal = 0;
  let informedTotal = 0;
  for (const item of items) {
    if (!item.requiresLot) continue;
    const requiredQty = Number(item.quantity || 0);
    const informed = lots.filter((lot) => lot.saleItemId === item.id).reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    requiredTotal += requiredQty;
    informedTotal += Math.min(informed, requiredQty);
  }
  const lotStatus = requiredTotal <= 0 ? "NOT_REQUIRED" : informedTotal <= 0 ? "PENDING" : informedTotal < requiredTotal ? "PARTIAL" : "COMPLETE";
  await tx.update(sales).set({ lotStatus }).where(eq16(sales.id, saleId));
  return lotStatus;
}
async function markSaleDelivered(tx, saleId, userId) {
  const saleRows = await tx.select().from(sales).where(eq16(sales.id, saleId)).for("update").limit(1);
  if (!saleRows.length) throw new Error("Venda n\xE3o encontrada.");
  const sale = saleRows[0];
  if (["DELIVERED", "RETURNED", "CANCELED", "CANCELLED"].includes(String(sale.fulfillmentStatus))) return;
  if (["PENDING", "PARTIAL"].includes(String(sale.lotStatus))) {
    throw new Error("Informe o lote completo dos itens antes de entregar (produto controlado por lote).");
  }
  const lines = await tx.select().from(saleItems).where(eq16(saleItems.saleId, saleId));
  for (const line of lines) {
    const qty = Number(line.quantity || 0);
    const balRows = await tx.select().from(stockBalances).where(eq16(stockBalances.productId, line.productId)).for("update").limit(1);
    if (!balRows.length) throw new Error("Estoque n\xE3o encontrado para item da venda.");
    const bal = balRows[0];
    const beforePhysical = Number(bal.physicalStock || 0);
    const beforeReserved = Number(bal.reservedStock || 0);
    if (beforeReserved < qty) throw new Error("Estoque reservado insuficiente para entregar a venda.");
    const afterPhysical = beforePhysical - qty;
    const afterReserved = beforeReserved - qty;
    await tx.update(stockBalances).set({ physicalStock: afterPhysical, reservedStock: afterReserved, updatedAt: /* @__PURE__ */ new Date() }).where(eq16(stockBalances.productId, line.productId));
    await consumeFifo(tx, line.productId, qty, { saleId, reason: "SALE" });
    await tx.insert(stockMovements).values({
      id: uuidv48(),
      productId: line.productId,
      quantity: -qty,
      userId,
      movementType: "OUT_DELIVERY_SIMPLE",
      referenceId: saleId,
      beforePhysical,
      afterPhysical,
      beforeReserved,
      afterReserved,
      reason: "Entrega da venda",
      notes: "Controle simples de entregas"
    });
  }
  await tx.update(stockReservations).set({ status: "DELIVERED" }).where(eq16(stockReservations.saleId, saleId));
  await consumeSaleLots(tx, saleId);
  const orderStatus = sale.paymentStatus === "PAID" ? "COMPLETED" : sale.orderStatus;
  await tx.update(sales).set({ fulfillmentStatus: "DELIVERED", orderStatus }).where(eq16(sales.id, saleId));
}
router14.get("/", requirePermission("sales", "view"), async (req, res) => {
  try {
    const { dateFrom, dateTo, customerName, number: number2, paymentStatus, fulfillmentStatus, serialNumber, q } = req.query;
    const conditions = [notInArray2(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"]), notInArray2(sales.paymentStatus, ["REFUNDED"])];
    if (dateFrom) {
      conditions.push(gte3(sales.createdAt, dayStartUtc(String(dateFrom))));
    }
    if (dateTo) {
      conditions.push(lte3(sales.createdAt, dayEndUtc(String(dateTo))));
    }
    if (customerName) {
      conditions.push(ilike3(customers.name, `%${customerName}%`));
    }
    if (number2) {
      conditions.push(sql13`CAST(${sales.number} AS TEXT) ILIKE ${`%${number2}%`}`);
    }
    if (paymentStatus) {
      conditions.push(eq16(sales.paymentStatus, String(paymentStatus)));
    }
    if (fulfillmentStatus) {
      conditions.push(eq16(sales.fulfillmentStatus, String(fulfillmentStatus)));
    }
    if (serialNumber) {
      const serialQuery = String(serialNumber).trim();
      const matchedSales = await db.selectDistinct({ saleId: saleItems.saleId }).from(productSerials).innerJoin(saleItems, eq16(productSerials.saleItemId, saleItems.id)).where(ilike3(productSerials.serialNumber, `%${serialQuery}%`));
      const saleIds = matchedSales.map((row) => row.saleId).filter(Boolean);
      if (saleIds.length === 0) {
        return res.json({ data: [], summary: { count: 0, grossAmount: 0, discountAmount: 0, ivaAmount: 0, netAmount: 0, paidAmount: 0, pendingAmount: 0 } });
      }
      conditions.push(inArray6(sales.id, saleIds));
    }
    if (q) {
      const searchText = String(q).trim();
      if (searchText) {
        const serialMatches = await db.selectDistinct({ saleId: saleItems.saleId }).from(productSerials).innerJoin(saleItems, eq16(productSerials.saleItemId, saleItems.id)).where(ilike3(productSerials.serialNumber, `%${searchText}%`));
        const serialSaleIds = serialMatches.map((row) => row.saleId).filter(Boolean);
        const searchConditions = [
          ilike3(customers.name, `%${searchText}%`),
          ilike3(customers.document, `%${searchText}%`),
          ilike3(customers.phone, `%${searchText}%`),
          sql13`CAST(${sales.number} AS TEXT) ILIKE ${`%${searchText}%`}`,
          sql13`CONCAT(${sales.series}, '-', LPAD(CAST(${sales.number} AS TEXT), 6, '0')) ILIKE ${`%${searchText}%`}`
        ];
        if (serialSaleIds.length > 0) searchConditions.push(inArray6(sales.id, serialSaleIds));
        conditions.push(or3(...searchConditions));
      }
    }
    const whereClause = conditions.length > 0 ? and14(...conditions) : void 0;
    const limit = 100;
    const [list, summaryRows] = await Promise.all([
      db.select({
        id: sales.id,
        series: sales.series,
        number: sales.number,
        orderStatus: sales.orderStatus,
        paymentStatus: sales.paymentStatus,
        fulfillmentStatus: sales.fulfillmentStatus,
        deliveryScheduledAt: sales.deliveryScheduledAt,
        deliveryNotes: sales.deliveryNotes,
        observations: sales.observations,
        lotStatus: sales.lotStatus,
        totalAmount: sales.totalAmount,
        ivaAmount: sales.ivaAmount,
        priceTable: sales.priceTable,
        currency: sales.currency,
        createdAt: sales.createdAt,
        customerName: customers.name,
        userName: users.name,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount
      }).from(sales).leftJoin(customers, eq16(sales.customerId, customers.id)).leftJoin(users, eq16(sales.userId, users.id)).where(whereClause).orderBy(desc8(sales.createdAt)).limit(limit),
      // Resumo financeiro coerente com o caixa:
      // - Bruto/Líquido = total vendido no período filtrado.
      // - Total Pago = soma de pagamentos realmente recebidos.
      // - Pendente = líquido vendido - total recebido.
      // Também mantém compatibilidade com vendas antigas marcadas como PAID sem linha em payments.
      db.select({
        id: sales.id,
        paymentStatus: sales.paymentStatus,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount,
        ivaAmount: sales.ivaAmount,
        totalAmount: sales.totalAmount
      }).from(sales).leftJoin(customers, eq16(sales.customerId, customers.id)).where(whereClause)
    ]);
    const summarySaleIds = summaryRows.map((row) => row.id).filter(Boolean);
    const paidBySale = /* @__PURE__ */ new Map();
    if (summarySaleIds.length > 0) {
      const paymentRows = await db.select({
        saleId: payments.saleId,
        paidAmount: sql13`sum(cast(${payments.amountUsd} as numeric))`
      }).from(payments).where(and14(inArray6(payments.saleId, summarySaleIds), eq16(payments.status, "COMPLETED"))).groupBy(payments.saleId);
      for (const row of paymentRows) {
        if (row.saleId) paidBySale.set(row.saleId, Number(row.paidAmount) || 0);
      }
    }
    const summary = summaryRows.reduce((acc, sale) => {
      const total = Number(sale.totalAmount) || 0;
      const paidFromPayments = paidBySale.get(sale.id) || 0;
      const effectivePaid = paidFromPayments > 0 ? Math.min(paidFromPayments, total) : sale.paymentStatus === "PAID" ? total : 0;
      acc.count += 1;
      acc.grossAmount += Number(sale.subtotalAmount) || 0;
      acc.discountAmount += Number(sale.discountAmount) || 0;
      acc.ivaAmount += Number(sale.ivaAmount) || 0;
      acc.netAmount += total;
      acc.paidAmount += effectivePaid;
      acc.pendingAmount += Math.max(total - effectivePaid, 0);
      return acc;
    }, {
      count: 0,
      grossAmount: 0,
      discountAmount: 0,
      ivaAmount: 0,
      netAmount: 0,
      paidAmount: 0,
      pendingAmount: 0
    });
    res.json({ data: list, summary });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vendas", details: err.message });
  }
});
router14.get("/deliveries/simple", requirePermission("sales", "view"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 500);
    const rows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      orderStatus: sales.orderStatus,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      deliveryScheduledAt: sales.deliveryScheduledAt,
      deliveryNotes: sales.deliveryNotes,
      lotStatus: sales.lotStatus,
      totalAmount: sales.totalAmount,
      createdAt: sales.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerDocument: customers.document,
      addressStreet: storeOrders.street,
      addressNumber: storeOrders.number,
      addressNeighborhood: storeOrders.neighborhood,
      addressCity: storeOrders.city,
      addressState: storeOrders.state,
      addressCep: storeOrders.cep
    }).from(sales).leftJoin(customers, eq16(sales.customerId, customers.id)).leftJoin(storeOrders, eq16(storeOrders.saleId, sales.id)).where(notInArray2(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])).orderBy(desc8(sales.createdAt)).limit(limit);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar entregas", details: err.message });
  }
});
router14.patch("/:id/fulfillment", requirePermission("sales", "create"), async (req, res) => {
  try {
    const { id } = req.params;
    const requested = normalizeFulfillmentStatus(req.body?.fulfillmentStatus);
    const deliveryScheduledAt = req.body?.deliveryScheduledAt ? new Date(String(req.body.deliveryScheduledAt)) : null;
    const deliveryNotes = req.body?.deliveryNotes ? String(req.body.deliveryNotes).trim() : null;
    const result = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq16(sales.id, id)).limit(1);
      if (!saleRows.length) throw new Error("Venda n\xE3o encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleRows[0].orderStatus))) throw new Error("Venda cancelada/devolvida n\xE3o pode ser alterada.");
      if (requested === "DELIVERED") {
        await tx.update(sales).set({ deliveryScheduledAt, deliveryNotes }).where(eq16(sales.id, id));
        await markSaleDelivered(tx, id, req.user.userId);
      } else {
        await tx.update(sales).set({ fulfillmentStatus: requested, deliveryScheduledAt, deliveryNotes }).where(eq16(sales.id, id));
      }
      const [updated] = await tx.select().from(sales).where(eq16(sales.id, id)).limit(1);
      return updated;
    });
    await logAction(req.user.userId, "UPDATE_FULFILLMENT", "sales", id, null, { fulfillmentStatus: result.fulfillmentStatus });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router14.patch("/:id/lots", requirePermission("sales", "create"), async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedLots = normalizeLotAllocations(req.body?.lots);
    const result = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq16(sales.id, id)).limit(1);
      if (!saleRows.length) throw new Error("Venda n\xE3o encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleRows[0].orderStatus))) throw new Error("Venda cancelada/devolvida n\xE3o pode receber lote.");
      const lines = await tx.select({ id: saleItems.id, productId: saleItems.productId, quantity: saleItems.quantity, requiresLot: products.requiresLot }).from(saleItems).innerJoin(products, eq16(saleItems.productId, products.id)).where(eq16(saleItems.saleId, id));
      const required = /* @__PURE__ */ new Map();
      for (const line of lines) {
        if (line.requiresLot) required.set(line.productId, (required.get(line.productId) || 0) + Number(line.quantity || 0));
      }
      calculateLotStatus(required, normalizedLots);
      await tx.delete(saleItemLots).where(eq16(saleItemLots.saleId, id));
      const lotRows = [];
      for (const lot of normalizedLots) {
        const line = lot.saleItemId ? lines.find((item) => item.id === lot.saleItemId) : lines.find((item) => item.productId === lot.productId);
        if (!line) continue;
        if (!line.requiresLot) continue;
        lotRows.push({
          id: uuidv48(),
          saleId: id,
          saleItemId: line.id,
          productId: line.productId,
          lotNumber: lot.lotNumber,
          quantity: lot.quantity,
          createdBy: req.user.userId
        });
      }
      if (lotRows.length) await tx.insert(saleItemLots).values(lotRows);
      const lotStatus = await recalculateSaleLotStatus(tx, id);
      return { lotStatus };
    });
    await logAction(req.user.userId, "UPDATE_SALE_LOTS", "sale_item_lots", id, null, { lotStatus: result.lotStatus });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router14.get("/:id", requirePermission("sales", "view"), async (req, res) => {
  try {
    const saleId = req.params.id;
    const [saleList, items] = await Promise.all([
      db.select({
        id: sales.id,
        series: sales.series,
        number: sales.number,
        orderStatus: sales.orderStatus,
        paymentStatus: sales.paymentStatus,
        fulfillmentStatus: sales.fulfillmentStatus,
        deliveryScheduledAt: sales.deliveryScheduledAt,
        deliveryNotes: sales.deliveryNotes,
        observations: sales.observations,
        lotStatus: sales.lotStatus,
        totalAmount: sales.totalAmount,
        subtotalAmount: sales.subtotalAmount,
        discountAmount: sales.discountAmount,
        ivaAmount: sales.ivaAmount,
        priceTable: sales.priceTable,
        currency: sales.currency,
        createdAt: sales.createdAt,
        customerName: customers.name,
        customerDocument: customers.document,
        customerPhone: customers.phone,
        userName: users.name
      }).from(sales).leftJoin(customers, eq16(sales.customerId, customers.id)).leftJoin(users, eq16(sales.userId, users.id)).where(eq16(sales.id, saleId)).limit(1),
      db.select({
        id: saleItems.id,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        totalPrice: saleItems.totalPrice,
        ivaAmount: saleItems.ivaAmount,
        discountAmount: saleItems.discountAmount,
        productName: products.name,
        productSku: products.sku,
        productId: products.id,
        hasSerialNumber: products.hasSerialNumber,
        requiresLot: products.requiresLot
      }).from(saleItems).leftJoin(products, eq16(saleItems.productId, products.id)).where(eq16(saleItems.saleId, saleId))
    ]);
    if (saleList.length === 0) return res.status(404).json({ error: "Venda n\xE3o encontrada" });
    const sale = saleList[0];
    const itemIds = items.map((i) => i.id);
    const [serialsList, lotsList, paymentActorRows, separationActorRows, deliveryActorRows, returnRows] = await Promise.all([
      itemIds.length > 0 ? db.select({
        saleItemId: productSerials.saleItemId,
        serialNumber: productSerials.serialNumber
      }).from(productSerials).where(inArray6(productSerials.saleItemId, itemIds)) : Promise.resolve([]),
      itemIds.length > 0 ? db.select({
        saleItemId: saleItemLots.saleItemId,
        productId: saleItemLots.productId,
        lotNumber: saleItemLots.lotNumber,
        quantity: saleItemLots.quantity
      }).from(saleItemLots).where(inArray6(saleItemLots.saleItemId, itemIds)) : Promise.resolve([]),
      db.select({
        userName: users.name,
        createdAt: payments.createdAt
      }).from(payments).leftJoin(users, eq16(payments.receivedBy, users.id)).where(and14(eq16(payments.saleId, saleId), eq16(payments.status, "COMPLETED"))).orderBy(desc8(payments.createdAt)).limit(1),
      db.select({
        userName: users.name,
        checkedAt: separationItems.checkedAt,
        taskCompletedAt: separationTasks.completedAt
      }).from(separationTasks).leftJoin(separationItems, eq16(separationItems.separationTaskId, separationTasks.id)).leftJoin(users, eq16(separationItems.checkedBy, users.id)).where(eq16(separationTasks.saleId, saleId)).orderBy(desc8(separationItems.checkedAt)).limit(1),
      db.select({
        userName: users.name,
        checkedAt: deliveryItems.checkedAt,
        taskCompletedAt: deliveryTasks.completedAt
      }).from(deliveryTasks).leftJoin(deliveryItems, eq16(deliveryItems.deliveryTaskId, deliveryTasks.id)).leftJoin(users, eq16(deliveryItems.checkedBy, users.id)).where(eq16(deliveryTasks.saleId, saleId)).orderBy(desc8(deliveryItems.checkedAt)).limit(1),
      db.select({
        id: saleReturns.id,
        notes: saleReturns.notes,
        totalAmountUsd: saleReturns.totalAmountUsd,
        createdAt: saleReturns.createdAt,
        returnedByName: users.name
      }).from(saleReturns).leftJoin(users, eq16(saleReturns.returnedBy, users.id)).where(eq16(saleReturns.saleId, saleId)).orderBy(desc8(saleReturns.createdAt)).limit(1)
    ]);
    const itemsWithSerials = items.map((item) => {
      const mappedSerials = serialsList.filter((s) => s.saleItemId === item.id).map((s) => s.serialNumber);
      const mappedLots = lotsList.filter((lot) => lot.saleItemId === item.id).map((lot) => ({ lotNumber: lot.lotNumber, quantity: lot.quantity }));
      return {
        ...item,
        serials: mappedSerials,
        lots: mappedLots,
        lotSummary: mappedLots.map((lot) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")
      };
    });
    res.json({
      ...sale,
      items: itemsWithSerials,
      actors: {
        order: { userName: sale.userName, at: sale.createdAt },
        payment: paymentActorRows[0] ? { userName: paymentActorRows[0].userName, at: paymentActorRows[0].createdAt } : null,
        separation: separationActorRows[0] ? { userName: separationActorRows[0].userName, at: separationActorRows[0].checkedAt || separationActorRows[0].taskCompletedAt } : null,
        delivery: deliveryActorRows[0] ? { userName: deliveryActorRows[0].userName, at: deliveryActorRows[0].checkedAt || deliveryActorRows[0].taskCompletedAt } : null
      },
      returnInfo: returnRows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar venda", details: err.message });
  }
});
router14.get("/:id/edit-data", requirePermission("sales", "view"), async (req, res) => {
  try {
    const { id } = req.params;
    const saleRows = await db.select().from(sales).where(eq16(sales.id, id));
    if (saleRows.length === 0) return res.status(404).json({ error: "Venda n\xE3o encontrada" });
    const sale = saleRows[0];
    if (sale.paymentStatus !== "PENDING" || sale.orderStatus !== "CONFIRMED" || sale.fulfillmentStatus === "DELIVERED") {
      return res.status(400).json({ error: "Esta venda n\xE3o pode ser editada (paga, cancelada ou entregue)." });
    }
    const items = await db.select({
      id: saleItems.id,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      ivaAmount: saleItems.ivaAmount,
      productName: products.name,
      sku: products.sku,
      hasSerials: products.hasSerialNumber,
      requiresLot: products.requiresLot
    }).from(saleItems).innerJoin(products, eq16(saleItems.productId, products.id)).where(eq16(saleItems.saleId, sale.id));
    const productIds = [...new Set(items.map((i) => i.productId))];
    const [stockRows, reservedRows] = productIds.length ? await Promise.all([
      db.select().from(stockBalances).where(inArray6(stockBalances.productId, productIds)),
      db.select().from(stockReservations).where(and14(eq16(stockReservations.saleId, sale.id), inArray6(stockReservations.productId, productIds), eq16(stockReservations.status, "ACTIVE")))
    ]) : [[], []];
    const stockByProduct = new Map(stockRows.map((s) => [s.productId, s]));
    const reservedByProduct = /* @__PURE__ */ new Map();
    for (const r of reservedRows) reservedByProduct.set(r.productId, (reservedByProduct.get(r.productId) || 0) + Number(r.quantity));
    const itemsWithStockArray = items.map((item) => {
      const stock = stockByProduct.get(item.productId);
      const reserved = stock ? Number(stock.reservedStock) : 0;
      const physical = stock ? Number(stock.physicalStock) : 0;
      const alreadyReserved = reservedByProduct.get(item.productId) || 0;
      const availableStockForEdit = physical - reserved + alreadyReserved;
      return { ...item, availableStockForEdit };
    });
    res.json({
      id: sale.id,
      customerId: sale.customerId,
      priceTable: sale.priceTable,
      observations: sale.observations,
      fulfillmentStatus: sale.fulfillmentStatus,
      deliveryScheduledAt: sale.deliveryScheduledAt,
      deliveryNotes: sale.deliveryNotes,
      discountAmount: sale.discountAmount,
      dueDate: sale.dueDate,
      lotStatus: sale.lotStatus,
      items: itemsWithStockArray
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router14.put("/:id", requirePermission("sales", "create"), async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, observations, items, priceTable, freightAmount, discountAmount: requestedDiscountAmount, fulfillmentStatus, deliveryScheduledAt, deliveryNotes, dueDate } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Venda deve ter pelo menos um item" });
    }
    const finalSale = await db.transaction(async (tx) => {
      const saleRows = await tx.select().from(sales).where(eq16(sales.id, id));
      if (saleRows.length === 0) throw new Error("Venda n\xE3o encontrada");
      const currentSale = saleRows[0];
      if (currentSale.paymentStatus !== "PENDING" || currentSale.orderStatus !== "CONFIRMED") {
        throw new Error("Vendas pagas ou canceladas n\xE3o podem ser editadas. Fa\xE7a estorno ou nova venda.");
      }
      if (currentSale.fulfillmentStatus === "DELIVERED") {
        throw new Error("Vendas entregues n\xE3o podem ser editadas.");
      }
      if (currentSale.fulfillmentStatus === "SEPARATED" || currentSale.fulfillmentStatus === "SEPARATING") {
        const sTasks = await tx.select().from(separationTasks).where(eq16(separationTasks.saleId, id));
        for (const st of sTasks) {
          await tx.delete(separationItems).where(eq16(separationItems.separationTaskId, st.id));
        }
        await tx.delete(separationTasks).where(eq16(separationTasks.saleId, id));
        const dTasks = await tx.select().from(deliveryTasks).where(eq16(deliveryTasks.saleId, id));
        for (const dt of dTasks) {
          await tx.delete(deliveryItems).where(eq16(deliveryItems.deliveryTaskId, dt.id));
        }
        await tx.delete(deliveryTasks).where(eq16(deliveryTasks.saleId, id));
      }
      const oldReservations = await tx.select().from(stockReservations).where(and14(eq16(stockReservations.saleId, id), eq16(stockReservations.status, "ACTIVE")));
      for (const r of oldReservations) {
        await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq16(stockReservations.id, r.id));
        const sb = await tx.select().from(stockBalances).where(eq16(stockBalances.productId, r.productId)).for("update");
        if (sb.length > 0) {
          const beforeRes = Number(sb[0].reservedStock);
          const newRes = Math.max(0, beforeRes - Number(r.quantity));
          await tx.update(stockBalances).set({ reservedStock: newRes }).where(eq16(stockBalances.productId, r.productId));
          await tx.insert(stockMovements).values({
            id: uuidv48(),
            productId: r.productId,
            movementType: "EDIT_SALE_RELEASE_RESERVATION",
            quantity: r.quantity,
            userId: req.user.userId,
            referenceId: r.saleId,
            beforePhysical: Number(sb[0].physicalStock),
            afterPhysical: Number(sb[0].physicalStock),
            beforeReserved: beforeRes,
            afterReserved: newRes,
            notes: "Libera\xE7\xE3o de reserva para edi\xE7\xE3o de nota"
          });
        }
      }
      await tx.delete(saleItemLots).where(eq16(saleItemLots.saleId, id));
      await tx.delete(saleItems).where(eq16(saleItems.saleId, id));
      let subtotalAmount = 0;
      let ivaAmount = 0;
      let discountAmount = 0;
      let isNational = false;
      if (customerId) {
        const custs = await tx.select().from(customers).where(eq16(customers.id, customerId)).limit(1);
        if (custs.length > 0) isNational = custs[0].nationality === "PY";
      }
      const productIds = items.map((i) => i.productId);
      const dbProducts = await tx.select().from(products).where(inArray6(products.id, productIds));
      const pMap = /* @__PURE__ */ new Map();
      dbProducts.forEach((p) => pMap.set(p.id, p));
      const itemsToInsert = [];
      const reservationsToInsert = [];
      for (const item of items) {
        const prod = pMap.get(item.productId);
        if (!prod) throw new Error("Produto n\xE3o encontrado");
        let unitPriceString = prod.salePriceA || prod.priceA;
        if (priceTable === "B") unitPriceString = prod.salePriceB || prod.priceB;
        const originalPrice = parseFloat(unitPriceString);
        const sellPrice = item.unitPrice ? parseFloat(item.unitPrice) : originalPrice;
        const lineTotal = sellPrice * item.quantity;
        const lineDiscount = Math.max(0, (originalPrice - sellPrice) * item.quantity);
        const productFreight = parseFloat(String(prod.ivaPercentage || "0")) || 0;
        const itemIvaAmount = Number.isFinite(Number(item.totalFreight)) ? Number(item.totalFreight) : Number.isFinite(Number(item.freightAmount)) ? Number(item.freightAmount) * item.quantity : productFreight * item.quantity;
        const unitCostStr = prod.costPrice || "0";
        const unitCost = parseFloat(String(unitCostStr));
        const totalCost = unitCost * item.quantity;
        const profitAmt = lineTotal - totalCost;
        subtotalAmount += originalPrice * item.quantity;
        discountAmount += lineDiscount;
        ivaAmount += itemIvaAmount;
        const reserveRes = await tx.execute(sql13`
          UPDATE "stock_balances"
          SET "reserved_stock" = "reserved_stock" + ${item.quantity}
          WHERE "product_id" = ${item.productId}
          AND ("physical_stock" - "reserved_stock") >= ${item.quantity}
          RETURNING *
        `);
        if (reserveRes.length === 0) {
          throw new Error(`Estoque insuficiente para o produto ${prod.name}`);
        }
        const reservedBal = reserveRes[0];
        const physical = parseFloat(reservedBal.physical_stock);
        const newReserved = parseFloat(reservedBal.reserved_stock);
        const reserved = newReserved - item.quantity;
        itemsToInsert.push({
          id: uuidv48(),
          saleId: id,
          productId: item.productId,
          quantity: item.quantity,
          priceTable: priceTable || "A",
          unitPrice: sellPrice.toString(),
          unitCostAtSale: unitCost.toString(),
          totalCostAtSale: totalCost.toString(),
          profitAmount: profitAmt.toString(),
          discountAmount: lineDiscount.toString(),
          ivaAmount: itemIvaAmount.toString(),
          totalPrice: lineTotal.toString()
        });
        reservationsToInsert.push({
          id: uuidv48(),
          saleId: id,
          productId: item.productId,
          quantity: item.quantity,
          status: "ACTIVE"
        });
        await tx.insert(stockMovements).values({
          id: uuidv48(),
          productId: item.productId,
          movementType: "EDIT_SALE_RESERVE_STOCK",
          quantity: item.quantity,
          userId: req.user.userId,
          referenceId: id,
          beforePhysical: physical,
          afterPhysical: physical,
          beforeReserved: reserved,
          afterReserved: newReserved,
          notes: "Reserva de estoque para edi\xE7\xE3o de nota"
        });
      }
      await tx.insert(saleItems).values(itemsToInsert);
      await tx.insert(stockReservations).values(reservationsToInsert);
      const effectiveFreightAmount = Number.isFinite(Number(freightAmount)) ? Number(freightAmount) : ivaAmount;
      const saleLevelDiscount = Number.isFinite(Number(requestedDiscountAmount)) ? Math.min(Math.max(Number(requestedDiscountAmount), 0), subtotalAmount) : discountAmount;
      const totalAmount = subtotalAmount - saleLevelDiscount + effectiveFreightAmount;
      if (customerId) {
        const custRows = await tx.select({ creditLimit: customers.creditLimit, name: customers.name }).from(customers).where(eq16(customers.id, customerId)).limit(1);
        const creditLimit = Number(custRows[0]?.creditLimit || 0);
        if (creditLimit > 0) {
          const outstanding = await getCustomerOutstanding(tx, customerId, id);
          if (outstanding + totalAmount > creditLimit + 0.01) {
            const available = Math.max(0, creditLimit - outstanding);
            throw new Error(`Limite de cr\xE9dito excedido para ${custRows[0]?.name || "o cliente"}. Limite: ${creditLimit.toFixed(2)} | Em aberto: ${outstanding.toFixed(2)} | Dispon\xEDvel: ${available.toFixed(2)} | Esta venda: ${totalAmount.toFixed(2)}.`);
          }
        }
      }
      const updatedSale = await tx.update(sales).set({
        customerId: customerId || null,
        observations: observations || "",
        priceTable,
        subtotalAmount: subtotalAmount.toString(),
        ivaAmount: effectiveFreightAmount.toString(),
        discountAmount: saleLevelDiscount.toString(),
        totalAmount: totalAmount.toString(),
        fulfillmentStatus: normalizeFulfillmentStatus(fulfillmentStatus),
        deliveryScheduledAt: deliveryScheduledAt ? new Date(String(deliveryScheduledAt)) : null,
        deliveryNotes: deliveryNotes ? String(deliveryNotes).trim() : null,
        dueDate: dueDate ? new Date(String(dueDate)) : null
      }).where(eq16(sales.id, id)).returning();
      await recalculateSaleLotStatus(tx, id);
      await syncStoreOrderFromSale(tx, id, req.user.userId);
      return updatedSale[0];
    });
    await logAction(req.user.userId, "EDIT_SALE", "sales", finalSale.id, null, { totalAmount: parseFloat(String(finalSale.totalAmount)) });
    res.json({ success: true, saleId: finalSale.id });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});
router14.post("/", requirePermission("sales", "create"), async (req, res) => {
  try {
    const { customerId, priceTable, items, observations, freightAmount, discountAmount, lotAllocations, fulfillmentStatus, deliveryScheduledAt, deliveryNotes, dueDate } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }
    const saleId = uuidv48();
    const dueDateValue = dueDate ? new Date(String(dueDate)) : null;
    let totalAmount = 0;
    let ivaAmount = 0;
    let subtotalAmount = 0;
    const normalizedLots = normalizeLotAllocations(lotAllocations);
    const requestedFulfillmentStatus = normalizeFulfillmentStatus(fulfillmentStatus);
    const scheduledDate = deliveryScheduledAt ? new Date(String(deliveryScheduledAt)) : null;
    const finalSale = await db.transaction(async (tx) => {
      const saleItemsToInsert = [];
      const stockMovementsToInsert = [];
      const requiredLotsByProduct = /* @__PURE__ */ new Map();
      const productIds = [...new Set(items.map((i) => i.productId))];
      const productRows = await tx.select().from(products).where(inArray6(products.id, productIds));
      const productsById = new Map(productRows.map((p) => [p.id, p]));
      for (const item of items) {
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        const product = productsById.get(item.productId);
        if (!product) throw new Error(`Produto n\xE3o encontrado: ${item.productId}`);
        let unitPriceStr = product.salePriceA;
        if (priceTable === "B") unitPriceStr = product.salePriceB;
        const unitPrice = parseFloat(String(unitPriceStr)) || 0;
        const productFreight = parseFloat(String(product.ivaPercentage)) || 0;
        const updateResult = await tx.execute(sql13`
          UPDATE "stock_balances" 
          SET "reserved_stock" = "reserved_stock" + ${quantity}
          WHERE "product_id" = ${item.productId} 
          AND ("physical_stock" - "reserved_stock") >= ${quantity}
          RETURNING *
        `);
        if (updateResult.length === 0) {
          throw new Error(`Estoque insuficiente ou falha de concorr\xEAncia para o item: ${product.name}`);
        }
        const bal = updateResult[0];
        stockMovementsToInsert.push({
          id: uuidv48(),
          productId: item.productId,
          quantity,
          userId: req.user.userId,
          movementType: "RESERVE_SALE",
          beforePhysical: parseFloat(bal.physical_stock),
          afterPhysical: parseFloat(bal.physical_stock),
          beforeReserved: parseFloat(bal.reserved_stock) - quantity,
          afterReserved: parseFloat(bal.reserved_stock),
          referenceId: saleId,
          reason: "Nova Venda - Reserva"
        });
        const lineTotal = quantity * unitPrice;
        const lineIva = Number.isFinite(Number(item.totalFreight)) ? Number(item.totalFreight) : Number.isFinite(Number(item.freightAmount)) ? Number(item.freightAmount) * quantity : productFreight * quantity;
        const unitCost = parseFloat(String(product.costPrice || "0"));
        const totalCost = unitCost * quantity;
        const profitAmt = lineTotal - totalCost;
        subtotalAmount += lineTotal;
        ivaAmount += lineIva;
        if (product.requiresLot) requiredLotsByProduct.set(item.productId, (requiredLotsByProduct.get(item.productId) || 0) + quantity);
        saleItemsToInsert.push({
          id: uuidv48(),
          saleId,
          productId: item.productId,
          quantity,
          unitPrice: String(unitPrice),
          unitCostAtSale: String(unitCost),
          totalCostAtSale: String(totalCost),
          profitAmount: String(profitAmt),
          totalPrice: String(lineTotal),
          discountAmount: "0",
          ivaAmount: String(lineIva),
          priceTable: priceTable || "A"
        });
      }
      const effectiveFreightAmount = Number.isFinite(Number(freightAmount)) ? Number(freightAmount) : ivaAmount;
      const saleDiscountAmount = Math.min(Math.max(Number(discountAmount || 0), 0), subtotalAmount);
      totalAmount = Math.max(0, subtotalAmount - saleDiscountAmount) + effectiveFreightAmount;
      const lotStatus = calculateLotStatus(requiredLotsByProduct, normalizedLots);
      if (customerId && dueDateValue) {
        const custRows = await tx.select({ creditLimit: customers.creditLimit, name: customers.name }).from(customers).where(eq16(customers.id, customerId)).limit(1);
        const creditLimit = Number(custRows[0]?.creditLimit || 0);
        if (creditLimit > 0) {
          const outstanding = await getCustomerOutstanding(tx, customerId);
          if (outstanding + totalAmount > creditLimit + 0.01) {
            const available = Math.max(0, creditLimit - outstanding);
            throw new Error(`Limite de cr\xE9dito excedido para ${custRows[0]?.name || "o cliente"}. Limite: ${creditLimit.toFixed(2)} | Em aberto: ${outstanding.toFixed(2)} | Dispon\xEDvel: ${available.toFixed(2)} | Esta venda: ${totalAmount.toFixed(2)}.`);
          }
        }
      }
      const upperObservations = observations ? String(observations).toUpperCase() : null;
      const companyCurrencyRows = await tx.select({ defaultCurrency: companySettings.defaultCurrency }).from(companySettings).limit(1);
      const saleCurrency = companyCurrencyRows[0]?.defaultCurrency === "BRL" ? "BRL" : "USD";
      const insertedSaleRes = await tx.insert(sales).values({
        id: saleId,
        series: "001",
        customerId: customerId || null,
        userId: req.user.userId,
        priceTable: priceTable || "A",
        subtotalAmount: String(subtotalAmount),
        discountAmount: String(saleDiscountAmount),
        ivaAmount: String(effectiveFreightAmount),
        totalAmount: String(totalAmount),
        currency: saleCurrency,
        orderStatus: "CONFIRMED",
        paymentStatus: "PENDING",
        fulfillmentStatus: requestedFulfillmentStatus === "DELIVERED" ? "PENDING" : requestedFulfillmentStatus,
        deliveryScheduledAt: scheduledDate,
        deliveryNotes: deliveryNotes ? String(deliveryNotes).trim() : null,
        dueDate: dueDateValue,
        lotStatus,
        observations: upperObservations
      }).returning();
      const insertedSale = insertedSaleRes[0];
      await tx.insert(saleItems).values(saleItemsToInsert);
      if (stockMovementsToInsert.length > 0) await tx.insert(stockMovements).values(stockMovementsToInsert);
      const lotRows = [];
      for (const lot of normalizedLots) {
        const itemRow = saleItemsToInsert.find((line) => line.productId === lot.productId);
        if (!itemRow) continue;
        lotRows.push({
          id: uuidv48(),
          saleId,
          saleItemId: itemRow.id,
          productId: itemRow.productId,
          lotNumber: lot.lotNumber,
          quantity: lot.quantity,
          createdBy: req.user.userId
        });
      }
      if (lotRows.length) await tx.insert(saleItemLots).values(lotRows);
      const reservationsToInsert = saleItemsToInsert.map((item) => ({
        id: uuidv48(),
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        status: "ACTIVE"
      }));
      await tx.insert(stockReservations).values(reservationsToInsert);
      if (requestedFulfillmentStatus === "DELIVERED") {
        await markSaleDelivered(tx, saleId, req.user.userId);
        insertedSale.fulfillmentStatus = "DELIVERED";
      }
      return { ...insertedSale, lotStatus, discountAmount: String(saleDiscountAmount), totalAmount: String(totalAmount), ivaAmount: String(effectiveFreightAmount) };
    });
    await logAction(req.user.userId, "CREATE_SALE", "sales", finalSale.id, null, { totalAmount: parseFloat(String(finalSale.totalAmount)) });
    res.status(201).json({
      saleId: finalSale.id,
      series: finalSale.series,
      number: finalSale.number,
      subtotalAmount: finalSale.subtotalAmount,
      discountAmount: finalSale.discountAmount,
      ivaAmount: finalSale.ivaAmount,
      totalAmount: finalSale.totalAmount,
      currency: finalSale.currency,
      priceTable: finalSale.priceTable,
      orderStatus: finalSale.orderStatus,
      paymentStatus: finalSale.paymentStatus,
      fulfillmentStatus: finalSale.fulfillmentStatus,
      lotStatus: finalSale.lotStatus
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});
router14.post("/:id/cancel", requirePermission("sales", "cancel"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: "Motivo do cancelamento \xE9 obrigat\xF3rio." });
    }
    const s = await db.select().from(sales).where(eq16(sales.id, id)).limit(1);
    if (s.length === 0) return res.status(404).json({ error: "Venda n\xE3o encontrada." });
    await db.transaction(async (tx) => {
      await cancelSaleTx(tx, s[0], reason, req.user.userId);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var AUTHORIZING_ROLES = ["master", "admin", "administrador", "administrator", "super admin", "super_admin"];
async function findAdminByPassword(adminPassword) {
  const adminUsers = await db.select({
    id: users.id,
    name: users.name,
    passwordHash: users.passwordHash,
    isActive: users.isActive,
    roleName: roles.name
  }).from(users).leftJoin(roles, eq16(users.roleId, roles.id)).where(eq16(users.isActive, true));
  for (const admin of adminUsers) {
    if (!AUTHORIZING_ROLES.includes(String(admin.roleName || "").trim().toLowerCase())) continue;
    const valid = await bcrypt4.compare(adminPassword, admin.passwordHash);
    if (valid) return admin;
  }
  return null;
}
router14.post("/:id/return", requirePermission("admin", "manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, adminPassword } = req.body || {};
    if (!adminPassword) {
      return res.status(400).json({ error: "Senha de autoriza\xE7\xE3o \xE9 obrigat\xF3ria." });
    }
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ error: "Anota\xE7\xE3o/motivo da devolu\xE7\xE3o \xE9 obrigat\xF3rio." });
    }
    const admin = await findAdminByPassword(String(adminPassword));
    if (!admin) {
      return res.status(403).json({ error: "Senha de autoriza\xE7\xE3o inv\xE1lida. Use a senha de login de um usu\xE1rio Master ou Administrador." });
    }
    const saleRows = await db.select().from(sales).where(eq16(sales.id, id)).limit(1);
    if (!saleRows.length) return res.status(404).json({ error: "Venda n\xE3o encontrada." });
    const sale = saleRows[0];
    if (["CANCELED", "CANCELLED", "RETURNED"].includes(sale.orderStatus) || sale.paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Esta venda j\xE1 foi cancelada/devolvida." });
    }
    await db.transaction(async (tx) => {
      const [sale2] = await tx.select().from(sales).where(eq16(sales.id, id)).limit(1).for("update");
      if (!sale2) throw new Error("Venda n\xE3o encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(sale2.orderStatus) || sale2.paymentStatus === "REFUNDED") {
        throw new Error("Esta venda j\xE1 foi cancelada/devolvida.");
      }
      const lines = await tx.select().from(saleItems).where(eq16(saleItems.saleId, id));
      const wasDelivered = sale2.fulfillmentStatus === "DELIVERED";
      for (const line of lines) {
        const balRows = await tx.select().from(stockBalances).where(eq16(stockBalances.productId, line.productId)).for("update").limit(1);
        const qty = Number(line.quantity || 0);
        if (balRows.length) {
          const oldPhys = Number(balRows[0].physicalStock || 0);
          const oldRes = Number(balRows[0].reservedStock || 0);
          const newPhys = wasDelivered ? oldPhys + qty : oldPhys;
          const newRes = wasDelivered ? oldRes : Math.max(0, oldRes - qty);
          await tx.update(stockBalances).set({ physicalStock: newPhys, reservedStock: newRes, updatedAt: /* @__PURE__ */ new Date() }).where(eq16(stockBalances.productId, line.productId));
          await tx.insert(stockMovements).values({
            id: uuidv48(),
            productId: line.productId,
            quantity: wasDelivered ? qty : -qty,
            userId: req.user.userId,
            movementType: wasDelivered ? "RETURN_SALE" : "RETURN_RESERVED_SALE",
            referenceId: id,
            beforePhysical: oldPhys,
            afterPhysical: newPhys,
            beforeReserved: oldRes,
            afterReserved: newRes,
            reason: "Devolu\xE7\xE3o de venda",
            notes: String(notes).trim()
          });
        }
      }
      if (!wasDelivered) {
        await tx.update(stockReservations).set({ status: "CANCELED" }).where(eq16(stockReservations.saleId, id));
      } else {
        await restoreSaleLots(tx, id);
        await restoreSaleLayers(tx, id);
      }
      const itemIds = lines.map((line) => line.id);
      if (itemIds.length > 0) {
        await tx.update(productSerials).set({ status: "AVAILABLE", saleItemId: null, updatedAt: /* @__PURE__ */ new Date() }).where(inArray6(productSerials.saleItemId, itemIds));
      }
      const salePayments = await tx.select().from(payments).where(and14(eq16(payments.saleId, id), eq16(payments.status, "COMPLETED"))).orderBy(desc8(payments.createdAt));
      for (const pmt of salePayments) {
        await tx.update(payments).set({ status: "REFUNDED" }).where(eq16(payments.id, pmt.id));
      }
      const cashRefundUsd = salePayments.filter((p) => p.paymentMethod === "CASH").reduce((sum, pmt) => sum + Number(pmt.amountUsd || 0), 0);
      let cashRegisterId;
      const candidateRegId = salePayments[0]?.cashRegisterId;
      if (candidateRegId) {
        const [reg] = await tx.select().from(cashRegisters).where(eq16(cashRegisters.id, candidateRegId)).limit(1);
        if (reg && reg.status === "OPEN" && reg.userId === req.user.userId) cashRegisterId = candidateRegId;
      }
      if (!cashRegisterId && cashRefundUsd > 0) {
        const openRegister = await tx.select().from(cashRegisters).where(and14(eq16(cashRegisters.userId, req.user.userId), eq16(cashRegisters.status, "OPEN"))).limit(1);
        cashRegisterId = openRegister[0]?.id;
      }
      if (cashRegisterId && cashRefundUsd > 0) {
        await tx.insert(cashMovements).values({
          cashRegisterId,
          type: "REFUND",
          amountUsd: `-${cashRefundUsd.toFixed(2)}`,
          description: `Devolu\xE7\xE3o venda ${sale2.series}-${sale2.number}`,
          referenceId: id,
          createdBy: req.user.userId
        });
      }
      await reverseSaleMovements(tx, id, req.user.userId);
      await tx.update(sales).set({
        orderStatus: "RETURNED",
        paymentStatus: salePayments.length > 0 ? "REFUNDED" : sale2.paymentStatus,
        fulfillmentStatus: "RETURNED",
        cancelReason: String(notes).trim()
      }).where(eq16(sales.id, id));
      await syncStoreOrderFromSale(tx, id, req.user.userId);
      const ret = await tx.insert(saleReturns).values({
        id: uuidv48(),
        saleId: id,
        returnedBy: req.user.userId,
        authorizedBy: admin.id,
        notes: String(notes).trim(),
        totalAmountUsd: String(sale2.totalAmount || "0"),
        status: "COMPLETED"
      }).returning();
      await tx.insert(auditLogs).values({
        id: uuidv48(),
        userId: req.user.userId,
        action: "RETURN_SALE",
        tableName: "sales",
        recordId: id,
        oldValues: JSON.stringify({ orderStatus: sale2.orderStatus, paymentStatus: sale2.paymentStatus, fulfillmentStatus: sale2.fulfillmentStatus }),
        newValues: JSON.stringify({ returnId: ret[0]?.id, adminId: admin.id, adminName: admin.name, notes: String(notes).trim(), totalAmountUsd: sale2.totalAmount })
      });
    });
    await createNotification(db, {
      type: "SALE_RETURNED",
      title: "Venda devolvida",
      message: `Venda ${sale.series}-${String(sale.number).padStart(6, "0")} devolvida (${formatBrl(Number(sale.totalAmount || 0))}) \u2014 autorizado por ${admin.name}.`,
      link: "/sales"
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao processar devolu\xE7\xE3o." });
  }
});
var sales_default = router14;

// src/server/reports.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router15 } from "express";
import {
  eq as eq18,
  and as and15,
  inArray as inArray7,
  sql as sql14,
  gte as gte4,
  lte as lte4,
  desc as desc9,
  isNull as isNull6,
  or as or4,
  ilike as ilike4,
  not
} from "drizzle-orm";
import PDFDocument from "pdfkit";

// src/server/pdfHelpers.ts
import fs from "fs";
import path from "path";
async function loadImageBuffer(imageUrl) {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } else if (imageUrl.startsWith("data:image/")) {
      const b64 = imageUrl.split(",")[1];
      if (b64) return Buffer.from(b64, "base64");
    } else if (imageUrl.startsWith("/uploads/")) {
      const localPath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// src/server/currency.ts
init_db();
init_schema();
import { eq as eq17 } from "drizzle-orm";
function normalizeCurrencyMode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "BRL") return "BRL";
  if (normalized === "DUAL" || normalized === "USD_BRL" || normalized === "BOTH") return "DUAL";
  return "USD";
}
function normalizeExchangeRate(value, fallback = 5.5) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
async function getServerCurrencySettings(companyCurrency) {
  const [companyRows, brlRows] = await Promise.all([
    companyCurrency === void 0 ? db.select().from(companySettings).limit(1) : Promise.resolve([]),
    db.select().from(currencies).where(eq17(currencies.code, "BRL")).limit(1)
  ]);
  return {
    mode: normalizeCurrencyMode(companyCurrency ?? companyRows[0]?.defaultCurrency),
    brlRate: normalizeExchangeRate(brlRows[0]?.rateToUsd)
  };
}
function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatAmount(value) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatServerCurrency(value, settings, dualSeparator = " / ") {
  const amount = number(value);
  if (settings.mode === "BRL") return `R$ ${formatAmount(amount)}`;
  const usd = `US$ ${formatAmount(amount)}`;
  if (settings.mode === "USD") return usd;
  return `${usd}${dualSeparator}R$ ${formatAmount(amount * settings.brlRate)}`;
}

// src/server/reports.ts
var router15 = Router15();
router15.use(requireAuth);
router15.get("/commissions", requirePermission("reports", "profit"), async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : void 0;
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : void 0;
    const conditions = [sql14`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`];
    const payFilter = String(status || "PAID").toUpperCase();
    if (payFilter === "PAID") conditions.push(eq18(sales.paymentStatus, "PAID"));
    if (fromDate) conditions.push(gte4(sales.createdAt, fromDate));
    if (toDate) conditions.push(lte4(sales.createdAt, toDate));
    const rows = await db.select({
      userId: sales.userId,
      sellerName: users.name,
      commissionPercent: users.commissionPercent,
      subtotal: sql14`sum(cast(${sales.subtotalAmount} as numeric))`,
      discount: sql14`sum(cast(${sales.discountAmount} as numeric))`,
      total: sql14`sum(cast(${sales.totalAmount} as numeric))`,
      salesCount: sql14`count(*)`
    }).from(sales).leftJoin(users, eq18(sales.userId, users.id)).where(and15(...conditions)).groupBy(sales.userId, users.name, users.commissionPercent).orderBy(sql14`sum(cast(${sales.subtotalAmount} as numeric)) desc`);
    const data = rows.map((r) => {
      const base = Math.round((Number(r.subtotal || 0) - Number(r.discount || 0)) * 100) / 100;
      const pct = Number(r.commissionPercent || 0);
      const commission = Math.round(base * (pct / 100) * 100) / 100;
      return {
        userId: r.userId,
        sellerName: r.sellerName || "\u2014",
        commissionPercent: pct,
        salesCount: Number(r.salesCount || 0),
        totalSold: Math.round(Number(r.total || 0) * 100) / 100,
        commissionBase: base,
        commission
      };
    });
    const summary = data.reduce((acc, d) => {
      acc.totalBase += d.commissionBase;
      acc.totalCommission += d.commission;
      acc.totalSold += d.totalSold;
      return acc;
    }, { sellers: data.length, totalBase: 0, totalCommission: 0, totalSold: 0 });
    summary.totalBase = Math.round(summary.totalBase * 100) / 100;
    summary.totalCommission = Math.round(summary.totalCommission * 100) / 100;
    summary.totalSold = Math.round(summary.totalSold * 100) / 100;
    res.json({ data, summary, status: payFilter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router15.get("/abc", requirePermission("reports", "profit"), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : void 0;
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : void 0;
    const conditions = [sql14`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`];
    if (fromDate) conditions.push(gte4(sales.createdAt, fromDate));
    if (toDate) conditions.push(lte4(sales.createdAt, toDate));
    const rows = await db.select({
      productId: saleItems.productId,
      productName: products.name,
      sku: products.sku,
      qty: sql14`sum(${saleItems.quantity})`,
      revenue: sql14`sum(cast(${saleItems.totalPrice} as numeric))`,
      cost: sql14`sum(coalesce(cast(${saleItems.totalCostAtSale} as numeric), 0))`,
      profit: sql14`sum(coalesce(cast(${saleItems.profitAmount} as numeric), 0))`
    }).from(saleItems).innerJoin(sales, eq18(saleItems.saleId, sales.id)).leftJoin(products, eq18(saleItems.productId, products.id)).where(and15(...conditions)).groupBy(saleItems.productId, products.name, products.sku).orderBy(sql14`sum(cast(${saleItems.totalPrice} as numeric)) desc`);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    let cumulative = 0;
    const data = rows.map((r) => {
      const revenue = Number(r.revenue || 0);
      const share = totalRevenue > 0 ? revenue / totalRevenue * 100 : 0;
      const before = cumulative;
      cumulative += share;
      const cls = before < 80 ? "A" : before < 95 ? "B" : "C";
      return {
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        qty: Number(r.qty || 0),
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(Number(r.cost || 0) * 100) / 100,
        profit: Math.round(Number(r.profit || 0) * 100) / 100,
        share: Math.round(share * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        classe: cls
      };
    });
    const byClass = { A: { count: 0, revenue: 0 }, B: { count: 0, revenue: 0 }, C: { count: 0, revenue: 0 } };
    for (const d of data) {
      const k = d.classe;
      byClass[k].count += 1;
      byClass[k].revenue = Math.round((byClass[k].revenue + d.revenue) * 100) / 100;
    }
    res.json({ data, totalRevenue: Math.round(totalRevenue * 100) / 100, byClass });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router15.post(
  "/products-catalog/preview",
  requirePermission("reports", "products_pdf"),
  async (req, res) => {
    try {
      const {
        groupIds,
        subgroupIds,
        onlyActive = true,
        onlyWithPhoto
      } = req.body;
      const conditions = [];
      if (onlyActive) conditions.push(eq18(products.isActive, true));
      if (groupIds && groupIds.length > 0)
        conditions.push(inArray7(products.groupId, groupIds));
      if (subgroupIds && subgroupIds.length > 0)
        conditions.push(inArray7(products.subgroupId, subgroupIds));
      const whereClause = conditions.length > 0 ? and15(...conditions) : void 0;
      const prods = await db.select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        imageUrl: products.imageUrl,
        groupName: productGroups.name,
        subgroupName: productSubgroups.name
      }).from(products).leftJoin(productGroups, eq18(products.groupId, productGroups.id)).leftJoin(
        productSubgroups,
        eq18(products.subgroupId, productSubgroups.id)
      ).where(whereClause).orderBy(
        productGroups.name,
        productSubgroups.name,
        products.name,
        products.sku
      );
      let filtered = prods;
      if (onlyWithPhoto) {
        filtered = filtered.filter((p) => !!p.imageUrl);
      }
      res.json({
        total: filtered.length,
        items: filtered.slice(0, 20)
      });
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).json({ error: "Erro ao gerar pr\xE9via." });
    }
  }
);
router15.post(
  "/products-catalog/pdf",
  requirePermission("reports", "products_pdf"),
  async (req, res) => {
    try {
      const {
        groupIds,
        subgroupIds,
        onlyWithPhoto,
        showPrice,
        priceTable,
        showSku,
        showPhoto,
        onlyActive = true
      } = req.body;
      const conditions = [];
      if (onlyActive) {
        conditions.push(eq18(products.isActive, true));
      }
      if (groupIds && groupIds.length > 0) {
        conditions.push(inArray7(products.groupId, groupIds));
      }
      if (subgroupIds && subgroupIds.length > 0) {
        conditions.push(inArray7(products.subgroupId, subgroupIds));
      }
      const whereClause = conditions.length > 0 ? and15(...conditions) : void 0;
      const prods = await db.select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        imageUrl: products.imageUrl,
        salePriceA: products.salePriceA,
        salePriceB: products.salePriceB,
        salePriceC: products.salePriceC,
        groupName: productGroups.name,
        subgroupName: productSubgroups.name
      }).from(products).leftJoin(productGroups, eq18(products.groupId, productGroups.id)).leftJoin(
        productSubgroups,
        eq18(products.subgroupId, productSubgroups.id)
      ).where(whereClause).orderBy(
        productGroups.name,
        productSubgroups.name,
        products.name,
        products.sku
      );
      let filtered = prods;
      if (onlyWithPhoto) {
        filtered = filtered.filter((p) => !!p.imageUrl);
      }
      const comp = await db.select().from(companySettings).limit(1);
      const company = comp[0] || {};
      const currencySettings = await getServerCurrencySettings(company.defaultCurrency);
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        layout: "landscape"
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="catalogo_produtos.pdf"`
      );
      doc.pipe(res);
      const imageBuffers = /* @__PURE__ */ new Map();
      if (company.logoUrl) {
        const b = await loadImageBuffer(company.logoUrl);
        if (b) imageBuffers.set("logo", b);
      }
      if (showPhoto) {
        for (const p of filtered) {
          if (p.imageUrl) {
            const b = await loadImageBuffer(p.imageUrl);
            if (b) imageBuffers.set(p.id, b);
          }
        }
      }
      const drawHeader = () => {
        doc.addPage();
        let logoStartY = 30;
        if (imageBuffers.has("logo")) {
          try {
            doc.image(imageBuffers.get("logo"), 30, logoStartY, {
              fit: [100, 50]
            });
          } catch (e) {
          }
        }
        doc.fontSize(16).font("Helvetica-Bold").text(`Cat\xE1logo de Produtos - ${company.tradeName || company.companyName || "Sua loja"}`, { align: "center" });
        doc.moveDown(1);
        if (imageBuffers.has("logo") && doc.y < 85) {
          doc.y = 85;
        }
        doc.rect(doc.x, doc.y, 782, 20).fillAndStroke("#f3f4f6", "#e5e7eb");
        doc.fillColor("#111827").fontSize(10);
        let headY = doc.y + 5;
        if (showSku) doc.text("SKU", 35, headY, { width: 80 });
        doc.text("GRUPO", showSku ? 120 : 35, headY, { width: 100 });
        doc.text("SUBGRUPO", showSku ? 225 : 140, headY, { width: 100 });
        doc.text("PRODUTO", showSku ? 335 : 250, headY, {
          width: showPrice && showPhoto ? 200 : 300
        });
        if (showPhoto) doc.text("FOTO", 545, headY, { width: 100 });
        if (showPrice)
          doc.text(currencySettings.mode === "DUAL" ? "PRE\xC7O US$ / R$" : "PRE\xC7O", 655, headY, { width: 145, align: "right" });
        doc.moveDown(1);
      };
      let firstPageY = 30;
      if (imageBuffers.has("logo")) {
        try {
          doc.image(imageBuffers.get("logo"), 30, firstPageY, {
            fit: [100, 50]
          });
        } catch (e) {
        }
      }
      doc.fontSize(16).font("Helvetica-Bold").text(`Cat\xE1logo de Produtos - ${company.tradeName || company.companyName || "Sua loja"}`, { align: "center" });
      doc.moveDown(1);
      if (imageBuffers.has("logo") && doc.y < 85) {
        doc.y = 85;
      }
      const drawTableHeader = (startY) => {
        doc.rect(30, startY, 782, 20).fillAndStroke("#f3f4f6", "#e5e7eb");
        doc.fillColor("#111827").fontSize(10).font("Helvetica-Bold");
        let textY = startY + 5;
        if (showSku) doc.text("SKU", 35, textY, { width: 80 });
        doc.text("GRUPO", showSku ? 120 : 35, textY, { width: 100 });
        doc.text("SUBGRUPO", showSku ? 225 : 140, textY, { width: 100 });
        doc.text("PRODUTO", showSku ? 335 : 250, textY, { width: 200 });
        if (showPhoto) doc.text("FOTO", 545, textY, { width: 100 });
        if (showPrice)
          doc.text(currencySettings.mode === "DUAL" ? "PRE\xC7O US$ / R$" : "PRE\xC7O", 655, textY, { width: 145, align: "right" });
        doc.font("Helvetica").fillColor("black");
      };
      let currentY = doc.y;
      drawTableHeader(currentY);
      currentY += 20;
      let rowToggle = false;
      for (const p of filtered) {
        if (currentY > 500) {
          doc.addPage();
          currentY = 30;
          drawTableHeader(currentY);
          currentY += 20;
        }
        const rowHeight = showPhoto ? 50 : currencySettings.mode === "DUAL" && showPrice ? 36 : 25;
        if (rowToggle) {
          doc.rect(30, currentY, 782, rowHeight).fill("#f9fafb");
        }
        doc.fillColor("#111827").fontSize(10);
        const textY = currentY + (showPhoto ? 20 : 7);
        if (showSku)
          doc.text(p.sku || "-", 35, textY, { width: 80, lineBreak: false });
        doc.text(p.groupName || "-", showSku ? 120 : 35, textY, {
          width: 100,
          height: rowHeight,
          ellipsis: true
        });
        doc.text(p.subgroupName || "-", showSku ? 225 : 140, textY, {
          width: 100,
          height: rowHeight,
          ellipsis: true
        });
        doc.text(p.name || "-", showSku ? 335 : 250, textY, {
          width: 200,
          height: rowHeight,
          ellipsis: true
        });
        if (showPhoto) {
          const buf = imageBuffers.get(p.id);
          if (buf) {
            try {
              doc.image(buf, 545, currentY + 5, { fit: [40, 40] });
            } catch {
              doc.fillColor("gray").fontSize(8).text("SEM FOTO", 545, textY);
            }
          } else {
            doc.fillColor("gray").fontSize(8).text("SEM FOTO", 545, textY);
          }
        }
        if (showPrice) {
          let price = p.salePriceA;
          if (priceTable === "B") price = p.salePriceB;
          const formattedPrice = formatServerCurrency(price, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");
          doc.fillColor("#111827").fontSize(currencySettings.mode === "DUAL" ? 8 : 10).text(formattedPrice, 655, textY, { width: 145, align: "right" });
        }
        currentY += rowHeight;
        rowToggle = !rowToggle;
      }
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro ao gerar PDF" });
      }
    }
  }
);
router15.get(
  "/profit",
  requirePermission("reports", "profit"),
  async (req, res) => {
    try {
      const { dateFrom, dateTo, status } = req.query;
      const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : void 0;
      const toDate = dateTo ? dayEndUtc(String(dateTo)) : void 0;
      const saleConditions = [
        sql14`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
        eq18(sales.paymentStatus, "PAID")
      ];
      if (fromDate) saleConditions.push(gte4(sales.createdAt, fromDate));
      if (toDate) saleConditions.push(lte4(sales.createdAt, toDate));
      if (status === "PAID") saleConditions.push(eq18(sales.paymentStatus, "PAID"));
      else if (status === "DELIVERED") saleConditions.push(eq18(sales.fulfillmentStatus, "DELIVERED"));
      const expensesConditions = [];
      if (fromDate) expensesConditions.push(gte4(expenses.expenseDate, fromDate));
      if (toDate) expensesConditions.push(lte4(expenses.expenseDate, toDate));
      expensesConditions.push(eq18(expenses.isFixed, false));
      const expensesPromise = Promise.all([
        db.select().from(expenses).where(expensesConditions.length > 0 ? and15(...expensesConditions) : void 0),
        db.select().from(expenses).where(and15(eq18(expenses.isFixed, true), eq18(expenses.isActive, true)))
      ]);
      const [salesList, activeProductsCount, activeCustomersCount] = await Promise.all([
        db.select({
          id: sales.id,
          series: sales.series,
          number: sales.number,
          createdAt: sales.createdAt,
          totalAmount: sales.totalAmount,
          subtotalAmount: sales.subtotalAmount,
          customerName: customers.name,
          paymentStatus: sales.paymentStatus
        }).from(sales).leftJoin(customers, eq18(sales.customerId, customers.id)).where(and15(...saleConditions)).orderBy(desc9(sales.createdAt)),
        db.select({ count: sql14`count(*)` }).from(products).where(eq18(products.isActive, true)),
        db.select({ count: sql14`count(*)` }).from(customers).where(eq18(customers.isActive, true))
      ]);
      let grossSales = 0;
      let netSales = 0;
      let productCost = 0;
      let itemsSold = 0;
      let profitAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let hasEstimatedCost = false;
      const saleIds = salesList.map((s) => s.id);
      const saleTotals = /* @__PURE__ */ new Map();
      if (saleIds.length) {
        const items = await db.select({
          saleId: saleItems.saleId,
          totalCostAtSale: saleItems.totalCostAtSale,
          profitAmount: saleItems.profitAmount,
          totalPrice: saleItems.totalPrice,
          unitCost: products.costPrice,
          quantity: saleItems.quantity
        }).from(saleItems).leftJoin(products, eq18(saleItems.productId, products.id)).where(inArray7(saleItems.saleId, saleIds));
        for (const i of items) {
          const current = saleTotals.get(i.saleId) || { cost: 0, profit: 0, qty: 0 };
          const qty = Number(i.quantity || 0);
          itemsSold += qty;
          current.qty += qty;
          let cost = 0;
          if (i.totalCostAtSale != null) {
            cost = Number(i.totalCostAtSale || 0);
          } else {
            hasEstimatedCost = true;
            cost = Number(i.unitCost || 0) * qty;
          }
          current.cost += cost;
          current.profit += i.profitAmount != null ? Number(i.profitAmount || 0) : Number(i.totalPrice || 0) - cost;
          saleTotals.set(i.saleId, current);
        }
      }
      const salesData = salesList.map((s) => {
        const saleCost = saleTotals.get(s.id)?.cost || 0;
        const saleProfit = saleTotals.get(s.id)?.profit || 0;
        const saleTotal = Number(s.totalAmount || 0);
        if (s.paymentStatus === "PAID") paidAmount += saleTotal;
        else if (s.paymentStatus === "PENDING") pendingAmount += saleTotal;
        grossSales += Number(s.subtotalAmount || 0);
        netSales += saleTotal;
        productCost += saleCost;
        profitAmount += saleProfit;
        return {
          id: s.id,
          series: s.series,
          number: s.number,
          createdAt: s.createdAt,
          customerName: s.customerName || "Consumidor Final",
          totalAmount: saleTotal,
          cost: saleCost,
          profit: saleProfit,
          marginPercent: saleTotal > 0 ? saleProfit / saleTotal * 100 : 0
        };
      });
      const [variableExpensesList, fixedExpensesList] = await expensesPromise;
      let totalExpenses = variableExpensesList.reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);
      const fromD = fromDate || /* @__PURE__ */ new Date();
      const toD = toDate || /* @__PURE__ */ new Date();
      const startYear = fromD.getFullYear();
      const startMonth = fromD.getMonth();
      const endYear = toD.getFullYear();
      const endMonth = toD.getMonth();
      const monthsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      if (monthsCount > 0) {
        for (const fe of fixedExpensesList) {
          totalExpenses += Number(fe.amountUsd || 0) * monthsCount;
        }
      }
      const grossProfit = profitAmount;
      const netProfit = grossProfit - totalExpenses;
      const grossMarginPercent = netSales > 0 ? grossProfit / netSales * 100 : 0;
      const netMarginPercent = netSales > 0 ? netProfit / netSales * 100 : 0;
      res.json({
        hasEstimatedCost,
        summary: {
          activeProducts: Number(activeProductsCount[0]?.count || 0),
          activeCustomers: Number(activeCustomersCount[0]?.count || 0),
          paidAmount,
          pendingAmount,
          grossSales,
          netSales,
          productCost,
          grossProfit,
          expenses: totalExpenses,
          netProfit,
          grossMarginPercent,
          netMarginPercent,
          salesCount: salesList.length,
          itemsSold,
          averageTicket: salesList.length > 0 ? netSales / salesList.length : 0
        },
        sales: salesData,
        expenses: [...variableExpensesList, ...fixedExpensesList]
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);
async function getProductsFinancialReportData(query) {
  const {
    dateFrom,
    dateTo,
    groupId,
    subgroupId,
    shelfId,
    q,
    onlySold,
    onlyInStock,
    onlyNegativeProfit
  } = query;
  let baseWhere = and15(eq18(products.isActive, true), isNull6(products.deletedAt));
  if (groupId)
    baseWhere = and15(baseWhere, eq18(products.groupId, groupId));
  if (subgroupId)
    baseWhere = and15(baseWhere, eq18(products.subgroupId, subgroupId));
  if (shelfId)
    baseWhere = and15(baseWhere, eq18(products.shelfId, shelfId));
  if (q) {
    const qs = q;
    baseWhere = and15(
      baseWhere,
      or4(ilike4(products.name, `%${qs}%`), ilike4(products.sku, `%${qs}%`))
    );
  }
  const allProducts = await db.select({
    productId: products.id,
    sku: products.sku,
    name: products.name,
    group: productGroups.name,
    subgroup: productSubgroups.name,
    shelf: shelves.name,
    cost: products.costPrice,
    salePriceA: products.salePriceA,
    salePriceB: products.salePriceB,
    physicalStock: stockBalances.physicalStock,
    reservedStock: stockBalances.reservedStock
  }).from(products).leftJoin(productGroups, eq18(products.groupId, productGroups.id)).leftJoin(productSubgroups, eq18(products.subgroupId, productSubgroups.id)).leftJoin(shelves, eq18(products.shelfId, shelves.id)).leftJoin(stockBalances, eq18(products.id, stockBalances.productId)).where(baseWhere).orderBy(products.name, products.sku);
  const dateWhere = [];
  if (dateFrom)
    dateWhere.push(gte4(sales.createdAt, /* @__PURE__ */ new Date(dateFrom + "T00:00:00.000Z")));
  if (dateTo)
    dateWhere.push(lte4(sales.createdAt, /* @__PURE__ */ new Date(dateTo + "T23:59:59.999Z")));
  const soldItems = await db.select({
    productId: saleItems.productId,
    qty: saleItems.quantity,
    unitPrice: saleItems.unitPrice,
    totalCostAtSale: saleItems.totalCostAtSale,
    profitAmount: saleItems.profitAmount,
    totalPrice: saleItems.totalPrice
  }).from(saleItems).innerJoin(sales, eq18(sales.id, saleItems.saleId)).where(
    and15(
      ...dateWhere,
      eq18(sales.paymentStatus, "PAID"),
      not(inArray7(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])),
      not(inArray7(sales.paymentStatus, ["REFUNDED"]))
    )
  );
  const soldMap = /* @__PURE__ */ new Map();
  soldItems.forEach((s) => {
    const cur = soldMap.get(s.productId) || {
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    };
    cur.qty += Number(s.qty);
    cur.revenue += Number(s.totalPrice);
    if (s.totalCostAtSale != null) {
      cur.cost += Number(s.totalCostAtSale);
      cur.profit += Number(s.profitAmount || 0);
    } else {
      cur.cost = -1;
      cur.profit = -1;
    }
    soldMap.set(s.productId, cur);
  });
  let data = allProducts.map((p) => {
    const sInfo = soldMap.get(p.productId) || {
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    };
    const soldQty = sInfo.qty;
    const revenue = sInfo.revenue;
    let finalCost = 0;
    let profit = 0;
    if (sInfo.cost === -1) {
      finalCost = soldQty * Number(p.cost || 0);
      profit = revenue - finalCost;
    } else {
      finalCost = sInfo.cost;
      profit = sInfo.profit;
    }
    const marginPercent = revenue > 0 ? profit / revenue * 100 : 0;
    const phys = Number(p.physicalStock) || 0;
    const resSt = Number(p.reservedStock) || 0;
    return {
      productId: p.productId,
      sku: p.sku,
      name: p.name,
      group: p.group || "-",
      subgroup: p.subgroup || "-",
      shelf: p.shelf || "-",
      soldQuantity: soldQty,
      revenue,
      cost: finalCost,
      profit,
      marginPercent,
      physicalStock: phys,
      availableStock: phys - resSt,
      costPrice: Number(p.cost || 0),
      salePriceA: Number(p.salePriceA || 0),
      salePriceB: Number(p.salePriceB || 0)
    };
  });
  if (onlySold === "true") data = data.filter((d) => d.soldQuantity > 0);
  if (onlyInStock === "true") data = data.filter((d) => d.availableStock > 0);
  if (onlyNegativeProfit === "true") data = data.filter((d) => d.profit < 0);
  const summary = data.reduce(
    (acc, curr) => {
      acc.totalProducts++;
      acc.totalSoldQuantity += curr.soldQuantity;
      acc.totalRevenue += curr.revenue;
      acc.totalCost += curr.cost;
      acc.totalProfit += curr.profit;
      return acc;
    },
    {
      totalProducts: 0,
      totalSoldQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageMarginPercent: 0
    }
  );
  if (summary.totalRevenue > 0) {
    summary.averageMarginPercent = summary.totalProfit / summary.totalRevenue * 100;
  }
  return { summary, data };
}
router15.get(
  "/products-financial",
  requirePermission("reports", "profit"),
  async (req, res) => {
    try {
      const report = await getProductsFinancialReportData(req.query);
      res.json(report);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);
router15.get(
  "/products-financial/pdf",
  requirePermission("reports", "profit"),
  async (req, res) => {
    try {
      const report = await getProductsFinancialReportData(req.query);
      const { dateFrom, dateTo, q } = req.query;
      const data = report.data;
      const summary = report.summary;
      const currencySettings = await getServerCurrencySettings();
      const money = (value) => formatServerCurrency(value, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");
      const percent = (value) => `${Number(value || 0).toFixed(1)}%`;
      const doc = new PDFDocument({
        margin: 28,
        size: currencySettings.mode === "DUAL" ? "A3" : "A4",
        layout: "landscape"
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="relatorio_financeiro_produtos.pdf"`
      );
      doc.pipe(res);
      const tableLeft = 28;
      const tableWidth = currencySettings.mode === "DUAL" ? 1135 : 785;
      const rowHeight = currencySettings.mode === "DUAL" ? 30 : 20;
      let y = 28;
      const drawTitle = () => {
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(16).text("Relat\xF3rio Financeiro de Produtos", tableLeft, y, {
          width: tableWidth,
          align: "center"
        });
        y += 24;
        doc.fillColor("#374151").font("Helvetica").fontSize(9);
        const periodo = `Per\xEDodo: ${dateFrom || "-"} at\xE9 ${dateTo || "-"}`;
        const busca = q ? ` | Busca: ${q}` : "";
        doc.text(`${periodo}${busca}`, tableLeft, y, {
          width: tableWidth,
          align: "center"
        });
        y += 18;
      };
      const drawSummary = () => {
        const cards = [
          ["Produtos", String(summary.totalProducts)],
          ["Qtd. Vendida", String(summary.totalSoldQuantity)],
          ["Faturamento", money(summary.totalRevenue)],
          ["Custo", money(summary.totalCost)],
          ["Lucro Bruto", money(summary.totalProfit)],
          ["Margem M\xE9dia", percent(summary.averageMarginPercent)]
        ];
        const cardW = tableWidth / cards.length;
        cards.forEach(([label, value], index2) => {
          const x = tableLeft + index2 * cardW;
          const cardHeight = currencySettings.mode === "DUAL" ? 46 : 34;
          doc.rect(x, y, cardW - 4, cardHeight).fillAndStroke("#f3f4f6", "#e5e7eb");
          doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text(label, x + 5, y + 6, { width: cardW - 14 });
          doc.fillColor("#111827").font("Helvetica-Bold").fontSize(currencySettings.mode === "DUAL" ? 7 : 9).text(value, x + 5, y + 18, { width: cardW - 14 });
        });
        y += currencySettings.mode === "DUAL" ? 58 : 46;
      };
      const columns = currencySettings.mode === "DUAL" ? [
        { title: "SKU", x: 30, w: 55, align: "left" },
        { title: "Produto", x: 89, w: 180, align: "left" },
        { title: "Grupo/Subgrupo", x: 273, w: 110, align: "left" },
        { title: "Qtd", x: 387, w: 35, align: "right" },
        { title: "Faturamento", x: 426, w: 105, align: "right" },
        { title: "Custo", x: 535, w: 95, align: "right" },
        { title: "Lucro", x: 634, w: 95, align: "right" },
        { title: "Margem", x: 733, w: 55, align: "right" },
        { title: "Estoque", x: 792, w: 55, align: "right" },
        { title: "C. Unit.", x: 851, w: 90, align: "right" },
        { title: "Varejo", x: 945, w: 90, align: "right" },
        { title: "Atacado", x: 1039, w: 100, align: "right" }
      ] : [
        { title: "SKU", x: 30, w: 48, align: "left" },
        { title: "Produto", x: 82, w: 142, align: "left" },
        { title: "Grupo/Subgrupo", x: 228, w: 88, align: "left" },
        { title: "Qtd", x: 320, w: 30, align: "right" },
        { title: "Faturamento", x: 354, w: 70, align: "right" },
        { title: "Custo", x: 428, w: 64, align: "right" },
        { title: "Lucro", x: 496, w: 64, align: "right" },
        { title: "Margem", x: 564, w: 44, align: "right" },
        { title: "Estoque", x: 612, w: 42, align: "right" },
        { title: "C. Unit.", x: 658, w: 46, align: "right" },
        { title: "Varejo", x: 708, w: 46, align: "right" },
        { title: "Atacado", x: 758, w: 52, align: "right" }
      ];
      const drawTableHeader = () => {
        doc.rect(tableLeft, y, tableWidth, rowHeight).fillAndStroke("#111827", "#111827");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
        columns.forEach(
          (c) => doc.text(c.title, c.x, y + 6, { width: c.w, align: c.align })
        );
        y += rowHeight;
      };
      const newPage = () => {
        doc.addPage();
        y = 28;
        drawTitle();
        drawTableHeader();
      };
      drawTitle();
      drawSummary();
      drawTableHeader();
      if (data.length === 0) {
        doc.fillColor("#374151").font("Helvetica").fontSize(10).text(
          "Nenhum produto encontrado com os filtros atuais.",
          tableLeft,
          y + 16,
          { width: tableWidth, align: "center" }
        );
      }
      data.forEach((p, index2) => {
        if (y + rowHeight > (currencySettings.mode === "DUAL" ? 780 : 560)) newPage();
        if (index2 % 2 === 0)
          doc.rect(tableLeft, y, tableWidth, rowHeight).fill("#f9fafb");
        doc.fillColor("#111827").font("Helvetica").fontSize(currencySettings.mode === "DUAL" ? 7 : 7);
        doc.text(p.sku || "-", columns[0].x, y + 6, {
          width: columns[0].w,
          ellipsis: true
        });
        doc.text(p.name || "-", columns[1].x, y + 6, {
          width: columns[1].w,
          ellipsis: true
        });
        doc.text(
          `${p.group || "-"} / ${p.subgroup || "-"}`,
          columns[2].x,
          y + 6,
          { width: columns[2].w, ellipsis: true }
        );
        doc.text(String(p.soldQuantity || 0), columns[3].x, y + 6, {
          width: columns[3].w,
          align: "right"
        });
        doc.text(money(p.revenue), columns[4].x, y + 6, {
          width: columns[4].w,
          align: "right"
        });
        doc.text(money(p.cost), columns[5].x, y + 6, {
          width: columns[5].w,
          align: "right"
        });
        doc.fillColor(Number(p.profit || 0) >= 0 ? "#065f46" : "#991b1b");
        doc.text(money(p.profit), columns[6].x, y + 6, {
          width: columns[6].w,
          align: "right"
        });
        doc.fillColor(
          Number(p.marginPercent || 0) >= 0 ? "#065f46" : "#991b1b"
        );
        doc.text(percent(p.marginPercent), columns[7].x, y + 6, {
          width: columns[7].w,
          align: "right"
        });
        doc.fillColor("#111827");
        doc.text(String(p.availableStock || 0), columns[8].x, y + 6, {
          width: columns[8].w,
          align: "right"
        });
        doc.text(money(p.costPrice), columns[9].x, y + 6, {
          width: columns[9].w,
          align: "right"
        });
        doc.text(money(p.salePriceA), columns[10].x, y + 6, {
          width: columns[10].w,
          align: "right"
        });
        doc.text(money(p.salePriceB), columns[11].x, y + 6, {
          width: columns[11].w,
          align: "right"
        });
        y += rowHeight;
      });
      doc.end();
    } catch (error) {
      console.error("Products financial PDF error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Erro ao gerar PDF do relat\xF3rio financeiro de produtos."
        });
      }
    }
  }
);
router15.get(
  "/stock-movements",
  requirePermission("reports", "stock"),
  async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(5e3, Math.max(10, Number(req.query.limit || 50)));
      const offset = (page - 1) * limit;
      const dateFrom = String(req.query.dateFrom || "").trim();
      const dateTo = String(req.query.dateTo || "").trim();
      const productId = String(req.query.productId || "").trim();
      const direction = String(req.query.direction || "ALL").trim().toUpperCase();
      const movementType = String(req.query.movementType || "").trim();
      const search = String(req.query.q || "").trim();
      const conditions = [];
      if (dateFrom) conditions.push(gte4(stockMovements.createdAt, dayStartUtc(String(dateFrom))));
      if (dateTo) conditions.push(lte4(stockMovements.createdAt, dayEndUtc(String(dateTo))));
      if (productId) conditions.push(eq18(stockMovements.productId, productId));
      if (movementType) conditions.push(eq18(stockMovements.movementType, movementType));
      if (search) {
        conditions.push(or4(
          ilike4(products.name, `%${search}%`),
          ilike4(products.sku, `%${search}%`),
          ilike4(stockMovements.reason, `%${search}%`),
          ilike4(stockMovements.notes, `%${search}%`)
        ));
      }
      if (direction === "ENTRY") {
        conditions.push(sql14`${stockMovements.afterPhysical} > ${stockMovements.beforePhysical}`);
      } else if (direction === "EXIT") {
        conditions.push(sql14`${stockMovements.afterPhysical} < ${stockMovements.beforePhysical}`);
      } else if (direction === "RESERVATION") {
        conditions.push(and15(
          sql14`${stockMovements.afterPhysical} = ${stockMovements.beforePhysical}`,
          sql14`${stockMovements.afterReserved} > ${stockMovements.beforeReserved}`
        ));
      } else if (direction === "RELEASE") {
        conditions.push(and15(
          sql14`${stockMovements.afterPhysical} = ${stockMovements.beforePhysical}`,
          sql14`${stockMovements.afterReserved} < ${stockMovements.beforeReserved}`
        ));
      } else if (direction === "ADJUSTMENT") {
        conditions.push(eq18(stockMovements.movementType, "MANUAL_ADJUSTMENT"));
      }
      const whereClause = conditions.length ? and15(...conditions) : void 0;
      const baseSelect = {
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        sku: products.sku,
        movementType: stockMovements.movementType,
        referenceId: stockMovements.referenceId,
        quantity: stockMovements.quantity,
        beforePhysical: stockMovements.beforePhysical,
        afterPhysical: stockMovements.afterPhysical,
        beforeReserved: stockMovements.beforeReserved,
        afterReserved: stockMovements.afterReserved,
        reason: stockMovements.reason,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        userName: users.name
      };
      const [rows, countRows, summaryRows, typeRows] = await Promise.all([
        db.select(baseSelect).from(stockMovements).innerJoin(products, eq18(stockMovements.productId, products.id)).leftJoin(users, eq18(stockMovements.userId, users.id)).where(whereClause).orderBy(desc9(stockMovements.createdAt)).limit(limit).offset(offset),
        db.select({ count: sql14`count(*)` }).from(stockMovements).innerJoin(products, eq18(stockMovements.productId, products.id)).where(whereClause),
        db.select({
          movements: sql14`count(*)`,
          entries: sql14`coalesce(sum(case when ${stockMovements.afterPhysical} > ${stockMovements.beforePhysical} then ${stockMovements.afterPhysical} - ${stockMovements.beforePhysical} else 0 end), 0)`,
          exits: sql14`coalesce(sum(case when ${stockMovements.afterPhysical} < ${stockMovements.beforePhysical} then ${stockMovements.beforePhysical} - ${stockMovements.afterPhysical} else 0 end), 0)`,
          reservations: sql14`coalesce(sum(case when ${stockMovements.afterReserved} > ${stockMovements.beforeReserved} then ${stockMovements.afterReserved} - ${stockMovements.beforeReserved} else 0 end), 0)`,
          releases: sql14`coalesce(sum(case when ${stockMovements.afterReserved} < ${stockMovements.beforeReserved} then ${stockMovements.beforeReserved} - ${stockMovements.afterReserved} else 0 end), 0)`
        }).from(stockMovements).innerJoin(products, eq18(stockMovements.productId, products.id)).where(whereClause),
        db.selectDistinct({ movementType: stockMovements.movementType }).from(stockMovements).orderBy(stockMovements.movementType)
      ]);
      const data = rows.map((row) => {
        const physicalDelta = Number(row.afterPhysical) - Number(row.beforePhysical);
        const reservedDelta = Number(row.afterReserved) - Number(row.beforeReserved);
        let movementDirection = "NO_CHANGE";
        if (physicalDelta > 0) movementDirection = "ENTRY";
        else if (physicalDelta < 0) movementDirection = "EXIT";
        else if (reservedDelta > 0) movementDirection = "RESERVATION";
        else if (reservedDelta < 0) movementDirection = "RELEASE";
        return { ...row, physicalDelta, reservedDelta, direction: movementDirection };
      });
      const summary = summaryRows[0] || {};
      res.json({
        data,
        page,
        limit,
        total: Number(countRows[0]?.count || 0),
        summary: {
          movements: Number(summary.movements || 0),
          entries: Number(summary.entries || 0),
          exits: Number(summary.exits || 0),
          reservations: Number(summary.reservations || 0),
          releases: Number(summary.releases || 0)
        },
        movementTypes: typeRows.map((row) => row.movementType).filter(Boolean)
      });
    } catch (error) {
      console.error("Stock movements report error:", error);
      res.status(500).json({ error: "Erro ao carregar a movimenta\xE7\xE3o de produtos." });
    }
  }
);
var reports_default = router15;

// src/server/health.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router16 } from "express";
import { eq as eq19, sql as sql15, and as and16, ne as ne2 } from "drizzle-orm";
import { v4 as uuidv49 } from "uuid";
var router16 = Router16();
router16.get("/", async (_req, res) => {
  try {
    await db.execute(sql15`select 1`);
    res.json({ status: "ok", db: "connected", time: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable", error: err.message });
  }
});
router16.post("/product-write-smoke", async (_req, res) => {
  if (process.env.VERCEL_ENV !== "preview") return res.status(404).json({ error: "Not found" });
  const rollbackMarker = `AURA_SMOKE_ROLLBACK_${Date.now()}`;
  try {
    const [group] = await db.select({ id: productGroups.id }).from(productGroups).limit(1);
    await db.transaction(async (tx) => {
      const id = uuidv49();
      await tx.insert(products).values({
        id,
        sku: `SMOKE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        name: "AURA DEPLOYMENT WRITE SMOKE",
        groupId: group?.id || null,
        salePriceA: "1.00",
        salePriceB: "1.00",
        salePriceC: "1.00",
        technicalSpecs: [{ label: "smoke", value: "ok" }],
        storeVisible: false
      });
      await tx.insert(stockBalances).values({ productId: id, physicalStock: 0, reservedStock: 0 });
      throw new Error(rollbackMarker);
    });
    return res.status(500).json({ status: "error", error: "Smoke transaction did not rollback" });
  } catch (error) {
    if (String(error?.message || "") === rollbackMarker) {
      return res.json({ status: "ok", dbWrite: "verified", rolledBack: true });
    }
    console.error("Product write smoke failed:", error);
    return res.status(500).json({ status: "error", dbWrite: "failed", error: String(error?.message || "unknown").slice(0, 300) });
  }
});
router16.get("/flow", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      paymentStatus: sales.paymentStatus,
      authorizeReason: deliveryPaymentOverrides.reason,
      authorizerUsername: users.username
    }).from(sales).leftJoin(deliveryPaymentOverrides, eq19(sales.id, deliveryPaymentOverrides.saleId)).leftJoin(users, eq19(users.id, deliveryPaymentOverrides.authorizedBy)).where(and16(
      eq19(sales.fulfillmentStatus, "DELIVERED"),
      ne2(sales.paymentStatus, "PAID")
    ));
    res.json({
      deliveredNotPaid: list,
      deliveredNotPaidCount: list.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router16.get("/db", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const userCount = await db.select({ count: sql15`count(*)` }).from(users);
    const permCount = await db.select({ count: sql15`count(*)` }).from(permissions);
    const admin = await db.select().from(users).where(eq19(users.username, "admin")).limit(1);
    let adminHasManageAdmin = false;
    let adminHasManageCustomer = false;
    let adminHasManageProduct = false;
    let adminHasManageUser = false;
    let adminHasSalesCreate = false;
    if (admin.length > 0) {
      const r_permissions = await db.select().from(rolePermissions).where(eq19(rolePermissions.roleId, admin[0].roleId));
      const perms = await db.select().from(permissions);
      const permIds = r_permissions.map((r) => r.permissionId);
      const userPerms = perms.filter((p) => permIds.includes(p.id));
      adminHasManageAdmin = userPerms.some((p) => p.module === "admin" && p.action === "manage");
      adminHasManageCustomer = userPerms.some((p) => p.module === "customer" && p.action === "manage");
      adminHasManageProduct = userPerms.some((p) => p.module === "product" && p.action === "manage");
      adminHasManageUser = userPerms.some((p) => p.module === "user" && p.action === "manage");
      adminHasSalesCreate = userPerms.some((p) => p.module === "sales" && p.action === "create");
    }
    res.json({
      status: "Ok",
      usersCount: Number(userCount[0].count),
      permissionsCount: Number(permCount[0].count),
      adminFound: admin.length > 0,
      adminHasManageAdmin,
      adminHasManageCustomer,
      adminHasManageProduct,
      adminHasManageUser,
      adminHasSalesCreate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var health_default = router16;

// src/server/archived.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router17 } from "express";
import { eq as eq20, and as and17, isNotNull as isNotNull2, ne as ne3 } from "drizzle-orm";
var router17 = Router17();
router17.use(requireAuth);
router17.use(requirePermission("admin", "manage"));
router17.get("/:type", async (req, res) => {
  try {
    const type = req.params.type;
    let list = [];
    if (type === "products") {
      list = await db.select().from(products).where(and17(eq20(products.isActive, false), isNotNull2(products.deletedAt))).orderBy(products.name, products.sku);
    } else if (type === "customers") {
      list = await db.select().from(customers).where(and17(eq20(customers.isActive, false), isNotNull2(customers.deletedAt))).orderBy(customers.name);
    } else if (type === "users") {
      const isMaster2 = String(req.user?.roleName || "").toLowerCase() === "master";
      list = await db.select().from(users).where(isMaster2 ? and17(eq20(users.isActive, false), isNotNull2(users.deletedAt)) : and17(eq20(users.isActive, false), isNotNull2(users.deletedAt), ne3(users.username, "master"))).orderBy(users.name);
    } else if (type === "groups") {
      list = await db.select().from(productGroups).where(and17(eq20(productGroups.isActive, false), isNotNull2(productGroups.deletedAt))).orderBy(productGroups.name);
    } else if (type === "subgroups") {
      list = await db.select().from(productSubgroups).where(and17(eq20(productSubgroups.isActive, false), isNotNull2(productSubgroups.deletedAt))).orderBy(productSubgroups.name);
    } else if (type === "shelves") {
      list = await db.select().from(shelves).where(and17(eq20(shelves.isActive, false), isNotNull2(shelves.deletedAt))).orderBy(shelves.name);
    } else {
      return res.status(400).json({ error: "Tipo inv\xE1lido." });
    }
    res.json({ data: list });
  } catch (err) {
    console.error("Erro em /api/archived/:type", {
      type: req.params.type,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      error: "Erro interno",
      details: process.env.NODE_ENV !== "production" ? err.message : void 0
    });
  }
});
var archived_default = router17;

// src/server/cash.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router18 } from "express";
import { eq as eq21, desc as desc10, and as and18, inArray as inArray8, notInArray as notInArray3, sql as sql16, gte as gte5, lte as lte5 } from "drizzle-orm";
init_fx();
import { v4 as uuidv410 } from "uuid";
var router18 = Router18();
router18.use(requireAuth);
function isPrivilegedRole2(roleName) {
  return ["master", "admin", "administrador", "administrator"].includes(String(roleName || "").trim().toLowerCase());
}
var cashRegisterOpenIndexReady = false;
async function ensureCashRegisterOpenIndex() {
  if (cashRegisterOpenIndexReady) return;
  await db.execute(sql16`CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_one_open_per_user ON cash_registers (user_id) WHERE status = 'OPEN'`);
  cashRegisterOpenIndexReady = true;
}
async function computeExpectedClosingUsd(tx, registerId) {
  const movs = await tx.select({ amountUsd: cashMovements.amountUsd }).from(cashMovements).where(eq21(cashMovements.cashRegisterId, registerId));
  const total = movs.reduce((acc, m) => acc + parseFloat(String(m.amountUsd || "0")), 0);
  return Math.round(total * 100) / 100;
}
router18.get("/registers/current", requirePermission("cash", "view"), async (req, res) => {
  try {
    const list = await db.select().from(cashRegisters).where(
      and18(
        eq21(cashRegisters.userId, req.user.userId),
        eq21(cashRegisters.status, "OPEN")
      )
    ).limit(1);
    res.json(list.length > 0 ? list[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.post("/registers/open", requirePermission("cash", "open"), async (req, res) => {
  try {
    await ensureCashRegisterOpenIndex();
    const { balances, openingAmountUsd, notes } = req.body;
    const rawBalances = Array.isArray(balances) ? balances : [];
    for (const b of rawBalances) {
      if (!CURRENCIES.includes(String(b?.currency))) {
        return res.status(400).json({ error: `Moeda inv\xE1lida: ${b?.currency}` });
      }
      if (!Number.isFinite(Number(b?.amount))) {
        return res.status(400).json({ error: `Valor inv\xE1lido para ${b.currency}.` });
      }
    }
    const balanceList = rawBalances.length > 0 ? rawBalances.map((b) => ({ currency: String(b.currency), amount: Number(b.amount) || 0 })).filter((b) => b.amount > 0) : Number(openingAmountUsd) > 0 ? [{ currency: "USD", amount: Number(openingAmountUsd) }] : [];
    const seenCurrencies = /* @__PURE__ */ new Set();
    for (const b of balanceList) {
      if (seenCurrencies.has(b.currency)) {
        return res.status(400).json({ error: `Moeda ${b.currency} informada mais de uma vez.` });
      }
      seenCurrencies.add(b.currency);
    }
    const existing = await db.select().from(cashRegisters).where(
      and18(
        eq21(cashRegisters.userId, req.user.userId),
        eq21(cashRegisters.status, "OPEN")
      )
    ).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Voc\xEA j\xE1 possui um caixa em aberto." });
    }
    let totalUsd = 0;
    for (const b of balanceList) totalUsd += await toUsd(b.amount, b.currency);
    totalUsd = Math.round(totalUsd * 100) / 100;
    const inserted = await db.transaction(async (tx) => {
      const insertedRegRes = await tx.insert(cashRegisters).values({
        userId: req.user.userId,
        status: "OPEN",
        openingAmountUsd: totalUsd.toFixed(2),
        notes
      }).returning();
      const reg = insertedRegRes[0];
      for (const b of balanceList) {
        await tx.insert(cashRegisterBalances).values({
          registerId: reg.id,
          currency: b.currency,
          openingAmount: b.amount.toFixed(4)
        });
      }
      if (totalUsd > 0) {
        await tx.insert(cashMovements).values({
          cashRegisterId: reg.id,
          type: "OPENING",
          amountUsd: totalUsd.toFixed(2),
          description: "Abertura de caixa",
          createdBy: req.user.userId
        });
      }
      await tx.insert(auditLogs).values({
        userId: req.user.userId,
        action: "OPEN",
        tableName: "cash_registers",
        recordId: reg.id,
        newValues: JSON.stringify({ balances: balanceList, notes })
      });
      return reg;
    });
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.post("/registers/:id/close", requirePermission("cash", "close"), async (req, res) => {
  try {
    const id = req.params.id;
    const { balances, declaredClosingAmountUsd, notes } = req.body;
    const rawDeclaredBalances = Array.isArray(balances) ? balances : [];
    for (const b of rawDeclaredBalances) {
      if (!CURRENCIES.includes(String(b?.currency))) {
        return res.status(400).json({ error: `Moeda inv\xE1lida: ${b?.currency}` });
      }
      if (!Number.isFinite(Number(b?.declaredAmount)) || Number(b?.declaredAmount) < 0) {
        return res.status(400).json({ error: `Valor declarado inv\xE1lido para ${b.currency}.` });
      }
    }
    const declaredList = rawDeclaredBalances.length > 0 ? rawDeclaredBalances.map((b) => ({ currency: String(b.currency), declaredAmount: Number(b.declaredAmount) })) : Number.isFinite(Number(declaredClosingAmountUsd)) && Number(declaredClosingAmountUsd) >= 0 ? [{ currency: "USD", declaredAmount: Number(declaredClosingAmountUsd) }] : [];
    if (declaredList.length === 0) {
      return res.status(400).json({ error: "Informe o valor declarado de pelo menos uma moeda." });
    }
    const seenCurrencies = /* @__PURE__ */ new Set();
    for (const d of declaredList) {
      if (seenCurrencies.has(d.currency)) {
        return res.status(400).json({ error: `Moeda ${d.currency} informada mais de uma vez.` });
      }
      seenCurrencies.add(d.currency);
    }
    const list = await db.select().from(cashRegisters).where(eq21(cashRegisters.id, id)).limit(1);
    if (list.length === 0) return res.status(404).json({ error: "Caixa n\xE3o encontrado" });
    if (list[0].status === "CLOSED") return res.status(400).json({ error: "Caixa j\xE1 est\xE1 fechado" });
    if (list[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) {
      return res.status(403).json({ error: "Este caixa pertence a outro operador." });
    }
    const result = await db.transaction(async (tx) => {
      const expectedTotalUsd = Math.round(await computeExpectedClosingUsd(tx, id) * 100) / 100;
      let declaredTotalUsd = 0;
      for (const d of declaredList) {
        const [existingBalance] = await tx.select().from(cashRegisterBalances).where(and18(eq21(cashRegisterBalances.registerId, id), eq21(cashRegisterBalances.currency, d.currency))).limit(1);
        const expectedForCurrency = existingBalance ? Number(existingBalance.openingAmount) : null;
        const differenceForCurrency = expectedForCurrency !== null ? Math.round((d.declaredAmount - expectedForCurrency) * 1e4) / 1e4 : null;
        if (existingBalance) {
          await tx.update(cashRegisterBalances).set({
            declaredClosingAmount: d.declaredAmount.toFixed(4),
            expectedClosingAmount: expectedForCurrency !== null ? expectedForCurrency.toFixed(4) : null,
            differenceAmount: differenceForCurrency !== null ? differenceForCurrency.toFixed(4) : null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq21(cashRegisterBalances.id, existingBalance.id));
        } else {
          await tx.insert(cashRegisterBalances).values({
            registerId: id,
            currency: d.currency,
            openingAmount: "0",
            declaredClosingAmount: d.declaredAmount.toFixed(4),
            expectedClosingAmount: null,
            differenceAmount: null
          });
        }
        declaredTotalUsd += await toUsd(d.declaredAmount, d.currency);
      }
      declaredTotalUsd = Math.round(declaredTotalUsd * 100) / 100;
      const differenceTotalUsd = Math.round((declaredTotalUsd - expectedTotalUsd) * 100) / 100;
      await tx.update(cashRegisters).set({
        status: "CLOSED",
        closedAt: /* @__PURE__ */ new Date(),
        declaredClosingAmountUsd: declaredTotalUsd.toFixed(2),
        expectedClosingAmountUsd: expectedTotalUsd.toFixed(2),
        differenceAmountUsd: differenceTotalUsd.toFixed(2),
        notes,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq21(cashRegisters.id, id));
      await tx.insert(auditLogs).values({
        userId: req.user.userId,
        action: "CLOSE",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ balances: declaredList, expectedClosingAmountUsd: expectedTotalUsd.toFixed(2), differenceAmountUsd: differenceTotalUsd.toFixed(2) })
      });
      return { expectedClosingAmountUsd: expectedTotalUsd.toFixed(2), differenceAmountUsd: differenceTotalUsd.toFixed(2) };
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.post("/registers/:id/supply", requirePermission("cash", "supply"), async (req, res) => {
  try {
    const id = req.params.id;
    const { amountUsd, description } = req.body;
    if (!amountUsd || parseFloat(amountUsd) <= 0) return res.status(400).json({ error: "Valor inv\xE1lido" });
    await db.transaction(async (tx) => {
      const reg = await tx.select().from(cashRegisters).where(eq21(cashRegisters.id, id)).limit(1);
      if (reg.length === 0 || reg[0].status === "CLOSED") throw new Error("Caixa n\xE3o encontrado ou fechado");
      if (reg[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) throw new Error("Este caixa pertence a outro operador.");
      await tx.insert(cashMovements).values({
        cashRegisterId: id,
        type: "SUPPLY",
        amountUsd,
        description: description || "Suprimento manual",
        createdBy: req.user.userId
      });
      await tx.insert(auditLogs).values({
        userId: req.user.userId,
        action: "SUPPLY",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ amountUsd, description })
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.post("/registers/:id/withdrawal", requirePermission("cash", "withdrawal"), async (req, res) => {
  try {
    const id = req.params.id;
    const { amountUsd, description } = req.body;
    if (!amountUsd || parseFloat(amountUsd) <= 0) return res.status(400).json({ error: "Valor inv\xE1lido" });
    await db.transaction(async (tx) => {
      const reg = await tx.select().from(cashRegisters).where(eq21(cashRegisters.id, id)).limit(1);
      if (reg.length === 0 || reg[0].status === "CLOSED") throw new Error("Caixa n\xE3o encontrado ou fechado");
      if (reg[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) throw new Error("Este caixa pertence a outro operador.");
      await tx.insert(cashMovements).values({
        cashRegisterId: id,
        type: "WITHDRAWAL",
        amountUsd: "-" + amountUsd,
        description: description || "Retirada/Sangria manual",
        createdBy: req.user.userId
      });
      await tx.insert(auditLogs).values({
        userId: req.user.userId,
        action: "WITHDRAWAL",
        tableName: "cash_registers",
        recordId: id,
        newValues: JSON.stringify({ amountUsd: "-" + amountUsd, description })
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/registers/:id/movements", requirePermission("cash", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: cashMovements.id,
      type: cashMovements.type,
      amountUsd: cashMovements.amountUsd,
      description: cashMovements.description,
      createdAt: cashMovements.createdAt,
      createdBy: users.name
    }).from(cashMovements).leftJoin(users, eq21(cashMovements.createdBy, users.id)).where(eq21(cashMovements.cashRegisterId, req.params.id)).orderBy(desc10(cashMovements.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/sales-pending", requirePermission("cash", "view"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 200);
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      lotStatus: sales.lotStatus,
      createdAt: sales.createdAt
    }).from(sales).leftJoin(customers, eq21(sales.customerId, customers.id)).where(
      and18(
        inArray8(sales.paymentStatus, ["PENDING", "PARTIAL"]),
        notInArray3(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])
      )
    ).orderBy(desc10(sales.createdAt)).limit(limit);
    const saleIds = list.map((s) => s.id);
    const paidBySale = /* @__PURE__ */ new Map();
    if (saleIds.length > 0) {
      const paidRows = await db.select({ saleId: payments.saleId, paid: sql16`sum(cast(${payments.amountUsd} as numeric))` }).from(payments).where(and18(inArray8(payments.saleId, saleIds), eq21(payments.status, "COMPLETED"))).groupBy(payments.saleId);
      for (const r of paidRows) if (r.saleId) paidBySale.set(r.saleId, Number(r.paid) || 0);
    }
    const enriched = list.map((s) => {
      const paid = paidBySale.get(s.id) || 0;
      const total = Number(s.totalAmount) || 0;
      return { ...s, paidAmount: Math.round(paid * 100) / 100, remainingAmount: Math.round(Math.max(0, total - paid) * 100) / 100 };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/sales-paid", requirePermission("cash", "view"), async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : null;
    const defaultLimit = dateFrom || dateTo ? 200 : 50;
    const limit = Math.min(parseInt(String(req.query.limit || String(defaultLimit)), 10) || defaultLimit, 200);
    const conditions = [
      eq21(sales.paymentStatus, "PAID"),
      notInArray3(sales.orderStatus, ["CANCELED", "CANCELLED", "RETURNED"])
    ];
    if (dateFrom) conditions.push(gte5(sales.createdAt, dayStartUtc(dateFrom)));
    if (dateTo) conditions.push(lte5(sales.createdAt, dayEndUtc(dateTo)));
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      lotStatus: sales.lotStatus,
      createdAt: sales.createdAt
      // We will join payments later to get these
    }).from(sales).leftJoin(customers, eq21(sales.customerId, customers.id)).where(and18(...conditions)).orderBy(desc10(sales.createdAt)).limit(limit);
    const saleIds = list.map((s) => s.id);
    let pmts = [];
    if (saleIds.length > 0) {
      pmts = await db.select({
        saleId: payments.saleId,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        userName: users.name
      }).from(payments).leftJoin(users, eq21(payments.receivedBy, users.id)).where(inArray8(payments.saleId, saleIds)).orderBy(desc10(payments.createdAt));
    }
    const latestBySale = /* @__PURE__ */ new Map();
    for (const p of pmts) if (p.saleId && !latestBySale.has(p.saleId)) latestBySale.set(p.saleId, p);
    const enhancedList = list.map((s) => {
      const pmt = latestBySale.get(s.id);
      return {
        ...s,
        paymentMethod: pmt?.paymentMethod,
        paymentDate: pmt?.createdAt,
        cashierName: pmt?.userName
      };
    });
    res.json(enhancedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/sales/:saleId/details", requirePermission("cash", "view"), async (req, res) => {
  try {
    const saleRows = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      customerName: customers.name,
      subtotalAmount: sales.subtotalAmount,
      ivaAmount: sales.ivaAmount,
      discountAmount: sales.discountAmount,
      totalAmount: sales.totalAmount,
      paymentStatus: sales.paymentStatus,
      fulfillmentStatus: sales.fulfillmentStatus,
      createdAt: sales.createdAt,
      observations: sales.observations
    }).from(sales).leftJoin(customers, eq21(sales.customerId, customers.id)).where(eq21(sales.id, req.params.saleId)).limit(1);
    if (!saleRows.length) return res.status(404).json({ error: "Venda n\xE3o encontrada" });
    const items = await db.select({
      id: saleItems.id,
      productName: products.name,
      sku: products.sku,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      ivaAmount: saleItems.ivaAmount,
      totalPrice: saleItems.totalPrice
    }).from(saleItems).leftJoin(products, eq21(saleItems.productId, products.id)).where(eq21(saleItems.saleId, req.params.saleId));
    const itemIds = items.map((item) => item.id);
    const lots = itemIds.length ? await db.select({ saleItemId: saleItemLots.saleItemId, lotNumber: saleItemLots.lotNumber, quantity: saleItemLots.quantity }).from(saleItemLots).where(inArray8(saleItemLots.saleItemId, itemIds)) : [];
    const itemsWithLots = items.map((item) => ({
      ...item,
      lots: lots.filter((lot) => lot.saleItemId === item.id).map((lot) => ({ lotNumber: lot.lotNumber, quantity: lot.quantity }))
    }));
    res.json({ sale: saleRows[0], items: itemsWithLots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/sales/:saleId/payments", requirePermission("cash", "view"), async (req, res) => {
  try {
    const list = await db.select().from(payments).where(and18(eq21(payments.saleId, req.params.saleId), eq21(payments.status, "COMPLETED"))).orderBy(payments.createdAt);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var ALLOWED_PAYMENT_METHODS = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"];
var ALLOWED_PAYMENT_CURRENCIES = ["USD", "BRL", "USDT"];
router18.post("/sales/:saleId/payments", requirePermission("cash", "receive_payment"), async (req, res) => {
  try {
    const saleId = req.params.saleId;
    const { cashRegisterId, paymentMethod, currency, amount, exchangeRate, notes, accountId } = req.body;
    if (!ALLOWED_PAYMENT_METHODS.includes(String(paymentMethod))) {
      return res.status(400).json({ error: "Forma de pagamento inv\xE1lida." });
    }
    const payCurrency = ALLOWED_PAYMENT_CURRENCIES.includes(String(currency)) ? String(currency) : "USD";
    const amountNum = Number(amount);
    const rateNum = Number(exchangeRate);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "Valor do pagamento deve ser maior que zero." });
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      return res.status(400).json({ error: "Taxa de c\xE2mbio inv\xE1lida." });
    }
    const saleInfo = await db.select().from(sales).where(eq21(sales.id, saleId)).limit(1);
    if (saleInfo.length === 0) return res.status(404).json({ error: "Venda n\xE3o encontrada" });
    if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleInfo[0].orderStatus)) || saleInfo[0].paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Venda cancelada/devolvida n\xE3o aceita pagamento." });
    }
    const regInfo = await db.select().from(cashRegisters).where(eq21(cashRegisters.id, cashRegisterId)).limit(1);
    if (regInfo.length === 0 || regInfo[0].status === "CLOSED") return res.status(400).json({ error: "Caixa inv\xE1lido ou fechado" });
    if (regInfo[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) {
      return res.status(403).json({ error: "Este caixa pertence a outro operador." });
    }
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(sales).where(eq21(sales.id, saleId)).limit(1).for("update");
      if (!locked) throw new Error("Venda n\xE3o encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(locked.orderStatus)) || locked.paymentStatus === "REFUNDED") {
        throw new Error("Venda cancelada/devolvida n\xE3o aceita pagamento.");
      }
      const priorPayments = await tx.select().from(payments).where(and18(eq21(payments.saleId, saleId), eq21(payments.status, "COMPLETED")));
      const alreadyPaidUsd = priorPayments.reduce((acc, curr) => acc + parseFloat(String(curr.amountUsd)), 0);
      const saleTotal = parseFloat(String(locked.totalAmount));
      const remaining = Math.max(0, saleTotal - alreadyPaidUsd);
      if (remaining <= MONEY_EPSILON) {
        throw new Error("Esta venda j\xE1 est\xE1 totalmente paga.");
      }
      const rawUsd = amountNum / rateNum;
      const appliedUsd = Math.min(Math.round(rawUsd * 100) / 100, remaining);
      if (appliedUsd <= 0) {
        throw new Error("Valor convertido do pagamento \xE9 zero.");
      }
      const appliedUsdStr = appliedUsd.toFixed(2);
      const insertedPaymentRes = await tx.insert(payments).values({
        saleId,
        cashRegisterId,
        paymentMethod,
        currency: payCurrency,
        amount: String(amountNum),
        exchangeRate: String(rateNum),
        amountUsd: appliedUsdStr,
        status: "COMPLETED",
        receivedBy: req.user.userId,
        notes
      }).returning();
      const pmt = insertedPaymentRes[0];
      if (paymentMethod === "CASH") {
        await tx.insert(cashMovements).values({
          cashRegisterId,
          type: "SALE_PAYMENT",
          amountUsd: appliedUsdStr,
          description: `Pgt venda ${locked.series}-${locked.number}`,
          referenceId: pmt.id,
          createdBy: req.user.userId
        });
      }
      const routed = await routePayment(tx, paymentMethod, appliedUsd, {
        saleId,
        saleLabel: `Venda ${locked.series}-${String(locked.number).padStart(6, "0")}`,
        userId: req.user.userId,
        accountId: accountId || null,
        sourceCurrency: String(locked.currency || "BRL")
      });
      if (!routed) {
        throw new Error(`Nenhuma conta configurada para ${paymentMethod} \u2014 mapeie em Financeiro > Mapear Contas antes de receber.`);
      }
      const totalPaidUsd = alreadyPaidUsd + appliedUsd;
      let newStatus = "PARTIAL";
      if (totalPaidUsd >= saleTotal - MONEY_EPSILON) {
        newStatus = "PAID";
      }
      let orderStatusUpdate = {};
      if (newStatus === "PAID" && locked.fulfillmentStatus === "DELIVERED") {
        orderStatusUpdate = { orderStatus: "COMPLETED" };
      }
      await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq21(sales.id, saleId));
      await syncStoreOrderFromSale(tx, saleId, req.user.userId);
      await tx.insert(auditLogs).values({
        id: uuidv410(),
        userId: req.user.userId,
        action: "RECEIVE_PAYMENT",
        tableName: "sales",
        recordId: saleId,
        newValues: JSON.stringify({ paymentId: pmt.id, amountUsd: appliedUsdStr, newStatus, ...orderStatusUpdate })
      });
      return { appliedUsd: appliedUsdStr, newStatus };
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router18.post("/sales/:saleId/payments/split", requirePermission("cash", "receive_payment"), async (req, res) => {
  try {
    const saleId = req.params.saleId;
    const { cashRegisterId, lines, notes } = req.body || {};
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: "Informe as formas de pagamento." });
    const saleInfo = await db.select().from(sales).where(eq21(sales.id, saleId)).limit(1);
    if (saleInfo.length === 0) return res.status(404).json({ error: "Venda n\xE3o encontrada" });
    if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(saleInfo[0].orderStatus)) || saleInfo[0].paymentStatus === "REFUNDED") {
      return res.status(400).json({ error: "Venda cancelada/devolvida n\xE3o aceita pagamento." });
    }
    const regInfo = await db.select().from(cashRegisters).where(eq21(cashRegisters.id, cashRegisterId)).limit(1);
    if (regInfo.length === 0 || regInfo[0].status === "CLOSED") return res.status(400).json({ error: "Caixa inv\xE1lido ou fechado" });
    if (regInfo[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) return res.status(403).json({ error: "Este caixa pertence a outro operador." });
    const saleLabel = `Venda ${saleInfo[0].series}-${String(saleInfo[0].number).padStart(6, "0")}`;
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(sales).where(eq21(sales.id, saleId)).limit(1).for("update");
      if (!locked) throw new Error("Venda n\xE3o encontrada.");
      if (["CANCELED", "CANCELLED", "RETURNED"].includes(String(locked.orderStatus)) || locked.paymentStatus === "REFUNDED") {
        throw new Error("Venda cancelada/devolvida n\xE3o aceita pagamento.");
      }
      if (String(locked.currency || "BRL") !== "BRL") {
        throw new Error("Pagamento dividido s\xF3 est\xE1 dispon\xEDvel pra vendas em R$. Para vendas em outra moeda, use pagamento \xFAnico com o c\xE2mbio informado.");
      }
      const prior = await tx.select().from(payments).where(and18(eq21(payments.saleId, saleId), eq21(payments.status, "COMPLETED")));
      const alreadyPaid = prior.reduce((a, p) => a + parseFloat(String(p.amountUsd)), 0);
      const saleTotal = parseFloat(String(locked.totalAmount));
      let remaining = Math.max(0, saleTotal - alreadyPaid);
      let appliedTotal = 0;
      for (const line of lines) {
        if (remaining <= MONEY_EPSILON) break;
        const method = String(line.method || "");
        if (!ALLOWED_PAYMENT_METHODS.includes(method)) throw new Error("Forma de pagamento inv\xE1lida na divis\xE3o.");
        const amt = Number(line.amount);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        const applied = Math.min(Math.round(amt * 100) / 100, remaining);
        if (applied <= 0) continue;
        const appliedStr = applied.toFixed(2);
        const [pmt] = await tx.insert(payments).values({
          saleId,
          cashRegisterId,
          paymentMethod: method,
          currency: "BRL",
          amount: String(amt),
          exchangeRate: "1",
          amountUsd: appliedStr,
          status: "COMPLETED",
          receivedBy: req.user.userId,
          notes
        }).returning();
        if (method === "CASH") {
          await tx.insert(cashMovements).values({ cashRegisterId, type: "SALE_PAYMENT", amountUsd: appliedStr, description: `Pgt ${saleLabel} (dinheiro)`, referenceId: pmt.id, createdBy: req.user.userId });
        }
        const routed = await routePayment(tx, method, applied, { saleId, saleLabel, userId: req.user.userId, accountId: line.accountId || null, sourceCurrency: "BRL" });
        if (!routed) throw new Error(`Nenhuma conta configurada para ${method} \u2014 mapeie em Financeiro > Mapear Contas antes de receber.`);
        remaining = Math.round((remaining - applied) * 100) / 100;
        appliedTotal = Math.round((appliedTotal + applied) * 100) / 100;
      }
      const totalPaid = alreadyPaid + appliedTotal;
      const newStatus = totalPaid >= saleTotal - MONEY_EPSILON ? "PAID" : "PARTIAL";
      const orderStatusUpdate = newStatus === "PAID" && locked.fulfillmentStatus === "DELIVERED" ? { orderStatus: "COMPLETED" } : {};
      await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq21(sales.id, saleId));
      await syncStoreOrderFromSale(tx, saleId, req.user.userId);
      await tx.insert(auditLogs).values({ id: uuidv410(), userId: req.user.userId, action: "RECEIVE_PAYMENT_SPLIT", tableName: "sales", recordId: saleId, newValues: JSON.stringify({ appliedTotal, newStatus, lines: lines.length }) });
      return { appliedTotal, newStatus };
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router18.post("/misc-receipt", requirePermission("cash", "receive_payment"), async (req, res) => {
  try {
    const { cashRegisterId, method, amount, accountId, description } = req.body || {};
    if (!ALLOWED_PAYMENT_METHODS.includes(String(method))) return res.status(400).json({ error: "Forma de pagamento inv\xE1lida." });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });
    const desc24 = String(description || "Recebimento avulso").trim() || "Recebimento avulso";
    await db.transaction(async (tx) => {
      if (method === "CASH" && cashRegisterId) {
        const reg = await tx.select().from(cashRegisters).where(eq21(cashRegisters.id, cashRegisterId)).limit(1);
        if (reg.length && reg[0].status === "OPEN") {
          if (reg[0].userId !== req.user.userId && !isPrivilegedRole2(req.user.roleName)) {
            throw new Error("Este caixa pertence a outro operador.");
          }
          await tx.insert(cashMovements).values({ cashRegisterId, type: "SUPPLY", amountUsd: amt.toFixed(2), description: `Avulso: ${desc24}`, createdBy: req.user.userId });
        }
      }
      const companyRows = await tx.select({ defaultCurrency: companySettings.defaultCurrency }).from(companySettings).limit(1);
      const miscCurrency = companyRows[0]?.defaultCurrency === "BRL" ? "BRL" : "USD";
      const routed = await routePayment(tx, method, amt, { saleLabel: `Avulso: ${desc24}`, userId: req.user.userId, accountId: accountId || null, sourceCurrency: miscCurrency });
      if (!routed) throw new Error(`Nenhuma conta configurada para ${method} \u2014 mapeie em Financeiro > Mapear Contas antes de receber.`);
      await tx.insert(auditLogs).values({ id: uuidv410(), userId: req.user.userId, action: "MISC_RECEIPT", tableName: "financial_accounts", recordId: accountId || "-", newValues: JSON.stringify({ method, amount: amt, description: desc24 }) });
    });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router18.get("/registers/history", requirePermission("cash", "view"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const rows = await db.select({
      id: cashRegisters.id,
      openedAt: cashRegisters.openedAt,
      closedAt: cashRegisters.closedAt,
      openingAmountUsd: cashRegisters.openingAmountUsd,
      declaredClosingAmountUsd: cashRegisters.declaredClosingAmountUsd,
      expectedClosingAmountUsd: cashRegisters.expectedClosingAmountUsd,
      differenceAmountUsd: cashRegisters.differenceAmountUsd,
      notes: cashRegisters.notes,
      userName: users.name
    }).from(cashRegisters).leftJoin(users, eq21(cashRegisters.userId, users.id)).where(eq21(cashRegisters.status, "CLOSED")).orderBy(desc10(cashRegisters.closedAt)).limit(limit);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router18.get("/registers/:id/report", requirePermission("cash", "view"), async (req, res) => {
  try {
    const regRows = await db.select().from(cashRegisters).leftJoin(users, eq21(cashRegisters.userId, users.id)).where(eq21(cashRegisters.id, req.params.id)).limit(1);
    if (!regRows.length) return res.status(404).json({ error: "Caixa n\xE3o encontrado." });
    const reg = regRows[0].cash_registers;
    const userName = regRows[0].users?.name;
    const movs = await db.select().from(cashMovements).where(eq21(cashMovements.cashRegisterId, req.params.id)).orderBy(cashMovements.createdAt);
    const sum = (type) => movs.filter((m) => m.type === type).reduce((a, m) => a + parseFloat(String(m.amountUsd)), 0);
    res.json({
      register: { ...reg, userName },
      summary: {
        opening: Number(reg.openingAmountUsd || 0),
        salesCash: Math.round(sum("SALE_PAYMENT") * 100) / 100,
        supplies: Math.round(sum("SUPPLY") * 100) / 100,
        withdrawals: Math.round(sum("WITHDRAWAL") * 100) / 100,
        refunds: Math.round(sum("REFUND") * 100) / 100,
        expected: Number(reg.expectedClosingAmountUsd || 0),
        declared: Number(reg.declaredClosingAmountUsd || 0),
        difference: Number(reg.differenceAmountUsd || 0)
      },
      movements: movs.map((m) => ({ type: m.type, amountUsd: m.amountUsd, description: m.description, createdAt: m.createdAt }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var cash_default = router18;

// src/server/separation.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router19 } from "express";
import { eq as eq22, and as and19, desc as desc11, inArray as inArray9 } from "drizzle-orm";
import { v4 as uuidv411 } from "uuid";
var router19 = Router19();
router19.use(requireAuth);
router19.get("/queue", requirePermission("separation", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      createdAt: sales.createdAt
    }).from(sales).where(inArray9(sales.fulfillmentStatus, ["PENDING", "SEPARATING"])).orderBy(desc11(sales.createdAt)).limit(100);
    let tasks = [];
    if (list.length > 0) {
      tasks = await db.select().from(separationTasks).where(inArray9(separationTasks.saleId, list.map((s) => s.id)));
    }
    const taskBySaleId = new Map(tasks.map((task) => [task.saleId, task]));
    const enriched = list.map((s) => {
      const task = taskBySaleId.get(s.id);
      return {
        ...s,
        taskId: task?.id,
        taskStatus: task?.status,
        assignedTo: task?.assignedTo
      };
    }).filter((s) => s.fulfillmentStatus === "SEPARATING" || s.fulfillmentStatus === "PENDING" && !s.taskId);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.post("/sales/:saleId/start", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user.userId;
    const existing = await db.select().from(separationTasks).where(eq22(separationTasks.saleId, saleId)).limit(1);
    let taskId = "";
    if (existing.length > 0) {
      taskId = existing[0].id;
    } else {
      taskId = uuidv411();
      await db.transaction(async (tx) => {
        await tx.insert(separationTasks).values({
          id: taskId,
          saleId,
          assignedTo: userId,
          status: "IN_PROGRESS",
          startedAt: /* @__PURE__ */ new Date()
        });
        const items = await tx.select().from(saleItems).where(eq22(saleItems.saleId, saleId));
        if (items.length > 0) {
          await tx.insert(separationItems).values(items.map((item) => ({
            id: uuidv411(),
            separationTaskId: taskId,
            saleItemId: item.id,
            productId: item.productId,
            quantityExpected: item.quantity,
            quantitySeparated: 0,
            status: "PENDING"
          })));
        }
        await tx.update(sales).set({ fulfillmentStatus: "SEPARATING" }).where(eq22(sales.id, saleId));
      });
    }
    res.json({ taskId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.get("/tasks/:taskId", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.select().from(separationTasks).where(eq22(separationTasks.id, taskId)).limit(1);
    if (task.length === 0) return res.status(404).json({ error: "Task not found" });
    const items = await db.select({
      id: separationItems.id,
      saleItemId: separationItems.saleItemId,
      productId: separationItems.productId,
      quantityExpected: separationItems.quantityExpected,
      quantitySeparated: separationItems.quantitySeparated,
      status: separationItems.status,
      productName: products.name,
      sku: products.sku,
      upc: products.upc,
      shelfName: shelves.name
    }).from(separationItems).leftJoin(products, eq22(separationItems.productId, products.id)).leftJoin(shelves, eq22(products.shelfId, shelves.id)).where(eq22(separationItems.separationTaskId, taskId));
    res.json({ ...task[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.post("/tasks/:taskId/items/:itemId/confirm", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity } = req.body;
    await db.update(separationItems).set({
      quantitySeparated: quantity,
      status: "SEPARATED",
      checkedBy: req.user.userId,
      checkedAt: /* @__PURE__ */ new Date()
    }).where(and19(eq22(separationItems.id, itemId), eq22(separationItems.separationTaskId, taskId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.post("/tasks/:taskId/items/:itemId/divergence", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity, notes } = req.body;
    await db.update(separationItems).set({
      quantitySeparated: quantity,
      status: "DIVERGENT",
      checkedBy: req.user.userId,
      checkedAt: /* @__PURE__ */ new Date(),
      notes
    }).where(and19(eq22(separationItems.id, itemId), eq22(separationItems.separationTaskId, taskId)));
    await db.update(separationTasks).set({ status: "DIVERGENT" }).where(eq22(separationTasks.id, taskId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.post("/tasks/:taskId/cancel", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.select().from(separationTasks).where(eq22(separationTasks.id, taskId)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ error: "Separa\xE7\xE3o n\xE3o encontrada." });
    }
    if (["COMPLETED"].includes(task[0].status)) {
      return res.status(400).json({ error: "Separa\xE7\xE3o j\xE1 finalizada n\xE3o pode ser cancelada por aqui." });
    }
    await db.transaction(async (tx) => {
      await tx.delete(separationItems).where(eq22(separationItems.separationTaskId, taskId));
      await tx.delete(separationTasks).where(eq22(separationTasks.id, taskId));
      await tx.update(sales).set({ fulfillmentStatus: "PENDING" }).where(and19(eq22(sales.id, task[0].saleId), eq22(sales.fulfillmentStatus, "SEPARATING")));
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router19.post("/tasks/:taskId/complete", requirePermission("separation", "process"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const items = await db.select().from(separationItems).where(eq22(separationItems.separationTaskId, taskId));
    const hasPending = items.some((i) => i.status === "PENDING");
    if (hasPending) {
      return res.status(400).json({ error: "Cannot complete task with PENDING items." });
    }
    const hasDivergent = items.some((i) => i.status === "DIVERGENT");
    await db.transaction(async (tx) => {
      const taskStatus = hasDivergent ? "DIVERGENT" : "COMPLETED";
      await tx.update(separationTasks).set({
        status: taskStatus,
        completedAt: /* @__PURE__ */ new Date()
      }).where(eq22(separationTasks.id, taskId));
      const task = await tx.select().from(separationTasks).where(eq22(separationTasks.id, taskId)).limit(1);
      await tx.update(sales).set({ fulfillmentStatus: "SEPARATED" }).where(eq22(sales.id, task[0].saleId));
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/delivery.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router20 } from "express";
import { eq as eq23, and as and20, desc as desc12, inArray as inArray10 } from "drizzle-orm";
import { v4 as uuidv412 } from "uuid";
import bcrypt5 from "bcryptjs";
var router20 = Router20();
router20.use(requireAuth);
async function assertSalePaidOrOverrideForDelivery(saleId) {
  const s = await db.select({
    id: sales.id,
    paymentStatus: sales.paymentStatus
  }).from(sales).where(eq23(sales.id, saleId)).limit(1);
  if (s.length === 0) {
    throw new Error("Venda n\xE3o encontrada.");
  }
  if (s[0].paymentStatus !== "PAID") {
    const override = await db.select().from(deliveryPaymentOverrides).where(eq23(deliveryPaymentOverrides.saleId, saleId)).limit(1);
    if (override.length === 0) {
      const err = new Error("A entrega s\xF3 pode ser iniciada ap\xF3s pagamento ou autoriza\xE7\xE3o administrativa.");
      err.statusCode = 400;
      throw err;
    }
  }
  return s[0];
}
router20.get("/queue", requirePermission("delivery", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: sales.id,
      series: sales.series,
      number: sales.number,
      fulfillmentStatus: sales.fulfillmentStatus,
      paymentStatus: sales.paymentStatus,
      createdAt: sales.createdAt,
      customerName: customers.name
    }).from(sales).leftJoin(customers, eq23(sales.customerId, customers.id)).where(
      inArray10(sales.fulfillmentStatus, ["PENDING", "SEPARATED", "DELIVERING"])
    ).orderBy(desc12(sales.createdAt)).limit(100);
    const saleIds = list.map((s) => s.id);
    const [overrides, tasks] = saleIds.length > 0 ? await Promise.all([
      db.select().from(deliveryPaymentOverrides).where(inArray10(deliveryPaymentOverrides.saleId, saleIds)),
      db.select().from(deliveryTasks).where(inArray10(deliveryTasks.saleId, saleIds))
    ]) : [[], []];
    const taskBySaleId = new Map(tasks.map((task) => [task.saleId, task]));
    const overrideSaleIds = new Set(overrides.map((override) => override.saleId));
    const enriched = list.map((s) => {
      const task = taskBySaleId.get(s.id);
      const isPaid = s.paymentStatus === "PAID";
      const hasOverride = overrideSaleIds.has(s.id);
      return {
        ...s,
        taskId: task?.id,
        taskStatus: task?.status,
        assignedTo: task?.assignedTo,
        paymentBlocked: !isPaid && !hasOverride,
        blockReason: !isPaid && !hasOverride ? "Aguardando pagamento para entrega" : void 0
      };
    }).filter((s) => s.fulfillmentStatus !== "SEPARATING");
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router20.post("/sales/:saleId/start", requirePermission("delivery", "process"), async (req, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user.userId;
    await assertSalePaidOrOverrideForDelivery(saleId);
    const existing = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.saleId, saleId)).limit(1);
    let taskId = "";
    if (existing.length > 0) {
      taskId = existing[0].id;
    } else {
      taskId = uuidv412();
      await db.transaction(async (tx) => {
        await tx.insert(deliveryTasks).values({
          id: taskId,
          saleId,
          assignedTo: userId,
          status: "IN_PROGRESS",
          startedAt: /* @__PURE__ */ new Date()
        });
        const items = await tx.select().from(saleItems).where(eq23(saleItems.saleId, saleId));
        if (items.length > 0) {
          await tx.insert(deliveryItems).values(items.map((item) => ({
            id: uuidv412(),
            deliveryTaskId: taskId,
            saleItemId: item.id,
            productId: item.productId,
            quantityExpected: item.quantity,
            quantityDelivered: 0,
            status: "PENDING"
          })));
        }
        await tx.update(sales).set({ fulfillmentStatus: "DELIVERING" }).where(eq23(sales.id, saleId));
      });
    }
    res.json({ taskId });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
router20.post("/sales/:saleId/skip-separation", requirePermission("separation", "skip"), async (req, res) => {
  try {
    const { saleId } = req.params;
    await assertSalePaidOrOverrideForDelivery(saleId);
    const s = await db.select().from(sales).where(eq23(sales.id, saleId)).limit(1);
    if (s.length > 0 && s[0].fulfillmentStatus === "PENDING") {
      const existing = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.saleId, saleId)).limit(1);
      if (existing.length === 0) {
        const taskId = uuidv412();
        await db.transaction(async (tx) => {
          await tx.insert(deliveryTasks).values({
            id: taskId,
            saleId,
            status: "PENDING"
          });
          const items = await tx.select().from(saleItems).where(eq23(saleItems.saleId, saleId));
          if (items.length > 0) {
            await tx.insert(deliveryItems).values(items.map((item) => ({
              id: uuidv412(),
              deliveryTaskId: taskId,
              saleItemId: item.id,
              productId: item.productId,
              quantityExpected: item.quantity,
              quantityDelivered: 0,
              status: "PENDING"
            })));
          }
        });
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "N\xE3o \xE9 poss\xEDvel pular separa\xE7\xE3o para esta venda." });
    }
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
router20.get("/tasks/:taskId", requirePermission("delivery", "process"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.id, taskId)).limit(1);
    if (task.length === 0) return res.status(404).json({ error: "Task not found" });
    const items = await db.select({
      id: deliveryItems.id,
      saleItemId: deliveryItems.saleItemId,
      productId: deliveryItems.productId,
      quantityExpected: deliveryItems.quantityExpected,
      quantityDelivered: deliveryItems.quantityDelivered,
      status: deliveryItems.status,
      productName: products.name,
      sku: products.sku,
      upc: products.upc,
      hasSerialNumber: products.hasSerialNumber,
      shelfName: shelves.name
    }).from(deliveryItems).leftJoin(products, eq23(deliveryItems.productId, products.id)).leftJoin(shelves, eq23(products.shelfId, shelves.id)).where(eq23(deliveryItems.deliveryTaskId, taskId));
    const allItemsIds = items.map((i) => i.id);
    let serials = [];
    if (allItemsIds.length > 0) {
      serials = await db.select().from(deliverySerials).where(inArray10(deliverySerials.deliveryItemId, allItemsIds));
    }
    res.json({ ...task[0], items: items.map((i) => ({ ...i, scannedSerials: serials.filter((s) => s.deliveryItemId === i.id) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router20.post("/tasks/:taskId/items/:itemId/confirm", requirePermission("delivery", "process"), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { quantity } = req.body;
    const task = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.id, taskId)).limit(1);
    if (task.length > 0) {
      await assertSalePaidOrOverrideForDelivery(task[0].saleId);
    }
    const dItem = await db.select().from(deliveryItems).where(eq23(deliveryItems.id, itemId)).limit(1);
    const prod = await db.select().from(products).where(eq23(products.id, dItem[0].productId)).limit(1);
    if (prod[0].hasSerialNumber) {
      return res.status(400).json({ error: "Este produto exige leitura de n\xFAmero de s\xE9rie." });
    }
    await db.update(deliveryItems).set({
      quantityDelivered: quantity,
      status: "DELIVERED",
      checkedBy: req.user.userId,
      checkedAt: /* @__PURE__ */ new Date()
    }).where(and20(eq23(deliveryItems.id, itemId), eq23(deliveryItems.deliveryTaskId, taskId)));
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
router20.post("/tasks/:taskId/items/:itemId/scan-serial", requirePermission("delivery", "scan_serial"), async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { serialNumber } = req.body;
    const task = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.id, taskId)).limit(1);
    if (task.length > 0) {
      await assertSalePaidOrOverrideForDelivery(task[0].saleId);
    }
    const dItem = await db.select().from(deliveryItems).where(eq23(deliveryItems.id, itemId)).limit(1);
    if (dItem.length === 0) return res.status(404).json({ error: "Item not found" });
    await db.transaction(async (tx) => {
      const s = await tx.select().from(productSerials).where(and20(eq23(productSerials.productId, dItem[0].productId), eq23(productSerials.serialNumber, serialNumber))).for("update").limit(1);
      if (s.length === 0) throw Object.assign(new Error("N\xFAmero de s\xE9rie n\xE3o encontrado no sistema."), { statusCode: 400 });
      if (s[0].status !== "AVAILABLE") throw Object.assign(new Error("N\xFAmero de s\xE9rie n\xE3o est\xE1 dispon\xEDvel (j\xE1 vendido ou reservado)."), { statusCode: 400 });
      const alreadyScanned = await tx.select().from(deliverySerials).where(and20(
        eq23(deliverySerials.productId, dItem[0].productId),
        eq23(deliverySerials.serialNumber, serialNumber)
      )).limit(1);
      if (alreadyScanned.length > 0) {
        const msg = alreadyScanned[0].deliveryItemId === itemId ? "N\xFAmero de s\xE9rie j\xE1 lido para este item." : "N\xFAmero de s\xE9rie j\xE1 foi lido em outra entrega.";
        throw Object.assign(new Error(msg), { statusCode: 400 });
      }
      await tx.insert(deliverySerials).values({
        id: uuidv412(),
        deliveryItemId: itemId,
        productId: dItem[0].productId,
        saleItemId: dItem[0].saleItemId,
        serialNumber,
        scannedBy: req.user.userId
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
router20.post("/sales/:saleId/authorize-unpaid", requirePermission("delivery", "view"), async (req, res) => {
  try {
    const { saleId } = req.params;
    const { adminUsername, adminPassword, reason } = req.body;
    if (!adminUsername || !adminPassword || !reason) {
      return res.status(400).json({ error: "Usu\xE1rio, senha e motivo s\xE3o obrigat\xF3rios." });
    }
    const adminUser = await db.select({
      id: users.id,
      passwordHash: users.passwordHash,
      roleName: roles.name
    }).from(users).leftJoin(roles, eq23(users.roleId, roles.id)).where(eq23(users.username, adminUsername)).limit(1);
    if (adminUser.length === 0) {
      return res.status(401).json({ error: "Credenciais de autoriza\xE7\xE3o inv\xE1lidas." });
    }
    const isValid = await bcrypt5.compare(adminPassword, adminUser[0].passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais de autoriza\xE7\xE3o inv\xE1lidas." });
    }
    if (adminUser[0].roleName?.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Este login n\xE3o tem permiss\xE3o para autorizar a entrega sem pagamento." });
    }
    await db.transaction(async (tx) => {
      await tx.insert(deliveryPaymentOverrides).values({
        saleId,
        authorizedBy: adminUser[0].id,
        reason,
        createdBy: req.user.userId
      });
      await tx.insert(auditLogs).values({
        id: uuidv412(),
        userId: req.user.userId,
        action: "AUTHORIZE_UNPAID_DELIVERY",
        tableName: "sales",
        recordId: saleId,
        newValues: JSON.stringify({ adminId: adminUser[0].id, reason })
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router20.post("/tasks/:taskId/complete", requirePermission("delivery", "complete"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskDetails = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.id, taskId)).limit(1);
    if (taskDetails.length > 0) {
      await assertSalePaidOrOverrideForDelivery(taskDetails[0].saleId);
    }
    const items = await db.select().from(deliveryItems).where(eq23(deliveryItems.deliveryTaskId, taskId));
    const allItemIds = items.map((i) => i.id);
    let allScannedSerials = [];
    if (allItemIds.length > 0) {
      allScannedSerials = await db.select().from(deliverySerials).where(inArray10(deliverySerials.deliveryItemId, allItemIds));
    }
    const hasPendingOrDivergent = items.some((i) => i.status === "PENDING" || i.status === "DIVERGENT");
    if (hasPendingOrDivergent) return res.status(400).json({ error: "N\xE3o \xE9 poss\xEDvel concluir com itens pendentes ou divergentes." });
    const task = await db.select().from(deliveryTasks).where(eq23(deliveryTasks.id, taskId)).limit(1);
    const saleId = task[0].saleId;
    const s = await db.select().from(sales).where(eq23(sales.id, saleId)).limit(1);
    const orderSt = s[0].paymentStatus === "PAID" ? "COMPLETED" : s[0].orderStatus;
    await db.transaction(async (tx) => {
      for (const item of items) {
        if (item.quantityDelivered > item.quantityExpected) {
          throw new Error("Quantidade entregue n\xE3o pode ser maior que a quantidade esperada.");
        }
        if (item.quantityDelivered < item.quantityExpected) {
          throw new Error("Quantidade entregue menor que a esperada. Marque diverg\xEAncia para prosseguir.");
        }
        const prod = await tx.select().from(products).where(eq23(products.id, item.productId)).limit(1);
        if (prod[0].hasSerialNumber) {
          const scannedCount = allScannedSerials.filter((v) => v.deliveryItemId === item.id).length;
          if (item.quantityExpected !== scannedCount) {
            throw new Error(`Item ${prod[0].sku} exige ${item.quantityExpected} n\xFAmeros de s\xE9rie, mas obteve ${scannedCount}.`);
          }
          const scannedForThis = allScannedSerials.filter((v) => v.deliveryItemId === item.id);
          for (const sc of scannedForThis) {
            const sold = await tx.update(productSerials).set({ status: "SOLD", saleItemId: item.saleItemId }).where(and20(eq23(productSerials.productId, item.productId), eq23(productSerials.serialNumber, sc.serialNumber), eq23(productSerials.status, "AVAILABLE"))).returning({ id: productSerials.id });
            if (sold.length === 0) {
              throw new Error(`N\xFAmero de s\xE9rie ${sc.serialNumber} n\xE3o est\xE1 mais dispon\xEDvel \u2014 j\xE1 foi entregue em outra tarefa.`);
            }
          }
        }
        const bal = await tx.select().from(stockBalances).where(eq23(stockBalances.productId, item.productId)).for("update").limit(1);
        if (!bal[0] || bal[0].reservedStock < item.quantityDelivered) {
          throw new Error(`Estoque reservado insuficiente para o item ${prod[0].sku || item.productId}`);
        }
        await tx.update(stockBalances).set({
          physicalStock: bal[0].physicalStock - item.quantityDelivered,
          reservedStock: bal[0].reservedStock - item.quantityDelivered
        }).where(eq23(stockBalances.productId, item.productId));
        await consumeFifo(tx, item.productId, item.quantityDelivered, { saleId, reason: "SALE" });
        await tx.insert(stockMovements).values({
          id: uuidv412(),
          productId: item.productId,
          quantity: -item.quantityDelivered,
          // delivery is an outward movement
          userId: req.user.userId,
          movementType: "OUT_DELIVERY",
          referenceId: saleId,
          beforePhysical: bal[0].physicalStock,
          afterPhysical: bal[0].physicalStock - item.quantityDelivered,
          beforeReserved: bal[0].reservedStock,
          afterReserved: bal[0].reservedStock - item.quantityDelivered,
          reason: "Delivery confirmation",
          notes: "DELIVERY"
        });
      }
      await tx.update(stockReservations).set({ status: "DELIVERED" }).where(eq23(stockReservations.saleId, saleId));
      const saleLotRow = await tx.select({ lotStatus: sales.lotStatus }).from(sales).where(eq23(sales.id, saleId)).limit(1);
      if (saleLotRow[0] && ["PENDING", "PARTIAL"].includes(String(saleLotRow[0].lotStatus))) {
        throw new Error("Venda com lote obrigat\xF3rio ainda n\xE3o totalmente alocado. Complete a aloca\xE7\xE3o de lotes em Vendas Realizadas antes de entregar.");
      }
      await consumeSaleLots(tx, saleId);
      await tx.update(deliveryTasks).set({ status: "COMPLETED", completedAt: /* @__PURE__ */ new Date() }).where(eq23(deliveryTasks.id, taskId));
      await tx.update(sales).set({ fulfillmentStatus: "DELIVERED", orderStatus: orderSt }).where(eq23(sales.id, saleId));
      await tx.insert(auditLogs).values({
        id: uuidv412(),
        userId: req.user.userId,
        action: orderSt === "COMPLETED" ? "DELIVER_SALE" : "DELIVER_UNPAID_AUTHORIZED",
        tableName: "sales",
        recordId: saleId
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// src/server/serials.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router21 } from "express";
import { eq as eq24, desc as desc13, and as and21, inArray as inArray11 } from "drizzle-orm";
import { v4 as uuidv413 } from "uuid";
var router21 = Router21();
router21.use(requireAuth);
router21.get("/:productId", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { productId } = req.params;
    const list = await db.select().from(productSerials).where(eq24(productSerials.productId, productId)).orderBy(desc13(productSerials.createdAt));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router21.post("/:productId", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { productId } = req.params;
    const serialNumber = String(req.body?.serialNumber || "").trim().toUpperCase();
    if (!serialNumber) return res.status(400).json({ error: "N\xFAmero de s\xE9rie \xE9 obrigat\xF3rio." });
    const pr = await db.select().from(products).where(eq24(products.id, productId)).limit(1);
    if (pr.length === 0 || !pr[0].hasSerialNumber) return res.status(400).json({ error: "Este produto n\xE3o usa controle de n\xFAmero de s\xE9rie." });
    const ex = await db.select().from(productSerials).where(and21(eq24(productSerials.productId, productId), eq24(productSerials.serialNumber, serialNumber))).limit(1);
    if (ex.length > 0) return res.status(400).json({ error: "Serial number already registered for this product." });
    const id = uuidv413();
    await db.insert(productSerials).values({ id, productId, serialNumber, status: "AVAILABLE" });
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router21.post("/:productId/bulk", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { productId } = req.params;
    const { serialNumbers } = req.body;
    const pr = await db.select().from(products).where(eq24(products.id, productId)).limit(1);
    if (pr.length === 0 || !pr[0].hasSerialNumber) return res.status(400).json({ error: "Este produto n\xE3o usa controle de n\xFAmero de s\xE9rie." });
    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) return res.status(400).json({ error: "Lista vazia." });
    const normalized = serialNumbers.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean);
    if (normalized.length !== serialNumbers.length) return res.status(400).json({ error: "A lista cont\xE9m n\xFAmero de s\xE9rie vazio." });
    const unique2 = [...new Set(normalized)];
    if (unique2.length !== normalized.length) return res.status(400).json({ error: "N\xFAmeros de s\xE9rie duplicados na lista." });
    const existing = await db.select({ serialNumber: productSerials.serialNumber }).from(productSerials).where(and21(eq24(productSerials.productId, productId), inArray11(productSerials.serialNumber, unique2)));
    if (existing.length > 0) return res.status(409).json({ error: "Um ou mais n\xFAmeros de s\xE9rie j\xE1 constam neste produto." });
    let inserted = 0;
    for (const sn of unique2) {
      await db.insert(productSerials).values({ id: uuidv413(), productId, serialNumber: sn, status: "AVAILABLE" });
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router21.patch("/:productId/:serialId", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { channel } = req.body || {};
    if (channel !== null && channel !== "OFERTA" && channel !== "OUTLET") {
      return res.status(400).json({ error: "Canal inv\xE1lido (use null, OFERTA ou OUTLET)." });
    }
    await db.update(productSerials).set({ channel, updatedAt: /* @__PURE__ */ new Date() }).where(and21(eq24(productSerials.productId, req.params.productId), eq24(productSerials.id, req.params.serialId)));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router21.delete("/:productId/:serialId", requirePermission("product", "manage"), async (req, res) => {
  try {
    const { productId, serialId } = req.params;
    const ex = await db.select().from(productSerials).where(and21(eq24(productSerials.productId, productId), eq24(productSerials.id, serialId))).limit(1);
    if (ex.length === 0) return res.status(404).json({ error: "S/N n\xE3o encontrado." });
    if (ex[0].status !== "AVAILABLE") {
      return res.status(400).json({ error: "Apenas S/N dispon\xEDveis podem ser removidos direto do estoque." });
    }
    await db.delete(productSerials).where(eq24(productSerials.id, serialId));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// src/server/settings.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router22 } from "express";
import nodemailer from "nodemailer";
import { eq as eq26, sql as sql19 } from "drizzle-orm";
import PDFDocument2 from "pdfkit";
import multer from "multer";

// src/server/backupService.ts
init_db();
init_schema();
import fs2 from "fs";
import path2 from "path";
import zlib from "zlib";
import { promisify } from "util";
import { sql as sql18 } from "drizzle-orm";
import { eq as eq25 } from "drizzle-orm";
var gzip = promisify(zlib.gzip);
var gunzip = promisify(zlib.gunzip);
var BACKUP_SETTINGS_KEY = "backup_settings";
var defaultBackupSettings = {
  enabled: false,
  time: "02:00",
  localServer: true,
  dropbox: true,
  googleDrive: false,
  includeReports: true,
  retentionDays: 30,
  lastRunAt: null,
  lastRunStatus: "NEVER",
  lastRunMessage: "Backup autom\xE1tico preparado, mas desativado."
};
function normalizeBackupSettings(value) {
  const raw = value || {};
  const merged = { ...defaultBackupSettings, ...raw };
  const dropboxEnabled = raw.dropbox ?? raw.googleDrive ?? defaultBackupSettings.dropbox;
  return {
    ...merged,
    enabled: Boolean(merged.enabled),
    localServer: Boolean(merged.localServer),
    dropbox: Boolean(dropboxEnabled),
    googleDrive: false,
    includeReports: Boolean(merged.includeReports),
    time: String(merged.time || "02:00"),
    retentionDays: Math.max(1, Number(merged.retentionDays ?? 30)),
    lastRunAt: merged.lastRunAt ?? null,
    lastRunStatus: merged.lastRunStatus || "NEVER",
    lastRunMessage: merged.lastRunMessage || defaultBackupSettings.lastRunMessage
  };
}
function isDropboxConfigured() {
  return Boolean(process.env.DROPBOX_ACCESS_TOKEN);
}
function getDropboxFolder() {
  const configured = String(process.env.DROPBOX_BACKUP_FOLDER || "/Backups Aura Sistemas").trim();
  if (!configured || configured === "/") return "";
  const normalized = configured.startsWith("/") ? configured : `/${configured}`;
  return normalized.replace(/\/+$/g, "");
}
async function uploadToDropbox(buffer, filename) {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.");
  }
  const folder = getDropboxFolder();
  const dropboxPath = `${folder}/${filename}`.replace(/\/+/g, "/");
  const args = {
    path: dropboxPath,
    mode: "add",
    autorename: true,
    mute: false,
    strict_conflict: false
  };
  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify(args),
      "Content-Type": "application/octet-stream"
    },
    body: buffer
  });
  const text2 = await response.text();
  if (!response.ok) {
    throw new Error(`Falha ao enviar backup para Dropbox (${response.status}): ${text2.slice(0, 400)}`);
  }
  const json = text2 ? JSON.parse(text2) : {};
  return String(json.path_display || dropboxPath);
}
async function postDropboxApi(pathname, body) {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.");
  }
  return fetch(`https://api.dropboxapi.com/2/${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
function formatDropboxError(text2) {
  if (!text2) return "sem detalhes retornados pela API.";
  try {
    const json = JSON.parse(text2);
    return String(json.error_summary || json.error_description || json.error || text2).slice(0, 400);
  } catch {
    return text2.slice(0, 400);
  }
}
async function cleanupOldDropboxBackups(retentionDays) {
  const folder = getDropboxFolder();
  const cutoff = Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1e3;
  let removed = 0;
  let cursor = "";
  let hasMore = true;
  while (hasMore) {
    const response = cursor ? await postDropboxApi("files/list_folder/continue", { cursor }) : await postDropboxApi("files/list_folder", { path: folder, recursive: false, include_deleted: false });
    const text2 = await response.text();
    if (!response.ok) {
      throw new Error(`Falha ao limpar backups antigos do Dropbox (${response.status}): ${formatDropboxError(text2)}`);
    }
    const json = text2 ? JSON.parse(text2) : {};
    for (const entry of json.entries || []) {
      const name = String(entry.name || "");
      const pathLower = String(entry.path_lower || "");
      if (entry[".tag"] !== "file") continue;
      if (!/^(?:aura-sistemas|origin)-backup-.*\.json\.gz$/i.test(name)) continue;
      const modifiedAt = Date.parse(String(entry.client_modified || entry.server_modified || ""));
      if (Number.isNaN(modifiedAt) || modifiedAt >= cutoff) continue;
      const deleteResponse = await postDropboxApi("files/delete_v2", { path: pathLower });
      const deleteText = await deleteResponse.text();
      if (!deleteResponse.ok) {
        throw new Error(`Falha ao apagar backup antigo do Dropbox (${deleteResponse.status}): ${formatDropboxError(deleteText)}`);
      }
      removed += 1;
    }
    cursor = String(json.cursor || "");
    hasMore = Boolean(json.has_more && cursor);
  }
  return removed;
}
async function getBackupSettings() {
  const rows = await db.select().from(systemSettings).where(eq25(systemSettings.key, BACKUP_SETTINGS_KEY)).limit(1);
  return normalizeBackupSettings(rows[0]?.value || {});
}
async function saveBackupSettings(settings) {
  const current = await getBackupSettings();
  const normalized = normalizeBackupSettings({
    ...current,
    ...settings,
    dropbox: settings.dropbox ?? settings.googleDrive ?? current.dropbox
  });
  const rows = await db.select().from(systemSettings).where(eq25(systemSettings.key, BACKUP_SETTINGS_KEY)).limit(1);
  if (rows.length) {
    await db.update(systemSettings).set({ value: normalized, updatedAt: /* @__PURE__ */ new Date() }).where(eq25(systemSettings.key, BACKUP_SETTINGS_KEY));
  } else {
    await db.insert(systemSettings).values({ key: BACKUP_SETTINGS_KEY, value: normalized });
  }
  return normalized;
}
function backupsDir() {
  const baseDir = process.env.VERCEL ? "/tmp" : process.cwd();
  const dir = path2.join(baseDir, "backups");
  if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
  return dir;
}
async function getPublicTables() {
  const result = await db.execute(sql18`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  return rows.map((row) => row.tablename).filter(Boolean);
}
async function exportDatabaseJson() {
  const tables = await getPublicTables();
  const dump = {
    meta: {
      app: "Aura Sistemas",
      format: "origin-json-gzip-v1",
      // identificador interno de formato — nunca aparece pro usuário
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tables
    },
    tables: {}
  };
  for (const table of tables) {
    const rowsResult = await db.execute(sql18.raw(`SELECT * FROM "${table.replace(/"/g, '""')}"`));
    dump.tables[table] = Array.isArray(rowsResult) ? rowsResult : rowsResult.rows || [];
  }
  return dump;
}
async function createLocalBackupFile(prefix = "aura-sistemas-backup") {
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const filename = `${prefix}-${stamp}.json.gz`;
  const filepath = path2.join(backupsDir(), filename);
  const dump = await exportDatabaseJson();
  const compressed = await gzip(Buffer.from(JSON.stringify(dump), "utf8"));
  fs2.writeFileSync(filepath, compressed);
  return { filename, filepath, compressed };
}
function assertOriginBackupPayload(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Arquivo de backup invalido.");
  }
  const validApp = value?.meta?.app === "Aura Sistemas" || value?.meta?.app === "Origin";
  if (!validApp || value?.meta?.format !== "origin-json-gzip-v1") {
    throw new Error("Este arquivo n\xE3o parece ser um backup v\xE1lido do Aura Sistemas.");
  }
  if (!value.tables || typeof value.tables !== "object" || Array.isArray(value.tables)) {
    throw new Error("Backup sem dados de tabelas.");
  }
}
async function readBackupPayload(buffer) {
  const decompressed = await gunzip(buffer);
  const text2 = decompressed.toString("utf8");
  const payload = JSON.parse(text2);
  assertOriginBackupPayload(payload);
  return payload;
}
async function getTableDependencies(tables) {
  const result = await db.execute(sql18`
    SELECT
      source.relname AS table_name,
      target.relname AS depends_on
    FROM pg_constraint constraint_info
    JOIN pg_class source ON source.oid = constraint_info.conrelid
    JOIN pg_namespace source_schema ON source_schema.oid = source.relnamespace
    JOIN pg_class target ON target.oid = constraint_info.confrelid
    JOIN pg_namespace target_schema ON target_schema.oid = target.relnamespace
    WHERE constraint_info.contype = 'f'
      AND source_schema.nspname = 'public'
      AND target_schema.nspname = 'public'
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  const tableSet = new Set(tables);
  const dependencies = /* @__PURE__ */ new Map();
  for (const table of tables) dependencies.set(table, /* @__PURE__ */ new Set());
  for (const row of rows) {
    const tableName = String(row.table_name || "");
    const dependsOn = String(row.depends_on || "");
    if (tableSet.has(tableName) && tableSet.has(dependsOn) && tableName !== dependsOn) {
      dependencies.get(tableName)?.add(dependsOn);
    }
  }
  return dependencies;
}
async function getTableColumnTypes(tables) {
  const result = await db.execute(sql18`
    SELECT table_name, column_name, data_type, is_identity, is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY ordinal_position ASC
  `);
  const rows = Array.isArray(result) ? result : result.rows || [];
  const tableSet = new Set(tables);
  const types = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const tableName = String(row.table_name || "");
    if (!tableSet.has(tableName)) continue;
    if (row.is_generated === "ALWAYS") continue;
    if (!types.has(tableName)) types.set(tableName, /* @__PURE__ */ new Map());
    types.get(tableName)?.set(String(row.column_name || ""), {
      type: String(row.data_type || ""),
      isIdentity: row.is_identity === "YES"
    });
  }
  return types;
}
function orderTablesByDependencies(tables, dependencies) {
  const pending = new Set(tables);
  const ordered = [];
  while (pending.size) {
    const ready = [...pending].filter((table) => {
      const deps = dependencies.get(table) || /* @__PURE__ */ new Set();
      return [...deps].every((dep) => !pending.has(dep));
    });
    if (!ready.length) {
      ordered.push(...[...pending].sort());
      break;
    }
    ready.sort();
    for (const table of ready) {
      ordered.push(table);
      pending.delete(table);
    }
  }
  return ordered;
}
function normalizeRows(rows, columnTypes) {
  if (!rows.length) return rows;
  const columns = [...rows.reduce((set, row) => {
    Object.keys(row || {}).filter((key) => columnTypes.has(key)).forEach((key) => set.add(key));
    return set;
  }, /* @__PURE__ */ new Set())];
  return rows.map((row) => {
    const normalized = {};
    for (const column of columns) {
      const value = row[column] ?? null;
      const metadata = columnTypes.get(column);
      normalized[column] = normalizeRestoreValue(value, metadata?.type);
    }
    return normalized;
  });
}
function normalizeRestoreValue(value, dataType) {
  if (value === null || value === void 0) return null;
  if (dataType === "json" || dataType === "jsonb") return JSON.stringify(value);
  if (typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) return JSON.stringify(value);
  return value;
}
async function insertRestoreRows(tx, table, rows, columnTypes) {
  const columns = Object.keys(rows[0] || {});
  if (!columns.length) return;
  const hasIdentityColumn = columns.some((column) => columnTypes.get(column)?.isIdentity);
  if (!hasIdentityColumn) {
    await tx`INSERT INTO ${tx(table)} ${tx(rows, columns)}`;
    return;
  }
  const escapedColumns = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
  const escapedTable = `"${table.replace(/"/g, '""')}"`;
  const placeholders = columns.map((_, index2) => `$${index2 + 1}`).join(", ");
  const query = `INSERT INTO ${escapedTable} (${escapedColumns}) OVERRIDING SYSTEM VALUE VALUES (${placeholders})`;
  for (const row of rows) {
    await tx.unsafe(query, columns.map((column) => row[column]));
  }
}
async function restoreBackupFromBuffer(buffer, triggeredBy) {
  const payload = await readBackupPayload(buffer);
  const currentTables = await getPublicTables();
  const backupTables = Object.keys(payload.tables).filter((table) => currentTables.includes(table));
  if (!backupTables.length) {
    throw new Error("Backup nao contem tabelas restauraveis para este banco.");
  }
  const safetyBackup = await createLocalBackupFile("aura-sistemas-safety-before-restore");
  const dependencies = await getTableDependencies(backupTables);
  const tableColumnTypes = await getTableColumnTypes(backupTables);
  const orderedTables = orderTablesByDependencies(backupTables, dependencies);
  let restoredRows = 0;
  await sqlClient.begin(async (tx) => {
    for (const table of currentTables) {
      await tx`TRUNCATE TABLE ${tx(table)} RESTART IDENTITY CASCADE`;
    }
    for (const table of orderedTables) {
      const columnTypes = tableColumnTypes.get(table) || /* @__PURE__ */ new Map();
      const rows = normalizeRows(payload.tables[table] || [], columnTypes);
      if (!rows.length) continue;
      await insertRestoreRows(tx, table, rows, columnTypes);
      restoredRows += rows.length;
    }
  });
  await saveBackupSettings({
    lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastRunStatus: "SUCCESS",
    lastRunMessage: `Backup restaurado por ${triggeredBy}. Backup de seguranca atual: ${safetyBackup.filename}.`
  });
  return {
    success: true,
    restoredTables: orderedTables.length,
    restoredRows,
    safetyBackupFilename: safetyBackup.filename,
    safetyBackupPath: safetyBackup.filepath
  };
}
async function runManualBackup(triggeredBy) {
  const settings = await getBackupSettings();
  try {
    const { filename, filepath, compressed } = await createLocalBackupFile();
    let dropboxUploaded = false;
    let dropboxPath = null;
    let cloudMessage = "Envio para Dropbox desativado.";
    const dropboxConfigured = isDropboxConfigured();
    if (settings.dropbox) {
      if (!dropboxConfigured) {
        cloudMessage = "Dropbox pendente: configure DROPBOX_ACCESS_TOKEN no Render.";
      } else {
        dropboxPath = await uploadToDropbox(compressed, filename);
        const cleaned = await cleanupOldDropboxBackups(settings.retentionDays);
        dropboxUploaded = true;
        cloudMessage = `Backup enviado ao Dropbox: ${dropboxPath}. Limpeza: ${cleaned} backup(s) antigo(s) removido(s).`;
      }
    }
    await saveBackupSettings({
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastRunStatus: "SUCCESS",
      lastRunMessage: `Backup local gerado por ${triggeredBy}: ${filename}. ${cloudMessage}`
    });
    return {
      success: true,
      filename,
      filepath,
      dropboxConfigured,
      dropboxUploaded,
      dropboxPath,
      cloudMessage,
      driveMessage: cloudMessage
    };
  } catch (error) {
    await saveBackupSettings({
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastRunStatus: "FAILED",
      lastRunMessage: error.message || "Falha ao gerar backup."
    });
    throw error;
  }
}
var lastScheduledSuccessKey = "";
var lastFailedScheduledAttemptAt = 0;
var backupCheckInFlight = false;
var lastPendingCheckAt = 0;
var PENDING_CHECK_THROTTLE_MS = 30 * 1e3;
var FAILED_RETRY_COOLDOWN_MS = 10 * 60 * 1e3;
var BACKUP_TIME_ZONE = process.env.BACKUP_TIME_ZONE || "America/Sao_Paulo";
function normalizeHHMM(time) {
  const raw = String(time || "02:00").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "02:00";
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function zonedParts(date, timeZone = BACKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}
function timeZoneOffsetMs(date, timeZone = BACKUP_TIME_ZONE) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}
function zonedLocalTimeToUtc(year, month, day, hour, minute, timeZone = BACKUP_TIME_ZONE) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = timeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}
function localDateKey(parts) {
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}
function getScheduledDateForToday(now, targetHHMM) {
  const [hour, minute] = normalizeHHMM(targetHHMM).split(":").map(Number);
  const parts = zonedParts(now);
  return zonedLocalTimeToUtc(parts.year, parts.month, parts.day, hour, minute);
}
function wasScheduledBackupSuccessful(settings, scheduledAt) {
  if (!settings.lastRunAt || settings.lastRunStatus !== "SUCCESS") return false;
  const lastRun = new Date(settings.lastRunAt);
  if (Number.isNaN(lastRun.getTime())) return false;
  return lastRun.getTime() >= scheduledAt.getTime();
}
function failedAttemptIsCoolingDown(settings) {
  const now = Date.now();
  if (lastFailedScheduledAttemptAt && now - lastFailedScheduledAttemptAt < FAILED_RETRY_COOLDOWN_MS) return true;
  if (settings.lastRunStatus === "FAILED" && settings.lastRunAt) {
    const lastRun = new Date(settings.lastRunAt).getTime();
    if (!Number.isNaN(lastRun) && now - lastRun < FAILED_RETRY_COOLDOWN_MS) return true;
  }
  return false;
}
async function checkPendingAutomaticBackupNow(source = "verifica\xE7\xE3o autom\xE1tica", options = {}) {
  const nowMs = Date.now();
  if (backupCheckInFlight) return;
  if (!options.force && nowMs - lastPendingCheckAt < PENDING_CHECK_THROTTLE_MS) return;
  backupCheckInFlight = true;
  lastPendingCheckAt = nowMs;
  try {
    const settings = await getBackupSettings();
    if (!settings.enabled) return;
    const now = /* @__PURE__ */ new Date();
    const today = localDateKey(zonedParts(now));
    const target = normalizeHHMM(settings.time);
    const scheduledAt = getScheduledDateForToday(now, target);
    const runKey = `${today}:${target}`;
    const scheduledTimeAlreadyPassed = now.getTime() >= scheduledAt.getTime();
    if (!scheduledTimeAlreadyPassed) return;
    if (lastScheduledSuccessKey === runKey) return;
    if (wasScheduledBackupSuccessful(settings, scheduledAt)) {
      lastScheduledSuccessKey = runKey;
      return;
    }
    if (failedAttemptIsCoolingDown(settings)) return;
    const wakeupDelayMs = now.getTime() - scheduledAt.getTime();
    const trigger = wakeupDelayMs > 60 * 1e3 ? `backup pendente ap\xF3s reativa\xE7\xE3o do servidor (${source})` : `agendamento autom\xE1tico (${source})`;
    console.log(`[BACKUP] Executando ${trigger}. Hor\xE1rio alvo=${target} (${BACKUP_TIME_ZONE}), agora=${now.toISOString()}`);
    try {
      await runManualBackup(trigger);
      lastScheduledSuccessKey = runKey;
      lastFailedScheduledAttemptAt = 0;
    } catch (error) {
      lastFailedScheduledAttemptAt = Date.now();
      throw error;
    }
  } catch (error) {
    console.error("Erro no agendador de backup:", error);
  } finally {
    backupCheckInFlight = false;
  }
}

// src/server/settings.ts
var storage = multer.memoryStorage();
var upload = multer({ storage, limits: { fileSize: 1 * 1024 * 1024 } });
var router22 = Router22();
var PIX_SETTINGS_KEY = "company_pix";
var companySettingsCompatReady = false;
async function ensureCompanySettingsCompat() {
  if (companySettingsCompatReady) return;
  await db.execute(sql19`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'RUC'`);
  await db.execute(sql19`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS instagram_url text`);
  companySettingsCompatReady = true;
}
router22.use((req, res, next) => {
  if (req.method === "GET" && req.path === "/company-public") return next();
  return requireAuth(req, res, next);
});
async function getPixSettings() {
  const rows = await db.select().from(systemSettings).where(eq26(systemSettings.key, PIX_SETTINGS_KEY)).limit(1);
  return rows[0]?.value || {};
}
async function savePixSettings(value) {
  const parsedRate = Number(String(value?.pixExchangeRate || "").replace(",", "."));
  const payload = {
    pixKey: String(value?.pixKey || "").trim(),
    pixExchangeRate: Number.isFinite(parsedRate) && parsedRate > 0 ? String(parsedRate) : "5.50"
  };
  const rows = await db.select().from(systemSettings).where(eq26(systemSettings.key, PIX_SETTINGS_KEY)).limit(1);
  if (rows.length) {
    await db.update(systemSettings).set({ value: payload, updatedAt: /* @__PURE__ */ new Date() }).where(eq26(systemSettings.key, PIX_SETTINGS_KEY));
  } else {
    await db.insert(systemSettings).values({ key: PIX_SETTINGS_KEY, value: payload });
  }
  return payload;
}
router22.get("/backup-status", requirePermission("settings", "manage"), async (req, res) => {
  try {
    await checkPendingAutomaticBackupNow("abertura da tela de backup", { force: true });
    const backup = await getBackupSettings();
    res.json({
      backup,
      dropboxConfigured: isDropboxConfigured(),
      googleDriveConfigured: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Erro ao carregar status do backup." });
  }
});
router22.post("/backup-now", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const result = await runManualBackup(req.user.userId);
    await logAction(req.user.userId, "SETTINGS_BACKUP_MANUAL", "system_settings", "backup_settings", null, { filename: result.filename });
    res.setHeader("X-Backup-Filename", encodeURIComponent(result.filename));
    res.setHeader("X-Backup-Cloud-Message", encodeURIComponent(result.cloudMessage || ""));
    res.setHeader("X-Backup-Dropbox-Uploaded", result.dropboxUploaded ? "true" : "false");
    res.setHeader("Cache-Control", "no-store");
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error("Erro ao enviar arquivo de backup:", err);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Erro ao gerar backup manual." });
  }
});
router22.get("/company", requirePermission("settings", "manage"), async (req, res) => {
  try {
    await ensureCompanySettingsCompat();
    let cs = await db.select().from(companySettings).limit(1);
    if (!cs.length) {
      await db.insert(companySettings).values({});
      cs = await db.select().from(companySettings).limit(1);
    }
    const pix = await getPixSettings();
    res.json({ ...cs[0], pixKey: pix.pixKey || "", pixExchangeRate: pix.pixExchangeRate || "5.50" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/company", requirePermission("settings", "manage"), async (req, res) => {
  try {
    await ensureCompanySettingsCompat();
    const data = req.body;
    const old = await db.select().from(companySettings).limit(1);
    const updatedBy = req.user.userId;
    const updateData = {
      companyName: data.companyName,
      tradeName: data.tradeName,
      documentType: data.documentType === "CNPJ" ? "CNPJ" : "RUC",
      documentNumber: data.documentNumber,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      logoUrl: data.logoUrl,
      whatsappGateway: data.whatsappGateway,
      instagramUrl: data.instagramUrl,
      defaultCurrency: data.defaultCurrency,
      defaultIvaPercentage: data.defaultIvaPercentage,
      updatedAt: /* @__PURE__ */ new Date(),
      updatedBy
    };
    if (old.length && old[0]) {
      await db.update(companySettings).set(updateData).where(eq26(companySettings.id, old[0].id));
    } else {
      await db.insert(companySettings).values(updateData);
    }
    const pix = await savePixSettings({ pixKey: data.pixKey, pixExchangeRate: data.pixExchangeRate });
    clearApiCache("settings:");
    await logAction(updatedBy, "UPDATE", "company_settings", old[0]?.id || "new", void 0, { ...updateData, pixKey: pix.pixKey ? "***" : "" });
    res.json({ success: true, updatedConfig: { ...updateData, pixKey: pix.pixKey } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.post("/company/logo", requirePermission("settings", "manage"), upload.single("logo"), async (req, res) => {
  try {
    await ensureCompanySettingsCompat();
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato de arquivo inv\xE1lido. Formatos suportados: JPG, JPEG, PNG, WEBP, SVG." });
    }
    const mimeType = req.file.mimetype || "image/webp";
    const logoUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
    const old = await db.select().from(companySettings).limit(1);
    const updatedBy = req.user.userId;
    if (old.length && old[0]) {
      await db.update(companySettings).set({ logoUrl, updatedAt: /* @__PURE__ */ new Date(), updatedBy }).where(eq26(companySettings.id, old[0].id));
    } else {
      await db.insert(companySettings).values({ logoUrl, updatedAt: /* @__PURE__ */ new Date(), updatedBy });
    }
    await logAction(updatedBy, "UPDATE", "company_settings", old[0]?.id || "new", void 0, { logoUrl });
    clearApiCache("settings:");
    res.json({ success: true, logoUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/company-public", async (req, res) => {
  try {
    await ensureCompanySettingsCompat();
    const payload = await withApiCache("settings:company-public", 5 * 60 * 1e3, async () => {
      const [cs, pix, brlRows] = await Promise.all([
        db.select().from(companySettings).limit(1),
        getPixSettings(),
        db.select().from(currencies).where(eq26(currencies.code, "BRL")).limit(1)
      ]);
      const company = cs[0] || {};
      return {
        companyName: company.companyName || "",
        tradeName: company.tradeName || company.companyName || "",
        documentType: company.documentType || "RUC",
        documentNumber: company.documentNumber || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        logoUrl: company.logoUrl || "",
        city: company.city || "Ciudad del Este",
        country: company.country || "Paraguay",
        pixKey: pix.pixKey || "",
        pixExchangeRate: pix.pixExchangeRate || "5.50",
        whatsappGateway: company.whatsappGateway || "",
        instagramUrl: company.instagramUrl || "",
        defaultCurrency: company.defaultCurrency || "USD",
        brlRateToUsd: brlRows[0]?.rateToUsd || pix.pixExchangeRate || "5.50"
      };
    });
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/pix", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const pix = await getPixSettings();
    res.json({ pixKey: pix.pixKey || "", pixExchangeRate: pix.pixExchangeRate || "5.50" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/pix", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const pix = await getPixSettings();
    const saved = await savePixSettings({
      pixKey: req.body.pixKey ?? pix.pixKey ?? "",
      pixExchangeRate: req.body.pixExchangeRate ?? pix.pixExchangeRate ?? "5.50"
    });
    clearApiCache("settings:");
    await logAction(req.user.userId, "UPDATE", "system_settings", PIX_SETTINGS_KEY, void 0, { pixKey: saved.pixKey ? "***" : "", pixExchangeRate: saved.pixExchangeRate });
    res.json({ success: true, ...saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/currencies", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const list = await db.select().from(currencies);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/currencies", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { code, rateToUsd } = req.body;
    if (!code || !rateToUsd) return res.status(400).json({ error: "Moeda e cota\xE7\xE3o s\xE3o obrigat\xF3rias." });
    const updatedBy = req.user.userId;
    const existing = await db.select().from(currencies).where(eq26(currencies.code, code)).limit(1);
    if (existing.length) {
      await db.update(currencies).set({ rateToUsd: String(rateToUsd), updatedAt: /* @__PURE__ */ new Date(), updatedBy }).where(eq26(currencies.code, code));
    } else {
      await db.insert(currencies).values({ code, rateToUsd: String(rateToUsd), updatedBy });
    }
    await logAction(updatedBy, "UPDATE", "currencies", code, existing[0], { rateToUsd });
    clearApiCache("settings:");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/fiscal", requirePermission("settings", "manage"), async (req, res) => {
  try {
    let fs6 = await db.select().from(fiscalSettings).limit(1);
    if (!fs6.length) {
      await db.insert(fiscalSettings).values({});
      fs6 = await db.select().from(fiscalSettings).limit(1);
    }
    res.json(fs6[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/fiscal", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const data = req.body;
    const old = await db.select().from(fiscalSettings).limit(1);
    const updatedBy = req.user.userId;
    const updateData = {
      ivaEnabled: data.ivaEnabled,
      defaultIvaPy: String(data.defaultIvaPy || 10),
      defaultIvaForeign: String(data.defaultIvaForeign || 0),
      updatedAt: /* @__PURE__ */ new Date(),
      updatedBy
    };
    if (old.length && old[0]) {
      await db.update(fiscalSettings).set(updateData).where(eq26(fiscalSettings.id, old[0].id));
    } else {
      await db.insert(fiscalSettings).values(updateData);
    }
    await logAction(updatedBy, "UPDATE", "fiscal_settings", old[0]?.id || "new", void 0, updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/email", requirePermission("settings", "manage"), async (req, res) => {
  try {
    let es = await db.select().from(emailSettings).limit(1);
    if (!es.length) {
      const [company] = await db.select().from(companySettings).limit(1);
      await db.insert(emailSettings).values({
        host: "smtp.example.com",
        port: 587,
        user: "user@example.com",
        password: "",
        fromEmail: "noreply@example.com",
        fromName: company?.tradeName || company?.companyName || "Sua loja"
      });
      es = await db.select().from(emailSettings).limit(1);
    }
    const payload = { ...es[0] };
    if (payload.password) {
      payload.password = "********";
    }
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/email", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const data = req.body;
    const old = await db.select().from(emailSettings).limit(1);
    const updatedBy = req.user.userId;
    const updateData = {
      host: data.host,
      port: data.port,
      user: data.user,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      useTls: data.useTls,
      updatedAt: /* @__PURE__ */ new Date(),
      updatedBy
    };
    if (data.password && data.password !== "********") {
      updateData.password = data.password;
    }
    if (old.length && old[0]) {
      await db.update(emailSettings).set(updateData).where(eq26(emailSettings.id, old[0].id));
    } else {
      await db.insert(emailSettings).values(updateData);
    }
    await logAction(updatedBy, "UPDATE", "email_settings", old[0]?.id || "new", void 0, { ...updateData, password: "***" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.post("/email/test", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const dbSettings = await db.select().from(emailSettings).limit(1);
    if (!dbSettings.length) throw new Error("Configura\xE7\xE3o de e-mail n\xE3o encontrada.");
    const conf = dbSettings[0];
    const transporter = nodemailer.createTransport({
      host: conf.host,
      port: conf.port,
      secure: conf.port === 465,
      // usually true for 465, false for other ports
      auth: {
        user: conf.user,
        pass: conf.password
      },
      tls: conf.useTls ? { rejectUnauthorized: false } : void 0
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `"${conf.fromName}" <${conf.fromEmail}>`,
      to: conf.fromEmail,
      subject: `Teste de Configura\xE7\xE3o SMTP - ${conf.fromName || "Sua loja"}`,
      text: "Suas configura\xE7\xF5es de e-mail est\xE3o funcionando perfeitamente."
    });
    res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router22.get("/printers", requirePermission("settings", "manage"), async (req, res) => {
  try {
    let ps = await db.select().from(printerSettings).limit(1);
    if (!ps.length) {
      await db.insert(printerSettings).values({});
      ps = await db.select().from(printerSettings).limit(1);
    }
    res.json(ps[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.put("/printers", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const data = req.body;
    const old = await db.select().from(printerSettings).limit(1);
    const updatedBy = req.user.userId;
    const updateData = {
      receiptFormat: data.receiptFormat,
      adminFormat: data.adminFormat,
      printMode: data.printMode,
      updatedBy
    };
    if (old.length) {
      await db.update(printerSettings).set(updateData).where(eq26(printerSettings.id, old[0].id));
    } else {
      await db.insert(printerSettings).values(updateData);
    }
    await logAction(updatedBy, "UPDATE", "printer_settings", old[0]?.id || "new", old[0], updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/printers/test", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { format } = req.query;
    const isThermal = format === "80mm" || format === "58mm";
    const width = format === "58mm" ? 164.4 : format === "80mm" ? 226.77 : void 0;
    const doc = new PDFDocument2({
      margin: isThermal ? 10 : 30,
      size: isThermal ? [width, 600] : format || "A4"
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="teste_impressao.pdf"`);
    doc.pipe(res);
    const comp = await db.select().from(companySettings).limit(1);
    const company = comp[0];
    const logoBuffer = await loadImageBuffer(company?.logoUrl || void 0);
    if (logoBuffer) {
      try {
        if (isThermal) {
          const startY = doc.y;
          doc.image(logoBuffer, (width - 110) / 2, startY, { fit: [110, 100], align: "center" });
          doc.y = startY + 115;
        } else {
          doc.image(logoBuffer, 30, doc.y, { fit: [165, 130] });
          doc.moveDown(5);
        }
      } catch (e) {
      }
    }
    const storeName = company?.tradeName || company?.companyName || "Sua loja";
    doc.fontSize(14).font("Helvetica-Bold").text(`TESTE DE IMPRESS\xC3O - ${storeName}`, { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").text(`Formato: ${isThermal ? "Termica" : "Administrativa"} ${format}`, { align: "center" });
    doc.text(`Data/hora: ${(/* @__PURE__ */ new Date()).toLocaleString()}`, { align: "center" });
    doc.moveDown(2);
    doc.text("Se voce consegue ler este texto, a impressora esta configurada e operando corretamente.");
    doc.text("--------------------------------------------------");
    doc.moveDown(1);
    doc.text(`${storeName} \xB7 operado pelo Aura Sistemas`);
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router22.get("/shortcuts", async (req, res) => {
  try {
    const payload = await withApiCache("settings:shortcuts", 5 * 60 * 1e3, async () => {
      const sc = await db.select().from(systemSettings).where(eq26(systemSettings.key, "pos_shortcuts")).limit(1);
      if (!sc.length) return { shortcuts: {} };
      return { shortcuts: sc[0].value || {} };
    });
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar atalhos" });
  }
});
router22.put("/shortcuts", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { shortcuts } = req.body;
    const sc = await db.select().from(systemSettings).where(eq26(systemSettings.key, "pos_shortcuts")).limit(1);
    if (sc.length) {
      await db.update(systemSettings).set({ value: shortcuts, updatedAt: /* @__PURE__ */ new Date() }).where(eq26(systemSettings.key, "pos_shortcuts"));
    } else {
      await db.insert(systemSettings).values({ key: "pos_shortcuts", value: shortcuts });
    }
    await logAction(req.user.userId, "UPDATE_SHORTCUTS", "system_settings", "pos_shortcuts", null, shortcuts);
    clearApiCache("settings:");
    res.json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar atalhos" });
  }
});
router22.post("/shortcuts/reset", requirePermission("settings", "manage"), async (req, res) => {
  try {
    await db.delete(systemSettings).where(eq26(systemSettings.key, "pos_shortcuts"));
    await logAction(req.user.userId, "RESET_SHORTCUTS", "system_settings", "pos_shortcuts", null, null);
    clearApiCache("settings:");
    res.json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao resetar atalhos" });
  }
});
router22.get("/brands", requirePermission("settings", "manage"), async (_req, res) => {
  try {
    const existing = await db.select().from(brandLogos).orderBy(brandLogos.sortOrder);
    const existingNames = new Set(existing.map((b) => b.name));
    const distinctBrands = await db.selectDistinct({ brand: products.brand }).from(products).where(sql19`${products.brand} is not null and ${products.brand} <> ''`).orderBy(products.brand);
    const maxOrder = existing.reduce((m, b) => Math.max(m, b.sortOrder), -1);
    const discovered = distinctBrands.map((r) => r.brand).filter((name) => !!name && !existingNames.has(name)).map((name, i) => ({
      id: null,
      name,
      logoUrl: null,
      sortOrder: maxOrder + 1 + i,
      visible: false
    }));
    res.json({ data: [...existing, ...discovered] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router22.post("/brands/:name/logo", requirePermission("settings", "manage"), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato de arquivo inv\xE1lido. Formatos suportados: JPG, JPEG, PNG, WEBP, SVG." });
    }
    const name = String(req.params.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da marca inv\xE1lido." });
    const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const [existing] = await db.select().from(brandLogos).where(eq26(brandLogos.name, name)).limit(1);
    if (existing) {
      await db.update(brandLogos).set({ logoUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq26(brandLogos.id, existing.id));
    } else {
      await db.insert(brandLogos).values({ name, logoUrl, visible: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router22.put("/brands/:name", requirePermission("settings", "manage"), async (req, res) => {
  try {
    const name = String(req.params.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da marca inv\xE1lido." });
    const { sortOrder, visible, logoUrl } = req.body || {};
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (sortOrder !== void 0) updates.sortOrder = Math.max(0, parseInt(String(sortOrder), 10) || 0);
    if (visible !== void 0) updates.visible = !!visible;
    if (logoUrl !== void 0) {
      const url = String(logoUrl || "").trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: "Link do logo precisa come\xE7ar com http:// ou https://." });
      }
      updates.logoUrl = url || null;
    }
    const [existing] = await db.select().from(brandLogos).where(eq26(brandLogos.name, name)).limit(1);
    if (existing) {
      await db.update(brandLogos).set(updates).where(eq26(brandLogos.id, existing.id));
    } else {
      await db.insert(brandLogos).values({ name, ...updates });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var settings_default = router22;

// src/server/receipts.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router23 } from "express";
import { eq as eq27, and as and22, inArray as inArray12, sql as sql20 } from "drizzle-orm";
import PDFDocument3 from "pdfkit";
import nodemailer2 from "nodemailer";
var router23 = Router23();
router23.use(requireAuth);
var companySettingsCompatReady2 = false;
async function ensureCompanySettingsCompat2() {
  if (companySettingsCompatReady2) return;
  await db.execute(sql20`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'RUC'`);
  companySettingsCompatReady2 = true;
}
async function getReceiptData(saleId) {
  await ensureCompanySettingsCompat2();
  const saleData = await db.select({
    id: sales.id,
    number: sales.number,
    series: sales.series,
    createdAt: sales.createdAt,
    orderStatus: sales.orderStatus,
    paymentStatus: sales.paymentStatus,
    fulfillmentStatus: sales.fulfillmentStatus,
    subtotalAmount: sales.subtotalAmount,
    discountAmount: sales.discountAmount,
    ivaAmount: sales.ivaAmount,
    totalAmount: sales.totalAmount,
    currency: sales.currency,
    observations: sales.observations
  }).from(sales).where(eq27(sales.id, saleId)).limit(1);
  if (!saleData.length) throw new Error("Venda n\xE3o encontrada.");
  const sale = saleData[0];
  const sItems = await db.select({
    id: saleItems.id,
    quantity: saleItems.quantity,
    unitPrice: saleItems.unitPrice,
    discountAmount: saleItems.discountAmount,
    ivaAmount: saleItems.ivaAmount,
    totalPrice: saleItems.totalPrice,
    product: {
      name: products.name,
      sku: products.sku,
      upc: products.upc
    }
  }).from(saleItems).leftJoin(products, eq27(saleItems.productId, products.id)).where(eq27(saleItems.saleId, saleId));
  const sis = sItems.map((i) => i.id);
  let saleSerials = [];
  let saleLots = [];
  if (sis.length > 0) {
    saleSerials = await db.select({
      saleItemId: productSerials.saleItemId,
      serialNumber: productSerials.serialNumber
    }).from(productSerials).where(and22(inArray12(productSerials.saleItemId, sis), eq27(productSerials.status, "SOLD")));
    saleLots = await db.select({
      saleItemId: saleItemLots.saleItemId,
      lotNumber: saleItemLots.lotNumber,
      quantity: saleItemLots.quantity
    }).from(saleItemLots).where(inArray12(saleItemLots.saleItemId, sis));
  }
  const items = sItems.map((si) => ({
    ...si,
    serials: saleSerials.filter((s) => s.saleItemId === si.id).map((s) => s.serialNumber),
    lots: saleLots.filter((l) => l.saleItemId === si.id).map((l) => ({ lotNumber: l.lotNumber, quantity: l.quantity }))
  }));
  const customerObj = await db.select().from(sales).leftJoin(customers, eq27(sales.customerId, customers.id)).where(eq27(sales.id, saleId)).limit(1);
  const userObj = await db.select().from(sales).leftJoin(users, eq27(sales.userId, users.id)).where(eq27(sales.id, saleId)).limit(1);
  const company = await db.select().from(companySettings).limit(1);
  const currencySettings = await getServerCurrencySettings(company[0]?.defaultCurrency);
  return {
    sale,
    items,
    customer: customerObj[0]?.customers || null,
    user: userObj[0]?.users || null,
    company: company[0] || null,
    currencySettings
  };
}
var getCompanyDocumentLabel = (company) => `${company?.documentType || "RUC"}: ${company?.documentNumber || "N/D"}`;
async function generateA4Doc(doc, saleData) {
  const { sale, items, customer, user, company, currencySettings } = saleData;
  const money = (value, separator = currencySettings?.mode === "DUAL" ? "\n" : " / ") => formatServerCurrency(value, currencySettings, separator);
  const pageX = 30;
  const pageWidth = 535;
  const headerY = 30;
  const generatedDate = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
  const saleCode = `${sale.series}-${String(sale.number).padStart(6, "0")}`;
  const companyName = company?.tradeName || company?.companyName || "Sua loja";
  const companyLines = [
    getCompanyDocumentLabel(company),
    company?.phone ? `Tel: ${company.phone}` : "Tel: N/D",
    company?.email ? `Email: ${company.email}` : "Email: N/D",
    [company?.address, company?.city].filter(Boolean).join(" - ")
  ].filter(Boolean);
  const logoBuffer = await loadImageBuffer(company?.logoUrl || void 0);
  doc.fillColor("#000");
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, pageX, headerY, { fit: [54, 54] });
    } catch {
      doc.fontSize(10).font("Helvetica-Bold").text(companyName, pageX, headerY, { width: 54, align: "center" });
    }
  } else {
    doc.fontSize(10).font("Helvetica-Bold").text(companyName, pageX, headerY + 14, { width: 54, align: "center" });
  }
  const companyX = pageX + 66;
  const rightX = pageX + pageWidth - 110;
  doc.fontSize(13).font("Helvetica-Bold").text(companyName, companyX, headerY + 2, { width: 300, lineGap: 0 });
  doc.fontSize(8).font("Helvetica");
  let infoY = doc.y + 1;
  for (const line of companyLines) {
    doc.text(line, companyX, infoY, { width: 330, lineGap: 1 });
    infoY = doc.y + 1;
  }
  doc.fontSize(7.5).font("Helvetica").text("Gerado em", rightX, headerY + 4, { width: 110, align: "right" });
  doc.fontSize(8).font("Helvetica-Bold").text(generatedDate, rightX, doc.y, { width: 110, align: "right" });
  doc.fontSize(7.5).font("Helvetica").text("Venda", rightX, doc.y + 4, { width: 110, align: "right" });
  doc.fontSize(8).font("Helvetica-Bold").text(saleCode, rightX, doc.y, { width: 110, align: "right" });
  doc.y = headerY + 66;
  doc.moveTo(pageX, doc.y).lineTo(pageX + pageWidth, doc.y).strokeColor("#d1d5db").lineWidth(1).stroke();
  doc.strokeColor("#000").lineWidth(1);
  doc.y += 10;
  doc.fillColor("#000").fontSize(14).font("Helvetica-Bold").text("RECIBO INTERNO / ROMANEIO DE VENDA", pageX, doc.y, { align: "center", width: pageWidth });
  doc.y += 20;
  const yInfo = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").text("Venda:", 30, yInfo);
  doc.font("Helvetica").text(saleCode, 70, yInfo);
  doc.font("Helvetica-Bold").text("Data:", 200, yInfo);
  doc.font("Helvetica").text(`${new Date(sale.createdAt).toLocaleDateString()}`, 235, yInfo);
  doc.font("Helvetica-Bold").text("Vendedor:", 350, yInfo);
  doc.font("Helvetica").text(`${user?.name || "N/D"}`, 410, yInfo);
  doc.moveDown(0.5);
  const yCust = doc.y;
  doc.font("Helvetica-Bold").text("Cliente:", 30, yCust);
  doc.font("Helvetica").text(`${customer?.name || "Consumidor Final"}`, 75, yCust);
  doc.font("Helvetica-Bold").text("Documento:", 350, yCust);
  if (customer?.document) {
    doc.font("Helvetica").text(`${customer.documentType || "Doc"} ${customer.document}`, 420, yCust);
  } else {
    doc.font("Helvetica").text(`N/D`, 420, yCust);
  }
  doc.moveDown(1.4);
  doc.font("Helvetica-Bold");
  const tY = doc.y;
  doc.text("SKU", 30, tY, { width: 65 });
  doc.text("Produto", 95, tY, { width: 180 });
  doc.text("Qtd", 275, tY, { width: 30, align: "center" });
  doc.text("Unit\xE1rio", 305, tY, { width: 85, align: "right" });
  doc.text("Frete", 390, tY, { width: 80, align: "right" });
  doc.text("Total", 470, tY, { width: 95, align: "right" });
  doc.y = tY + 16;
  doc.rect(30, doc.y, 535, 1).fill("#e5e7eb");
  doc.y += 6;
  doc.fillColor("#000").font("Helvetica");
  for (const it of items) {
    const rowY = doc.y;
    const metaParts = [];
    if (it.serials && it.serials.length > 0) metaParts.push(`S/N: ${it.serials.join(", ")}`);
    if (it.lots && it.lots.length > 0) {
      metaParts.push(`Lote: ${it.lots.map((lot) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}`);
    }
    const hasMeta = metaParts.length > 0;
    const rowHeight = currencySettings?.mode === "DUAL" ? hasMeta ? 33 : 28 : hasMeta ? 24 : 18;
    doc.fontSize(currencySettings?.mode === "DUAL" ? 7.5 : 9);
    doc.text(it.product.sku, 30, rowY, { width: 65, height: rowHeight, ellipsis: true });
    doc.text(it.product.name, 95, rowY, { width: 180, height: 10, ellipsis: true });
    if (hasMeta) {
      doc.fontSize(7).fillColor("#555").text(metaParts.join(" | "), 95, rowY + 10, { width: 280, height: 11, ellipsis: true });
      doc.fillColor("#000").fontSize(currencySettings?.mode === "DUAL" ? 7.5 : 9);
    }
    doc.text(String(it.quantity), 275, rowY, { width: 30, align: "center" });
    doc.text(money(it.unitPrice), 305, rowY, { width: 85, align: "right" });
    doc.text(money(it.ivaAmount), 390, rowY, { width: 80, align: "right" });
    doc.text(money(it.totalPrice), 470, rowY, { width: 95, align: "right" });
    doc.y = rowY + rowHeight;
    doc.fillColor("#000");
  }
  doc.fontSize(10);
  doc.moveDown(2);
  doc.rect(30, doc.y, 535, 1).fill("#e5e7eb").moveDown(1);
  doc.fillColor("#000").font("Helvetica-Bold");
  const labelX = 315;
  const valueX = 420;
  const valueWidth = 145;
  const totalStep = currencySettings?.mode === "DUAL" ? 26 : 16;
  let totalsY = doc.y;
  doc.text("Subtotal", labelX, totalsY, { width: 100, align: "right" });
  doc.text(money(sale.subtotalAmount), valueX, totalsY, { width: valueWidth, align: "right" });
  totalsY += totalStep;
  if (Number(sale.discountAmount) > 0) {
    doc.text("Desconto", labelX, totalsY, { width: 100, align: "right" });
    doc.text(money(sale.discountAmount), valueX, totalsY, { width: valueWidth, align: "right" });
    totalsY += totalStep;
  }
  if (Number(sale.ivaAmount) > 0) {
    doc.text("Frete", labelX, totalsY, { width: 100, align: "right" });
    doc.text(money(sale.ivaAmount), valueX, totalsY, { width: valueWidth, align: "right" });
    totalsY += totalStep;
  }
  totalsY += 8;
  doc.fontSize(12);
  doc.text("Total", labelX, totalsY, { width: 100, align: "right" });
  doc.text(money(sale.totalAmount), valueX, totalsY, { width: valueWidth, align: "right" });
  doc.fontSize(10);
  doc.y = totalsY + 30;
  doc.fontSize(8).font("Helvetica-Oblique").text("Documento interno de controle da loja. N\xE3o substitui documento fiscal oficial quando exigido pela legisla\xE7\xE3o aplic\xE1vel.", 30, doc.y, { align: "center", width: 535 });
}
var safeBudgetText = (value, fallback = "") => {
  const text2 = String(value ?? fallback).replace(/\s+/g, " ").trim();
  return text2 || fallback;
};
var budgetNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
router23.post("/budget/pdf", requirePermission("sales", "create"), async (req, res) => {
  try {
    await ensureCompanySettingsCompat2();
    const body = req.body || {};
    const companyRows = await db.select().from(companySettings).limit(1);
    const company = companyRows[0] || null;
    const currencySettings = await getServerCurrencySettings(company?.defaultCurrency);
    const money = (value) => formatServerCurrency(value, currencySettings, " | ");
    const items = Array.isArray(body.items) ? body.items.slice(0, 120).map((item) => ({
      name: safeBudgetText(item?.name, "Produto"),
      quantity: Math.max(0, budgetNumber(item?.quantity)),
      unitPrice: budgetNumber(item?.unitPrice),
      totalPrice: budgetNumber(item?.totalPrice)
    })).filter((item) => item.quantity > 0) : [];
    if (!items.length) {
      res.status(400).json({ error: "Adicione produtos para gerar o or\xE7amento." });
      return;
    }
    const customerLabel = safeBudgetText(body.customerLabel, "Cliente padr\xE3o");
    const subtotal = budgetNumber(body.subtotal);
    const discountAmount = budgetNumber(body.discountAmount);
    const freight = budgetNumber(body.freight);
    const grandTotal = budgetNumber(body.grandTotal);
    const companyName = company?.tradeName || company?.companyName || "Empresa";
    const companyLines = [
      company?.documentNumber ? `${company?.documentType || "RUC"}: ${company.documentNumber}` : "",
      company?.phone ? `Tel: ${company.phone}` : "",
      company?.email ? `Email: ${company.email}` : "",
      [company?.address, company?.city].filter(Boolean).join(" - ")
    ].filter(Boolean);
    const doc = new PDFDocument3({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orcamento_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    doc.pipe(res);
    const pageX = 30;
    const pageWidth = 535;
    const headerY = 30;
    const logoBuffer = await loadImageBuffer(company?.logoUrl || void 0);
    doc.fillColor("#000");
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageX, headerY, { fit: [48, 48] });
      } catch {
        doc.fontSize(9).font("Helvetica-Bold").text(companyName, pageX, headerY + 12, { width: 48, align: "center" });
      }
    } else {
      doc.fontSize(9).font("Helvetica-Bold").text(companyName, pageX, headerY + 12, { width: 48, align: "center" });
    }
    const companyX = pageX + 62;
    const rightX = pageX + pageWidth - 110;
    doc.fontSize(13).font("Helvetica-Bold").text(companyName, companyX, headerY + 2, { width: 300 });
    doc.fontSize(8).font("Helvetica");
    let infoY = doc.y + 1;
    for (const line of companyLines) {
      doc.text(line, companyX, infoY, { width: 330, lineGap: 1 });
      infoY = doc.y + 1;
    }
    doc.fontSize(7.5).font("Helvetica").text("Gerado em", rightX, headerY + 4, { width: 110, align: "right" });
    doc.fontSize(8).font("Helvetica-Bold").text((/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"), rightX, doc.y, { width: 110, align: "right" });
    doc.y = headerY + 62;
    doc.moveTo(pageX, doc.y).lineTo(pageX + pageWidth, doc.y).strokeColor("#d1d5db").lineWidth(1).stroke();
    doc.strokeColor("#000").lineWidth(1);
    doc.y += 12;
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#000").text("RESUMO DO OR\xC7AMENTO", pageX, doc.y, { align: "center", width: pageWidth });
    doc.y += 20;
    const metaY = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").text("CLIENTE", pageX, metaY);
    doc.fontSize(10).font("Helvetica-Bold").text(customerLabel, pageX, metaY + 12, { width: 290 });
    doc.fontSize(8).font("Helvetica").text("Or\xE7amento gerado no PDV", rightX - 45, metaY + 2, { width: 155, align: "right" });
    doc.y = metaY + 34;
    for (const item of items) {
      if (doc.y > 725) doc.addPage();
      const rowY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000").text(item.name, pageX, rowY, { width: 340, height: 12, ellipsis: true });
      doc.fontSize(9).font("Helvetica-Bold").text(money(item.totalPrice), pageX + 365, rowY, { width: 170, align: "right" });
      doc.fontSize(8).font("Helvetica").text(`${item.quantity} x ${money(item.unitPrice)}`, pageX, rowY + 13, { width: 300 });
      doc.moveTo(pageX, rowY + 28).lineTo(pageX + pageWidth, rowY + 28).strokeColor("#e5e7eb").lineWidth(1).stroke();
      doc.strokeColor("#000");
      doc.y = rowY + 34;
    }
    doc.y += 8;
    if (doc.y > 670) doc.addPage();
    const labelX = pageX + 305;
    const valueX = pageX + 410;
    const valueWidth = 125;
    const summaryRows = [
      ["Subtotal", subtotal],
      ["Desconto", discountAmount],
      ["Frete", freight]
    ];
    doc.fontSize(8.5).font("Helvetica").fillColor("#000");
    for (const [label, value] of summaryRows) {
      const rowY = doc.y;
      doc.font("Helvetica").text(label, labelX, rowY, { width: 100 });
      doc.font("Helvetica-Bold").text(money(value), valueX, rowY, { width: valueWidth, align: "right" });
      doc.y = rowY + 16;
    }
    doc.y += 6;
    const totalY = doc.y;
    doc.fontSize(13).font("Helvetica-Bold").text("Total", labelX, totalY, { width: 100 });
    doc.text(money(grandTotal), valueX, totalY, { width: valueWidth, align: "right" });
    doc.y = totalY + 22;
    doc.fontSize(7.5).font("Helvetica").fillColor("#444").text(
      "Or\xE7amento sem valor fiscal. Valores sujeitos a confirma\xE7\xE3o no fechamento da venda.",
      pageX,
      doc.y + 26,
      { width: pageWidth, align: "center" }
    );
    doc.end();
  } catch (error) {
    console.error("Erro ao gerar or\xE7amento em PDF:", error);
    res.status(500).json({ error: error.message || "Erro ao gerar PDF do or\xE7amento." });
  }
});
router23.get("/:id/receipt", requirePermission("receipt", "view"), async (req, res) => {
  try {
    const data = await getReceiptData(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "Erro ao carregar recibo", details: error.message });
  }
});
router23.get("/:id/receipt/pdf", requirePermission("receipt", "download"), async (req, res) => {
  try {
    const { format, action = "download" } = req.query;
    const data = await getReceiptData(req.params.id);
    const { sale, items, customer, user, company, currencySettings } = data;
    const money = (value) => formatServerCurrency(value, currencySettings, currencySettings.mode === "DUAL" ? "\n" : " / ");
    const doc = new PDFDocument3({
      margin: format === "thermal" ? 10 : 30,
      size: format === "thermal" ? [226.77, 800] : "A4"
      // 80mm width ≈ 226.77 pt
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="recibo_${sale.series}-${sale.number}.pdf"`);
    doc.pipe(res);
    if (format === "thermal") {
      const logoBuffer = await loadImageBuffer(company?.logoUrl || void 0);
      if (logoBuffer) {
        try {
          const startY = doc.y;
          doc.image(logoBuffer, (226.77 - 64) / 2, startY, { fit: [64, 58], align: "center" });
          doc.y = startY + 66;
        } catch (e) {
          doc.fontSize(12).font("Helvetica-Bold").text(company?.tradeName || company?.companyName || "Sua loja", { align: "center" });
          doc.moveDown(0.5);
        }
      } else {
        doc.fontSize(12).font("Helvetica-Bold").text(company?.tradeName || company?.companyName || "Sua loja", { align: "center" });
        doc.moveDown(0.5);
      }
      doc.fontSize(8).font("Helvetica").text(`${getCompanyDocumentLabel(company)} | Tel: ${company?.phone || "N/D"}`, { align: "center" });
      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica-Bold").text("RECIBO INTERNO", { align: "center" });
      doc.fontSize(8).font("Helvetica").text(`Venda: ${sale.series}-${String(sale.number).padStart(6, "0")}`, { align: "center" });
      doc.text(`Cliente: ${customer?.name || "Consumidor Final"}`, { align: "center" });
      doc.moveDown(1);
      doc.font("Helvetica-Bold").text("ITENS", { underline: true });
      doc.font("Helvetica");
      for (const it of items) {
        doc.text(`${String(it.quantity)}x ${it.product.sku} - ${it.product.name}`);
        const metaParts = [];
        if (it.serials && it.serials.length > 0) metaParts.push(`S/N: ${it.serials.join(", ")}`);
        if (it.lots && it.lots.length > 0) metaParts.push(`Lote: ${it.lots.map((lot) => `${lot.lotNumber}${Number(lot.quantity || 0) > 0 ? ` (${lot.quantity})` : ""}`).join(" | ")}`);
        if (metaParts.length) {
          doc.fontSize(7).text(metaParts.join(" | "));
          doc.fontSize(8);
        }
        doc.text(`${money(it.unitPrice)}
Total: ${money(it.totalPrice)}`, { align: "right" });
      }
      doc.moveDown(1);
      doc.font("Helvetica-Bold");
      if (Number(sale.discountAmount) > 0) doc.text(`Desc.: ${money(sale.discountAmount)}`, { align: "right" });
      doc.fontSize(10).text(`TOTAL: ${money(sale.totalAmount)}`, { align: "right" });
      doc.fontSize(8).font("Helvetica").moveDown(2);
      doc.text("Documento interno. N\xE3o tem valor fiscal.", { align: "center" });
    } else {
      await generateA4Doc(doc, data);
    }
    doc.end();
    await db.insert(printLogs).values({
      saleId: sale.id,
      format: format === "thermal" ? "THERMAL" : "A4",
      printedBy: req.user.userId,
      notes: action === "print" ? "PRINT_REQUEST" : "PDF_DOWNLOAD"
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar PDF do recibo", details: error.message });
  }
});
router23.post("/:id/receipt/email", requirePermission("receipt", "email"), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error("E-mail n\xE3o informado.");
    const saleData = await getReceiptData(req.params.id);
    const sale = saleData.sale;
    const storeName = saleData.company?.tradeName || saleData.company?.companyName || "Sua loja";
    const es = await db.select().from(emailSettings).limit(1);
    if (!es.length) throw new Error("Configure o SMTP em Configura\xE7\xF5es > E-mail da empresa antes de enviar recibos.");
    const conf = es[0];
    const transporter = nodemailer2.createTransport({
      host: conf.host,
      port: conf.port,
      secure: conf.port === 465,
      auth: { user: conf.user, pass: conf.password },
      tls: conf.useTls ? { rejectUnauthorized: false } : void 0
    });
    const doc = new PDFDocument3({ margin: 30, size: "A4" });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    await generateA4Doc(doc, saleData);
    doc.end();
    const pdfData = await new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
    });
    const filename = `recibo_${sale.series}-${sale.number}.pdf`;
    try {
      await transporter.sendMail({
        from: `"${conf.fromName}" <${conf.fromEmail}>`,
        to: email,
        subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6, "0")}`,
        text: `Ol\xE1,

Segue em anexo o recibo da venda ${sale.series}-${String(sale.number).padStart(6, "0")}.

Obrigado por comprar conosco!

${storeName}`,
        attachments: [
          {
            filename,
            content: pdfData
          }
        ]
      });
      await db.insert(emailLogs).values({
        saleId: sale.id,
        recipientEmail: email,
        subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6, "0")}`,
        status: "SENT",
        sentBy: req.user.userId
      });
      res.json({ success: true });
    } catch (mailError) {
      await db.insert(emailLogs).values({
        saleId: sale.id,
        recipientEmail: email,
        subject: `Recibo ${storeName} - Venda ${sale.series}-${String(sale.number).padStart(6, "0")}`,
        status: "FAILED",
        errorMessage: mailError.message,
        sentBy: req.user.userId
      });
      throw mailError;
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao enviar e-mail", details: error.message });
  }
});
var receipts_default = router23;

// src/server/suppliers.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router24 } from "express";
import { eq as eq28, ilike as ilike5, or as or5, and as and23, isNull as isNull7, sql as sql21, desc as desc14 } from "drizzle-orm";
import multer2 from "multer";
import fs3 from "fs";
import path3 from "path";
import { v4 as uuidv414 } from "uuid";
var router24 = Router24();
router24.use(requireAuth);
var upload2 = multer2({ storage: multer2.memoryStorage() });
var SUPPLIER_INVOICE_MAX_BYTES = 4 * 1024 * 1024;
var SUPPLIER_INVOICE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
function toSafeDate(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function resolveUploadPath(filePath) {
  return path3.join(process.cwd(), filePath.replace(/^\//, ""));
}
router24.get("/", requirePermission("supplier", "view"), async (req, res) => {
  try {
    const { search, includeInactive } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
    const offset = (page - 1) * limit;
    let conditions = includeInactive === "true" ? [isNull7(suppliers.deletedAt)] : [eq28(suppliers.isActive, true), isNull7(suppliers.deletedAt)];
    let whereClause = and23(...conditions);
    if (search) {
      const q = `%${search}%`;
      whereClause = and23(
        ...conditions,
        or5(
          ilike5(suppliers.name, q),
          ilike5(suppliers.document, q)
        )
      );
    }
    const [list, countResult] = await Promise.all([
      db.select().from(suppliers).where(whereClause).orderBy(suppliers.name).limit(limit).offset(offset),
      db.select({ count: sql21`count(*)` }).from(suppliers).where(whereClause)
    ]);
    res.json({
      data: list,
      total: Number(countResult[0]?.count || 0),
      page,
      limit
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar fornecedores", details: e.message });
  }
});
router24.post("/", requirePermission("supplier", "create"), async (req, res) => {
  try {
    const data = req.body;
    const [created] = await db.insert(suppliers).values({
      name: data.name?.toUpperCase(),
      document: data.document?.toUpperCase(),
      phone: data.phone,
      email: data.email?.toLowerCase(),
      address: data.address?.toUpperCase(),
      city: data.city?.toUpperCase(),
      country: data.country?.toUpperCase(),
      observations: data.observations?.toUpperCase(),
      isActive: data.isActive !== void 0 ? data.isActive : true
    }).returning();
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: "Erro ao criar fornecedor", details: e.message });
  }
});
router24.get("/:id/invoices", requirePermission("supplier", "view"), async (req, res) => {
  try {
    const supplierId = req.params.id;
    const list = await db.select().from(supplierInvoiceFiles).where(eq28(supplierInvoiceFiles.supplierId, supplierId)).orderBy(desc14(supplierInvoiceFiles.createdAt));
    res.json({ data: list, total: list.length });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar notas do fornecedor", details: e.message });
  }
});
router24.post("/:id/invoices", requirePermission("supplier", "edit"), upload2.single("file"), async (req, res) => {
  try {
    const supplierId = req.params.id;
    const [supplier] = await db.select().from(suppliers).where(eq28(suppliers.id, supplierId)).limit(1);
    if (!supplier) return res.status(404).json({ error: "Fornecedor n\xE3o encontrado" });
    if (!req.file) return res.status(400).json({ error: "Selecione uma foto/PDF da nota." });
    if (!SUPPLIER_INVOICE_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato inv\xE1lido. Use JPG, PNG, WEBP ou PDF." });
    }
    if (req.file.size > SUPPLIER_INVOICE_MAX_BYTES) {
      return res.status(400).json({ error: "Arquivo maior que 4 MB." });
    }
    const id = uuidv414();
    const persistentFilePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const [created] = await db.insert(supplierInvoiceFiles).values({
      id,
      supplierId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: persistentFilePath,
      invoiceNumber: req.body.invoiceNumber ? String(req.body.invoiceNumber).toUpperCase() : null,
      invoiceDate: toSafeDate(req.body.invoiceDate),
      observations: req.body.observations ? String(req.body.observations).toUpperCase() : null,
      source: "MANUAL",
      createdBy: req.user?.userId || null
    }).returning();
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: "Erro ao anexar nota ao fornecedor", details: e.message });
  }
});
router24.put("/:id/invoices/:invoiceId", requirePermission("supplier", "edit"), async (req, res) => {
  try {
    const supplierId = req.params.id;
    const invoiceId = req.params.invoiceId;
    const [updated] = await db.update(supplierInvoiceFiles).set({
      invoiceNumber: req.body.invoiceNumber ? String(req.body.invoiceNumber).toUpperCase() : null,
      invoiceDate: toSafeDate(req.body.invoiceDate),
      observations: req.body.observations ? String(req.body.observations).toUpperCase() : null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and23(eq28(supplierInvoiceFiles.id, invoiceId), eq28(supplierInvoiceFiles.supplierId, supplierId))).returning();
    if (!updated) return res.status(404).json({ error: "Nota n\xE3o encontrada" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao atualizar nota", details: e.message });
  }
});
router24.delete("/:id/invoices/:invoiceId", requirePermission("supplier", "edit"), async (req, res) => {
  try {
    const supplierId = req.params.id;
    const invoiceId = req.params.invoiceId;
    const [invoice] = await db.select().from(supplierInvoiceFiles).where(and23(eq28(supplierInvoiceFiles.id, invoiceId), eq28(supplierInvoiceFiles.supplierId, supplierId))).limit(1);
    if (!invoice) return res.status(404).json({ error: "Nota n\xE3o encontrada" });
    await db.delete(supplierInvoiceFiles).where(eq28(supplierInvoiceFiles.id, invoiceId));
    if (invoice.source !== "OCR" && invoice.filePath && String(invoice.filePath).startsWith("/uploads/")) {
      const localPath = resolveUploadPath(invoice.filePath);
      if (fs3.existsSync(localPath)) {
        try {
          await fs3.promises.unlink(localPath);
        } catch {
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Erro ao excluir nota", details: e.message });
  }
});
router24.put("/:id", requirePermission("supplier", "edit"), async (req, res) => {
  try {
    const data = req.body;
    const [updated] = await db.update(suppliers).set({
      name: data.name?.toUpperCase(),
      document: data.document?.toUpperCase(),
      phone: data.phone,
      email: data.email?.toLowerCase(),
      address: data.address?.toUpperCase(),
      city: data.city?.toUpperCase(),
      country: data.country?.toUpperCase(),
      observations: data.observations?.toUpperCase(),
      isActive: data.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq28(suppliers.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "N\xE3o encontrado" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao atualizar fornecedor", details: e.message });
  }
});
router24.patch("/:id/archive", requirePermission("supplier", "archive"), async (req, res) => {
  try {
    const [updated] = await db.update(suppliers).set({
      isActive: false,
      deletedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq28(suppliers.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "N\xE3o encontrado" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao arquivar fornecedor", details: e.message });
  }
});
router24.delete("/:id/hard-delete", requirePermission("supplier", "delete"), async (req, res) => {
  try {
    const id = req.params.id;
    const history = await db.select().from(purchaseOrders).where(eq28(purchaseOrders.supplierId, id)).limit(1);
    if (history.length > 0) {
      return res.status(400).json({ error: "Fornecedor possui compras. Arquive em vez de excluir." });
    }
    await db.delete(suppliers).where(eq28(suppliers.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Erro ao excluir fornecedor", details: e.message });
  }
});
var suppliers_default = router24;

// src/server/purchases.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router26 } from "express";
import { eq as eq30, or as or6, and as and25, desc as desc16 } from "drizzle-orm";
import multer3 from "multer";

// src/server/ocrService.ts
var OCR_JSON_SHAPE = `{
  "supplier": {"name":"string","document":"string opcional"},
  "invoice": {"number":"string","date":"YYYY-MM-DD opcional","total":0},
  "items": [{"sku":"opcional","upc":"opcional","name":"string","quantity":1,"unitCost":0,"totalCost":0,"confidence":0.0,"rawText":"opcional"}],
  "rawText":"texto detectado opcional",
  "warnings":["avisos opcionais"]
}`;
function normalizeOcrResult(value) {
  const supplier = value?.supplier && typeof value.supplier === "object" ? value.supplier : {};
  const invoice = value?.invoice && typeof value.invoice === "object" ? value.invoice : {};
  const items = Array.isArray(value?.items) ? value.items : [];
  return {
    supplier: {
      name: String(supplier.name || "N\xE3o informado"),
      ...supplier.document ? { document: String(supplier.document) } : {}
    },
    invoice: {
      number: String(invoice.number || "N\xE3o informado"),
      ...invoice.date ? { date: String(invoice.date) } : {},
      ...Number.isFinite(Number(invoice.total)) ? { total: Number(invoice.total) } : {}
    },
    items: items.filter((item) => item && typeof item === "object").slice(0, 250).map((item) => ({
      ...item.sku ? { sku: String(item.sku) } : {},
      ...item.upc ? { upc: String(item.upc) } : {},
      name: String(item.name || "Item n\xE3o identificado"),
      quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
      unitCost: Number(item.unitCost) || 0,
      ...Number.isFinite(Number(item.totalCost)) ? { totalCost: Number(item.totalCost) } : {},
      confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
      ...item.rawText ? { rawText: String(item.rawText) } : {}
    })),
    ...value?.rawText ? { rawText: String(value.rawText) } : {},
    ...Array.isArray(value?.warnings) ? { warnings: value.warnings.map(String).slice(0, 30) } : {}
  };
}
async function processImageWithOllama(fileBuffer, language) {
  const outputLanguage = language?.toLowerCase().startsWith("es") ? "Spanish (Paraguay)" : "Brazilian Portuguese";
  const base64Data = fileBuffer.toString("base64");
  const prompt = `Analise esta imagem de nota fiscal, fatura comercial ou recibo de compra.
Extraia fornecedor, documento fiscal, n\xFAmero/data/total da nota e todos os itens vis\xEDveis com SKU/c\xF3digo, UPC/EAN/GTIN, descri\xE7\xE3o, quantidade, custo unit\xE1rio, total da linha, confian\xE7a de 0 a 1 e texto bruto quando \xFAtil.
N\xE3o invente valores que n\xE3o estejam leg\xEDveis. Se algo estiver incerto, registre um aviso.
Todos os avisos e observa\xE7\xF5es devem estar em ${outputLanguage}.
Retorne APENAS JSON v\xE1lido neste formato: ${OCR_JSON_SHAPE}`;
  const text2 = await ollamaChat({
    model: getOllamaModel("vision"),
    messages: [{ role: "user", content: prompt, images: [base64Data] }],
    temperature: 0,
    json: true,
    timeoutMs: 58e3
  });
  return normalizeOcrResult(extractJsonObject(text2));
}
async function processPdfWithOllama() {
  throw new Error("OCR_PDF_NEEDS_IMAGE");
}
async function processInvoiceOcr(fileBuffer, mimeType, language = "pt") {
  try {
    if (mimeType === "application/pdf") {
      return await processPdfWithOllama();
    }
    if (!mimeType.startsWith("image/")) {
      throw new Error("OCR_UNSUPPORTED_TYPE");
    }
    return await processImageWithOllama(fileBuffer, language);
  } catch (error) {
    if (error?.message === "OCR_PDF_NEEDS_IMAGE") {
      throw new Error("PDF ainda precisa ser convertido para imagem antes do OCR com Ollama. Envie JPG, PNG ou WEBP.");
    }
    if (error?.message === "OCR_UNSUPPORTED_TYPE") {
      throw new Error("Formato n\xE3o suportado para OCR.");
    }
    const info = getOllamaErrorInfo(error);
    if (info.notConfigured) {
      throw new Error("OCR com Ollama n\xE3o configurado. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL.");
    }
    console.error("OCR extraction failed:", info.message || error?.message || error);
    throw new Error(error?.message || "Erro no processamento OCR.");
  }
}

// src/server/payables.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router25 } from "express";
import { and as and24, desc as desc15, eq as eq29 } from "drizzle-orm";
var router25 = Router25();
router25.use(requireAuth);
async function createPayableForPurchase(tx, order, userId) {
  const amount = Number(order.totalAmount || 0);
  if (amount <= 0) return;
  const existing = await tx.select({ id: payables.id }).from(payables).where(and24(eq29(payables.source, "PURCHASE"), eq29(payables.referenceId, order.id))).limit(1);
  if (existing.length > 0) return;
  await tx.insert(payables).values({
    source: "PURCHASE",
    referenceId: order.id,
    supplierId: order.supplierId || null,
    description: `Compra ${order.invoiceNumber || order.id.slice(0, 8)}`,
    amountUsd: amount.toFixed(2),
    paidAmount: "0",
    dueDate: order.paymentDueDate || null,
    status: "PENDING",
    notes: order.payableNotes || null,
    createdBy: userId || null
  });
}
router25.get("/", requirePermission("cash", "view"), async (req, res) => {
  try {
    const onlyOverdue = String(req.query.overdue || "") === "true";
    const includePaid = String(req.query.includePaid || "") === "true";
    const rows = await db.select({
      id: payables.id,
      source: payables.source,
      description: payables.description,
      supplierName: suppliers.name,
      amountUsd: payables.amountUsd,
      paidAmount: payables.paidAmount,
      dueDate: payables.dueDate,
      status: payables.status,
      paidAt: payables.paidAt,
      createdAt: payables.createdAt
    }).from(payables).leftJoin(suppliers, eq29(payables.supplierId, suppliers.id)).orderBy(desc15(payables.createdAt)).limit(500);
    const now = Date.now();
    let data = rows.filter((r) => includePaid || r.status !== "PAID").map((r) => {
      const outstanding = Math.round(Math.max(0, Number(r.amountUsd) - Number(r.paidAmount)) * 100) / 100;
      const due = r.dueDate ? new Date(r.dueDate).getTime() : null;
      const daysToDue = due !== null ? Math.ceil((due - now) / (1e3 * 60 * 60 * 24)) : null;
      const overdue = due !== null && due < now && r.status !== "PAID";
      return { ...r, outstanding, daysToDue, overdue };
    });
    if (onlyOverdue) data = data.filter((d) => d.overdue);
    const summary = data.reduce((acc, d) => {
      acc.totalOutstanding += d.outstanding;
      if (d.overdue) {
        acc.overdueCount += 1;
        acc.overdueAmount += d.outstanding;
      }
      return acc;
    }, { count: data.length, totalOutstanding: 0, overdueCount: 0, overdueAmount: 0 });
    summary.totalOutstanding = Math.round(summary.totalOutstanding * 100) / 100;
    summary.overdueAmount = Math.round(summary.overdueAmount * 100) / 100;
    res.json({ data, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router25.post("/", requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const { description, amountUsd, dueDate, supplierId, notes } = req.body || {};
    const amount = Number(amountUsd);
    if (!description || !String(description).trim()) return res.status(400).json({ error: "Descri\xE7\xE3o \xE9 obrigat\xF3ria." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });
    const [row] = await db.insert(payables).values({
      source: "MANUAL",
      supplierId: supplierId || null,
      description: String(description).trim(),
      amountUsd: amount.toFixed(2),
      paidAmount: "0",
      dueDate: dueDate ? new Date(String(dueDate)) : null,
      status: "PENDING",
      notes: notes ? String(notes).trim() : null,
      createdBy: req.user.userId
    }).returning();
    await logAction(req.user.userId, "CREATE", "payables", row.id, null, { description, amountUsd: amount });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router25.post("/:id/pay", requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const { amount, accountId } = req.body || {};
    if (!accountId) return res.status(400).json({ error: "Escolha a conta de onde o dinheiro sai." });
    const result = await db.transaction(async (tx) => {
      const rows = await tx.select().from(payables).where(eq29(payables.id, req.params.id)).limit(1).for("update");
      if (rows.length === 0) throw new Error("T\xEDtulo n\xE3o encontrado.");
      const p = rows[0];
      if (p.status === "PAID") throw new Error("T\xEDtulo j\xE1 est\xE1 pago.");
      const [acc] = await tx.select().from(financialAccounts).where(eq29(financialAccounts.id, accountId)).limit(1);
      if (!acc) throw new Error("Conta financeira inv\xE1lida.");
      if (acc.type === "CARD_RECEIVABLE") throw new Error("Conta de cart\xE3o a receber n\xE3o pode pagar contas.");
      const total = Number(p.amountUsd);
      const alreadyPaid = Number(p.paidAmount);
      const remaining = Math.max(0, total - alreadyPaid);
      const payNum = amount !== void 0 && amount !== null && amount !== "" ? Number(amount) : remaining;
      if (!Number.isFinite(payNum) || payNum <= 0) throw new Error("Valor de pagamento inv\xE1lido.");
      const applied = Math.min(Math.round(payNum * 100) / 100, remaining);
      const newPaid = Math.round((alreadyPaid + applied) * 100) / 100;
      const status = newPaid >= total - MONEY_EPSILON ? "PAID" : "PARTIAL";
      await tx.update(payables).set({
        paidAmount: newPaid.toFixed(2),
        status,
        paidAt: status === "PAID" ? /* @__PURE__ */ new Date() : p.paidAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq29(payables.id, p.id));
      const conv = await convertBrlToAccountCurrency(applied, String(acc.currency || "BRL"));
      const fxNote = String(acc.currency || "BRL") !== "BRL" ? ` - R$ ${applied.toFixed(2)} -> ${acc.currency} ${conv.amount.toFixed(2)} (cambio do dia)` : "";
      await postMovement(tx, accountId, "EXPENSE", -conv.amount, {
        referenceType: "payable",
        referenceId: p.id,
        userId: req.user.userId,
        description: `Pagamento: ${p.description}${fxNote}`
      });
      return { status, paidAmount: newPaid.toFixed(2) };
    });
    await logAction(req.user.userId, "PAY", "payables", req.params.id, null, result);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router25.delete("/:id", requirePermission("expenses", "manage"), async (req, res) => {
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(payables).where(eq29(payables.id, req.params.id)).limit(1).for("update");
      if (rows.length === 0) throw new Error("T\xEDtulo n\xE3o encontrado.");
      const p = rows[0];
      if (p.source !== "MANUAL") throw new Error("Somente t\xEDtulos manuais podem ser exclu\xEDdos.");
      if (Number(p.paidAmount) > 0) {
        const movs = await tx.select().from(accountMovements).where(and24(eq29(accountMovements.referenceType, "payable"), eq29(accountMovements.referenceId, p.id)));
        for (const m of movs) {
          const amt = Number(m.amountUsd);
          if (amt === 0) continue;
          await postMovement(tx, m.accountId, "ADJUSTMENT", -amt, {
            referenceType: "payable",
            referenceId: p.id,
            userId: req.user.userId,
            description: `Estorno: t\xEDtulo "${p.description}" exclu\xEDdo`
          });
        }
      }
      await tx.delete(payables).where(eq29(payables.id, p.id));
      await logAction(req.user.userId, "DELETE", "payables", p.id, p, null);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var payables_default = router25;

// src/server/purchases.ts
init_fx();
import { v4 as uuidv415 } from "uuid";
import fs4 from "fs";
import path4 from "path";
import xlsx from "xlsx";
import Papa from "papaparse";
var router26 = Router26();
router26.use(requireAuth);
var upload3 = multer3({ storage: multer3.memoryStorage() });
router26.post("/import/spreadsheet", requirePermission("purchase", "import"), upload3.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const ext = req.file.originalname.split(".").pop()?.toLowerCase();
    let rawData = [];
    if (ext === "csv") {
      const csv = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else if (ext === "xlsx") {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ error: "Formato de arquivo inv\xE1lido. Apenas .csv e .xlsx s\xE3o suportados" });
    }
    const mapped = rawData.map((r) => {
      const row = {};
      for (let key in r) {
        row[key.toUpperCase()] = r[key];
      }
      return {
        sku: row.SKU || "",
        upc: row.UPC || "",
        productName: row.PRODUTO || "",
        brand: row.MARCA || "",
        model: row.MODELO || "",
        group: row.GRUPO || "",
        subgroup: row.SUBGRUPO || "",
        shelf: row.PRATELEIRA || "",
        quantity: Number(row.QUANTIDADE) || 0,
        costPrice: Number(row.CUSTO) || 0,
        salePriceA: Number(row.PRECO_A) || 0,
        salePriceB: Number(row.PRECO_B) || 0,
        hasSerialNumber: String(row.CONTROLA_SN).toUpperCase() === "SIM" || String(row.CONTROLA_SN).toUpperCase() === "TRUE" || String(row.CONTROLA_SN) === "1",
        serials: row.SERIAIS ? String(row.SERIAIS).split(",").map((s) => s.trim()) : []
      };
    });
    res.json({ data: mapped });
  } catch (e) {
    res.status(500).json({ error: "Erro ao ler planilha", details: e.message });
  }
});
router26.post("/ocr", requirePermission("purchase", "ocr"), upload3.single("file"), async (req, res) => {
  const jobId = uuidv415();
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato de arquivo inv\xE1lido. Formatos suportados: JPG, JPEG, PNG, WEBP, PDF." });
    }
    const maxBytes = 4 * 1024 * 1024;
    if (req.file.size > maxBytes) {
      return res.status(400).json({ error: "O tamanho do arquivo excede o limite de 4 MB." });
    }
    const persistentFilePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    await db.insert(purchaseOcrJobs).values({
      id: jobId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: persistentFilePath,
      status: "PROCESSING",
      createdBy: req.user?.userId || null
    });
    const lang = req.body.language || "pt";
    const ocrResult = await processInvoiceOcr(req.file.buffer, req.file.mimetype, lang);
    await db.update(purchaseOcrJobs).set({
      status: "COMPLETED",
      rawText: ocrResult.rawText || "",
      parsedJson: JSON.stringify(ocrResult),
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq30(purchaseOcrJobs.id, jobId));
    res.json({
      jobId,
      ...ocrResult
    });
  } catch (err) {
    console.error("OCR Route error:", err);
    try {
      const [jobExists] = await db.select().from(purchaseOcrJobs).where(eq30(purchaseOcrJobs.id, jobId)).limit(1);
      if (jobExists) {
        await db.update(purchaseOcrJobs).set({
          status: "FAILED",
          errorMessage: err.message || "Erro desconhecido durante o processamento OCR.",
          completedAt: /* @__PURE__ */ new Date()
        }).where(eq30(purchaseOcrJobs.id, jobId));
      } else {
        await db.insert(purchaseOcrJobs).values({
          id: jobId,
          fileName: req.file ? req.file.originalname : "unknown",
          fileType: req.file ? req.file.mimetype : "unknown",
          fileSize: req.file ? req.file.size : 0,
          status: "FAILED",
          errorMessage: err.message || "Erro durante o upload/processamento.",
          createdBy: req.user?.userId || null,
          completedAt: /* @__PURE__ */ new Date()
        });
      }
    } catch (dbErr) {
      console.error("Failed to update failing job in DB", dbErr);
    }
    res.status(500).json({ error: err.message || "Falha ao processar o arquivo via OCR." });
  }
});
router26.get("/ocr/jobs", requirePermission("purchase", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: purchaseOcrJobs.id,
      fileName: purchaseOcrJobs.fileName,
      fileType: purchaseOcrJobs.fileType,
      fileSize: purchaseOcrJobs.fileSize,
      filePath: purchaseOcrJobs.filePath,
      status: purchaseOcrJobs.status,
      rawText: purchaseOcrJobs.rawText,
      errorMessage: purchaseOcrJobs.errorMessage,
      createdAt: purchaseOcrJobs.createdAt,
      completedAt: purchaseOcrJobs.completedAt,
      purchaseId: purchaseOrders.id,
      purchaseStatus: purchaseOrders.status
    }).from(purchaseOcrJobs).leftJoin(purchaseOrders, eq30(purchaseOcrJobs.id, purchaseOrders.ocrJobId)).orderBy(desc16(purchaseOcrJobs.createdAt));
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar hist\xF3rico de OCR", details: err.message });
  }
});
router26.get("/ocr/jobs/:id", requirePermission("purchase", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: purchaseOcrJobs.id,
      fileName: purchaseOcrJobs.fileName,
      fileType: purchaseOcrJobs.fileType,
      fileSize: purchaseOcrJobs.fileSize,
      filePath: purchaseOcrJobs.filePath,
      status: purchaseOcrJobs.status,
      rawText: purchaseOcrJobs.rawText,
      parsedJson: purchaseOcrJobs.parsedJson,
      errorMessage: purchaseOcrJobs.errorMessage,
      createdAt: purchaseOcrJobs.createdAt,
      completedAt: purchaseOcrJobs.completedAt,
      purchaseId: purchaseOrders.id,
      purchaseStatus: purchaseOrders.status
    }).from(purchaseOcrJobs).leftJoin(purchaseOrders, eq30(purchaseOcrJobs.id, purchaseOrders.ocrJobId)).where(eq30(purchaseOcrJobs.id, req.params.id)).limit(1);
    if (!list.length) {
      return res.status(404).json({ error: "Trabalho OCR n\xE3o encontrado" });
    }
    const job = list[0];
    let parsed = null;
    if (job.parsedJson) {
      try {
        parsed = JSON.parse(job.parsedJson);
      } catch (e) {
        console.error("Failed to parse OCR parsed_json", e);
      }
    }
    res.json({
      id: job.id,
      fileName: job.fileName,
      fileType: job.fileType,
      fileSize: job.fileSize,
      filePath: job.filePath,
      status: job.status,
      rawText: job.rawText,
      parsedJson: parsed,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      purchaseId: job.purchaseId,
      purchaseStatus: job.purchaseStatus
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar detalhes do trabalho OCR", details: err.message });
  }
});
router26.delete("/ocr/jobs/:id", requirePermission("purchase", "ocr"), async (req, res) => {
  try {
    const jobId = req.params.id;
    const [job] = await db.select().from(purchaseOcrJobs).where(eq30(purchaseOcrJobs.id, jobId)).limit(1);
    if (!job) {
      return res.status(404).json({ error: "Trabalho OCR n\xE3o encontrado" });
    }
    if (job.filePath && String(job.filePath).startsWith("/uploads/")) {
      const localPath = path4.join(process.cwd(), String(job.filePath).replace(/^\//, ""));
      if (fs4.existsSync(localPath)) {
        try {
          fs4.unlinkSync(localPath);
        } catch (e) {
          console.error(`Failed to delete physical file: ${localPath}`, e);
        }
      }
    }
    await db.delete(purchaseOcrJobs).where(eq30(purchaseOcrJobs.id, jobId));
    res.json({ success: true, message: "Hist\xF3rico OCR exclu\xEDdo com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir hist\xF3rico de OCR", details: err.message });
  }
});
async function attachOcrInvoiceToSupplier(tx, data, purchaseOrderId, userId) {
  if (!data?.supplierId || !data?.ocrJobId) return;
  const [job] = await tx.select().from(purchaseOcrJobs).where(eq30(purchaseOcrJobs.id, data.ocrJobId)).limit(1);
  if (!job || !job.filePath) return;
  const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
  const [existing] = await tx.select().from(supplierInvoiceFiles).where(eq30(supplierInvoiceFiles.ocrJobId, data.ocrJobId)).limit(1);
  let persistentFilePath = job.filePath;
  if (String(job.filePath).startsWith("/uploads/")) {
    try {
      const localPath = path4.join(process.cwd(), String(job.filePath).replace(/^\//, ""));
      if (fs4.existsSync(localPath) && job.fileType) {
        const fileBuffer = await fs4.promises.readFile(localPath);
        persistentFilePath = `data:${job.fileType};base64,${fileBuffer.toString("base64")}`;
      }
    } catch {
    }
  }
  const values = {
    supplierId: data.supplierId,
    purchaseOrderId,
    ocrJobId: data.ocrJobId,
    fileName: job.fileName || `OCR ${data.ocrJobId}`,
    fileType: job.fileType || null,
    fileSize: job.fileSize || null,
    filePath: persistentFilePath,
    invoiceNumber: data.invoiceNumber ? String(data.invoiceNumber).toUpperCase() : null,
    invoiceDate: invoiceDate && !Number.isNaN(invoiceDate.getTime()) ? invoiceDate : null,
    observations: data.notes ? String(data.notes).toUpperCase() : "SALVA AUTOMATICAMENTE VIA OCR",
    source: "OCR",
    createdBy: userId || null,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (existing) {
    await tx.update(supplierInvoiceFiles).set(values).where(eq30(supplierInvoiceFiles.id, existing.id));
    return;
  }
  await tx.insert(supplierInvoiceFiles).values(values);
}
async function approvePurchaseOrder(tx, orderId, userId) {
  const [order] = await tx.select().from(purchaseOrders).where(eq30(purchaseOrders.id, orderId)).limit(1);
  if (!order) throw new Error("Compra n\xE3o encontrada");
  if (order.status !== "DRAFT") throw new Error("Apenas compras em rascunho podem ser aprovadas");
  const items = await tx.select().from(purchaseOrderItems).where(eq30(purchaseOrderItems.purchaseOrderId, order.id));
  const duplicateErrors = {};
  const orderCurrency = String(order.currency || "BRL");
  let fxToBrl = Number(order.fxRateToBrl) || 0;
  if (!(fxToBrl > 0)) {
    if (orderCurrency === "BRL") fxToBrl = 1;
    else {
      const rates = await resolveRates();
      fxToBrl = orderCurrency === "USD" ? rates.USDBRL?.rate || 0 : orderCurrency === "PYG" ? rates.BRLPYG?.rate ? 1 / rates.BRLPYG.rate : 0 : orderCurrency === "USDT" ? rates.USDTBRL?.rate || 0 : 0;
      if (!(fxToBrl > 0)) throw new Error(`Sem c\xE2mbio ${orderCurrency}\u2192BRL. Informe o c\xE2mbio na compra ou em Financeiro > C\xE2mbio de hoje.`);
    }
    await tx.update(purchaseOrders).set({ fxRateToBrl: fxToBrl.toFixed(6) }).where(eq30(purchaseOrders.id, order.id));
  }
  const totalUnits = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const freightPerUnit = totalUnits > 0 ? Number(order.freightAmount || 0) / totalUnits : 0;
  const landedUnitBrl = (costInOrderCurrency) => Math.round(((Number(costInOrderCurrency) || 0) + freightPerUnit) * fxToBrl * 1e4) / 1e4;
  for (const [idx, item] of items.entries()) {
    if (item.quantity <= 0) {
      duplicateErrors[`items.${idx}.quantity`] = "Quantidade deve ser maior que zero.";
    }
    if (Number(item.costPrice) < 0) {
      duplicateErrors[`items.${idx}.costPrice`] = "Custo n\xE3o pode ser negativo.";
    }
    let activeProductId = item.productId;
    let pA = Number(item.salePriceA);
    let pB = item.salePriceB && Number(item.salePriceB) > 0 ? Number(item.salePriceB) : pA;
    let pC = pA;
    if (!activeProductId) {
      if (!item.sku || !item.productName) throw new Error(`[{Item ID: ${item.id}}] Campos obrigat\xF3rios faltando para o novo produto (Nome ou SKU).`);
      if (!item.groupId || !item.shelfId) throw new Error(`[{Item ID: ${item.id}}] Produto novo precisa de grupo e prateleira.`);
      if (pA <= 0) duplicateErrors[`items.${idx}.salePriceA`] = "Pre\xE7o A deve ser maior que zero para novo produto.";
      const [existing] = await tx.select().from(products).where(
        or6(
          eq30(products.sku, item.sku.toUpperCase()),
          item.upc ? eq30(products.upc, item.upc.toUpperCase()) : void 0
        )
      ).limit(1);
      if (existing) {
        if (existing.sku === item.sku.toUpperCase()) duplicateErrors[`items.${idx}.sku`] = `SKU '${item.sku}' j\xE1 cadastrado no sistema.`;
        if (item.upc && existing.upc === item.upc?.toUpperCase()) duplicateErrors[`items.${idx}.upc`] = `UPC '${item.upc}' j\xE1 cadastrado.`;
      } else {
        const [insertedProduct] = await tx.insert(products).values({
          sku: item.sku.toUpperCase(),
          upc: item.upc?.toUpperCase(),
          name: item.productName.toUpperCase(),
          // Custo do produto é SEMPRE em BRL: (custo na moeda + frete rateado) × câmbio da data.
          costPrice: landedUnitBrl(item.costPrice).toFixed(4),
          salePriceA: pA.toString(),
          salePriceB: pB.toString(),
          groupId: item.groupId,
          subgroupId: item.subgroupId || null,
          shelfId: item.shelfId,
          hasSerialNumber: item.hasSerialNumber,
          unitMeasure: "UN"
        }).returning();
        activeProductId = insertedProduct.id;
        await tx.update(purchaseOrderItems).set({ productId: activeProductId, status: "MAPPED" }).where(eq30(purchaseOrderItems.id, item.id));
      }
    } else {
      const [existingProd] = await tx.select().from(products).where(eq30(products.id, activeProductId)).limit(1);
      if (existingProd) {
        if (existingProd.hasSerialNumber && !item.hasSerialNumber) {
          duplicateErrors[`items.${idx}.serials`] = `Aten\xE7\xE3o: Este produto controla S/N. Forne\xE7a os seriais.`;
        }
        const updates = {};
        let hasUpdates = false;
        const oldValues = {};
        const newValues = {};
        if (item.updateCost) {
          const costBrl = landedUnitBrl(item.costPrice).toFixed(4);
          updates.costPrice = costBrl;
          oldValues.costPrice = existingProd.costPrice;
          newValues.costPrice = costBrl;
          hasUpdates = true;
        }
        if (item.updatePriceA) {
          updates.salePriceA = pA.toString();
          oldValues.salePriceA = existingProd.salePriceA;
          newValues.salePriceA = pA.toString();
          hasUpdates = true;
        }
        if (item.updatePriceB && Number(item.salePriceB) > 0) {
          updates.salePriceB = item.salePriceB;
          oldValues.salePriceB = existingProd.salePriceB;
          newValues.salePriceB = item.salePriceB;
          hasUpdates = true;
        }
        if (hasUpdates) {
          updates.updatedAt = /* @__PURE__ */ new Date();
          await tx.update(products).set(updates).where(eq30(products.id, activeProductId));
          if (userId) {
            await tx.insert(auditLogs).values({
              userId,
              action: "UPDATE_PRODUCT_FROM_PURCHASE",
              tableName: "products",
              recordId: activeProductId,
              oldValues: JSON.stringify(oldValues),
              newValues: JSON.stringify(newValues)
            });
          }
        }
      }
    }
    const requireSerial = activeProductId ? (await tx.select().from(products).where(eq30(products.id, activeProductId)).limit(1))[0]?.hasSerialNumber : item.hasSerialNumber;
    if (requireSerial) {
      const serials = await tx.select().from(purchaseOrderSerials).where(eq30(purchaseOrderSerials.purchaseOrderItemId, item.id));
      if (serials.length !== item.quantity) {
        duplicateErrors[`items.${idx}.serials`] = `Produto requer ${item.quantity} seriais, possui apenas ${serials.length}.`;
      }
      const duplicatesFound = [];
      for (const sn of serials) {
        if (!activeProductId) continue;
        const [existingSn] = await tx.select().from(productSerials).where(and25(eq30(productSerials.productId, activeProductId), eq30(productSerials.serialNumber, sn.serialNumber.toUpperCase()))).limit(1);
        if (existingSn) {
          duplicatesFound.push(sn.serialNumber);
        } else {
          await tx.insert(productSerials).values({
            productId: activeProductId,
            serialNumber: sn.serialNumber.toUpperCase(),
            status: "AVAILABLE"
          });
          await tx.update(purchaseOrderSerials).set({ status: "IMPORTED", productId: activeProductId }).where(eq30(purchaseOrderSerials.id, sn.id));
        }
      }
      if (duplicatesFound.length > 0) {
        duplicateErrors[`items.${idx}.serials`] = `Seriais j\xE1 existentes: ${duplicatesFound.join(", ")}`;
      }
    }
    if (Object.keys(duplicateErrors).length === 0 && activeProductId) {
      let [sb] = await tx.select().from(stockBalances).where(eq30(stockBalances.productId, activeProductId)).limit(1);
      let beforePhys = 0;
      let beforeRes = 0;
      if (!sb) {
        const [newSb] = await tx.insert(stockBalances).values({
          productId: activeProductId,
          physicalStock: item.quantity,
          reservedStock: 0
        }).returning();
        sb = newSb;
      } else {
        beforePhys = sb.physicalStock;
        beforeRes = sb.reservedStock;
        [sb] = await tx.update(stockBalances).set({
          physicalStock: sb.physicalStock + item.quantity,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq30(stockBalances.productId, activeProductId)).returning();
      }
      if (userId) {
        await tx.insert(stockMovements).values({
          productId: activeProductId,
          movementType: "PURCHASE",
          quantity: item.quantity,
          referenceId: order.id,
          beforePhysical: beforePhys,
          afterPhysical: sb.physicalStock,
          beforeReserved: beforeRes,
          afterReserved: sb.reservedStock,
          notes: `Entrada via compra ${order.invoiceNumber || order.id}`,
          userId
        });
      }
      if (item.lotNumber && String(item.lotNumber).trim()) {
        await addLotStock(tx, activeProductId, String(item.lotNumber), item.quantity, item.expiryDate ? new Date(item.expiryDate) : null);
      }
      await addCostLayer(tx, {
        productId: activeProductId,
        qty: item.quantity,
        unitCostBrl: landedUnitBrl(item.costPrice),
        purchaseOrderId: order.id,
        sourceCurrency: orderCurrency,
        fxRate: fxToBrl,
        note: `Compra ${order.invoiceNumber || order.id.slice(0, 8)}`
      });
    }
  }
  if (Object.keys(duplicateErrors).length > 0) {
    throw { name: "ValidationError", message: "Dados inv\xE1lidos.", fields: duplicateErrors };
  }
  const [updated] = await tx.update(purchaseOrders).set({
    status: "APPROVED",
    approvedBy: userId,
    approvedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq30(purchaseOrders.id, order.id)).returning();
  const itemsTotalNative = items.reduce((s, i) => s + (Number(i.costPrice) || 0) * (Number(i.quantity) || 0), 0);
  const payableTotalBrl = Math.round((itemsTotalNative + Number(order.freightAmount || 0)) * fxToBrl * 100) / 100;
  await createPayableForPurchase(tx, {
    ...updated,
    totalAmount: payableTotalBrl,
    payableNotes: orderCurrency !== "BRL" ? `Compra em ${orderCurrency}: ${itemsTotalNative.toFixed(2)} + frete ${Number(order.freightAmount || 0).toFixed(2)} \xB7 c\xE2mbio ${fxToBrl.toFixed(4)} = R$ ${payableTotalBrl.toFixed(2)}` : null
  }, userId);
  if (userId) {
    await tx.insert(auditLogs).values({
      userId,
      action: "APPROVE_PURCHASE",
      tableName: "purchase_orders",
      recordId: order.id,
      newValues: JSON.stringify({ status: "APPROVED" })
    });
  }
  return updated;
}
router26.post("/import/confirm", requirePermission("purchase", "import"), async (req, res) => {
  try {
    const data = req.body;
    if (!data.supplierId) return res.status(400).json({ error: "Fornecedor \xE9 obrigat\xF3rio." });
    if (!data.items || !data.items.length) return res.status(400).json({ error: "Pelo menos 1 item \xE9 obrigat\xF3rio." });
    const newOrder = await db.transaction(async (tx) => {
      const [order] = await tx.insert(purchaseOrders).values({
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        currency: isValidCurrency(data.currency) ? data.currency : "USD",
        fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
        freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
        notes: data.notes || null,
        status: "DRAFT",
        createdBy: req.user?.userId,
        totalAmount: data.items.reduce((acc, cur) => acc + Number(cur.quantity) * Number(cur.costPrice), 0).toString(),
        ocrJobId: data.ocrJobId || null
      }).returning();
      for (const item of data.items) {
        const [pi] = await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: order.id,
          productId: item.productId || null,
          sku: item.sku?.toUpperCase() || null,
          upc: item.upc?.toUpperCase() || null,
          productName: item.productName?.toUpperCase() || null,
          quantity: Number(item.quantity),
          lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          costPrice: item.costPrice?.toString() || "0",
          salePriceA: item.salePriceA?.toString() || "0",
          salePriceB: item.salePriceB?.toString() || "0",
          shelfId: item.shelfId || null,
          groupId: item.groupId || null,
          subgroupId: item.subgroupId || null,
          hasSerialNumber: item.hasSerialNumber || false,
          updateCost: item.updateCost ?? true,
          updatePriceA: item.updatePriceA ?? true,
          updatePriceB: item.updatePriceB ?? false,
          status: item.productId ? "MAPPED" : "NEW_PRODUCT"
        }).returning();
        if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
          for (const sn of item.serials) {
            await tx.insert(purchaseOrderSerials).values({
              purchaseOrderItemId: pi.id,
              productId: item.productId || null,
              serialNumber: sn.toUpperCase(),
              status: "PENDING"
            });
          }
        }
      }
      await attachOcrInvoiceToSupplier(tx, data, order.id, req.user?.userId);
      return order;
    });
    let returnedOrder = newOrder;
    if (data.autoApprove) {
      try {
        await db.transaction(async (tx) => {
          returnedOrder = await approvePurchaseOrder(tx, newOrder.id, req.user?.userId);
        });
      } catch (e) {
        if (e.name === "ValidationError") {
          return res.status(400).json({ error: e.message, fields: e.fields });
        }
        throw e;
      }
    }
    res.status(201).json(returnedOrder);
  } catch (e) {
    res.status(500).json({ error: "Erro ao confirmar importa\xE7\xE3o", details: e.message });
  }
});
router26.get("/", requirePermission("purchase", "view"), async (req, res) => {
  try {
    const list = await db.select({
      id: purchaseOrders.id,
      invoiceNumber: purchaseOrders.invoiceNumber,
      invoiceDate: purchaseOrders.invoiceDate,
      currency: purchaseOrders.currency,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.createdAt,
      supplier: {
        name: suppliers.name
      }
    }).from(purchaseOrders).leftJoin(suppliers, eq30(purchaseOrders.supplierId, suppliers.id)).orderBy(desc16(purchaseOrders.createdAt));
    res.json({
      data: list,
      total: list.length,
      page: 1,
      limit: 50
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar compras", details: e.message });
  }
});
router26.get("/:id", requirePermission("purchase", "view"), async (req, res) => {
  try {
    const pData = await db.select().from(purchaseOrders).leftJoin(suppliers, eq30(purchaseOrders.supplierId, suppliers.id)).where(eq30(purchaseOrders.id, req.params.id)).limit(1);
    if (!pData.length) return res.status(404).json({ error: "N\xE3o encontrado" });
    const items = await db.select().from(purchaseOrderItems).where(eq30(purchaseOrderItems.purchaseOrderId, req.params.id));
    const serials = await db.select().from(purchaseOrderSerials).innerJoin(purchaseOrderItems, eq30(purchaseOrderSerials.purchaseOrderItemId, purchaseOrderItems.id)).where(eq30(purchaseOrderItems.purchaseOrderId, req.params.id));
    res.json({
      purchase: pData[0].purchase_orders,
      supplier: pData[0].suppliers,
      items: items.map((i) => ({
        ...i,
        serials: serials.filter((s) => s.purchase_order_serials.purchaseOrderItemId === i.id).map((s) => s.purchase_order_serials)
      }))
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar compra", details: e.message });
  }
});
router26.post("/", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const data = req.body;
    const fields = {};
    if (!data.supplierId) fields["supplierId"] = "Fornecedor \xE9 obrigat\xF3rio.";
    if (!data.items || !data.items.length) fields["items"] = "Pelo menos 1 item \xE9 obrigat\xF3rio.";
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, idx) => {
        if (!item.productId) {
          if (!item.sku) fields[`items.${idx}.sku`] = "SKU \xE9 obrigat\xF3rio para produto novo.";
          if (!item.productName) fields[`items.${idx}.productName`] = "Nome \xE9 obrigat\xF3rio para produto novo.";
          if (!item.groupId) fields[`items.${idx}.groupId`] = "Grupo \xE9 obrigat\xF3rio para produto novo.";
          if (!item.shelfId) fields[`items.${idx}.shelfId`] = "Prateleira \xE9 obrigat\xF3ria para produto novo.";
        }
      });
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    const newOrder = await db.transaction(async (tx) => {
      const [order] = await tx.insert(purchaseOrders).values({
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        currency: isValidCurrency(data.currency) ? data.currency : "USD",
        fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
        freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
        notes: data.notes || null,
        status: "DRAFT",
        createdBy: req.user?.userId,
        totalAmount: data.items.reduce((acc, cur) => acc + Number(cur.quantity) * Number(cur.costPrice), 0).toString(),
        ocrJobId: data.ocrJobId || null
      }).returning();
      for (const item of data.items) {
        const [pi] = await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: order.id,
          productId: item.productId || null,
          sku: item.sku?.toUpperCase() || null,
          upc: item.upc?.toUpperCase() || null,
          productName: item.productName?.toUpperCase() || null,
          quantity: Number(item.quantity),
          lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          costPrice: item.costPrice?.toString() || "0",
          salePriceA: item.salePriceA?.toString() || "0",
          salePriceB: item.salePriceB?.toString() || "0",
          shelfId: item.shelfId || null,
          groupId: item.groupId || null,
          subgroupId: item.subgroupId || null,
          hasSerialNumber: item.hasSerialNumber || false,
          updateCost: item.updateCost ?? true,
          updatePriceA: item.updatePriceA ?? true,
          updatePriceB: item.updatePriceB ?? false,
          status: item.productId ? "MAPPED" : "NEW_PRODUCT"
        }).returning();
        if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
          for (const sn of item.serials) {
            await tx.insert(purchaseOrderSerials).values({
              purchaseOrderItemId: pi.id,
              productId: item.productId || null,
              serialNumber: sn.toUpperCase(),
              status: "PENDING"
            });
          }
        }
      }
      await attachOcrInvoiceToSupplier(tx, data, order.id, req.user?.userId);
      return order;
    });
    res.status(201).json(newOrder);
  } catch (e) {
    res.status(500).json({ error: "Erro ao criar compra", details: e.message });
  }
});
router26.post("/:id/approve", requirePermission("purchase", "approve"), async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await db.transaction(async (tx) => {
      return await approvePurchaseOrder(tx, orderId, req.user?.userId);
    });
    res.json(result);
  } catch (e) {
    if (e.name === "ValidationError") {
      return res.status(400).json({ error: e.message, fields: e.fields });
    }
    res.status(500).json({ error: "Erro ao aprovar compra", details: e.message });
  }
});
router26.put("/:id", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const orderId = req.params.id;
    const data = req.body;
    const fields = {};
    if (!data.supplierId) fields["supplierId"] = "Fornecedor \xE9 obrigat\xF3rio.";
    if (!data.items || !data.items.length) fields["items"] = "Pelo menos 1 item \xE9 obrigat\xF3rio.";
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Dados inv\xE1lidos.", fields });
    }
    const updated = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(purchaseOrders).where(eq30(purchaseOrders.id, orderId)).limit(1);
      if (!order) throw new Error("Compra n\xE3o encontrada.");
      if (order.status !== "DRAFT") throw new Error("Somente rascunhos podem ser editados.");
      const [updatedOrder] = await tx.update(purchaseOrders).set({
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        currency: isValidCurrency(data.currency) ? data.currency : "USD",
        fxRateToBrl: Number(data.fxRateToBrl) > 0 ? Number(data.fxRateToBrl).toFixed(6) : null,
        freightAmount: (Number(data.freightAmount) > 0 ? Number(data.freightAmount) : 0).toFixed(2),
        notes: data.notes || null,
        totalAmount: data.items.reduce((acc, cur) => acc + Number(cur.quantity) * Number(cur.costPrice), 0).toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq30(purchaseOrders.id, orderId)).returning();
      const existingItems = await tx.select().from(purchaseOrderItems).where(eq30(purchaseOrderItems.purchaseOrderId, orderId));
      for (const it of existingItems) {
        await tx.delete(purchaseOrderSerials).where(eq30(purchaseOrderSerials.purchaseOrderItemId, it.id));
      }
      await tx.delete(purchaseOrderItems).where(eq30(purchaseOrderItems.purchaseOrderId, orderId));
      for (const item of data.items) {
        const [pi] = await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: orderId,
          productId: item.productId || null,
          sku: item.sku?.toUpperCase() || null,
          upc: item.upc?.toUpperCase() || null,
          productName: item.productName?.toUpperCase() || null,
          quantity: Number(item.quantity),
          lotNumber: item.lotNumber ? String(item.lotNumber).toUpperCase().trim() : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          costPrice: item.costPrice?.toString() || "0",
          salePriceA: item.salePriceA?.toString() || "0",
          salePriceB: item.salePriceB?.toString() || "0",
          shelfId: item.shelfId || null,
          groupId: item.groupId || null,
          subgroupId: item.subgroupId || null,
          hasSerialNumber: item.hasSerialNumber || false,
          updateCost: item.updateCost ?? true,
          updatePriceA: item.updatePriceA ?? true,
          updatePriceB: item.updatePriceB ?? false,
          status: item.productId ? "MAPPED" : "NEW_PRODUCT"
        }).returning();
        if (item.hasSerialNumber && item.serials && item.serials.length > 0) {
          for (const sn of item.serials) {
            await tx.insert(purchaseOrderSerials).values({
              purchaseOrderItemId: pi.id,
              productId: item.productId || null,
              serialNumber: sn.toUpperCase(),
              status: "PENDING"
            });
          }
        }
      }
      await attachOcrInvoiceToSupplier(tx, data, orderId, req.user?.userId);
      return updatedOrder;
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Erro ao atualizar compra", details: e.message });
  }
});
router26.post("/:id/cancel", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const orderId = req.params.id;
    const canceled = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(purchaseOrders).where(eq30(purchaseOrders.id, orderId)).limit(1);
      if (!order) throw new Error("Compra n\xE3o encontrada.");
      if (order.status !== "DRAFT") throw new Error("Apenas rascunhos podem ser cancelados diretamente.");
      const [updated] = await tx.update(purchaseOrders).set({
        status: "CANCELED",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq30(purchaseOrders.id, orderId)).returning();
      return updated;
    });
    res.json(canceled);
  } catch (e) {
    res.status(500).json({ error: "Erro ao cancelar compra", details: e.message });
  }
});
var purchases_default = router26;

// src/server/expenses.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router27 } from "express";
import { eq as eq31, desc as desc17, and as and26, gte as gte6, lte as lte6 } from "drizzle-orm";
import { v4 as uuidv416 } from "uuid";
var router27 = Router27();
router27.get("/categories", requireAuth, async (req, res) => {
  try {
    const categories = await db.select().from(expenseCategories).where(eq31(expenseCategories.isActive, true));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router27.post("/categories", requireAuth, requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const { name, type } = req.body;
    const result = await db.insert(expenseCategories).values({
      id: uuidv416(),
      name,
      type: type || "FIXED"
    }).returning();
    res.json({ success: true, category: result[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router27.get("/", requireAuth, requirePermission("expenses", "view"), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    let conditions = [];
    if (dateFrom) conditions.push(gte6(expenses.expenseDate, dayStartUtc(String(dateFrom))));
    if (dateTo) conditions.push(lte6(expenses.expenseDate, dayEndUtc(String(dateTo))));
    const results = await db.select({
      id: expenses.id,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryType: expenseCategories.type,
      description: expenses.description,
      expenseDate: expenses.expenseDate,
      amountUsd: expenses.amountUsd,
      paymentMethod: expenses.paymentMethod,
      notes: expenses.notes,
      isFixed: expenses.isFixed,
      dueDay: expenses.dueDay,
      isActive: expenses.isActive,
      recurrence: expenses.recurrence
    }).from(expenses).leftJoin(expenseCategories, eq31(expenses.categoryId, expenseCategories.id)).where(conditions.length > 0 ? and26(...conditions) : void 0).orderBy(desc17(expenses.expenseDate));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router27.post("/", requireAuth, requirePermission("expenses", "manage"), async (req, res) => {
  try {
    let { categoryId, description, expenseDate, amountUsd, paymentMethod, notes, isFixed, recurrence, dueDay, isActive } = req.body;
    if (!categoryId) {
      const outrosCat = await db.select().from(expenseCategories).where(eq31(expenseCategories.name, "OUTROS")).limit(1);
      if (outrosCat.length > 0) {
        categoryId = outrosCat[0].id;
      }
    }
    const result = await db.insert(expenses).values({
      id: uuidv416(),
      categoryId,
      description,
      expenseDate: new Date(expenseDate || Date.now()),
      amountUsd: amountUsd.toString(),
      paymentMethod,
      notes,
      isFixed,
      dueDay: dueDay ? Number(dueDay) : null,
      isActive: isActive !== void 0 ? isActive : true,
      recurrence: recurrence || "NONE",
      createdBy: req.user.userId
    }).returning();
    res.json({ success: true, expense: result[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router27.put("/:id", requireAuth, requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const { id } = req.params;
    let { categoryId, description, expenseDate, amountUsd, paymentMethod, notes, isFixed, recurrence, dueDay, isActive } = req.body;
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (categoryId === "") {
      const outrosCat = await db.select().from(expenseCategories).where(eq31(expenseCategories.name, "OUTROS")).limit(1);
      if (outrosCat.length > 0) {
        categoryId = outrosCat[0].id;
      }
    }
    if (categoryId !== void 0) updateData.categoryId = categoryId;
    if (description !== void 0) updateData.description = description;
    if (expenseDate !== void 0) updateData.expenseDate = new Date(expenseDate);
    if (amountUsd !== void 0) updateData.amountUsd = amountUsd.toString();
    if (paymentMethod !== void 0) updateData.paymentMethod = paymentMethod;
    if (notes !== void 0) updateData.notes = notes;
    if (isFixed !== void 0) updateData.isFixed = isFixed;
    if (dueDay !== void 0) updateData.dueDay = dueDay ? Number(dueDay) : null;
    if (isActive !== void 0) updateData.isActive = isActive;
    if (recurrence !== void 0) updateData.recurrence = recurrence;
    const result = await db.update(expenses).set(updateData).where(eq31(expenses.id, id)).returning();
    res.json({ success: true, expense: result[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router27.delete("/:id", requireAuth, requirePermission("expenses", "manage"), async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(expenses).where(eq31(expenses.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var expenses_default = router27;

// src/server/dashboard.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router28 } from "express";
import { and as and27, gte as gte7, lte as lte7, eq as eq32, desc as desc18, sql as sql22, inArray as inArray13, isNotNull as isNotNull3 } from "drizzle-orm";
var router28 = Router28();
var toNumber = (value) => Number(value || 0);
function isMasterRole3(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();
  return ["master", "super admin", "super_admin", "superadmin"].includes(normalized);
}
var hideMasterLogsCondition2 = sql22`lower(coalesce(${roles.name}, '')) not in ('master', 'super admin', 'super_admin', 'superadmin')`;
function getRecentAuditLogsForUser(roleName) {
  let query = db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    tableName: auditLogs.tableName,
    createdAt: auditLogs.createdAt,
    userId: auditLogs.userId,
    userName: users.name,
    recordId: auditLogs.recordId
  }).from(auditLogs).leftJoin(users, eq32(auditLogs.userId, users.id)).leftJoin(roles, eq32(users.roleId, roles.id)).$dynamic();
  if (!isMasterRole3(roleName)) {
    query = query.where(hideMasterLogsCondition2);
  }
  return query.orderBy(desc18(auditLogs.createdAt)).limit(10);
}
router28.get("/overview", requireAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : new Date((/* @__PURE__ */ new Date()).setDate(1));
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : /* @__PURE__ */ new Date();
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(fromDate.getTime() - 1 - spanMs);
    const [activeProductsCount, activeCustomersCount, salesList, variableExpensesList, fixedExpensesList, recentAuditLogs, prevSalesRows, paymentMixRows, prevCustomersRows, pageviewRows, prevPageviewsRows] = await Promise.all([
      db.select({ count: sql22`count(*)` }).from(products).where(eq32(products.isActive, true)),
      db.select({ count: sql22`count(*)` }).from(customers).where(eq32(customers.isActive, true)),
      db.select({
        id: sales.id,
        subtotalAmount: sales.subtotalAmount,
        totalAmount: sales.totalAmount,
        paymentStatus: sales.paymentStatus,
        createdAt: sales.createdAt,
        customerId: sales.customerId
      }).from(sales).where(and27(
        gte7(sales.createdAt, fromDate),
        lte7(sales.createdAt, toDate),
        sql22`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
        eq32(sales.paymentStatus, "PAID")
      )),
      db.select().from(expenses).where(and27(
        gte7(expenses.expenseDate, fromDate),
        lte7(expenses.expenseDate, toDate),
        eq32(expenses.isFixed, false)
      )),
      db.select().from(expenses).where(and27(eq32(expenses.isFixed, true), eq32(expenses.isActive, true))),
      getRecentAuditLogsForUser(req.user?.roleName),
      // Faturamento e nº de vendas do período anterior (para comparativo).
      db.select({ total: sql22`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`, count: sql22`count(*)` }).from(sales).where(and27(
        gte7(sales.createdAt, prevFrom),
        lte7(sales.createdAt, prevTo),
        sql22`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
        eq32(sales.paymentStatus, "PAID")
      )),
      // Formas de pagamento recebidas no período.
      db.select({ method: payments.paymentMethod, total: sql22`sum(cast(${payments.amountUsd} as numeric))` }).from(payments).where(and27(gte7(payments.createdAt, fromDate), lte7(payments.createdAt, toDate), eq32(payments.status, "COMPLETED"))).groupBy(payments.paymentMethod),
      // Clientes distintos que compraram no período ANTERIOR (comparativo de "clientes ativos").
      db.select({ count: sql22`count(distinct ${sales.customerId})` }).from(sales).where(and27(
        gte7(sales.createdAt, prevFrom),
        lte7(sales.createdAt, prevTo),
        sql22`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`,
        eq32(sales.paymentStatus, "PAID"),
        isNotNull3(sales.customerId)
      )),
      // Visualizações de página da loja no período atual (só a data, pra agrupar por dia depois).
      db.select({ createdAt: storePageviews.createdAt }).from(storePageviews).where(and27(gte7(storePageviews.createdAt, fromDate), lte7(storePageviews.createdAt, toDate))),
      // Total de visualizações no período ANTERIOR (só a contagem, pro comparativo).
      db.select({ count: sql22`count(*)` }).from(storePageviews).where(and27(gte7(storePageviews.createdAt, prevFrom), lte7(storePageviews.createdAt, prevTo)))
    ]);
    const salesPeriodFilter = and27(
      gte7(sales.createdAt, fromDate),
      lte7(sales.createdAt, toDate),
      sql22`"sales"."order_status" NOT IN ('CANCELED', 'CANCELLED', 'RETURNED')`
    );
    const [topSellersRows, topCustomersRows, recentSales, recentPayments, recentPurchases, recentPersonal, realMarginRows, personalAccountsRows, recentOrdersRows] = await Promise.all([
      // Top vendedores: quem faturou mais no período (vendas não canceladas).
      db.select({
        userId: sales.userId,
        userName: users.name,
        commissionPercent: users.commissionPercent,
        total: sql22`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
        count: sql22`count(*)`
      }).from(sales).leftJoin(users, eq32(sales.userId, users.id)).where(and27(salesPeriodFilter, isNotNull3(sales.userId))).groupBy(sales.userId, users.name, users.commissionPercent).orderBy(desc18(sql22`sum(cast(${sales.totalAmount} as numeric))`)).limit(6),
      // Top compradores: melhores clientes do período.
      db.select({
        customerId: sales.customerId,
        customerName: customers.name,
        total: sql22`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
        count: sql22`count(*)`,
        lastAt: sql22`max(${sales.createdAt})`
      }).from(sales).leftJoin(customers, eq32(sales.customerId, customers.id)).where(and27(salesPeriodFilter, isNotNull3(sales.customerId))).groupBy(sales.customerId, customers.name).orderBy(desc18(sql22`sum(cast(${sales.totalAmount} as numeric))`)).limit(6),
      // Feed: vendas recentes
      db.select({
        id: sales.id,
        series: sales.series,
        number: sales.number,
        total: sales.totalAmount,
        status: sales.paymentStatus,
        createdAt: sales.createdAt,
        customerName: customers.name,
        userName: users.name
      }).from(sales).leftJoin(customers, eq32(sales.customerId, customers.id)).leftJoin(users, eq32(sales.userId, users.id)).where(salesPeriodFilter).orderBy(desc18(sales.createdAt)).limit(12),
      // Feed: recebimentos
      db.select({
        id: payments.id,
        saleId: payments.saleId,
        method: payments.paymentMethod,
        amount: payments.amountUsd,
        createdAt: payments.createdAt,
        userName: users.name
      }).from(payments).leftJoin(users, eq32(payments.receivedBy, users.id)).where(and27(gte7(payments.createdAt, fromDate), lte7(payments.createdAt, toDate), eq32(payments.status, "COMPLETED"))).orderBy(desc18(payments.createdAt)).limit(12),
      // Feed: entradas de mercadoria aprovadas (com moeda da compra)
      db.select({
        id: purchaseOrders.id,
        invoice: purchaseOrders.invoiceNumber,
        total: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
        fxRate: purchaseOrders.fxRateToBrl,
        createdAt: purchaseOrders.approvedAt,
        supplierName: suppliers.name
      }).from(purchaseOrders).leftJoin(suppliers, eq32(purchaseOrders.supplierId, suppliers.id)).where(and27(eq32(purchaseOrders.status, "APPROVED"), gte7(purchaseOrders.approvedAt, fromDate), lte7(purchaseOrders.approvedAt, toDate))).orderBy(desc18(purchaseOrders.approvedAt)).limit(8),
      // Feed: gastos pessoais
      db.select({
        id: personalExpenses.id,
        amount: personalExpenses.amount,
        currency: personalExpenses.currency,
        amountBrl: personalExpenses.amountBrl,
        description: personalExpenses.description,
        createdAt: personalExpenses.expenseDate,
        categoryName: personalCategories.name
      }).from(personalExpenses).leftJoin(personalCategories, eq32(personalExpenses.categoryId, personalCategories.id)).where(and27(gte7(personalExpenses.expenseDate, fromDate), lte7(personalExpenses.expenseDate, toDate))).orderBy(desc18(personalExpenses.expenseDate)).limit(8),
      // Margem REAL do período (custo FIFO da época da compra) — só vendas já entregues.
      db.select({
        saleId: costConsumptions.saleId,
        cost: sql22`sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric))`
      }).from(costConsumptions).where(and27(gte7(costConsumptions.createdAt, fromDate), lte7(costConsumptions.createdAt, toDate), eq32(costConsumptions.reason, "SALE"))).groupBy(costConsumptions.saleId),
      // Contas pessoais (saldo em moeda nativa) — para o card do módulo Pessoal.
      db.select({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency, balance: financialAccounts.currentBalance }).from(financialAccounts).where(and27(eq32(financialAccounts.scope, "PERSONAL"), eq32(financialAccounts.isActive, true))),
      // Pedidos da loja mais recentes (card "Pedidos recentes") — fulfillmentStatus vem da venda
      // ligada pra saber o estágio real (separando/entregue), não só o status do pedido em si.
      db.select({
        id: storeOrders.id,
        code: storeOrders.code,
        customerName: storeOrders.customerName,
        customerPhone: storeOrders.customerPhone,
        totalAmount: storeOrders.totalAmount,
        status: storeOrders.status,
        createdAt: storeOrders.createdAt,
        saleId: storeOrders.saleId,
        fulfillmentStatus: sales.fulfillmentStatus
      }).from(storeOrders).leftJoin(sales, eq32(storeOrders.saleId, sales.id)).where(and27(gte7(storeOrders.createdAt, fromDate), lte7(storeOrders.createdAt, toDate))).orderBy(desc18(storeOrders.createdAt)).limit(8)
    ]);
    let grossSales = 0;
    let netSales = 0;
    let productCost = 0;
    let profitAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let hasEstimatedCost = false;
    const saleIds = salesList.map((s) => s.id);
    const saleTotals = /* @__PURE__ */ new Map();
    if (saleIds.length) {
      const items = await db.select({
        saleId: saleItems.saleId,
        totalCostAtSale: saleItems.totalCostAtSale,
        profitAmount: saleItems.profitAmount,
        totalPrice: saleItems.totalPrice,
        unitCost: products.costPrice,
        quantity: saleItems.quantity
      }).from(saleItems).leftJoin(products, eq32(saleItems.productId, products.id)).where(inArray13(saleItems.saleId, saleIds));
      for (const i of items) {
        const current = saleTotals.get(i.saleId) || { cost: 0, profit: 0 };
        let cost = 0;
        if (i.totalCostAtSale != null) {
          cost = toNumber(i.totalCostAtSale);
        } else {
          hasEstimatedCost = true;
          cost = toNumber(i.unitCost) * toNumber(i.quantity);
        }
        current.cost += cost;
        current.profit += i.profitAmount != null ? toNumber(i.profitAmount) : toNumber(i.totalPrice) - cost;
        saleTotals.set(i.saleId, current);
      }
    }
    const orderSaleIds = recentOrdersRows.map((o) => o.saleId).filter((id) => !!id);
    const orderItemRows = orderSaleIds.length ? await db.select({ saleId: saleItems.saleId, productName: products.name }).from(saleItems).leftJoin(products, eq32(saleItems.productId, products.id)).where(inArray13(saleItems.saleId, orderSaleIds)) : [];
    const itemsByOrderSale = /* @__PURE__ */ new Map();
    for (const it of orderItemRows) {
      if (!it.saleId) continue;
      const arr = itemsByOrderSale.get(it.saleId) || [];
      if (it.productName) arr.push(it.productName);
      itemsByOrderSale.set(it.saleId, arr);
    }
    const recentOrders = recentOrdersRows.map((o) => {
      const items = o.saleId ? itemsByOrderSale.get(o.saleId) || [] : [];
      return {
        id: o.id,
        code: o.code,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        totalAmount: Math.round(toNumber(o.totalAmount) * 100) / 100,
        status: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        createdAt: o.createdAt,
        productLabel: items.length === 0 ? "\u2014" : items.length === 1 ? items[0] : `${items[0]} +${items.length - 1} item(ns)`
      };
    });
    for (const s of salesList) {
      grossSales += toNumber(s.subtotalAmount);
      netSales += toNumber(s.totalAmount);
      if (s.paymentStatus === "PAID") paidAmount += toNumber(s.totalAmount);
      else if (s.paymentStatus === "PENDING") pendingAmount += toNumber(s.totalAmount);
      const totals = saleTotals.get(s.id) || { cost: 0, profit: 0 };
      productCost += totals.cost;
      profitAmount += totals.profit;
    }
    let totalExpenses = variableExpensesList.reduce((sum, e) => sum + toNumber(e.amountUsd), 0);
    let totalFixedExpenses = 0;
    const startYear = fromDate.getFullYear();
    const startMonth = fromDate.getMonth();
    const endYear = toDate.getFullYear();
    const endMonth = toDate.getMonth();
    const monthsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (monthsCount > 0) {
      for (const fe of fixedExpensesList) {
        totalFixedExpenses += toNumber(fe.amountUsd) * monthsCount;
      }
      totalExpenses += totalFixedExpenses;
    }
    const grossProfit = profitAmount;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercent = netSales > 0 ? grossProfit / netSales * 100 : 0;
    const netMarginPercent = netSales > 0 ? netProfit / netSales * 100 : 0;
    const byDay = /* @__PURE__ */ new Map();
    for (const s of salesList) {
      const key = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "";
      if (!key) continue;
      const cur = byDay.get(key) || { total: 0, count: 0, customers: /* @__PURE__ */ new Set(), profit: 0 };
      cur.total += toNumber(s.totalAmount);
      cur.count += 1;
      if (s.customerId) cur.customers.add(s.customerId);
      cur.profit += saleTotals.get(s.id)?.profit || 0;
      byDay.set(key, cur);
    }
    const byDayViews = /* @__PURE__ */ new Map();
    for (const v of pageviewRows) {
      const key = v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : "";
      if (!key) continue;
      byDayViews.set(key, (byDayViews.get(key) || 0) + 1);
    }
    const byDayVariableExpenses = /* @__PURE__ */ new Map();
    for (const e of variableExpensesList) {
      const key = e.expenseDate ? new Date(e.expenseDate).toISOString().split("T")[0] : "";
      if (!key) continue;
      byDayVariableExpenses.set(key, (byDayVariableExpenses.get(key) || 0) + toNumber(e.amountUsd));
    }
    const dailySales = [];
    const dayCursor = new Date(fromDate);
    dayCursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(toDate);
    lastDay.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((lastDay.getTime() - dayCursor.getTime()) / 864e5) + 1);
    const fixedShare = totalFixedExpenses / totalDays;
    let guard = 0;
    while (dayCursor <= lastDay && guard < 120) {
      const key = dayCursor.toISOString().split("T")[0];
      const found = byDay.get(key) || { total: 0, count: 0, customers: /* @__PURE__ */ new Set(), profit: 0 };
      const dayNetProfit = found.profit - (byDayVariableExpenses.get(key) || 0) - fixedShare;
      dailySales.push({
        date: key,
        total: Math.round(found.total * 100) / 100,
        count: found.count,
        customers: found.customers.size,
        views: byDayViews.get(key) || 0,
        profit: Math.round(dayNetProfit * 100) / 100,
        ticket: found.count > 0 ? Math.round(found.total / found.count * 100) / 100 : 0
      });
      dayCursor.setDate(dayCursor.getDate() + 1);
      guard += 1;
    }
    const prevNetSales = toNumber(prevSalesRows[0]?.total);
    const prevSalesCount = Number(prevSalesRows[0]?.count || 0);
    const pct = (cur, prev) => prev > 0 ? (cur - prev) / prev * 100 : cur > 0 ? 100 : 0;
    const activeCustomersInPeriod = new Set(salesList.map((s) => s.customerId).filter(Boolean)).size;
    const prevActiveCustomers = Number(prevCustomersRows[0]?.count || 0);
    const pageviewsTotal = pageviewRows.length;
    const prevPageviewsTotal = Number(prevPageviewsRows[0]?.count || 0);
    const paymentMix = paymentMixRows.map((r) => ({ method: r.method, total: Math.round(toNumber(r.total) * 100) / 100 })).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
    const r24 = (n) => Math.round(n * 100) / 100;
    const topSellers = topSellersRows.map((r) => ({
      userId: r.userId,
      name: r.userName || "\u2014",
      total: r24(toNumber(r.total)),
      count: Number(r.count || 0),
      avgTicket: Number(r.count) > 0 ? r24(toNumber(r.total) / Number(r.count)) : 0,
      commission: r24(toNumber(r.total) * (toNumber(r.commissionPercent) / 100))
    }));
    const topCustomers = topCustomersRows.map((r) => ({
      customerId: r.customerId,
      name: r.customerName || "\u2014",
      total: r24(toNumber(r.total)),
      count: Number(r.count || 0),
      avgTicket: Number(r.count) > 0 ? r24(toNumber(r.total) / Number(r.count)) : 0,
      lastAt: r.lastAt
    }));
    const activity = [];
    for (const s of recentSales) activity.push({
      kind: "SALE",
      at: s.createdAt,
      title: `Venda ${s.series}-${String(s.number).padStart(6, "0")}`,
      subtitle: s.customerName || "Consumidor final",
      who: s.userName,
      amount: r24(toNumber(s.total)),
      currency: "BRL",
      status: s.status,
      link: "/sales"
    });
    for (const p of recentPayments) activity.push({
      kind: "PAYMENT",
      at: p.createdAt,
      title: "Recebimento",
      subtitle: p.method,
      who: p.userName,
      amount: r24(toNumber(p.amount)),
      currency: "BRL",
      link: "/cash"
    });
    for (const p of recentPurchases) activity.push({
      kind: "PURCHASE",
      at: p.createdAt,
      title: `Entrada ${p.invoice || ""}`.trim(),
      subtitle: p.supplierName || "Fornecedor",
      amount: r24(toNumber(p.total)),
      currency: p.currency || "BRL",
      fxRate: p.fxRate ? Number(p.fxRate) : null,
      link: "/purchases"
    });
    for (const e of recentPersonal) activity.push({
      kind: "PERSONAL",
      at: e.createdAt,
      title: e.description || "Gasto pessoal",
      subtitle: e.categoryName || "sem categoria",
      amount: r24(toNumber(e.amount)),
      currency: e.currency,
      amountBrl: r24(toNumber(e.amountBrl)),
      link: "/personal"
    });
    activity.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    const recentActivity = activity.slice(0, 14);
    const realCostBySale = /* @__PURE__ */ new Map();
    for (const r of realMarginRows) if (r.saleId) realCostBySale.set(r.saleId, toNumber(r.cost));
    let realSales = 0, realCost = 0, coveredCount = 0;
    for (const s of salesList) {
      const c = realCostBySale.get(s.id);
      if (c == null) continue;
      coveredCount += 1;
      realSales += toNumber(s.totalAmount);
      realCost += c;
    }
    const realMargin = {
      sales: r24(realSales),
      cost: r24(realCost),
      margin: r24(realSales - realCost),
      marginPercent: realSales > 0 ? r24((realSales - realCost) / realSales * 100) : 0,
      // % das vendas do período que já têm custo real apurado (o resto ainda não saiu do estoque).
      coverage: salesList.length > 0 ? r24(coveredCount / salesList.length * 100) : 0,
      coveredCount,
      totalSales: salesList.length
    };
    let fxToday = {};
    let personal = null;
    try {
      const { resolveRates: resolveRates2, toBrl: toBrl2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
      fxToday = await resolveRates2();
      const conv = async (v, c) => {
        try {
          return await toBrl2(v, c);
        } catch {
          return null;
        }
      };
      let personalTotalBrl = 0;
      const accounts = [];
      for (const a of personalAccountsRows) {
        const brl = await conv(toNumber(a.balance), String(a.currency || "BRL"));
        if (brl != null) personalTotalBrl += brl;
        accounts.push({ name: a.name, currency: a.currency, balance: toNumber(a.balance), balanceBrl: brl != null ? r24(brl) : null });
      }
      const d90 = /* @__PURE__ */ new Date();
      d90.setDate(d90.getDate() - 90);
      const last90 = await db.select({ amountBrl: personalExpenses.amountBrl }).from(personalExpenses).where(gte7(personalExpenses.expenseDate, d90));
      const avgMonthlyBrl = r24(last90.reduce((s, e) => s + toNumber(e.amountBrl), 0) / 3);
      personal = {
        accounts,
        totalBrl: r24(personalTotalBrl),
        avgMonthlyBrl,
        runwayMonths: avgMonthlyBrl > 0 ? r24(personalTotalBrl / avgMonthlyBrl) : null,
        monthSpentBrl: r24(recentPersonal.reduce((s, e) => s + toNumber(e.amountBrl), 0))
      };
    } catch {
    }
    res.json({
      topSellers,
      topCustomers,
      recentOrders,
      recentActivity,
      realMargin,
      fxToday,
      personal,
      dailySales,
      previous: {
        netSales: prevNetSales,
        salesCount: prevSalesCount,
        netSalesDeltaPercent: Math.round(pct(netSales, prevNetSales) * 10) / 10,
        salesCountDeltaPercent: Math.round(pct(salesList.length, prevSalesCount) * 10) / 10,
        activeCustomers: prevActiveCustomers,
        activeCustomersDeltaPercent: Math.round(pct(activeCustomersInPeriod, prevActiveCustomers) * 10) / 10,
        pageviews: prevPageviewsTotal,
        pageviewsDeltaPercent: Math.round(pct(pageviewsTotal, prevPageviewsTotal) * 10) / 10
      },
      paymentMix,
      hasEstimatedCost,
      period: {
        dateFrom: fromDate.toISOString().split("T")[0],
        dateTo: toDate.toISOString().split("T")[0]
      },
      summary: {
        activeProducts: Number(activeProductsCount[0]?.count || 0),
        activeCustomers: Number(activeCustomersCount[0]?.count || 0),
        activeCustomersInPeriod,
        pageviews: pageviewsTotal,
        salesCount: salesList.length,
        grossSales,
        netSales,
        productCost,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        grossMarginPercent,
        netMarginPercent,
        paidAmount,
        pendingAmount,
        averageTicket: salesList.length > 0 ? netSales / salesList.length : 0
      },
      recentAuditLogs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
var dashboard_default = router28;

// src/server/analytics.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router29 } from "express";
import { and as and28, gte as gte8, lte as lte8, eq as eq33, sql as sql23 } from "drizzle-orm";
var router29 = Router29();
router29.use(requireAuth);
router29.use(requirePermission("reports", "financial"));
var num = (v) => Number(v || 0);
var r2 = (n) => Math.round(n * 100) / 100;
var SESSION_GAP_MS = 30 * 60 * 1e3;
function buildSessions(rows) {
  const byVisitor = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!r.visitorId) continue;
    const arr = byVisitor.get(r.visitorId) || [];
    arr.push({ path: r.path, createdAt: r.createdAt });
    byVisitor.set(r.visitorId, arr);
  }
  const sessions = [];
  for (const pages of byVisitor.values()) {
    pages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let start = 0;
    for (let i = 1; i <= pages.length; i++) {
      const gap = i < pages.length ? pages[i].createdAt.getTime() - pages[i - 1].createdAt.getTime() : Infinity;
      if (gap > SESSION_GAP_MS) {
        const slice = pages.slice(start, i);
        sessions.push({
          entryPath: slice[0].path,
          pages: slice.length,
          durationMs: slice[slice.length - 1].createdAt.getTime() - slice[0].createdAt.getTime()
        });
        start = i;
      }
    }
  }
  return sessions;
}
router29.get("/overview", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? dayStartUtc(String(dateFrom)) : new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() - 29));
    const toDate = dateTo ? dayEndUtc(String(dateTo)) : /* @__PURE__ */ new Date();
    const views = await db.select({
      path: storePageviews.path,
      visitorId: storePageviews.visitorId,
      country: storePageviews.country,
      region: storePageviews.region,
      city: storePageviews.city,
      createdAt: storePageviews.createdAt
    }).from(storePageviews).where(and28(gte8(storePageviews.createdAt, fromDate), lte8(storePageviews.createdAt, toDate)));
    const totalViews = views.length;
    const uniqueVisitorSet = new Set(views.map((v) => v.visitorId).filter(Boolean));
    const uniqueVisitors = uniqueVisitorSet.size;
    const rowsWithDate = views.map((v) => ({ ...v, createdAt: v.createdAt ? new Date(v.createdAt) : /* @__PURE__ */ new Date() }));
    const sessions = buildSessions(rowsWithDate);
    const bounces = sessions.filter((s) => s.pages === 1).length;
    const bounceRate = sessions.length > 0 ? r2(bounces / sessions.length * 100) : 0;
    const avgSessionDurationSec = sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + x.durationMs, 0) / sessions.length / 1e3) : 0;
    const byDay = /* @__PURE__ */ new Map();
    for (const v of rowsWithDate) {
      const key = v.createdAt.toISOString().split("T")[0];
      const cur = byDay.get(key) || { views: 0, visitors: /* @__PURE__ */ new Set() };
      cur.views += 1;
      if (v.visitorId) cur.visitors.add(v.visitorId);
      byDay.set(key, cur);
    }
    const dailySeries = [];
    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(toDate);
    last.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cursor <= last && guard < 370) {
      const key = cursor.toISOString().split("T")[0];
      const found = byDay.get(key);
      dailySeries.push({ date: key, views: found?.views || 0, visitors: found?.visitors.size || 0 });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    const pageViews = /* @__PURE__ */ new Map();
    const pageVisitors = /* @__PURE__ */ new Map();
    for (const v of rowsWithDate) {
      pageViews.set(v.path, (pageViews.get(v.path) || 0) + 1);
      const set = pageVisitors.get(v.path) || /* @__PURE__ */ new Set();
      if (v.visitorId) set.add(v.visitorId);
      pageVisitors.set(v.path, set);
    }
    const entryTotals = /* @__PURE__ */ new Map();
    const entryBounces = /* @__PURE__ */ new Map();
    for (const s of sessions) {
      entryTotals.set(s.entryPath, (entryTotals.get(s.entryPath) || 0) + 1);
      if (s.pages === 1) entryBounces.set(s.entryPath, (entryBounces.get(s.entryPath) || 0) + 1);
    }
    const topPages = [...pageViews.entries()].map(([path6, viewsCount]) => {
      const entries = entryTotals.get(path6) || 0;
      const bouncesForPath = entryBounces.get(path6) || 0;
      return {
        path: path6,
        views: viewsCount,
        uniqueVisitors: pageVisitors.get(path6)?.size || 0,
        bounceRate: entries > 0 ? r2(bouncesForPath / entries * 100) : null
      };
    }).sort((a, b) => b.views - a.views).slice(0, 10);
    const locKey = (v) => `${v.country || "?"}|${v.region || "?"}|${v.city || "?"}`;
    const locVisitors = /* @__PURE__ */ new Map();
    const locMeta = /* @__PURE__ */ new Map();
    for (const v of rowsWithDate) {
      if (!v.country && !v.city) continue;
      const key = locKey(v);
      const set = locVisitors.get(key) || /* @__PURE__ */ new Set();
      if (v.visitorId) set.add(v.visitorId);
      locVisitors.set(key, set);
      locMeta.set(key, { country: v.country, region: v.region, city: v.city });
    }
    const topLocations = [...locVisitors.entries()].map(([key, set]) => ({ ...locMeta.get(key), visitors: set.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 10);
    const revenueRows = await db.select({
      groupName: productGroups.name,
      total: sql23`coalesce(sum(cast(${saleItems.totalPrice} as numeric)), 0)`
    }).from(saleItems).innerJoin(sales, eq33(saleItems.saleId, sales.id)).leftJoin(products, eq33(saleItems.productId, products.id)).leftJoin(productGroups, eq33(products.groupId, productGroups.id)).where(and28(
      eq33(sales.series, "LOJ"),
      eq33(sales.paymentStatus, "PAID"),
      gte8(sales.createdAt, fromDate),
      lte8(sales.createdAt, toDate)
    )).groupBy(productGroups.name);
    const revenueByGroup = revenueRows.map((r) => ({ name: r.groupName || "Sem grupo", total: r2(num(r.total)) })).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
    res.json({
      totalViews,
      uniqueVisitors,
      bounceRate,
      avgSessionDurationSec,
      dailySeries,
      topPages,
      topLocations,
      revenueByGroup,
      period: { dateFrom: fromDate.toISOString().split("T")[0], dateTo: toDate.toISOString().split("T")[0] }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var analytics_default = router29;

// src/server/transfers.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router30 } from "express";
import { and as and29, desc as desc19, eq as eq34, ilike as ilike7, inArray as inArray14, or as or7 } from "drizzle-orm";
import { v4 as uuidv417 } from "uuid";
import multer4 from "multer";
var router30 = Router30();
router30.use(requireAuth);
var upload4 = multer4({ storage: multer4.memoryStorage() });
var TRANSFER_INVOICE_MAX_BYTES = 4 * 1024 * 1024;
var TRANSFER_INVOICE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
function asDate(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
function cleanText(value) {
  const text2 = String(value || "").trim();
  return text2 || null;
}
function transferCode() {
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${date}-${suffix}`;
}
async function loadItems(transferIds) {
  if (!transferIds.length) return [];
  const rows = await db.select({
    id: stockTransferItems.id,
    transferId: stockTransferItems.transferId,
    productId: stockTransferItems.productId,
    savedProductName: stockTransferItems.productName,
    registeredProductName: products.name,
    sku: products.sku,
    requiresLot: products.requiresLot,
    lotSent: stockTransferItems.lotSent,
    lotReceived: stockTransferItems.lotReceived,
    quantitySent: stockTransferItems.quantitySent,
    quantityReceived: stockTransferItems.quantityReceived,
    quantityDamaged: stockTransferItems.quantityDamaged,
    notes: stockTransferItems.notes,
    createdAt: stockTransferItems.createdAt
  }).from(stockTransferItems).leftJoin(products, eq34(stockTransferItems.productId, products.id)).where(inArray14(stockTransferItems.transferId, transferIds)).orderBy(stockTransferItems.createdAt);
  return rows.map((row) => ({
    ...row,
    productName: row.savedProductName || row.registeredProductName || "Produto sem nome",
    sku: row.sku || "",
    requiresLot: !!row.requiresLot
  }));
}
router30.get("/", async (req, res) => {
  try {
    const status = String(req.query.status || "IN_TRANSIT").toUpperCase();
    const q = String(req.query.q || "").trim();
    const conditions = [];
    if (status === "RECEIVED") {
      conditions.push(inArray14(stockTransfers.status, ["RECEIVED", "PARTIAL", "DIVERGENT"]));
    } else if (status && status !== "ALL") {
      conditions.push(eq34(stockTransfers.status, status));
    }
    if (q) {
      conditions.push(or7(
        ilike7(stockTransfers.code, `%${q}%`),
        ilike7(stockTransfers.title, `%${q}%`),
        ilike7(stockTransfers.origin, `%${q}%`),
        ilike7(stockTransfers.destination, `%${q}%`),
        ilike7(stockTransfers.carrier, `%${q}%`)
      ));
    }
    const [rows, summaryRows] = await Promise.all([
      db.select({
        id: stockTransfers.id,
        code: stockTransfers.code,
        title: stockTransfers.title,
        origin: stockTransfers.origin,
        destination: stockTransfers.destination,
        carrier: stockTransfers.carrier,
        status: stockTransfers.status,
        departureAt: stockTransfers.departureAt,
        expectedAt: stockTransfers.expectedAt,
        receivedAt: stockTransfers.receivedAt,
        notes: stockTransfers.notes,
        receiptNotes: stockTransfers.receiptNotes,
        invoiceFileName: stockTransfers.invoiceFileName,
        invoiceFileType: stockTransfers.invoiceFileType,
        invoiceFileSize: stockTransfers.invoiceFileSize,
        createdBy: stockTransfers.createdBy,
        receivedBy: stockTransfers.receivedBy,
        createdAt: stockTransfers.createdAt,
        updatedAt: stockTransfers.updatedAt
      }).from(stockTransfers).where(conditions.length ? and29(...conditions) : void 0).orderBy(desc19(stockTransfers.createdAt)).limit(300),
      db.select({ status: stockTransfers.status, expectedAt: stockTransfers.expectedAt }).from(stockTransfers)
    ]);
    const items = await loadItems(rows.map((row) => row.id));
    const data = rows.map((row) => {
      const transferItems = items.filter((item) => item.transferId === row.id);
      return {
        ...row,
        items: transferItems,
        totalProducts: transferItems.length,
        totalUnits: transferItems.reduce((sum, item) => sum + Number(item.quantitySent || 0), 0),
        totalReceived: transferItems.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0),
        hasInvoiceFile: !!row.invoiceFileName
      };
    });
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const summary = {
      transit: summaryRows.filter((row) => row.status === "IN_TRANSIT").length,
      late: summaryRows.filter((row) => row.status === "IN_TRANSIT" && row.expectedAt && new Date(row.expectedAt).toISOString().slice(0, 10) < today).length,
      divergent: summaryRows.filter((row) => ["PARTIAL", "DIVERGENT"].includes(row.status)).length
    };
    res.json({ data, summary });
  } catch (error) {
    console.error("Transfer list error:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel carregar as transfer\xEAncias." });
  }
});
router30.post("/:id/invoice", requirePermission("purchase", "create"), upload4.single("file"), async (req, res) => {
  try {
    const [transfer] = await db.select({ id: stockTransfers.id }).from(stockTransfers).where(eq34(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transfer\xEAncia n\xE3o encontrada." });
    if (!req.file) return res.status(400).json({ error: "Selecione uma foto ou PDF da nota." });
    if (!TRANSFER_INVOICE_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Formato inv\xE1lido. Use JPG, PNG, WEBP ou PDF." });
    }
    if (req.file.size > TRANSFER_INVOICE_MAX_BYTES) {
      return res.status(400).json({ error: "Arquivo maior que 4 MB." });
    }
    const [updated] = await db.update(stockTransfers).set({
      invoiceFileName: req.file.originalname,
      invoiceFileType: req.file.mimetype,
      invoiceFileSize: req.file.size,
      invoiceFilePath: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq34(stockTransfers.id, transfer.id)).returning({
      id: stockTransfers.id,
      invoiceFileName: stockTransfers.invoiceFileName,
      invoiceFileType: stockTransfers.invoiceFileType,
      invoiceFileSize: stockTransfers.invoiceFileSize,
      invoiceFilePath: stockTransfers.invoiceFilePath
    });
    res.json(updated);
  } catch (error) {
    console.error("Transfer invoice upload error:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel salvar a nota da transfer\xEAncia." });
  }
});
router30.delete("/:id/invoice", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const [updated] = await db.update(stockTransfers).set({
      invoiceFileName: null,
      invoiceFileType: null,
      invoiceFileSize: null,
      invoiceFilePath: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq34(stockTransfers.id, req.params.id)).returning({ id: stockTransfers.id });
    if (!updated) return res.status(404).json({ error: "Transfer\xEAncia n\xE3o encontrada." });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel remover a nota da transfer\xEAncia." });
  }
});
router30.get("/:id", async (req, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq34(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transfer\xEAncia n\xE3o encontrada." });
    const items = await loadItems([transfer.id]);
    res.json({ ...transfer, items });
  } catch (error) {
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel carregar a transfer\xEAncia." });
  }
});
router30.post("/", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const title = cleanText(req.body.title);
    const origin = cleanText(req.body.origin) || "Paraguai";
    const destination = cleanText(req.body.destination);
    const carrier = cleanText(req.body.carrier);
    const notes = cleanText(req.body.notes);
    const expectedAt = asDate(req.body.expectedAt);
    const departureAt = asDate(req.body.departureAt) || /* @__PURE__ */ new Date();
    const inputItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!destination) return res.status(400).json({ error: "Informe o destino da mercadoria." });
    if (!inputItems.length) return res.status(400).json({ error: "Adicione pelo menos um produto." });
    const normalizedItems = inputItems.map((item) => ({
      productId: cleanText(item.productId),
      productName: cleanText(item.productName),
      quantitySent: Math.floor(Number(item.quantitySent || 0)),
      lotSent: cleanText(item.lotSent),
      notes: cleanText(item.notes)
    }));
    if (normalizedItems.some((item) => !item.productName || item.quantitySent <= 0)) {
      return res.status(400).json({ error: "Confira os nomes dos produtos e as quantidades da transfer\xEAncia." });
    }
    const result = await db.transaction(async (tx) => {
      const productIds = [...new Set(normalizedItems.map((item) => item.productId).filter(Boolean))];
      if (productIds.length) {
        const productRows = await tx.select({ id: products.id }).from(products).where(inArray14(products.id, productIds));
        const existingProductIds = new Set(productRows.map((product) => product.id));
        const missingProduct = productIds.find((productId) => !existingProductIds.has(productId));
        if (missingProduct) throw new Error("Um dos produtos cadastrados n\xE3o foi encontrado.");
      }
      const transferId = uuidv417();
      const code = transferCode();
      await tx.insert(stockTransfers).values({
        id: transferId,
        code,
        title,
        origin,
        destination,
        carrier,
        status: "IN_TRANSIT",
        departureAt,
        expectedAt,
        notes,
        createdBy: req.user.userId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      for (const item of normalizedItems) {
        await tx.insert(stockTransferItems).values({
          id: uuidv417(),
          transferId,
          productId: item.productId,
          productName: item.productName,
          lotSent: item.lotSent,
          quantitySent: item.quantitySent,
          notes: item.notes
        });
      }
      return { id: transferId, code, title };
    });
    res.status(201).json(result);
  } catch (error) {
    console.error("Create transfer error:", error);
    const knownMessages = [
      "Um dos produtos cadastrados n\xE3o foi encontrado.",
      "Informe o destino da mercadoria.",
      "Adicione pelo menos um produto.",
      "Confira os nomes dos produtos e as quantidades da transfer\xEAncia."
    ];
    const rawMessage = String(error?.message || "");
    const knownMessage = knownMessages.find((message) => rawMessage.includes(message));
    res.status(knownMessage ? 400 : 500).json({
      error: knownMessage || "N\xE3o foi poss\xEDvel salvar a transfer\xEAncia. Atualize a p\xE1gina e tente novamente."
    });
  }
});
router30.post("/:id/dispatch", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq34(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transfer\xEAncia n\xE3o encontrada." });
    if (transfer.status !== "DRAFT") return res.status(400).json({ error: "Essa transfer\xEAncia n\xE3o est\xE1 aguardando sa\xEDda." });
    await db.update(stockTransfers).set({
      status: "IN_TRANSIT",
      departureAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq34(stockTransfers.id, transfer.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error?.message || "N\xE3o foi poss\xEDvel confirmar a sa\xEDda." });
  }
});
router30.post("/:id/receive", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const receiptRows = Array.isArray(req.body.items) ? req.body.items : [];
    const receiptNotes = cleanText(req.body.receiptNotes);
    const result = await db.transaction(async (tx) => {
      const [transfer] = await tx.select().from(stockTransfers).where(eq34(stockTransfers.id, req.params.id)).limit(1);
      if (!transfer) throw new Error("Transfer\xEAncia n\xE3o encontrada.");
      if (transfer.status !== "IN_TRANSIT") throw new Error("Essa transfer\xEAncia n\xE3o est\xE1 em tr\xE2nsito.");
      const items = await tx.select().from(stockTransferItems).where(eq34(stockTransferItems.transferId, transfer.id));
      if (!items.length) throw new Error("A transfer\xEAncia n\xE3o possui produtos.");
      const receivedMap = new Map(receiptRows.map((row) => [String(row.id || ""), row]));
      let hasMissing = false;
      let hasDivergence = false;
      for (const item of items) {
        const input = receivedMap.get(item.id) || {};
        const quantityReceived = Math.max(0, Math.floor(Number(input.quantityReceived ?? item.quantitySent)));
        const quantityDamaged = Math.max(0, Math.floor(Number(input.quantityDamaged || 0)));
        const lotReceived = cleanText(input.lotReceived) || item.lotSent;
        const itemNotes = cleanText(input.notes);
        const sent = Number(item.quantitySent || 0);
        if (quantityReceived + quantityDamaged > sent) {
          throw new Error("A quantidade recebida/avariada n\xE3o pode ultrapassar a quantidade enviada.");
        }
        if (quantityReceived + quantityDamaged < sent) hasMissing = true;
        if (quantityDamaged > 0 || item.lotSent && String(lotReceived || "") !== String(item.lotSent)) hasDivergence = true;
        await tx.update(stockTransferItems).set({
          lotReceived,
          quantityReceived,
          quantityDamaged,
          notes: itemNotes || item.notes,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq34(stockTransferItems.id, item.id));
      }
      const status = hasDivergence ? "DIVERGENT" : hasMissing ? "PARTIAL" : "RECEIVED";
      await tx.update(stockTransfers).set({
        status,
        receivedAt: /* @__PURE__ */ new Date(),
        receivedBy: req.user.userId,
        receiptNotes,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq34(stockTransfers.id, transfer.id));
      return { ok: true, status };
    });
    res.json(result);
  } catch (error) {
    console.error("Receive transfer error:", error);
    res.status(400).json({ error: error?.message || "N\xE3o foi poss\xEDvel confirmar a chegada." });
  }
});
router30.delete("/:id", requirePermission("purchase", "create"), async (req, res) => {
  try {
    const [transfer] = await db.select().from(stockTransfers).where(eq34(stockTransfers.id, req.params.id)).limit(1);
    if (!transfer) return res.status(404).json({ error: "Transfer\xEAncia n\xE3o encontrada." });
    if (transfer.status !== "DRAFT") return res.status(400).json({ error: "Somente rascunhos podem ser exclu\xEDdos." });
    await db.transaction(async (tx) => {
      await tx.delete(stockTransferItems).where(eq34(stockTransferItems.transferId, transfer.id));
      await tx.delete(stockTransfers).where(eq34(stockTransfers.id, transfer.id));
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel excluir o rascunho." });
  }
});
var transfers_default = router30;

// src/server/aiReports.ts
init_authMiddleware();
import { Router as Router31 } from "express";
var router31 = Router31();
router31.use(requireAuth);
var cleanData = (data) => {
  const json = JSON.stringify(data ?? {}, (_key, value) => {
    if (typeof value === "string" && value.length > 400) return `${value.slice(0, 400)}...`;
    return value;
  });
  return json.length > 45e3 ? `${json.slice(0, 45e3)}...` : json;
};
router31.post("/analysis", requirePermission("reports", "profit"), async (req, res) => {
  try {
    const { reportType, language = "pt-BR", filters = {}, data = {} } = req.body || {};
    const outputLanguage = String(language).toLowerCase().startsWith("es") ? "Spanish (Paraguay)" : "Brazilian Portuguese";
    const prompt = `
You are a senior financial auditor and retail ERP analyst for a Paraguay store.
Generate a practical management report in ${outputLanguage}.

Report type: ${reportType || "financial"}
Filters used: ${JSON.stringify(filters)}
Data extracted from the ERP: ${cleanData(data)}

Required structure:
1. Resumo executivo.
2. DRE gerencial simplificada when the data has revenue/cost/expenses/profit.
3. Main risks, inconsistencies, alerts and unusual points.
4. Product analysis when product-level data exists: best products, low margin products, negative margin, inventory/cash issues.
5. Operational recommendations for the owner/manager.
6. Checklist of what to verify next in the system.

Rules:
- Do not invent values not present in the data.
- If a metric is missing, say it is unavailable.
- Use short sections, clear bullets and currency formatting.
- Keep it concise but useful for decision-making.
`;
    const analysis = await ollamaChat({
      messages: [
        { role: "system", content: "Voc\xEA \xE9 um auditor financeiro s\xEAnior e analista de ERP. N\xE3o invente n\xFAmeros nem fatos ausentes." },
        { role: "user", content: prompt }
      ],
      model: process.env.OLLAMA_REPORT_MODEL || process.env.OLLAMA_MODEL,
      temperature: 0.15,
      timeoutMs: 58e3
    });
    res.json({ analysis: analysis || "N\xE3o foi poss\xEDvel gerar an\xE1lise." });
  } catch (error) {
    const failure = getOllamaErrorInfo(error);
    if (failure.notConfigured) {
      return res.status(400).json({ code: "AI_NOT_CONFIGURED", error: "Ollama n\xE3o configurado. Defina OLLAMA_API_KEY ou OLLAMA_BASE_URL." });
    }
    if (failure.rateLimited) {
      const wait = failure.retryAfterSeconds ? ` Aguarde cerca de ${failure.retryAfterSeconds} segundos e tente novamente.` : " Aguarde um momento e tente novamente.";
      return res.status(429).json({ code: "AI_RATE_LIMIT", error: `Limite tempor\xE1rio da IA atingido.${wait}`, retryAfterSeconds: failure.retryAfterSeconds });
    }
    if (failure.unavailable) {
      return res.status(503).json({ code: "AI_UNAVAILABLE", error: "O Ollama est\xE1 temporariamente indispon\xEDvel. Tente novamente em alguns instantes." });
    }
    console.error("Ollama report error:", failure.message);
    res.status(500).json({ code: "AI_ERROR", error: "N\xE3o foi poss\xEDvel gerar a an\xE1lise com IA agora. Tente novamente mais tarde." });
  }
});
var aiReports_default = router31;

// src/server/master.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router32 } from "express";
import bcrypt6 from "bcryptjs";
import multer5 from "multer";
import { eq as eq35 } from "drizzle-orm";
var router32 = Router32();
var upload5 = multer5({ storage: multer5.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });
router32.use(requireAuth);
function isMaster(req) {
  return String(req.user?.roleName || "").toLowerCase() === "master";
}
function requireMaster(req, res, next) {
  if (!isMaster(req)) return res.status(403).json({ error: "Acesso restrito." });
  next();
}
async function validateMasterPassword(password) {
  if (!password) return false;
  const row = await db.select({ passwordHash: users.passwordHash, isActive: users.isActive }).from(users).innerJoin(roles, eq35(users.roleId, roles.id)).where(eq35(roles.name, "Master")).limit(1);
  const master = row[0];
  if (!master || !master.isActive) return false;
  return bcrypt6.compare(password, master.passwordHash);
}
router32.get("/status", requireMaster, async (req, res) => {
  await checkPendingAutomaticBackupNow("abertura do painel master", { force: true });
  const settings = await getBackupSettings();
  res.json({
    user: { role: "Master" },
    backup: settings,
    dropboxConfigured: isDropboxConfigured(),
    googleDriveConfigured: false,
    renderFreeWarning: true
  });
});
router32.put("/backup-settings", requireMaster, async (req, res) => {
  const saved = await saveBackupSettings(req.body || {});
  await logAction(req.user.userId, "UPDATE_MASTER_BACKUP_SETTINGS", "system_settings", "backup_settings", null, saved);
  res.json({ success: true, backup: saved });
});
router32.post("/backup-now", requireMaster, async (req, res) => {
  try {
    const result = await runManualBackup(req.user.userId);
    await logAction(req.user.userId, "MASTER_BACKUP_NOW", "system_settings", "backup_settings", null, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Erro ao gerar backup." });
  }
});
router32.post("/backup-restore", requireMaster, upload5.single("backup"), async (req, res) => {
  try {
    const { masterPassword } = req.body || {};
    const ok = await validateMasterPassword(masterPassword);
    if (!ok) return res.status(401).json({ error: "Senha Master invalida." });
    if (!req.file?.buffer) return res.status(400).json({ error: "Envie um arquivo de backup .json.gz gerado pelo Aura Sistemas." });
    const result = await restoreBackupFromBuffer(req.file.buffer, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Erro ao restaurar backup." });
  }
});
router32.post("/reset-check", requireMaster, async (req, res) => {
  const { masterPassword, confirmation } = req.body || {};
  if (confirmation !== "RESETAR AURA") {
    return res.status(400).json({ error: "Digite exatamente RESETAR AURA para confirmar." });
  }
  const ok = await validateMasterPassword(masterPassword);
  if (!ok) return res.status(401).json({ error: "Senha Master inv\xE1lida." });
  await logAction(req.user.userId, "MASTER_RESET_CHECK_APPROVED", "system_settings", "reset", null, { confirmation });
  res.json({
    success: true,
    message: "Confirma\xE7\xE3o validada. Para resetar o banco real com seguran\xE7a, gere backup e execute DROP SCHEMA/db:push/db:seed ou ative a rotina definitiva quando estiver pronto."
  });
});
var master_default = router32;

// api/handler.ts
init_fx();

// src/server/personal.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router33 } from "express";
import { and as and30, asc as asc3, desc as desc20, eq as eq36, gte as gte9, lte as lte9 } from "drizzle-orm";
init_fx();
init_audit();
var router33 = Router33();
router33.use(requireAuth);
router33.use(requirePermission("cash", "manage_accounts"));
var round24 = (n) => Math.round(n * 100) / 100;
var CURS = ["BRL", "USD", "PYG"];
router33.get("/categories", async (_req, res) => {
  try {
    const rows = await db.select().from(personalCategories).where(eq36(personalCategories.isActive, true)).orderBy(asc3(personalCategories.sortOrder), asc3(personalCategories.name));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router33.post("/categories", async (req, res) => {
  try {
    const { name, monthlyBudget, budgetCurrency } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio." });
    const [row] = await db.insert(personalCategories).values({
      name: String(name).trim(),
      monthlyBudget: (Number(monthlyBudget) > 0 ? Number(monthlyBudget) : 0).toFixed(2),
      budgetCurrency: CURS.includes(String(budgetCurrency)) ? String(budgetCurrency) : "PYG"
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router33.put("/categories/:id", async (req, res) => {
  try {
    const { name, monthlyBudget, budgetCurrency, isActive } = req.body || {};
    const updates = {};
    if (name !== void 0) updates.name = String(name).trim();
    if (monthlyBudget !== void 0) updates.monthlyBudget = (Number(monthlyBudget) > 0 ? Number(monthlyBudget) : 0).toFixed(2);
    if (budgetCurrency !== void 0 && CURS.includes(String(budgetCurrency))) updates.budgetCurrency = String(budgetCurrency);
    if (isActive !== void 0) updates.isActive = !!isActive;
    await db.update(personalCategories).set(updates).where(eq36(personalCategories.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router33.get("/expenses", async (req, res) => {
  try {
    const from = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : /* @__PURE__ */ new Date((/* @__PURE__ */ new Date()).toISOString().slice(0, 8) + "01");
    const to = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : /* @__PURE__ */ new Date();
    const rows = await db.select({
      id: personalExpenses.id,
      amount: personalExpenses.amount,
      currency: personalExpenses.currency,
      amountBrl: personalExpenses.amountBrl,
      description: personalExpenses.description,
      expenseDate: personalExpenses.expenseDate,
      categoryId: personalExpenses.categoryId,
      categoryName: personalCategories.name,
      accountId: personalExpenses.accountId,
      accountName: financialAccounts.name
    }).from(personalExpenses).leftJoin(personalCategories, eq36(personalExpenses.categoryId, personalCategories.id)).leftJoin(financialAccounts, eq36(personalExpenses.accountId, financialAccounts.id)).where(and30(gte9(personalExpenses.expenseDate, from), lte9(personalExpenses.expenseDate, to))).orderBy(desc20(personalExpenses.expenseDate)).limit(500);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router33.post("/expenses", async (req, res) => {
  try {
    const { categoryId, accountId, amount, currency, description, expenseDate } = req.body || {};
    const amt = round24(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Valor deve ser maior que zero." });
    const result = await db.transaction(async (tx) => {
      let cur = CURS.includes(String(currency)) ? String(currency) : "PYG";
      if (accountId) {
        const [acc] = await tx.select().from(financialAccounts).where(eq36(financialAccounts.id, accountId)).limit(1);
        if (!acc) throw new Error("Conta n\xE3o encontrada.");
        cur = String(acc.currency || "BRL");
        await postMovement(tx, accountId, "EXPENSE", -amt, {
          referenceType: "personal_expense",
          userId: req.user.userId,
          description: `Gasto pessoal: ${String(description || "sem descricao").slice(0, 120)}`
        });
      }
      const amountBrl = round24(await toBrl(amt, cur));
      const [row] = await tx.insert(personalExpenses).values({
        categoryId: categoryId || null,
        accountId: accountId || null,
        amount: amt.toFixed(2),
        currency: cur,
        amountBrl: amountBrl.toFixed(2),
        description: description ? String(description).trim() : null,
        expenseDate: expenseDate ? new Date(String(expenseDate)) : /* @__PURE__ */ new Date(),
        createdBy: req.user.userId
      }).returning();
      return row;
    });
    await logAction(req.user.userId, "CREATE", "personal_expenses", result.id, null, { amount: amt });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router33.delete("/expenses/:id", async (req, res) => {
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(personalExpenses).where(eq36(personalExpenses.id, req.params.id)).limit(1).for("update");
      if (!row) throw new Error("Gasto n\xE3o encontrado.");
      if (row.accountId) {
        await postMovement(tx, row.accountId, "ADJUSTMENT", Number(row.amount), {
          referenceType: "personal_expense",
          referenceId: row.id,
          userId: req.user.userId,
          description: "Estorno de gasto pessoal excluido"
        });
      }
      await tx.delete(personalExpenses).where(eq36(personalExpenses.id, row.id));
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router33.get("/summary", async (req, res) => {
  try {
    const month = String(req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
    const monthStart = /* @__PURE__ */ new Date(month + "-01");
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const cats = await db.select().from(personalCategories).where(eq36(personalCategories.isActive, true)).orderBy(asc3(personalCategories.sortOrder));
    const monthExpenses = await db.select().from(personalExpenses).where(and30(gte9(personalExpenses.expenseDate, monthStart), lte9(personalExpenses.expenseDate, nextMonth)));
    const byCat = /* @__PURE__ */ new Map();
    let monthTotalBrl = 0;
    for (const e of monthExpenses) {
      const key = e.categoryId || "none";
      const cur = byCat.get(key) || { spentBrl: 0, spentNative: {} };
      cur.spentBrl = round24(cur.spentBrl + Number(e.amountBrl));
      cur.spentNative[e.currency] = round24((cur.spentNative[e.currency] || 0) + Number(e.amount));
      byCat.set(key, cur);
      monthTotalBrl = round24(monthTotalBrl + Number(e.amountBrl));
    }
    const categories = [];
    for (const c of cats) {
      const spent = byCat.get(c.id) || { spentBrl: 0, spentNative: {} };
      let budgetBrl = 0;
      try {
        budgetBrl = round24(await toBrl(Number(c.monthlyBudget), String(c.budgetCurrency)));
      } catch {
        budgetBrl = 0;
      }
      categories.push({
        id: c.id,
        name: c.name,
        monthlyBudget: Number(c.monthlyBudget),
        budgetCurrency: c.budgetCurrency,
        budgetBrl,
        spentBrl: spent.spentBrl,
        spentNative: spent.spentNative,
        usedPercent: budgetBrl > 0 ? round24(spent.spentBrl / budgetBrl * 100) : null
      });
    }
    const uncategorized = byCat.get("none");
    const d90 = /* @__PURE__ */ new Date();
    d90.setDate(d90.getDate() - 90);
    const last90 = await db.select().from(personalExpenses).where(gte9(personalExpenses.expenseDate, d90));
    const avgMonthlyBrl = round24(last90.reduce((s, e) => s + Number(e.amountBrl), 0) / 3);
    const personalAccounts = await db.select().from(financialAccounts).where(and30(eq36(financialAccounts.scope, "PERSONAL"), eq36(financialAccounts.isActive, true)));
    let personalTotalBrl = 0;
    const accounts = [];
    for (const a of personalAccounts) {
      let brl = null;
      try {
        brl = round24(await toBrl(Number(a.currentBalance), String(a.currency || "BRL")));
        personalTotalBrl = round24(personalTotalBrl + brl);
      } catch {
        brl = null;
      }
      accounts.push({ id: a.id, name: a.name, currency: a.currency, balance: Number(a.currentBalance), balanceBrl: brl });
    }
    const runwayMonths = avgMonthlyBrl > 0 ? round24(personalTotalBrl / avgMonthlyBrl) : null;
    res.json({
      month,
      categories,
      uncategorizedBrl: uncategorized?.spentBrl || 0,
      monthTotalBrl,
      avgMonthlyBrl,
      accounts,
      personalTotalBrl,
      runwayMonths
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router33.get("/trend", async (_req, res) => {
  try {
    const from = /* @__PURE__ */ new Date();
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const rows = await db.select({ amountBrl: personalExpenses.amountBrl, expenseDate: personalExpenses.expenseDate }).from(personalExpenses).where(gte9(personalExpenses.expenseDate, from));
    const byMonth = /* @__PURE__ */ new Map();
    for (let i = 5; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() - i);
      byMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const r of rows) {
      const d = new Date(r.expenseDate);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (byMonth.has(k)) byMonth.set(k, round24((byMonth.get(k) || 0) + Number(r.amountBrl)));
    }
    res.json({ data: [...byMonth.entries()].map(([month, totalBrl]) => ({ month, totalBrl })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router33.get("/rules", async (_req, res) => {
  try {
    const rows = await db.select({
      id: profitDistributionRules.id,
      name: profitDistributionRules.name,
      percent: profitDistributionRules.percent,
      accountId: profitDistributionRules.accountId,
      isActive: profitDistributionRules.isActive,
      accountName: financialAccounts.name,
      accountCurrency: financialAccounts.currency
    }).from(profitDistributionRules).leftJoin(financialAccounts, eq36(profitDistributionRules.accountId, financialAccounts.id)).orderBy(asc3(profitDistributionRules.sortOrder));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router33.put("/rules", async (req, res) => {
  try {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const activeSum = rules.filter((r) => r.isActive !== false).reduce((s, r) => s + (Number(r.percent) || 0), 0);
    if (activeSum > 100.01) return res.status(400).json({ error: `Percentuais ativos somam ${activeSum.toFixed(1)}% \u2014 m\xE1ximo 100%.` });
    await db.transaction(async (tx) => {
      await tx.delete(profitDistributionRules);
      for (const [i, r] of rules.entries()) {
        if (!r.name || !(Number(r.percent) > 0)) continue;
        await tx.insert(profitDistributionRules).values({
          name: String(r.name).trim(),
          percent: Number(r.percent).toFixed(2),
          accountId: r.accountId || null,
          sortOrder: i,
          isActive: r.isActive !== false
        });
      }
    });
    await logAction(req.user.userId, "UPDATE", "profit_distribution_rules", "rules", null, { count: rules.length });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router33.post("/distribute", async (req, res) => {
  try {
    const { fromAccountId, baseAmountBrl } = req.body || {};
    const base = round24(Number(baseAmountBrl));
    if (!fromAccountId) return res.status(400).json({ error: "Escolha a conta de origem." });
    if (!Number.isFinite(base) || base <= 0) return res.status(400).json({ error: "Valor base inv\xE1lido." });
    const result = await db.transaction(async (tx) => {
      const [from] = await tx.select().from(financialAccounts).where(eq36(financialAccounts.id, fromAccountId)).limit(1);
      if (!from) throw new Error("Conta de origem n\xE3o encontrada.");
      const rules = await tx.select().from(profitDistributionRules).where(eq36(profitDistributionRules.isActive, true)).orderBy(asc3(profitDistributionRules.sortOrder));
      const applicable = rules.filter((r) => r.accountId && r.accountId !== fromAccountId);
      if (!applicable.length) throw new Error("Nenhuma regra ativa com conta de destino definida.");
      const executed = [];
      for (const rule of applicable) {
        const shareBrl = round24(base * (Number(rule.percent) / 100));
        if (shareBrl <= 0) continue;
        const [to] = await tx.select().from(financialAccounts).where(eq36(financialAccounts.id, rule.accountId)).limit(1);
        if (!to) continue;
        const outConv = await convertBrlToAccountCurrency(shareBrl, String(from.currency || "BRL"));
        const inConv = await convertBrlToAccountCurrency(shareBrl, String(to.currency || "BRL"));
        const desc24 = `Distribuicao de lucro: ${rule.name} ${Number(rule.percent).toFixed(0)}% (base R$ ${base.toFixed(2)})`;
        const ref = `dist:${fromAccountId}->${rule.accountId}`;
        await postMovement(tx, fromAccountId, "TRANSFER_OUT", -outConv.amount, { referenceType: "distribution", referenceId: ref, userId: req.user.userId, description: desc24 });
        await postMovement(tx, rule.accountId, "TRANSFER_IN", inConv.amount, { referenceType: "distribution", referenceId: ref, userId: req.user.userId, description: desc24 });
        executed.push({ rule: rule.name, percent: Number(rule.percent), shareBrl, out: { amount: outConv.amount, currency: from.currency }, in: { amount: inConv.amount, currency: to.currency } });
      }
      return executed;
    });
    await logAction(req.user.userId, "DISTRIBUTE_PROFIT", "financial_accounts", fromAccountId, null, { base, executed: result.length });
    res.json({ success: true, executed: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var personal_default = router33;

// src/server/store.ts
init_db();
init_schema();
init_authMiddleware();
init_audit();
import { Router as Router36 } from "express";
import { and as and33, desc as desc22, eq as eq39, inArray as inArray15, isNotNull as isNotNull4, isNull as isNull10, or as or9, sql as sql25 } from "drizzle-orm";
import { v4 as uuidv418 } from "uuid";

// src/lib/cpf.ts
var onlyDigits = (v) => String(v || "").replace(/\D/g, "");
function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (upTo) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) sum += Number(cpf[i]) * (upTo + 1 - i);
    const rest = sum * 10 % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
function isFullName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter((p) => p.length >= 2);
  return parts.length >= 2;
}

// src/server/maintenance.ts
init_db();
init_schema();
init_authMiddleware();
import { Router as Router34 } from "express";
import { eq as eq37, and as and31, lt, or as or8, isNull as isNull9 } from "drizzle-orm";
import fs5 from "fs";
import path5 from "path";
var router34 = Router34();
async function purgeOldOcrJobs() {
  try {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 1);
    const oldJobs = await db.select().from(purchaseOcrJobs).where(lt(purchaseOcrJobs.createdAt, cutoff));
    if (oldJobs.length === 0) return 0;
    let totalDeleted = 0;
    for (const job of oldJobs) {
      if (job.filePath && String(job.filePath).startsWith("/uploads/")) {
        const localPath = path5.join(process.cwd(), String(job.filePath).replace(/^\//, ""));
        if (fs5.existsSync(localPath)) {
          try {
            fs5.unlinkSync(localPath);
          } catch (e) {
            console.error(`Failed to delete physical file during purge: ${localPath}`, e);
          }
        }
      }
      await db.delete(purchaseOcrJobs).where(eq37(purchaseOcrJobs.id, job.id));
      totalDeleted++;
    }
    if (totalDeleted > 0) {
      await db.insert(maintenanceLogs).values({
        action: "PURGE_OLD_OCR_JOBS",
        totalDeleted,
        details: `Purgou ${totalDeleted} trabalhos de OCR antigos.`
      });
    }
    return totalDeleted;
  } catch (err) {
    console.error("Erro na purga de trabalhos de OCR antigos:", err);
    return 0;
  }
}
async function deleteDeadSaleRecords(tx, saleId) {
  const items = await tx.select().from(saleItems).where(eq37(saleItems.saleId, saleId));
  for (const item of items) {
    await tx.delete(deliverySerials).where(eq37(deliverySerials.saleItemId, item.id));
    await tx.delete(deliveryItems).where(eq37(deliveryItems.saleItemId, item.id));
    await tx.delete(separationItems).where(eq37(separationItems.saleItemId, item.id));
    await tx.update(productSerials).set({ saleItemId: null, status: "AVAILABLE", updatedAt: /* @__PURE__ */ new Date() }).where(eq37(productSerials.saleItemId, item.id));
  }
  await tx.delete(deliveryTasks).where(eq37(deliveryTasks.saleId, saleId));
  await tx.delete(separationTasks).where(eq37(separationTasks.saleId, saleId));
  await tx.delete(deliveryPaymentOverrides).where(eq37(deliveryPaymentOverrides.saleId, saleId));
  await tx.delete(printLogs).where(eq37(printLogs.saleId, saleId));
  await tx.delete(emailLogs).where(eq37(emailLogs.saleId, saleId));
  await tx.delete(payments).where(eq37(payments.saleId, saleId));
  await tx.delete(stockReservations).where(eq37(stockReservations.saleId, saleId));
  await tx.delete(stockMovements).where(eq37(stockMovements.referenceId, saleId));
  await tx.delete(saleItemLots).where(eq37(saleItemLots.saleId, saleId));
  await tx.delete(saleReturns).where(eq37(saleReturns.saleId, saleId));
  await tx.delete(costConsumptions).where(eq37(costConsumptions.saleId, saleId));
  await tx.delete(auditLogs).where(and31(eq37(auditLogs.tableName, "sales"), eq37(auditLogs.recordId, saleId)));
  await tx.delete(saleItems).where(eq37(saleItems.saleId, saleId));
  await tx.delete(sales).where(eq37(sales.id, saleId));
}
async function purgeOldCanceledSales() {
  try {
    const cutoff = /* @__PURE__ */ new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 1);
    const oldCanceled = await db.select().from(sales).where(
      and31(
        eq37(sales.orderStatus, "CANCELED"),
        eq37(sales.paymentStatus, "CANCELED"),
        eq37(sales.fulfillmentStatus, "CANCELED"),
        or8(
          lt(sales.canceledAt, cutoff),
          and31(isNull9(sales.canceledAt), lt(sales.createdAt, cutoff)),
          and31(isNull9(sales.canceledAt), isNull9(sales.createdAt))
        )
      )
    );
    if (oldCanceled.length === 0) return 0;
    let totalDeleted = 0;
    for (const sale of oldCanceled) {
      const hasMovement = await db.select({ id: accountMovements.id }).from(accountMovements).where(eq37(accountMovements.referenceId, sale.id)).limit(1);
      if (hasMovement.length > 0) continue;
      const hasOrder = await db.select({ id: storeOrders.id }).from(storeOrders).where(eq37(storeOrders.saleId, sale.id)).limit(1);
      if (hasOrder.length > 0) continue;
      await db.transaction(async (tx) => {
        await deleteDeadSaleRecords(tx, sale.id);
      });
      totalDeleted++;
    }
    if (totalDeleted > 0) {
      await db.insert(maintenanceLogs).values({
        action: "PURGE_OLD_CANCELED_SALES",
        totalDeleted,
        details: `Purgou ${totalDeleted} vendas canceladas antigas.`
      });
    }
    return totalDeleted;
  } catch (err) {
    console.error("Erro na purga de vendas canceladas:", err);
    return 0;
  }
}
router34.post("/purge-canceled-sales", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const count = await purgeOldCanceledSales();
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router34.post("/purge-ocr-jobs", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const deleted = await purgeOldOcrJobs();
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/store.ts
init_authMiddleware();

// src/server/customerAuth.ts
init_db();
init_schema();
import { Router as Router35 } from "express";
import jwt3 from "jsonwebtoken";
import bcrypt7 from "bcryptjs";
import { and as and32, desc as desc21, eq as eq38, sql as sql24 } from "drizzle-orm";
import nodemailer3 from "nodemailer";
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}
var SECRET3 = process.env.JWT_SECRET;
var CUSTOMER_TOKEN_TTL = "30d";
var RESET_TOKEN_TTL = "30m";
var hits = /* @__PURE__ */ new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
var clientIp = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Fa\xE7a login para continuar." });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt3.verify(token, SECRET3);
    if (payload.kind !== "customer") return res.status(401).json({ error: "Sess\xE3o inv\xE1lida." });
    req.customer = { customerId: payload.customerId };
    next();
  } catch {
    return res.status(401).json({ error: "Sess\xE3o expirada. Fa\xE7a login novamente." });
  }
}
function signCustomerToken(customerId) {
  return jwt3.sign({ customerId, kind: "customer" }, SECRET3, { expiresIn: CUSTOMER_TOKEN_TTL });
}
function publicCustomer(c) {
  return { id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city };
}
async function findByCpf(cpf) {
  const [row] = await db.select().from(customers).where(sql24`regexp_replace(coalesce(${customers.document}, ''), '\\D', '', 'g') = ${cpf}`).limit(1);
  return row || null;
}
async function findByEmail(email) {
  const [row] = await db.select().from(customers).where(sql24`lower(${customers.email}) = ${email}`).limit(1);
  return row || null;
}
var router35 = Router35();
router35.post("/login", async (req, res) => {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 5, 10 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const found = email ? await findByEmail(email) : null;
    if (!found || !found.passwordHash || !await bcrypt7.compare(password, found.passwordHash)) {
      return res.status(401).json({ error: "E-mail ou senha inv\xE1lidos." });
    }
    res.json({ token: signCustomerToken(found.id), customer: publicCustomer(found) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.post("/register", async (req, res) => {
  try {
    if (!rateLimit(`account-write:${clientIp(req)}`, 10, 10 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = onlyDigits(req.body?.phone);
    const country = ["BR", "AR", "PY", "OTHER"].includes(req.body?.country) ? req.body.country : "BR";
    const documentRaw = String(req.body?.document || "").trim();
    const document = country === "BR" ? onlyDigits(documentRaw) : documentRaw;
    const password = String(req.body?.password || "");
    const marketingOptIn = !!req.body?.marketingOptIn;
    const acceptedTerms = !!req.body?.acceptedTerms;
    if (!isFullName(name)) return res.status(400).json({ error: "Informe seu nome completo." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Informe um e-mail v\xE1lido." });
    if (phone.length < 10) return res.status(400).json({ error: "Informe um telefone v\xE1lido com DDD." });
    if (country === "BR" ? !isValidCpf(document) : document.length < 4) {
      return res.status(400).json({ error: "Documento inv\xE1lido." });
    }
    if (password.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    if (!acceptedTerms) return res.status(400).json({ error: "\xC9 preciso aceitar os termos de uso para continuar." });
    if (await findByEmail(email)) return res.status(409).json({ error: "Esse e-mail j\xE1 tem conta. Fa\xE7a login." });
    const passwordHash = await bcrypt7.hash(password, 10);
    const nationality = country === "PY" ? "PY" : "FOREIGN";
    const documentType = country === "BR" ? "CPF" : country === "AR" ? "DNI" : country === "PY" ? "CI" : "PASSPORT";
    const existingByCpf = country === "BR" ? await findByCpf(document) : null;
    if (existingByCpf) {
      if (existingByCpf.passwordHash) return res.status(409).json({ error: "Esse documento j\xE1 est\xE1 vinculado a outra conta." });
      if (existingByCpf.phone && existingByCpf.phone !== phone) {
        return res.status(409).json({ error: "Esse documento j\xE1 tem pedidos no sistema. Informe o telefone usado na \xFAltima compra para vincular a conta, ou fale com o suporte." });
      }
      const [updated] = await db.update(customers).set({
        email,
        passwordHash,
        marketingOptIn,
        phone: existingByCpf.phone || phone,
        name: existingByCpf.name || name,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq38(customers.id, existingByCpf.id)).returning();
      return res.json({ token: signCustomerToken(updated.id), customer: publicCustomer(updated) });
    }
    const [created] = await db.insert(customers).values({
      name,
      type: "PERSON",
      nationality,
      documentType,
      document,
      phone,
      email,
      passwordHash,
      marketingOptIn,
      country: country === "BR" ? "Brasil" : country === "AR" ? "Argentina" : country === "PY" ? "Paraguai" : "Outro",
      observations: "Cadastrado pela loja online (Minha Conta)."
    }).returning();
    await createNotification(db, {
      type: "CUSTOMER_NEW",
      title: "Novo cliente cadastrado",
      message: `${name} criou uma conta na loja online.`,
      link: "/customers"
    });
    res.json({ token: signCustomerToken(created.id), customer: publicCustomer(created) });
  } catch (err) {
    if (err?.code === "23505") return res.status(409).json({ error: "Esse e-mail j\xE1 tem conta. Fa\xE7a login." });
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.post("/forgot-password", async (req, res) => {
  try {
    if (!rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const found = email ? await findByEmail(email) : null;
    const genericOk = { ok: true, message: "Se esse e-mail tiver conta, enviamos um link de redefini\xE7\xE3o." };
    if (!found) return res.json(genericOk);
    const [conf] = await db.select().from(emailSettings).limit(1);
    if (!conf) return res.json(genericOk);
    const resetToken = jwt3.sign({ customerId: found.id, kind: "password-reset" }, SECRET3, { expiresIn: RESET_TOKEN_TTL });
    const origin = `${req.protocol}://${req.get("host")}`;
    const link = `${origin}/loja/conta/redefinir-senha?token=${resetToken}`;
    const transporter = nodemailer3.createTransport({
      host: conf.host,
      port: conf.port,
      secure: conf.port === 465,
      auth: { user: conf.user, pass: conf.password },
      tls: conf.useTls ? { rejectUnauthorized: false } : void 0
    });
    await transporter.sendMail({
      from: `"${conf.fromName}" <${conf.fromEmail}>`,
      to: found.email,
      subject: "Redefinir sua senha",
      text: `Ol\xE1, ${found.name}.

Pra redefinir sua senha, acesse:
${link}

Esse link expira em 30 minutos. Se n\xE3o foi voc\xEA, ignore este e-mail.`
    });
    res.json(genericOk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.post("/reset-password", async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    let payload;
    try {
      payload = jwt3.verify(String(req.body?.token || ""), SECRET3);
    } catch {
      return res.status(400).json({ error: "Link inv\xE1lido ou expirado. Pe\xE7a um novo." });
    }
    if (payload.kind !== "password-reset") return res.status(400).json({ error: "Link inv\xE1lido." });
    const passwordHash = await bcrypt7.hash(password, 10);
    await db.update(customers).set({ passwordHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq38(customers.id, payload.customerId));
    res.json({ token: signCustomerToken(payload.customerId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.get("/me", requireCustomerAuth, async (req, res) => {
  const [c] = await db.select().from(customers).where(eq38(customers.id, req.customer.customerId)).limit(1);
  if (!c) return res.status(404).json({ error: "Conta n\xE3o encontrada." });
  res.json(publicCustomer(c));
});
router35.put("/me", requireCustomerAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    const phone = onlyDigits(req.body?.phone);
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    if (!isFullName(name)) return res.status(400).json({ error: "Informe seu nome completo." });
    if (phone.length < 10) return res.status(400).json({ error: "Informe um telefone v\xE1lido com DDD." });
    if (email) {
      const other = await findByEmail(email);
      if (other && other.id !== req.customer.customerId) {
        return res.status(409).json({ error: "Esse e-mail j\xE1 est\xE1 em uso por outra conta." });
      }
    }
    const [updated] = await db.update(customers).set({ name, phone, email, updatedAt: /* @__PURE__ */ new Date() }).where(eq38(customers.id, req.customer.customerId)).returning();
    res.json(publicCustomer(updated));
  } catch (err) {
    if (err?.code === "23505") return res.status(409).json({ error: "Esse e-mail j\xE1 est\xE1 em uso por outra conta." });
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.post("/password", requireCustomerAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (newPassword.length < 6) return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    const [c] = await db.select().from(customers).where(eq38(customers.id, req.customer.customerId)).limit(1);
    if (!c?.passwordHash || !await bcrypt7.compare(currentPassword, c.passwordHash)) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }
    const passwordHash = await bcrypt7.hash(newPassword, 10);
    await db.update(customers).set({ passwordHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq38(customers.id, c.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.get("/orders", requireCustomerAuth, async (req, res) => {
  const rows = await db.select({
    id: storeOrders.id,
    code: storeOrders.code,
    status: storeOrders.status,
    totalAmount: storeOrders.totalAmount,
    deliveryType: storeOrders.deliveryType,
    createdAt: storeOrders.createdAt
  }).from(storeOrders).where(eq38(storeOrders.customerId, req.customer.customerId)).orderBy(desc21(storeOrders.createdAt));
  res.json(rows);
});
router35.get("/addresses", requireCustomerAuth, async (req, res) => {
  const rows = await db.select().from(customerAddresses).where(eq38(customerAddresses.customerId, req.customer.customerId)).orderBy(desc21(customerAddresses.isDefault), desc21(customerAddresses.createdAt));
  res.json(rows);
});
router35.post("/addresses", requireCustomerAuth, async (req, res) => {
  try {
    const { label, cep, street, number: number2, neighborhood, city, state, isDefault } = req.body || {};
    if (String(street || "").trim().length < 3) return res.status(400).json({ error: "Informe a rua." });
    if (isDefault) {
      await db.update(customerAddresses).set({ isDefault: false }).where(eq38(customerAddresses.customerId, req.customer.customerId));
    }
    const [created] = await db.insert(customerAddresses).values({
      customerId: req.customer.customerId,
      label: label || "Endere\xE7o",
      cep,
      street,
      number: number2,
      neighborhood,
      city,
      state,
      isDefault: !!isDefault
    }).returning();
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.put("/addresses/:id", requireCustomerAuth, async (req, res) => {
  try {
    const { label, cep, street, number: number2, neighborhood, city, state, isDefault } = req.body || {};
    if (isDefault) {
      await db.update(customerAddresses).set({ isDefault: false }).where(eq38(customerAddresses.customerId, req.customer.customerId));
    }
    const [updated] = await db.update(customerAddresses).set({ label, cep, street, number: number2, neighborhood, city, state, isDefault: !!isDefault }).where(and32(eq38(customerAddresses.id, req.params.id), eq38(customerAddresses.customerId, req.customer.customerId))).returning();
    if (!updated) return res.status(404).json({ error: "Endere\xE7o n\xE3o encontrado." });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.delete("/addresses/:id", requireCustomerAuth, async (req, res) => {
  await db.delete(customerAddresses).where(and32(eq38(customerAddresses.id, req.params.id), eq38(customerAddresses.customerId, req.customer.customerId)));
  res.json({ ok: true });
});
router35.get("/wishlist", requireCustomerAuth, async (req, res) => {
  const rows = await db.select({
    id: customerWishlist.id,
    productId: products.id,
    name: products.name,
    imageUrl: products.imageUrl,
    salePriceA: products.salePriceA,
    isActive: products.isActive,
    storeVisible: products.storeVisible,
    createdAt: customerWishlist.createdAt
  }).from(customerWishlist).innerJoin(products, eq38(customerWishlist.productId, products.id)).where(eq38(customerWishlist.customerId, req.customer.customerId)).orderBy(desc21(customerWishlist.createdAt));
  res.json(rows);
});
router35.post("/wishlist", requireCustomerAuth, async (req, res) => {
  try {
    const productId = String(req.body?.productId || "");
    if (!productId) return res.status(400).json({ error: "Produto inv\xE1lido." });
    await db.insert(customerWishlist).values({ customerId: req.customer.customerId, productId }).onConflictDoNothing();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor." });
  }
});
router35.delete("/wishlist/:productId", requireCustomerAuth, async (req, res) => {
  await db.delete(customerWishlist).where(and32(
    eq38(customerWishlist.customerId, req.customer.customerId),
    eq38(customerWishlist.productId, req.params.productId)
  ));
  res.json({ ok: true });
});
var customerAuth_default = router35;

// src/server/store.ts
import geoip from "geoip-lite";
var router36 = Router36();
var availableStockExpr = () => sql25`greatest(${stockBalances.physicalStock} - ${stockBalances.reservedStock}, 0)`;
var PIX_SETTINGS_KEY2 = "company_pix";
var MAX_PROOF_BYTES = 3 * 1024 * 1024;
var MAX_FONT_URL_CHARS = 4e5;
var MAX_ITEMS = 40;
var MAX_QTY_PER_ITEM = 99;
function makeOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LJ-${s}`;
}
var hits2 = /* @__PURE__ */ new Map();
function rateLimit2(key, max, windowMs) {
  const now = Date.now();
  const cur = hits2.get(key);
  if (!cur || now > cur.resetAt) {
    hits2.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
var clientIp2 = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
async function getStoreConfig() {
  const { resolveRates: resolveRates2, fetchApiRates: fetchApiRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
  let fx = await resolveRates2().catch(() => ({}));
  if (!fx.USDBRL || !fx.USDPYG) {
    await fetchApiRates2().catch((e) => console.error("[store] fetchApiRates falhou:", e.message));
    fx = await resolveRates2().catch(() => fx);
  }
  const currencies2 = [
    { code: "USD", rateToUsd: 1 },
    ...fx.USDBRL ? [{ code: "BRL", rateToUsd: fx.USDBRL.rate }] : [],
    ...fx.USDPYG ? [{ code: "PYG", rateToUsd: fx.USDPYG.rate }] : []
  ];
  const [cs] = await db.select().from(companySettings).limit(1);
  const pixRows = await db.select().from(systemSettings).where(eq39(systemSettings.key, PIX_SETTINGS_KEY2)).limit(1);
  const pix = pixRows[0]?.value || {};
  return {
    storeName: cs?.tradeName || cs?.companyName || "Sua loja",
    logoUrl: cs?.logoUrl || "",
    city: cs?.city || "",
    whatsapp: cs?.whatsappGateway || "",
    instagramUrl: cs?.instagramUrl || "",
    email: cs?.email || "",
    pixKey: pix.pixKey || "",
    currencies: currencies2
  };
}
router36.get("/info", async (_req, res) => {
  try {
    const c = await getStoreConfig();
    const { APP_VERSION: APP_VERSION2 } = await Promise.resolve().then(() => (init_version(), version_exports));
    res.json({ storeName: c.storeName, logoUrl: c.logoUrl, city: c.city, whatsapp: c.whatsapp, instagramUrl: c.instagramUrl, email: c.email, pixEnabled: !!c.pixKey, appVersion: APP_VERSION2, currencies: c.currencies });
  } catch (err) {
    res.status(500).json({ error: "Loja indispon\xEDvel." });
  }
});
router36.get("/manifest.webmanifest", async (_req, res) => {
  try {
    const c = await getStoreConfig();
    const name = String(c.storeName || "Sua loja").trim().slice(0, 80) || "Sua loja";
    res.type("application/manifest+json").set("Cache-Control", "no-store").json({
      name,
      short_name: name.slice(0, 24),
      description: `${name} \u2014 loja online`,
      start_url: "/loja/",
      scope: "/loja/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#d46a86",
      background_color: "#fff5f7",
      icons: [
        { src: "/api/store/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/store/icon/512", sizes: "512x512", type: "image/png", purpose: "any" }
      ]
    });
  } catch {
    res.status(503).json({ error: "Manifesto da loja indispon\xEDvel." });
  }
});
router36.get("/icon/:size", async (req, res) => {
  try {
    const size = req.params.size === "512" ? "512" : "192";
    const c = await getStoreConfig();
    const logo = String(c.logoUrl || "");
    const data = logo.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (data) {
      res.type(data[1]).set("Cache-Control", "no-store").send(Buffer.from(data[2], "base64"));
      return;
    }
    if (/^https?:\/\//i.test(logo)) {
      res.redirect(302, logo);
      return;
    }
    if (/^\/branding\/[a-z0-9/_-]+\.png$/i.test(logo)) {
      res.redirect(302, logo);
      return;
    }
    res.redirect(302, `/branding/store-placeholder-${size}.png?v=1`);
  } catch {
    const size = req.params.size === "512" ? "512" : "192";
    res.redirect(302, `/branding/store-placeholder-${size}.png?v=1`);
  }
});
var catalogWhere = () => and33(
  eq39(products.isActive, true),
  eq39(products.storeVisible, true),
  isNull10(products.parentId)
);
var publicStock = (available) => ({
  stockLabel: available > 10 ? "Dispon\xEDvel" : available > 0 ? `\xDAltimas ${available} un` : "Esgotado",
  stockStatus: available > 10 ? "available" : available > 0 ? "low" : "out",
  stockQty: available > 0 ? available : void 0,
  maxQty: Math.min(available, MAX_QTY_PER_ITEM)
});
router36.get("/products", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const group = String(req.query.group || "").trim();
    const subgroup = String(req.query.subgroup || "").trim();
    const sort = String(req.query.sort || "name");
    const brand = String(req.query.brand || "").trim();
    const model = String(req.query.model || "").trim();
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const canal = String(req.query.canal || "").trim();
    const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 240);
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 120) : 120;
    const effectivePrice = sql25`coalesce((select min(v.sale_price_a) from products v where v.parent_id = ${products.id} and v.is_active = true and v.store_visible = true), ${products.salePriceA})`;
    const orderBy = sort === "price_asc" ? sql25`${effectivePrice} asc` : sort === "price_desc" ? sql25`${effectivePrice} desc` : sort === "newest" ? desc22(products.createdAt) : sql25`${products.name} asc`;
    const priceExpr = canal === "oferta" ? sql25`coalesce(${products.ofertaPrice}, ${products.salePriceA})` : canal === "outlet" ? sql25`coalesce(${products.outletPrice}, ${products.salePriceA})` : products.salePriceA;
    const rows = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      imageUrl: products.imageUrl,
      price: priceExpr,
      description: products.storeDescription,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      groupName: productGroups.name,
      available: availableStockExpr()
    }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).leftJoin(productGroups, eq39(products.groupId, productGroups.id)).where(and33(
      catalogWhere(),
      ids.length > 0 ? inArray15(products.id, ids) : void 0,
      group ? eq39(products.groupId, group) : void 0,
      subgroup ? eq39(products.subgroupId, subgroup) : void 0,
      canal === "oferta" ? sql25`${products.ofertaQty} > 0` : void 0,
      canal === "outlet" ? sql25`${products.outletQty} > 0` : void 0,
      search ? or9(sql25`${products.name} ILIKE ${"%" + search + "%"}`, sql25`${products.sku} ILIKE ${"%" + search + "%"}`) : void 0,
      brand ? eq39(products.brand, brand) : void 0,
      model ? sql25`${products.model} ILIKE ${"%" + model + "%"}` : void 0,
      Number.isFinite(minPrice) ? sql25`${effectivePrice} >= ${minPrice}` : void 0,
      Number.isFinite(maxPrice) ? sql25`${effectivePrice} <= ${maxPrice}` : void 0
    )).orderBy(orderBy).limit(limit);
    const parentIds = rows.map((r) => r.id);
    const variantsMap = {};
    if (parentIds.length > 0) {
      const vRows = await db.select({
        id: products.id,
        parentId: products.parentId,
        variantName: products.variantName,
        price: products.salePriceA,
        available: availableStockExpr()
      }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(eq39(products.isActive, true), eq39(products.storeVisible, true), inArray15(products.parentId, parentIds)));
      for (const v of vRows) {
        if (!variantsMap[v.parentId]) variantsMap[v.parentId] = [];
        variantsMap[v.parentId].push({
          id: v.id,
          variantName: v.variantName,
          price: Number(v.price),
          available: Number(v.available)
        });
      }
    }
    const galleryMap = {};
    if (parentIds.length > 0) {
      const galleryRows = await db.select({ productId: productImages.productId, imageUrl: productImages.imageUrl }).from(productImages).where(inArray15(productImages.productId, parentIds)).orderBy(productImages.sortOrder);
      for (const g of galleryRows) {
        (galleryMap[g.productId] ||= []).push(g.imageUrl);
      }
    }
    res.json({
      data: rows.map((p) => {
        const variants = variantsMap[p.id] || [];
        const hasVariants = variants.length > 0;
        const totalAvailable = hasVariants ? variants.reduce((acc, v) => acc + v.available, 0) : Number(p.available);
        const displayPrice = hasVariants ? Math.min(...variants.map((v) => v.price)) : Number(p.price);
        const images = [...p.imageUrl ? [p.imageUrl] : [], ...galleryMap[p.id] || []].filter(Boolean).slice(0, 4);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          imageUrl: p.imageUrl,
          images,
          price: displayPrice,
          description: p.description,
          brand: p.brand,
          model: p.model,
          groupId: p.groupId,
          groupName: p.groupName,
          hasVariants,
          variants: variants.map((v) => ({ ...v, ...publicStock(v.available) })),
          ...publicStock(totalAvailable)
        };
      })
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar cat\xE1logo." });
  }
});
router36.get("/filters", async (_req, res) => {
  try {
    const effectivePrice = sql25`coalesce((select min(v.sale_price_a) from products v where v.parent_id = ${products.id} and v.is_active = true and v.store_visible = true), ${products.salePriceA})`;
    const [brandRows, priceRow, ofertaCount, outletCount] = await Promise.all([
      db.selectDistinct({ brand: products.brand }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(catalogWhere(), sql25`${products.brand} is not null and ${products.brand} <> ''`)).orderBy(products.brand),
      db.select({ min: sql25`min(${effectivePrice})`, max: sql25`max(${effectivePrice})` }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(catalogWhere()),
      db.select({ n: sql25`count(*)` }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(catalogWhere(), sql25`${products.ofertaQty} > 0`)),
      db.select({ n: sql25`count(*)` }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(catalogWhere(), sql25`${products.outletQty} > 0`))
    ]);
    res.json({
      brands: brandRows.map((r) => r.brand).filter(Boolean),
      priceMin: Math.floor(Number(priceRow[0]?.min) || 0),
      priceMax: Math.ceil(Number(priceRow[0]?.max) || 0),
      hasOferta: Number(ofertaCount[0]?.n) > 0,
      hasOutlet: Number(outletCount[0]?.n) > 0
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar filtros." });
  }
});
router36.get("/brands", async (_req, res) => {
  try {
    const rows = await db.select().from(brandLogos).where(and33(eq39(brandLogos.visible, true), isNotNull4(brandLogos.logoUrl))).orderBy(brandLogos.sortOrder);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar marcas." });
  }
});
router36.get("/categories", async (_req, res) => {
  try {
    const [rows, countRows, subgroupRows] = await Promise.all([
      db.select({
        id: productGroups.id,
        name: productGroups.name,
        icon: productGroups.icon,
        sortOrder: productGroups.sortOrder
      }).from(productGroups).where(and33(eq39(productGroups.storeVisible, true), eq39(productGroups.isActive, true), isNull10(productGroups.deletedAt))).orderBy(productGroups.sortOrder, productGroups.name),
      db.select({ groupId: products.groupId, count: sql25`count(*)` }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(catalogWhere()).groupBy(products.groupId),
      // Subgrupos só entram na navegação se tiverem produto visível de
      // verdade — subgrupo vazio não aparece como botão no catálogo.
      db.select({
        id: productSubgroups.id,
        groupId: productSubgroups.groupId,
        name: productSubgroups.name
      }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).innerJoin(productSubgroups, eq39(products.subgroupId, productSubgroups.id)).where(and33(catalogWhere(), eq39(productSubgroups.isActive, true))).groupBy(productSubgroups.id, productSubgroups.groupId, productSubgroups.name).orderBy(productSubgroups.name)
    ]);
    const countByGroup = new Map(countRows.map((row) => [row.groupId, Number(row.count)]));
    const subgroupsByGroup = {};
    for (const sg of subgroupRows) {
      (subgroupsByGroup[sg.groupId] ||= []).push({ id: sg.id, name: sg.name });
    }
    res.json({
      data: rows.map((r) => ({ ...r, count: countByGroup.get(r.id) || 0, subgroups: subgroupsByGroup[r.id] || [] }))
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar categorias." });
  }
});
async function buscarProdutoImpl(nomeBuscado) {
  const termo = String(nomeBuscado || "").trim().slice(0, 100);
  if (!termo) return { encontrados: [] };
  const rows = await db.select({
    id: products.id,
    name: products.name,
    price: products.salePriceA,
    available: availableStockExpr()
  }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(catalogWhere(), or9(
    sql25`${products.name} ILIKE ${"%" + termo + "%"}`,
    sql25`${products.sku} ILIKE ${"%" + termo + "%"}`
  ))).limit(5);
  if (rows.length === 0) return { encontrados: [] };
  const parentIds = rows.map((r) => r.id);
  const variantRows = await db.select({
    parentId: products.parentId,
    price: products.salePriceA,
    available: availableStockExpr()
  }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(eq39(products.isActive, true), eq39(products.storeVisible, true), inArray15(products.parentId, parentIds)));
  const variantsByParent = {};
  for (const v of variantRows) {
    if (!v.parentId) continue;
    (variantsByParent[v.parentId] ||= []).push({ price: Number(v.price), available: Number(v.available) });
  }
  return {
    encontrados: rows.map((r) => {
      const variants = variantsByParent[r.id] || [];
      const hasVariants = variants.length > 0;
      const available = hasVariants ? variants.reduce((acc, v) => acc + v.available, 0) : Number(r.available);
      const price = hasVariants ? Math.min(...variants.map((v) => v.price)) : Number(r.price);
      return {
        nome: r.name,
        preco: formatBrl(price),
        disponibilidade: publicStock(available).stockLabel
      };
    })
  };
}
router36.post("/assistant/chat", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`assistant:${ip}`, 200, 10 * 60 * 1e3)) {
      console.warn(`[assistant] rate limit atingido \u2014 ip=${ip || "(vazio)"}`);
      return res.status(429).json({ code: "AI_RATE_LIMIT", error: "Muitas mensagens. Aguarde alguns minutos e tente de novo." });
    }
    const message = String(req.body?.message || "").trim().slice(0, 500);
    if (!message) return res.status(400).json({ error: "Mensagem vazia." });
    const lang = ["es", "pt", "en"].includes(req.body?.lang) ? req.body.lang : "es";
    const historyRaw = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = historyRaw.filter((h) => h && (h.role === "user" || h.role === "model" || h.role === "assistant") && typeof h.text === "string").slice(-8).map((h) => ({ role: h.role === "model" ? "assistant" : h.role, content: String(h.text).slice(0, 500) }));
    const [company] = await db.select({ tradeName: companySettings.tradeName, companyName: companySettings.companyName }).from(companySettings).limit(1);
    const categoryRows = await db.select({ name: productGroups.name }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).innerJoin(productGroups, eq39(products.groupId, productGroups.id)).where(and33(catalogWhere(), eq39(productGroups.storeVisible, true))).groupBy(productGroups.id, productGroups.name);
    const categoryNames = [...new Set(categoryRows.map((r) => r.name))];
    const words = message.replace(/[^\p{L}\p{N}\-]+/gu, " ").split(/\s+/).map((word) => word.trim()).filter((word) => word.length >= 3).filter((word) => !["tem", "uma", "uns", "com", "para", "por", "qual", "quanto", "preco", "pre\xE7o", "produto", "voc\xEAs", "voces"].includes(word.toLowerCase())).slice(0, 5);
    let productContext = await buscarProdutoImpl(message);
    if (productContext.encontrados.length === 0) {
      for (const word of words) {
        productContext = await buscarProdutoImpl(word);
        if (productContext.encontrados.length > 0) break;
      }
    }
    const langName = { es: "espa\xF1ol", pt: "portugu\xEAs", en: "English" }[lang];
    const storeName = company?.tradeName || company?.companyName || "a loja";
    const systemPrompt = `Voc\xEA \xE9 a assistente de vendas da loja online "${storeName}".
Responda SEMPRE em ${langName}, em no m\xE1ximo 3 frases, com tom simp\xE1tico de atendente.
Categorias atuais: ${categoryNames.length > 0 ? categoryNames.join(", ") : "(nenhuma cadastrada ainda)"}.
Como funciona a compra: o cliente escolhe o produto, adiciona ao carrinho, paga via PIX, envia o comprovante pelo WhatsApp e combina retirada ou entrega.
Dados reais de produtos possivelmente relacionados \xE0 pergunta: ${JSON.stringify(productContext.encontrados)}.
Nunca invente pre\xE7o ou disponibilidade. S\xF3 informe pre\xE7o/estoque se aparecer nos dados reais acima; se n\xE3o aparecer, diga que n\xE3o localizou esse produto no cat\xE1logo.
Se a pergunta n\xE3o tiver rela\xE7\xE3o com a loja, recuse educadamente e redirecione para cat\xE1logo/atendimento.`;
    const reply = await ollamaChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message }
      ],
      temperature: 0.25,
      timeoutMs: 55e3
    });
    res.json({ reply: String(reply || "").trim() });
  } catch (err) {
    const info = getOllamaErrorInfo(err);
    if (info.notConfigured) return res.status(503).json({ code: "AI_UNAVAILABLE", error: "Assistente n\xE3o configurado. Configure o Ollama no servidor." });
    if (info.rateLimited) return res.status(429).json({ code: "AI_RATE_LIMIT", error: "Assistente ocupado agora. Tente de novo em instantes." });
    if (info.unavailable) return res.status(503).json({ code: "AI_UNAVAILABLE", error: "Assistente temporariamente indispon\xEDvel." });
    console.error("assistant Ollama error:", info.message);
    res.status(500).json({ code: "AI_ERROR", error: "N\xE3o consegui responder agora." });
  }
});
router36.get("/product/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const [p] = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      imageUrl: products.imageUrl,
      price: products.salePriceA,
      storeDescription: products.storeDescription,
      description: products.description,
      brand: products.brand,
      model: products.model,
      groupId: products.groupId,
      groupName: productGroups.name,
      available: availableStockExpr()
    }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).leftJoin(productGroups, eq39(products.groupId, productGroups.id)).where(and33(catalogWhere(), eq39(products.id, id))).limit(1);
    if (!p) return res.status(404).json({ error: "Produto n\xE3o dispon\xEDvel." });
    const gallery = await db.select({ imageUrl: productImages.imageUrl }).from(productImages).where(eq39(productImages.productId, id)).orderBy(productImages.sortOrder);
    const related = p.groupId ? await db.select({
      id: products.id,
      name: products.name,
      imageUrl: products.imageUrl,
      price: products.salePriceA,
      available: availableStockExpr()
    }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(catalogWhere(), eq39(products.groupId, p.groupId), sql25`${products.id} <> ${id}`)).orderBy(desc22(products.createdAt)).limit(4) : [];
    const variantsRows = await db.select({
      id: products.id,
      variantName: products.variantName,
      price: products.salePriceA,
      available: availableStockExpr()
    }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(and33(eq39(products.isActive, true), eq39(products.storeVisible, true), eq39(products.parentId, id)));
    const variants = variantsRows.map((v) => ({
      id: v.id,
      variantName: v.variantName,
      price: Number(v.price),
      ...publicStock(Number(v.available))
    }));
    const totalAvailable = variants.length > 0 ? variantsRows.reduce((sum, v) => sum + Number(v.available), 0) : Number(p.available);
    const displayPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : Number(p.price);
    res.json({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: displayPrice,
      description: p.storeDescription || p.description || "",
      brand: p.brand,
      model: p.model,
      groupId: p.groupId,
      groupName: p.groupName,
      images: [...p.imageUrl ? [p.imageUrl] : [], ...gallery.map((g) => g.imageUrl)].filter(Boolean),
      variants,
      hasVariants: variants.length > 0,
      ...publicStock(totalAvailable),
      related: related.map((r) => ({ id: r.id, name: r.name, imageUrl: r.imageUrl, price: Number(r.price), ...publicStock(Number(r.available)) }))
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar produto." });
  }
});
router36.post("/pageview", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`pageview:${ip}`, 60, 60 * 1e3)) return res.status(429).json({ error: "Rate limit exceeded" });
    const path6 = String(req.body?.path || "/loja").slice(0, 200);
    const visitorId = req.body?.visitorId ? String(req.body.visitorId).slice(0, 64) : null;
    let country = null, region = null, city = null;
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country || null;
        region = geo.region || null;
        city = geo.city || null;
      }
    } catch {
    }
    await db.insert(storePageviews).values({ path: path6, visitorId, country, region, city });
    res.status(201).json({ success: true });
  } catch {
    res.status(200).json({ success: false });
  }
});
router36.post("/newsletter", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`newsletter:${ip}`, 8, 10 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Informe um e-mail v\xE1lido." });
    }
    await db.insert(storeNewsletterSubscribers).values({ email, source: "HOME_FIRST_ORDER" }).onConflictDoUpdate({
      target: storeNewsletterSubscribers.email,
      set: { isActive: true, source: "HOME_FIRST_ORDER", updatedAt: /* @__PURE__ */ new Date() }
    });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Erro ao cadastrar newsletter:", err);
    return res.status(500).json({ error: "N\xE3o foi poss\xEDvel cadastrar agora." });
  }
});
router36.post("/cart/abandoned", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`cart_abandoned:${ip}`, 10, 5 * 60 * 1e3)) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    const { customerPhone, customerName, items } = req.body;
    if (!customerPhone || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const phoneClean = customerPhone.replace(/\D/g, "");
    if (phoneClean.length < 10) return res.status(400).json({ error: "Invalid phone" });
    const { abandonedCarts: abandonedCarts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const updateSet = { cartData: items, status: "PENDING", updatedAt: /* @__PURE__ */ new Date() };
    if (customerName) updateSet.customerName = customerName;
    await db.insert(abandonedCarts2).values({ customerPhone, customerName: customerName || null, cartData: items, status: "PENDING" }).onConflictDoUpdate({ target: abandonedCarts2.customerPhone, set: updateSet });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro no carrinho abandonado:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router36.get("/admin/abandoned-carts", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const { abandonedCarts: abandonedCarts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const list = await db.select().from(abandonedCarts2).where(eq39(abandonedCarts2.status, "PENDING")).orderBy(desc22(abandonedCarts2.updatedAt));
    return res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});
router36.post("/shipping/calculate", async (req, res) => {
  try {
    const { cep, items } = req.body;
    if (!cep || !items || !items.length) {
      return res.status(400).json({ success: false, error: "CEP e itens s\xE3o obrigat\xF3rios." });
    }
    await new Promise((r) => setTimeout(r, 800));
    const baseVal = parseInt(cep.replace(/\\D/g, "").substring(0, 2)) || 10;
    res.json({
      success: true,
      data: [
        { id: "pac", name: "PAC", feeBrl: (15 + baseVal * 0.5).toFixed(2), days: 7 },
        { id: "sedex", name: "SEDEX", feeBrl: (30 + baseVal).toFixed(2), days: 3 }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router36.post("/orders", requireCustomerAuth, async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`order:${ip}`, 5, 10 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitos pedidos deste dispositivo. Tente novamente em alguns minutos." });
    }
    const { deliveryType, address, cep, street, number: number2, neighborhood, city, state, shippingMethod, shippingFeeBrl, notes, items, couponCode, shippingZoneId, acceptedTerms } = req.body || {};
    if (!acceptedTerms) return res.status(400).json({ error: "\xC9 preciso aceitar os termos do pedido para continuar." });
    const [buyer] = await db.select().from(customers).where(eq39(customers.id, req.customer.customerId)).limit(1);
    if (!buyer) return res.status(401).json({ error: "Conta n\xE3o encontrada. Fa\xE7a login novamente." });
    const name = buyer.name;
    const phone = onlyDigits(buyer.phone || "");
    const cpf = onlyDigits(buyer.document || "");
    if (!isValidCpf(cpf)) return res.status(400).json({ error: "O CPF da sua conta est\xE1 inv\xE1lido \u2014 atualize em Meus dados antes de comprar." });
    const payerIsBuyer = req.body?.payerIsBuyer !== false;
    let payerName2 = null;
    let payerCpf = null;
    if (!payerIsBuyer) {
      payerName2 = String(req.body?.payerDeclaredName || "").trim().replace(/\s+/g, " ");
      payerCpf = onlyDigits(req.body?.payerDeclaredCpf);
      if (!isFullName(payerName2)) return res.status(400).json({ error: "Informe o nome completo de quem vai pagar." });
      if (!isValidCpf(payerCpf)) return res.status(400).json({ error: "CPF de quem vai pagar \xE9 inv\xE1lido." });
      if (payerCpf === cpf) return res.status(400).json({ error: 'O CPF do pagador \xE9 o mesmo seu \u2014 escolha "eu mesmo" acima.' });
    }
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Carrinho vazio." });
    if (items.length > MAX_ITEMS) return res.status(400).json({ error: "Pedido muito grande. Fale conosco pelo WhatsApp." });
    const delivery = deliveryType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    if (delivery === "DELIVERY" && String(address || "").trim().length < 8) {
      return res.status(400).json({ error: "Informe o endere\xE7o de entrega." });
    }
    const terms = await getStoreVitrineConfig();
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx.select({ id: users.id }).from(users).leftJoin(roles, eq39(users.roleId, roles.id)).where(and33(eq39(users.isActive, true), sql25`lower(coalesce(${roles.name}, '')) in ('master','admin','administrador','administrator')`)).limit(1);
      if (!owner) throw new Error("Loja sem operador configurado.");
      const customerId = buyer.id;
      const patch = {};
      if (!buyer.phone && phone) patch.phone = phone;
      if (!buyer.address && delivery === "DELIVERY" && address) patch.address = String(address).trim();
      if (Object.keys(patch).length > 0) {
        await tx.update(customers).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(customers.id, customerId));
      }
      const ids = [...new Set(items.map((i) => String(i.productId)))];
      const prods = await tx.select({
        id: products.id,
        name: products.name,
        price: products.salePriceA,
        isActive: products.isActive,
        storeVisible: products.storeVisible,
        requiresLot: products.requiresLot,
        physical: stockBalances.physicalStock,
        reserved: stockBalances.reservedStock
      }).from(products).innerJoin(stockBalances, eq39(products.id, stockBalances.productId)).where(inArray15(products.id, ids)).for("update");
      const map = new Map(prods.map((p) => [p.id, p]));
      let subtotal = 0;
      const toInsert = [];
      const saleId = uuidv418();
      for (const raw of items) {
        const p = map.get(String(raw.productId));
        const qty = Math.floor(Number(raw.quantity) || 0);
        if (!p || !p.isActive || !p.storeVisible) throw new Error("Um dos produtos n\xE3o est\xE1 mais dispon\xEDvel.");
        if (qty <= 0 || qty > MAX_QTY_PER_ITEM) throw new Error("Quantidade inv\xE1lida no pedido.");
        const free = Number(p.physical) - Number(p.reserved);
        if (qty > free) throw new Error(`Estoque insuficiente de "${p.name}". Dispon\xEDvel: ${Math.max(0, free)}.`);
        const unit = Number(p.price);
        const total = round23(unit * qty);
        subtotal = round23(subtotal + total);
        toInsert.push({
          id: uuidv418(),
          saleId,
          productId: p.id,
          quantity: qty,
          unitPrice: unit.toFixed(2),
          totalPrice: total.toFixed(2),
          discountAmount: "0",
          ivaAmount: "0"
        });
      }
      let shippingFee = 0;
      let zoneName = null;
      if (delivery === "DELIVERY") {
        if (!shippingZoneId) throw new Error("Op\xE7\xE3o de frete inv\xE1lida.");
        const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const [zone] = await tx.select().from(storeShippingZones2).where(and33(eq39(storeShippingZones2.id, String(shippingZoneId)), eq39(storeShippingZones2.isActive, true))).limit(1);
        if (!zone) throw new Error("Regi\xE3o de entrega inv\xE1lida. Escolha de novo.");
        shippingFee = round23(Number(zone.feeBrl));
        zoneName = zone.name;
      }
      let discount = 0;
      let appliedCoupon = null;
      if (couponCode && String(couponCode).trim()) {
        const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const codeUp = String(couponCode).trim().toUpperCase();
        const [c] = await tx.select().from(storeCoupons2).where(eq39(storeCoupons2.code, codeUp)).for("update").limit(1);
        if (!c || !c.isActive) throw new Error("Cupom n\xE3o encontrado ou inativo.");
        const nowD = /* @__PURE__ */ new Date();
        if (c.validFrom && nowD < new Date(c.validFrom)) throw new Error("Cupom ainda n\xE3o est\xE1 valendo.");
        if (c.validUntil && nowD > new Date(c.validUntil)) throw new Error("Cupom expirado.");
        if (c.maxUses != null && Number(c.usedCount) >= Number(c.maxUses)) throw new Error("Cupom esgotado.");
        const min = c.minOrderBrl != null ? Number(c.minOrderBrl) : 0;
        if (subtotal < min) throw new Error(`Pedido m\xEDnimo de R$ ${min.toFixed(2).replace(".", ",")} pra usar esse cupom.`);
        discount = c.type === "FIXED" ? Math.min(round23(Number(c.value)), subtotal) : round23(subtotal * Number(c.value) / 100);
        appliedCoupon = codeUp;
        await tx.update(storeCoupons2).set({ usedCount: Number(c.usedCount) + 1, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeCoupons2.id, c.id));
      }
      const grandTotal = calcOrderTotal(subtotal, discount, shippingFee);
      await tx.insert(sales).values({
        id: saleId,
        series: "LOJ",
        userId: owner.id,
        customerId,
        priceTable: "A",
        subtotalAmount: round23(subtotal + shippingFee).toFixed(2),
        discountAmount: discount.toFixed(2),
        ivaAmount: "0",
        totalAmount: grandTotal.toFixed(2),
        currency: "BRL",
        orderStatus: "CONFIRMED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "PENDING",
        observations: `PEDIDO ONLINE - ${name} - ${phone}${delivery === "DELIVERY" ? ` - ENTREGA: ${String(address).trim()}` : " - RETIRADA"}${zoneName ? ` - REGIAO: ${zoneName} (FRETE R$ ${shippingFee.toFixed(2)})` : ""}${appliedCoupon ? ` - CUPOM: ${appliedCoupon} (-R$ ${discount.toFixed(2)})` : ""}${notes ? ` - OBS: ${String(notes).trim()}` : ""}`.toUpperCase()
      });
      await tx.insert(saleItems).values(toInsert);
      for (const it of toInsert) {
        const p = map.get(it.productId);
        const beforeRes = Number(p.reserved);
        const newRes = beforeRes + Number(it.quantity);
        await tx.update(stockBalances).set({ reservedStock: newRes, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(stockBalances.productId, it.productId));
        await tx.insert(stockReservations).values({ id: uuidv418(), saleId, productId: it.productId, quantity: it.quantity, status: "ACTIVE" });
        await tx.insert(stockMovements).values({
          id: uuidv418(),
          productId: it.productId,
          movementType: "STORE_ORDER_RESERVE",
          quantity: it.quantity,
          userId: owner.id,
          referenceId: saleId,
          beforePhysical: Number(p.physical),
          afterPhysical: Number(p.physical),
          beforeReserved: beforeRes,
          afterReserved: newRes,
          notes: "Reserva de pedido da loja online"
        });
        p.reserved = newRes;
      }
      let code = makeOrderCode();
      for (let i = 0; i < 5; i++) {
        const exists = await tx.select({ id: storeOrders.id }).from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
        if (!exists.length) break;
        code = makeOrderCode();
      }
      const [order] = await tx.insert(storeOrders).values({
        code,
        saleId,
        customerName: name,
        customerPhone: phone,
        customerDocument: cpf,
        customerId,
        // Prova de aceite: texto exato, versão, quando, de onde e de qual aparelho.
        clientUserAgent: String(req.headers["user-agent"] || "").slice(0, 400),
        termsVersion: terms.termsVersion,
        termsAcceptedAt: /* @__PURE__ */ new Date(),
        // Pagamento por terceiro entra no próprio texto aceito — a autorização
        // fica provada junto com o resto.
        termsSnapshot: payerIsBuyer ? terms.termsText : `${terms.termsText}

Declara\xE7\xE3o adicional: autorizo que o pagamento deste pedido seja feito por ${payerName2} (CPF ${payerCpf}), com o meu conhecimento e a meu pedido.`,
        payerIsBuyer,
        payerDeclaredName: payerName2,
        payerDeclaredCpf: payerCpf,
        deliveryType: delivery,
        address: delivery === "DELIVERY" ? String(address).trim() : null,
        cep: delivery === "DELIVERY" && cep ? String(cep).trim() : null,
        street: delivery === "DELIVERY" && street ? String(street).trim() : null,
        number: delivery === "DELIVERY" && number2 ? String(number2).trim() : null,
        neighborhood: delivery === "DELIVERY" && neighborhood ? String(neighborhood).trim() : null,
        city: delivery === "DELIVERY" && city ? String(city).trim() : null,
        state: delivery === "DELIVERY" && state ? String(state).trim() : null,
        shippingMethod: delivery === "DELIVERY" && shippingMethod ? String(shippingMethod).trim() : null,
        notes: notes ? String(notes).trim() : null,
        totalAmount: grandTotal.toFixed(2),
        subtotalBrl: subtotal.toFixed(2),
        couponCode: appliedCoupon,
        discountBrl: discount > 0 ? discount.toFixed(2) : null,
        shippingZone: zoneName,
        shippingFeeBrl: zoneName != null ? shippingFee.toFixed(2) : null,
        status: "AWAITING_PAYMENT",
        clientIp: ip
      }).returning();
      const phoneClean = phone.replace(/\D/g, "");
      if (phoneClean.length >= 10) {
        const { abandonedCarts: abandonedCarts2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await tx.update(abandonedCarts2).set({ status: "RECOVERED", updatedAt: /* @__PURE__ */ new Date() }).where(eq39(abandonedCarts2.customerPhone, phone));
      }
      await tx.insert(auditLogs).values({
        id: uuidv418(),
        userId: owner.id,
        action: "STORE_ORDER_CREATED",
        tableName: "store_orders",
        recordId: order.id,
        newValues: JSON.stringify({ code, total: grandTotal, subtotal, discount, shippingFee, coupon: appliedCoupon, items: toInsert.length })
      });
      return { code: order.code, total: grandTotal, customerName: order.customerName };
    });
    await createNotification(db, {
      type: "ORDER_NEW",
      title: "Novo pedido recebido",
      message: `${result.customerName} fez o pedido ${result.code} no valor de ${formatBrl(result.total)}.`,
      link: "/store-orders"
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "N\xE3o foi poss\xEDvel criar o pedido." });
  }
});
router36.get("/orders/:code", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`order_lookup:${ip}`, 30, 10 * 60 * 1e3)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }
    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    const items = order.saleId ? await db.select({ name: products.name, quantity: saleItems.quantity, unitPrice: saleItems.unitPrice, totalPrice: saleItems.totalPrice }).from(saleItems).leftJoin(products, eq39(saleItems.productId, products.id)).where(eq39(saleItems.saleId, order.saleId)) : [];
    const cfg = await getStoreConfig();
    const makePix = async (amount, txid) => {
      if (!cfg.pixKey) return "";
      const { buildPixPayload: buildPixPayload2 } = await Promise.resolve().then(() => (init_pix(), pix_exports));
      try {
        return buildPixPayload2({
          pixKey: cfg.pixKey,
          amount,
          merchantName: cfg.storeName,
          merchantCity: cfg.city || "CIDADE",
          txid
        });
      } catch {
        return "";
      }
    };
    const openForPayment = order.status === "AWAITING_PAYMENT" || order.status === "PROOF_SENT";
    const pixPayload = order.status === "AWAITING_PAYMENT" ? await makePix(Number(order.totalAmount), order.code.replace("-", "")) : "";
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const parts = await db.select().from(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, order.id)).orderBy(storeOrderPayments2.seq);
    const payments2 = [];
    for (const p of parts) {
      payments2.push({
        id: p.id,
        seq: p.seq,
        amount: Number(p.amountBrl),
        status: p.status,
        hasProof: !!p.proofData,
        pixPayload: openForPayment && p.status !== "CONFIRMED" && !p.proofData ? await makePix(Number(p.amountBrl), `${order.code.replace("-", "")}${p.seq}`) : ""
      });
    }
    const paidSent = payments2.filter((p) => p.hasProof).reduce((s, p) => s + p.amount, 0);
    res.json({
      pixConfigured: !!cfg.pixKey,
      payments: payments2,
      paidSent: round23(paidSent),
      remaining: round23(Math.max(0, Number(order.totalAmount) - paidSent)),
      code: order.code,
      status: order.status,
      total: Number(order.totalAmount),
      subtotal: order.subtotalBrl != null ? Number(order.subtotalBrl) : Number(order.totalAmount),
      couponCode: order.couponCode || null,
      discount: order.discountBrl != null ? Number(order.discountBrl) : 0,
      shippingZone: order.shippingZone || null,
      shippingFee: order.shippingFeeBrl != null ? Number(order.shippingFeeBrl) : 0,
      customerName: order.customerName,
      deliveryType: order.deliveryType,
      address: order.address,
      createdAt: order.createdAt,
      hasProof: !!order.proofData,
      deliveryConfirmedAt: order.deliveryConfirmedAt,
      items,
      pixPayload,
      pixKey: order.status === "AWAITING_PAYMENT" ? cfg.pixKey : "",
      storeName: cfg.storeName,
      whatsapp: cfg.whatsapp
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar pedido." });
  }
});
router36.post("/orders/:code/proof", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`proof:${ip}`, 10, 10 * 60 * 1e3)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const code = String(req.params.code || "").toUpperCase().trim();
    const { fileName, fileType, data } = req.body || {};
    if (!data || typeof data !== "string") return res.status(400).json({ error: "Envie o arquivo do comprovante." });
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(String(fileType || ""));
    if (!okType) return res.status(400).json({ error: "Formato inv\xE1lido. Envie imagem (JPG/PNG) ou PDF." });
    const approxBytes = Math.floor(data.length * 3 / 4);
    if (approxBytes > MAX_PROOF_BYTES) return res.status(400).json({ error: "Arquivo muito grande (m\xE1x. 3 MB)." });
    const [order] = await db.select().from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    await db.update(storeOrders).set({
      proofFileName: String(fileName || "comprovante").slice(0, 120),
      proofFileType: String(fileType),
      proofFileSize: approxBytes,
      proofData: data,
      proofSentAt: /* @__PURE__ */ new Date(),
      status: order.status === "AWAITING_PAYMENT" ? "PROOF_SENT" : order.status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq39(storeOrders.id, order.id));
    await createNotification(db, {
      type: "PAYMENT_PROOF",
      title: "Comprovante recebido",
      message: `${order.customerName} enviou o comprovante do pedido ${order.code} \u2014 confira e confirme.`,
      link: "/store-orders"
    });
    res.json({ success: true, status: "PROOF_SENT" });
  } catch (err) {
    res.status(400).json({ error: "N\xE3o foi poss\xEDvel enviar o comprovante." });
  }
});
router36.post("/orders/:code/received", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`received:${ip}`, 20, 10 * 60 * 1e3)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    if (order.status !== "CONFIRMED") return res.status(400).json({ error: "O pagamento ainda n\xE3o foi confirmado pela loja." });
    if (order.deliveryConfirmedAt) return res.json({ success: true, alreadyConfirmed: true });
    await db.update(storeOrders).set({
      deliveryConfirmedAt: /* @__PURE__ */ new Date(),
      deliveryConfirmedIp: ip,
      deliveryConfirmedUserAgent: String(req.headers["user-agent"] || "").slice(0, 400),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq39(storeOrders.id, order.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "N\xE3o foi poss\xEDvel registrar o recebimento." });
  }
});
var MAX_PARTS = 6;
function splitAmount(total, parts) {
  const base = Math.floor(total * 100 / parts) / 100;
  const values = Array.from({ length: parts }, () => base);
  values[parts - 1] = round23(total - base * (parts - 1));
  return values;
}
router36.post("/orders/:code/split", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`split:${ip}`, 20, 10 * 60 * 1e3)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const parts = Math.floor(Number(req.body?.parts) || 0);
    if (!(parts >= 1 && parts <= MAX_PARTS)) return res.status(400).json({ error: `Escolha de 1 a ${MAX_PARTS} pagamentos.` });
    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    if (order.status === "CONFIRMED") return res.status(400).json({ error: "Este pedido j\xE1 est\xE1 pago." });
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const existing = await db.select().from(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, order.id));
    if (existing.some((p) => !!p.proofData)) {
      return res.status(400).json({ error: "J\xE1 existe comprovante enviado. Fale com a loja pelo WhatsApp para ajustar a divis\xE3o." });
    }
    await db.delete(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, order.id));
    if (parts > 1) {
      const values = splitAmount(Number(order.totalAmount), parts);
      await db.insert(storeOrderPayments2).values(values.map((amount, i) => ({
        orderId: order.id,
        seq: i + 1,
        amountBrl: amount.toFixed(2)
      })));
    }
    res.json({ success: true, parts });
  } catch (err) {
    res.status(400).json({ error: "N\xE3o foi poss\xEDvel dividir o pagamento." });
  }
});
router36.post("/orders/:code/payments/:paymentId/proof", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`proof:${ip}`, 15, 10 * 60 * 1e3)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const { fileName, fileType, data } = req.body || {};
    if (!data || typeof data !== "string") return res.status(400).json({ error: "Envie o arquivo do comprovante." });
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(String(fileType || ""));
    if (!okType) return res.status(400).json({ error: "Formato inv\xE1lido. Envie imagem (JPG/PNG) ou PDF." });
    const approxBytes = Math.floor(data.length * 3 / 4);
    if (approxBytes > MAX_PROOF_BYTES) return res.status(400).json({ error: "Arquivo muito grande (m\xE1x. 3 MB)." });
    const code = String(req.params.code || "").toUpperCase().trim();
    const [order] = await db.select().from(storeOrders).where(eq39(storeOrders.code, code)).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.status === "CANCELED") return res.status(400).json({ error: "Este pedido foi cancelado." });
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [part] = await db.select().from(storeOrderPayments2).where(and33(eq39(storeOrderPayments2.id, String(req.params.paymentId)), eq39(storeOrderPayments2.orderId, order.id))).limit(1);
    if (!part) return res.status(404).json({ error: "Pagamento n\xE3o encontrado neste pedido." });
    await db.update(storeOrderPayments2).set({
      proofFileName: String(fileName || "comprovante").slice(0, 120),
      proofFileType: String(fileType),
      proofFileSize: approxBytes,
      proofData: data,
      proofSentAt: /* @__PURE__ */ new Date(),
      status: part.status === "CONFIRMED" ? "CONFIRMED" : "PROOF_SENT",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq39(storeOrderPayments2.id, part.id));
    const all = await db.select().from(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, order.id));
    const allSent = all.every((p) => !!p.proofData);
    if (allSent && order.status === "AWAITING_PAYMENT") {
      await db.update(storeOrders).set({ status: "PROOF_SENT", proofSentAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeOrders.id, order.id));
    }
    res.json({ success: true, allSent });
  } catch (err) {
    res.status(400).json({ error: "N\xE3o foi poss\xEDvel enviar o comprovante." });
  }
});
router36.get("/admin/orders", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const rows = await db.select({
      id: storeOrders.id,
      code: storeOrders.code,
      saleId: storeOrders.saleId,
      customerName: storeOrders.customerName,
      customerPhone: storeOrders.customerPhone,
      customerDocument: storeOrders.customerDocument,
      customerId: storeOrders.customerId,
      clientIp: storeOrders.clientIp,
      clientUserAgent: storeOrders.clientUserAgent,
      termsVersion: storeOrders.termsVersion,
      termsAcceptedAt: storeOrders.termsAcceptedAt,
      receivedAmountBrl: storeOrders.receivedAmountBrl,
      payerName: storeOrders.payerName,
      payerIsBuyer: storeOrders.payerIsBuyer,
      payerDeclaredName: storeOrders.payerDeclaredName,
      payerDeclaredCpf: storeOrders.payerDeclaredCpf,
      deliveryConfirmedAt: storeOrders.deliveryConfirmedAt,
      deliveryType: storeOrders.deliveryType,
      address: storeOrders.address,
      notes: storeOrders.notes,
      totalAmount: storeOrders.totalAmount,
      status: storeOrders.status,
      proofFileName: storeOrders.proofFileName,
      proofSentAt: storeOrders.proofSentAt,
      createdAt: storeOrders.createdAt,
      confirmedAt: storeOrders.confirmedAt,
      saleNumber: sales.number,
      saleSeries: sales.series,
      salePaymentStatus: sales.paymentStatus,
      // Pedido pago em partes: quantas partes existem e quantas já têm comprovante.
      partsTotal: sql25`(select count(*) from store_order_payments p where p.order_id = ${storeOrders.id})`,
      partsWithProof: sql25`(select count(*) from store_order_payments p where p.order_id = ${storeOrders.id} and p.proof_data is not null)`
    }).from(storeOrders).leftJoin(sales, eq39(storeOrders.saleId, sales.id)).where(status ? eq39(storeOrders.status, status) : void 0).orderBy(desc22(storeOrders.createdAt)).limit(200);
    const counts = await db.select({ status: storeOrders.status, n: sql25`count(*)` }).from(storeOrders).groupBy(storeOrders.status);
    res.json({
      data: rows.map((r) => ({ ...r, partsTotal: Number(r.partsTotal), partsWithProof: Number(r.partsWithProof) })),
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.get("/admin/orders/:id/proof", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const [o] = await db.select({ data: storeOrders.proofData, type: storeOrders.proofFileType, name: storeOrders.proofFileName }).from(storeOrders).where(eq39(storeOrders.id, req.params.id)).limit(1);
    if (!o?.data) return res.status(404).json({ error: "Sem comprovante." });
    res.json({ data: o.data, fileType: o.type, fileName: o.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.get("/admin/orders/:id/payments", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const rows = await db.select({
      id: storeOrderPayments2.id,
      seq: storeOrderPayments2.seq,
      amountBrl: storeOrderPayments2.amountBrl,
      status: storeOrderPayments2.status,
      fileName: storeOrderPayments2.proofFileName,
      fileType: storeOrderPayments2.proofFileType,
      sentAt: storeOrderPayments2.proofSentAt,
      hasProof: sql25`${storeOrderPayments2.proofData} is not null`
    }).from(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, req.params.id)).orderBy(storeOrderPayments2.seq);
    res.json({ data: rows.map((r) => ({ ...r, amount: Number(r.amountBrl) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.get("/admin/orders/:id/payments/:paymentId/proof", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [p] = await db.select().from(storeOrderPayments2).where(and33(eq39(storeOrderPayments2.id, req.params.paymentId), eq39(storeOrderPayments2.orderId, req.params.id))).limit(1);
    if (!p?.proofData) return res.status(404).json({ error: "Sem comprovante nesta parte." });
    res.json({ data: p.proofData, fileType: p.proofFileType, fileName: p.proofFileName, amount: Number(p.amountBrl), seq: p.seq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.post("/admin/orders/:id/confirm", requireAuth, requirePermission("cash", "receive_payment"), async (req, res) => {
  try {
    const [o] = await db.select().from(storeOrders).where(eq39(storeOrders.id, req.params.id)).limit(1);
    if (!o) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (o.status === "CANCELED") return res.status(400).json({ error: "Pedido cancelado." });
    if (o.saleId) {
      const [linkedSale] = await db.select().from(sales).where(eq39(sales.id, o.saleId)).limit(1);
      if (linkedSale && (["CANCELED", "CANCELLED", "RETURNED"].includes(String(linkedSale.orderStatus)) || linkedSale.paymentStatus === "REFUNDED")) {
        return res.status(400).json({ error: "A venda deste pedido j\xE1 foi cancelada/estornada no Caixa." });
      }
    }
    const total = round23(Number(o.totalAmount));
    const informed = req.body?.receivedAmount;
    const received = informed == null || informed === "" ? total : round23(Number(informed));
    if (!(received >= 0)) return res.status(400).json({ error: "Valor recebido inv\xE1lido." });
    const missing = round23(total - received);
    if (missing > MONEY_EPSILON && !req.body?.force) {
      return res.status(409).json({
        error: `Faltam R$ ${missing.toFixed(2).replace(".", ",")} \u2014 recebido R$ ${received.toFixed(2).replace(".", ",")} de R$ ${total.toFixed(2).replace(".", ",")}.`,
        code: "AMOUNT_MISMATCH",
        total,
        received,
        missing
      });
    }
    if (missing > MONEY_EPSILON && req.body?.force) {
      await createNotification(db, {
        type: "PAYMENT_MISMATCH",
        title: "Pedido confirmado com falta",
        message: `Pedido ${o.code} (${o.customerName}) confirmado faltando ${formatBrl(missing)} de ${formatBrl(total)}.`,
        link: "/store-orders"
      });
    }
    await db.transaction(async (tx) => {
      const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await tx.update(storeOrders).set({
        status: "CONFIRMED",
        confirmedBy: req.user.userId,
        confirmedAt: /* @__PURE__ */ new Date(),
        receivedAmountBrl: received.toFixed(2),
        payerName: req.body?.payerName ? String(req.body.payerName).trim().slice(0, 160) : null,
        receiptCheckedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq39(storeOrders.id, o.id));
      await tx.update(storeOrderPayments2).set({ status: "CONFIRMED", confirmedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeOrderPayments2.orderId, o.id));
      if (o.saleId) {
        await routePayment(tx, "PIX", received, {
          saleId: o.saleId,
          saleLabel: `Pedido ${o.code}`,
          userId: req.user.userId,
          sourceCurrency: "BRL"
        });
        const [sale] = await tx.select().from(sales).where(eq39(sales.id, o.saleId)).limit(1).for("update");
        if (sale) {
          const newStatus = received >= total - MONEY_EPSILON ? "PAID" : "PARTIAL";
          const orderStatusUpdate = newStatus === "PAID" && sale.fulfillmentStatus === "DELIVERED" ? { orderStatus: "COMPLETED" } : {};
          await tx.update(sales).set({ paymentStatus: newStatus, ...orderStatusUpdate }).where(eq39(sales.id, o.saleId));
        }
      }
      await logAction(req.user.userId, "STORE_ORDER_CONFIRM", "store_orders", o.id, null, {
        code: o.code,
        total,
        received,
        missing: missing > 0 ? missing : 0,
        payerName: req.body?.payerName || null
      }, tx);
    });
    await createNotification(db, {
      type: "PAYMENT_CONFIRMED",
      title: "Pagamento confirmado",
      message: `Pagamento de ${formatBrl(received)} do pedido ${o.code} (${o.customerName}) confirmado.`,
      link: "/store-orders"
    });
    res.json({ success: true, received, missing: missing > 0 ? missing : 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.post("/admin/orders/:id/cancel", requireAuth, requirePermission("sales", "cancel"), async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim() || "Cancelado pela loja";
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(storeOrders).where(eq39(storeOrders.id, req.params.id)).limit(1);
      if (!o) throw new Error("Pedido n\xE3o encontrado.");
      if (o.status === "CANCELED") throw new Error("Pedido j\xE1 cancelado.");
      const [sale] = o.saleId ? await tx.select().from(sales).where(eq39(sales.id, o.saleId)).limit(1) : [void 0];
      const saleAlreadyDead = sale && (["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus)) || sale.paymentStatus === "REFUNDED");
      if (sale && !saleAlreadyDead) {
        await cancelSaleTx(tx, sale, reason, req.user.userId);
        return;
      }
      if (o.couponCode) {
        const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await tx.update(storeCoupons2).set({ usedCount: sql25`greatest(${storeCoupons2.usedCount} - 1, 0)`, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeCoupons2.code, o.couponCode));
      }
      await tx.update(storeOrders).set({ status: "CANCELED", canceledReason: reason, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeOrders.id, o.id));
    });
    await logAction(req.user.userId, "STORE_ORDER_CANCEL", "store_orders", req.params.id, null, { reason });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.post("/admin/orders/:id/purge", requireAuth, requirePermission("admin", "manage"), async (req, res) => {
  try {
    const { masterPassword } = req.body || {};
    if (!masterPassword) return res.status(400).json({ error: "Senha do Master \xE9 obrigat\xF3ria." });
    const master = await findMasterByPassword(String(masterPassword));
    if (!master) return res.status(403).json({ error: "Senha inv\xE1lida \u2014 s\xF3 o perfil Master pode excluir um pedido." });
    const result = await db.transaction(async (tx) => {
      const [o] = await tx.select().from(storeOrders).where(eq39(storeOrders.id, req.params.id)).limit(1).for("update");
      if (!o) throw new Error("Pedido n\xE3o encontrado.");
      if (o.status !== "CANCELED") throw new Error("S\xF3 \xE9 poss\xEDvel excluir pedidos cancelados.");
      let reversedAmount = 0;
      if (o.saleId) {
        const [sale] = await tx.select().from(sales).where(eq39(sales.id, o.saleId)).limit(1).for("update");
        if (sale) {
          if (!["CANCELED", "CANCELLED", "RETURNED"].includes(String(sale.orderStatus))) {
            throw new Error("A venda ligada a este pedido n\xE3o est\xE1 cancelada \u2014 cancele ou devolva pelo Caixa antes de excluir.");
          }
          const before = await tx.select({ amt: accountMovements.amountUsd }).from(accountMovements).where(eq39(accountMovements.referenceId, sale.id));
          reversedAmount = before.reduce((s, r) => s + Number(r.amt), 0);
          if (Math.abs(reversedAmount) > MONEY_EPSILON) {
            await reverseSaleMovements(tx, sale.id, req.user.userId, `pedido da loja ${o.code} exclu\xEDdo por Master`);
          }
        }
        const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await tx.delete(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, o.id));
      }
      await logAction(master.id, "MASTER_PURGE_STORE_ORDER", "store_orders", o.id, o, {
        code: o.code,
        reversedAmount,
        executedBy: req.user.userId
      });
      await tx.delete(storeOrders).where(eq39(storeOrders.id, o.id));
      if (o.saleId) await deleteDeadSaleRecords(tx, o.saleId);
      return { code: o.code, reversedAmount };
    });
    await createNotification(db, {
      type: "MASTER_ACTION",
      title: "Pedido exclu\xEDdo pelo Master",
      message: `Pedido ${result.code} exclu\xEDdo por ${master.name}${result.reversedAmount > 0.01 ? ` (${formatBrl(result.reversedAmount)} estornado)` : ""}.`,
      link: "/store-orders"
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.put("/admin/products/:id/visibility", requireAuth, requirePermission("product", "manage"), async (req, res) => {
  try {
    const { storeVisible, storeDescription } = req.body || {};
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (storeVisible !== void 0) updates.storeVisible = !!storeVisible;
    if (storeDescription !== void 0) updates.storeDescription = String(storeDescription || "").slice(0, 400) || null;
    await db.update(products).set(updates).where(eq39(products.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.get("/admin/orders/:id/dossier", requireAuth, requirePermission("sales", "view"), async (req, res) => {
  try {
    const [o] = await db.select().from(storeOrders).where(eq39(storeOrders.id, req.params.id)).limit(1);
    if (!o) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    const [cs] = await db.select().from(companySettings).limit(1);
    const [sale] = o.saleId ? await db.select().from(sales).where(eq39(sales.id, o.saleId)).limit(1) : [void 0];
    const { storeOrderPayments: storeOrderPayments2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const parts = await db.select().from(storeOrderPayments2).where(eq39(storeOrderPayments2.orderId, o.id)).orderBy(storeOrderPayments2.seq);
    const [cust] = o.customerId ? await db.select().from(customers).where(eq39(customers.id, o.customerId)).limit(1) : [void 0];
    const [who] = await db.select({ name: users.name }).from(users).where(eq39(users.id, req.user.userId)).limit(1);
    const PDFDocument4 = (await import("pdfkit")).default;
    const doc = new PDFDocument4({ size: "A4", margin: 0, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="dossie_${o.code}.pdf"`);
    doc.pipe(res);
    const INK = "#111827", MUTED = "#6b7280", LINE = "#e5e7eb", SOFT = "#f9fafb";
    const OK = "#047857", WARN = "#b45309", BAD = "#b91c1c";
    const M = 42, W = 595 - M * 2, COL = (W - 18) / 2, COL2 = M + COL + 18;
    const FOOT = 792;
    const brl = formatBrl;
    const dt = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "\u2014";
    const cpfFmt = (v) => {
      const d = String(v || "").replace(/\D/g, "");
      return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v ? String(v) : "\u2014";
    };
    const foneFmt = (v) => {
      const d = String(v || "").replace(/\D/g, "");
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return v || "\u2014";
    };
    const device = (ua) => {
      const s = String(ua || "");
      if (!s) return "\u2014";
      const os = /iPhone|iPad/i.test(s) ? "iPhone/iPad" : /Android/i.test(s) ? "Android" : /Windows/i.test(s) ? "Windows" : /Mac OS/i.test(s) ? "Mac" : "outro";
      const br = /Edg\//i.test(s) ? "Edge" : /Chrome\//i.test(s) ? "Chrome" : /Firefox\//i.test(s) ? "Firefox" : /Safari\//i.test(s) ? "Safari" : "navegador";
      return `${os} \xB7 ${br}`;
    };
    const sectionTitle = (title, y2) => {
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text(title.toUpperCase(), M, y2, { characterSpacing: 0.8, width: W });
      const ly = doc.y + 2.5;
      doc.moveTo(M, ly).lineTo(M + W, ly).lineWidth(0.7).strokeColor(LINE).stroke();
      return ly + 6;
    };
    const kv = (x, y2, w, label, value, color = INK) => {
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(label.toUpperCase(), x, y2, { width: w, characterSpacing: 0.4 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(color).text(value || "\u2014", x, doc.y + 0.5, { width: w });
      return doc.y + 5.5;
    };
    doc.rect(0, 0, 595, 68).fill(INK);
    const empresa = String(cs?.tradeName || cs?.companyName || "Sua loja");
    doc.fillColor("#ffffff").fontSize(12.5).font("Helvetica-Bold").text(empresa, M, 20, { width: 300 });
    const idLinha = [cs?.companyName !== empresa ? cs?.companyName : null, cs?.documentNumber ? `${cs?.documentType || "DOC"} ${cs.documentNumber}` : null, cs?.city].filter(Boolean).join("  \xB7  ");
    doc.fontSize(7).font("Helvetica").fillColor("#9ca3af").text(idLinha || "\u2014", M, 38, { width: 300 });
    doc.fontSize(6.5).font("Helvetica").fillColor("#9ca3af").text("DOSSI\xCA DO PEDIDO", M + 300, 20, { width: W - 300, align: "right", characterSpacing: 1 });
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#ffffff").text(o.code, M + 300, 30, { width: W - 300, align: "right" });
    let y = 86;
    const statusTxt = o.status === "CONFIRMED" ? "Pagamento confirmado" : o.status === "PROOF_SENT" ? "Comprovante enviado" : o.status === "CANCELED" ? "Cancelado" : "Aguardando pagamento";
    const statusCor = o.status === "CONFIRMED" ? OK : o.status === "CANCELED" ? BAD : WARN;
    doc.roundedRect(M, y, W, 52, 4).fillAndStroke(SOFT, LINE);
    doc.fontSize(6).font("Helvetica").fillColor(MUTED).text("VALOR PAGO POR PIX", M + 14, y + 9, { characterSpacing: 0.5, width: 200 });
    doc.fontSize(19).font("Helvetica-Bold").fillColor(INK).text(brl(o.totalAmount), M + 14, y + 20, { width: 200 });
    const info = [
      ["Pedido feito em", dt(o.createdAt), INK],
      ["Situa\xE7\xE3o", statusTxt, statusCor],
      ["Venda no sistema", sale ? `${sale.series}-${sale.number}` : "\u2014", INK]
    ];
    info.forEach(([l, v, c], i) => {
      const x = M + 215 + i * ((W - 225) / 3);
      const wcol = (W - 225) / 3 - 6;
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(l.toUpperCase(), x, y + 12, { width: wcol, characterSpacing: 0.4 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(c).text(v, x, y + 24, { width: wcol });
    });
    y += 66;
    y = sectionTitle("Comprador e pagamento", y);
    let yL = y, yR = y;
    yL = kv(M, yL, COL, "Comprador", o.customerName);
    yL = kv(M, yL, COL, "CPF do comprador", cpfFmt(o.customerDocument));
    yL = kv(M, yL, COL, "WhatsApp", foneFmt(o.customerPhone));
    yL = kv(M, yL, COL, "Origem do pedido", `IP ${o.clientIp || "\u2014"} \xB7 ${device(o.clientUserAgent)}`);
    if (cust) yL = kv(M, yL, COL, "Cadastro no sistema", `${cust.name} \xB7 desde ${dt(cust.createdAt).slice(0, 10)}`);
    const recebido = o.receivedAmountBrl != null ? Number(o.receivedAmountBrl) : null;
    const falta = recebido != null ? round23(Number(o.totalAmount) - recebido) : 0;
    yR = kv(COL2, yR, COL, "Forma", parts.length > 0 ? `PIX em ${parts.length} pagamentos` : "PIX \xE0 vista");
    yR = kv(
      COL2,
      yR,
      COL,
      "Quem paga (declarado no pedido)",
      o.payerIsBuyer === false ? `${o.payerDeclaredName || "\u2014"} \xB7 CPF ${cpfFmt(o.payerDeclaredCpf)} (autorizado)` : "o pr\xF3prio comprador"
    );
    yR = kv(COL2, yR, COL, "Titular do comprovante", o.payerName || "n\xE3o informado");
    yR = kv(
      COL2,
      yR,
      COL,
      "Valor conferido pela loja",
      recebido == null ? "ainda n\xE3o conferido" : falta > 9e-3 ? `${brl(recebido)} \u2014 faltaram ${brl(falta)}` : `${brl(recebido)} \u2014 confere`,
      recebido == null ? WARN : falta > 9e-3 ? BAD : OK
    );
    yR = kv(
      COL2,
      yR,
      COL,
      "Entrega",
      `${o.deliveryType === "DELIVERY" ? "Entrega" : "Retirada no local"}${o.deliveryConfirmedAt ? ` \xB7 cliente confirmou em ${dt(o.deliveryConfirmedAt)}` : " \xB7 sem confirma\xE7\xE3o do cliente"}`,
      o.deliveryConfirmedAt ? OK : INK
    );
    y = Math.max(yL, yR) + 4;
    if (parts.length > 0) {
      const resumo = parts.map((p) => `${p.seq}\xAA ${brl(p.amountBrl)}${p.proofData ? " \u2713" : " (sem comprovante)"}`).join("   \xB7   ");
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(resumo, M, y, { width: W });
      y = doc.y + 6;
    }
    y = sectionTitle("Termo aceito pelo comprador", y);
    if (o.termsAcceptedAt) {
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(
        `Aceito eletronicamente em ${dt(o.termsAcceptedAt)}   \xB7   IP ${o.clientIp || "\u2014"}   \xB7   ${device(o.clientUserAgent)}   \xB7   vers\xE3o ${o.termsVersion || "1"}`,
        M,
        y,
        { width: W }
      );
      y = doc.y + 4;
      const txt = String(o.termsSnapshot || "\u2014");
      const reservaComprovante = 210;
      const disponivel = FOOT - 10 - y - reservaComprovante;
      let fs6 = 7;
      let h = doc.heightOfString(txt, { width: W - 20 });
      while (h > disponivel - 12 && fs6 > 5.5) {
        fs6 -= 0.25;
        doc.fontSize(fs6);
        h = doc.heightOfString(txt, { width: W - 20 });
      }
      const coube = h <= disponivel - 12;
      const boxH = Math.min(h + 12, Math.max(disponivel, 30));
      doc.roundedRect(M, y, W, boxH, 3).fillAndStroke("#ffffff", LINE);
      doc.fontSize(fs6).font("Helvetica").fillColor("#374151").text(coube ? txt : `${txt.slice(0, 900)}\u2026`, M + 10, y + 6, { width: W - 20, height: boxH - 12, ellipsis: true });
      if (!coube) {
        doc.fontSize(6).font("Helvetica-Oblique").fillColor(MUTED).text("(texto integral no anexo)", M, y + boxH + 1, { width: W, align: "right" });
      }
      o.__termoCoube = coube;
      y += boxH + 10;
    } else {
      doc.fontSize(8).font("Helvetica").fillColor(BAD).text("Pedido anterior ao registro de aceite \u2014 sem termo gravado.", M, y, { width: W });
      y = doc.y + 8;
      o.__termoCoube = true;
    }
    const comprovantes = parts.length > 0 ? parts.map((p) => ({ label: `${p.seq}\xAA parcela \xB7 ${brl(p.amountBrl)}`, data: p.proofData, type: p.proofFileType, when: p.proofSentAt })) : [{ label: `Pagamento \xB7 ${brl(o.totalAmount)}`, data: o.proofData, type: o.proofFileType, when: o.proofSentAt }];
    const comImagem = comprovantes.filter((c) => c.data);
    y = sectionTitle("Comprovante do pagamento", y);
    const espaco = FOOT - 12 - y;
    const principal = comImagem[0];
    if (!principal) {
      doc.fontSize(8).font("Helvetica").fillColor(WARN).text("Nenhum comprovante enviado pelo cliente at\xE9 o momento.", M, y, { width: W });
    } else {
      doc.fontSize(6.5).font("Helvetica").fillColor(MUTED).text(`${principal.label}  \xB7  enviado em ${dt(principal.when)}${comImagem.length > 1 ? `  \xB7  demais comprovantes em anexo` : ""}`, M, y, { width: W });
      const top = doc.y + 4;
      const alturaImg = Math.max(90, FOOT - 12 - top);
      if (/^image\/(png|jpe?g)$/i.test(String(principal.type || ""))) {
        try {
          doc.image(Buffer.from(principal.data, "base64"), M, top, { fit: [W, alturaImg], align: "center" });
        } catch {
          doc.fontSize(8).font("Helvetica").fillColor(BAD).text("N\xE3o foi poss\xEDvel embutir a imagem. Veja o original em Pedidos da Loja.", M, top, { width: W });
        }
      } else {
        doc.fontSize(8).font("Helvetica").fillColor(INK).text(`Comprovante em ${String(principal.type || "").includes("pdf") ? "PDF" : "arquivo"} enviado pelo cliente \u2014 abra o original em Pedidos da Loja \u203A Ver comprovante.`, M, top, { width: W });
      }
    }
    for (let i = 1; i < comImagem.length; i++) {
      const pr = comImagem[i];
      doc.addPage();
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text("ANEXO \xB7 COMPROVANTE", M, 48, { characterSpacing: 0.8, width: W });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(INK).text(pr.label, M, doc.y + 3, { width: W });
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(`Pedido ${o.code}  \xB7  enviado em ${dt(pr.when)}`, M, doc.y + 1, { width: W });
      const top = doc.y + 8;
      if (/^image\/(png|jpe?g)$/i.test(String(pr.type || ""))) {
        try {
          doc.image(Buffer.from(pr.data, "base64"), M, top, { fit: [W, FOOT - 12 - top], align: "center" });
        } catch {
        }
      } else {
        doc.fontSize(8).font("Helvetica").fillColor(INK).text("Arquivo enviado pelo cliente \u2014 abra o original no sistema.", M, top, { width: W });
      }
    }
    if (o.termsAcceptedAt && o.termsSnapshot && o.__termoCoube === false) {
      doc.addPage();
      doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text("ANEXO \xB7 TERMO ACEITO (TEXTO INTEGRAL)", M, 48, { characterSpacing: 0.8, width: W });
      doc.fontSize(7).font("Helvetica").fillColor(MUTED).text(`Pedido ${o.code}  \xB7  vers\xE3o ${o.termsVersion || "1"}  \xB7  aceito em ${dt(o.termsAcceptedAt)}  \xB7  IP ${o.clientIp || "\u2014"}`, M, doc.y + 3, { width: W });
      doc.fontSize(9).font("Helvetica").fillColor("#374151").text(String(o.termsSnapshot), M, doc.y + 10, { width: W, lineGap: 3 });
    }
    const range = doc.bufferedPageRange();
    const carimbo = `Documento gerado em ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} por ${who?.name || "usu\xE1rio do sistema"} \xB7 Pedido ${o.code}`;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.moveTo(M, FOOT).lineTo(M + W, FOOT).lineWidth(0.7).strokeColor(LINE).stroke();
      doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(carimbo, M, FOOT + 6, { width: W - 60 });
      if (range.count > 1) doc.fontSize(6).font("Helvetica").fillColor(MUTED).text(`${i + 1}/${range.count}`, M + W - 60, FOOT + 6, { width: 60, align: "right" });
    }
    doc.end();
    await logAction(req.user.userId, "STORE_ORDER_DOSSIER", "store_orders", o.id, null, { code: o.code });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "N\xE3o foi poss\xEDvel gerar o dossi\xEA." });
  }
});
var STORE_CONFIG_KEY = "store_config";
var DEFAULT_TERMS = `TERMOS E CONDI\xC7\xD5ES GERAIS DE USO

Leia atentamente todas as informa\xE7\xF5es abaixo antes de efetuar qualquer compra em nossa loja virtual.

1. Estes Termos e Condi\xE7\xF5es Gerais de Uso do Site s\xE3o aplic\xE1veis a todas as compras de produtos realizadas pelos clientes neste site.

2. Para realizar um pedido de compra, o cliente precisa aceitar os presentes Termos e Condi\xE7\xF5es de Uso do Site \u2014 caso contr\xE1rio, a finaliza\xE7\xE3o do pedido n\xE3o ser\xE1 poss\xEDvel. Qualquer compra feita no site pressup\xF5e a ci\xEAncia do cliente sobre o teor deste termo.

3. Reservamo-nos o direito de modificar o presente documento a qualquer momento, sem aviso pr\xE9vio, respeitados os pedidos j\xE1 confirmados e finalizados antes da altera\xE7\xE3o.

4. Estes Termos e Condi\xE7\xF5es de Uso do Site, em conjunto com o "Pedido", constituem o acordo integral entre a loja e o cliente para a intermedia\xE7\xE3o do produto ou servi\xE7o \u2014 ou seja, formam o contrato de intermedia\xE7\xE3o pelo servi\xE7o prestado necess\xE1rio \xE0s compras feitas via este e-commerce.

5. Para os fins deste documento, considera-se: "Cliente" \u2014 pessoa f\xEDsica ou jur\xEDdica que compra produto(s) como destinat\xE1rio final no site; "Pre\xE7o" \u2014 valor indicado no Pedido, j\xE1 com o servi\xE7o de intermedia\xE7\xE3o embutido, sem custos adicionais; "Produto" \u2014 bem descrito no Pedido.

6. Sendo constatado que a compra se deu por meios ilegais ou maliciosos, reservamo-nos o direito de cancelar os pedidos em que forem identificadas atividades maliciosas, uso de bots, scripts ou qualquer outra forma de compra automatizada realizada visando burlar o sistema regular de compra.

PEDIDO, PRE\xC7OS E PAGAMENTO

7. N\xE3o ser\xE1 vinculante o pedido na hip\xF3tese de erro claro de lan\xE7amento de informa\xE7\xE3o sobre o produto (qualidade, pre\xE7o, etc.), quando o erro for verificado antes do envio da compra. Reservamo-nos o direito de cancelar o pedido nesses casos, obrigando-nos a devolver prontamente e integralmente o valor eventualmente pago.

8. Os dados da compra \u2014 n\xFAmero do pedido, m\xE9todo e prazo de envio, dados da cobran\xE7a, endere\xE7o de entrega, entre outras informa\xE7\xF5es \u2014 constar\xE3o em e-mail enviado ao endere\xE7o cadastrado pelo cliente em sua conta, ap\xF3s a finaliza\xE7\xE3o da compra.

9. O cliente deve consultar tamb\xE9m sua caixa de spam, pois este e-mail de confirma\xE7\xE3o por vezes n\xE3o chega \xE0 caixa de entrada comum, por fatores externos a n\xF3s.

10. O cliente deve verificar os dados constantes no Pedido enviado ap\xF3s a compra \u2014 produtos, pre\xE7os e quantidades \u2014 e informar imediatamente qualquer erro para corre\xE7\xE3o e ajuste.

11. Ao efetuar o pagamento, o cliente concorda com o Pedido que lhe foi enviado, n\xE3o podendo reclamar posteriormente de erro na inclus\xE3o dos produtos, j\xE1 que essa inclus\xE3o \xE9 feita pelo pr\xF3prio cliente.

12. O prazo para confirma\xE7\xE3o do pagamento \xE9 de at\xE9 2 dias \xFAteis. Esse prazo pode ser alterado em \xE9pocas de maior demanda de pedidos (datas comemorativas, Black Friday, Natal, etc.).

13. Caso n\xE3o haja confirma\xE7\xE3o do pagamento do pedido dentro do prazo, o pedido ser\xE1 cancelado automaticamente e sem custo. O cliente poder\xE1 fazer um novo pedido, sujeito \xE0s condi\xE7\xF5es atuais de pre\xE7o e disponibilidade do produto.

14. As ofertas somente s\xE3o v\xE1lidas quando disponibilizadas por escrito no site (ou outro meio de publicidade nosso), durante o prazo indicado e enquanto houver produtos dispon\xEDveis em estoque.

15. Descontos concedidos para pagamento via PIX s\xE3o exclusivos dessa modalidade de pagamento.

16. Poder\xE1 haver altera\xE7\xE3o de valores de produtos em curto per\xEDodo de tempo. Produtos promocionais mant\xEAm seu valor dentro do prazo e quantidade estipulados, encerrando-se pelo que se esgotar primeiro.

17. Em caso de produto anunciado com erro de digita\xE7\xE3o em valor, especifica\xE7\xE3o ou qualquer caracter\xEDstica, reservamo-nos o direito de corrigir o equ\xEDvoco e cancelar o pedido a qualquer tempo, sem \xF4nus \xE0s partes, devolvendo integralmente o valor pago.

18. N\xE3o garantimos pre\xE7os id\xEAnticos em todos os nossos canais de venda.

19. O pedido \xE9 separado e postado para envio ap\xF3s a confirma\xE7\xE3o do pagamento. Em per\xEDodos de maior demanda, esse prazo de postagem pode ser aumentado, podendo o envio ocorrer em at\xE9 5 dias \xFAteis.

20. Reservamo-nos o direito de aguardar a confirma\xE7\xE3o do pagamento antes de concluir a venda e enviar o produto, n\xE3o nos responsabilizando por eventuais fraudes ocorridas no processo de pagamento.

ENTREGA

21. No momento da compra, o cliente escolhe entre envio por transportadora/Correios ou retirada no local, previamente combinada.

22. Cada localidade tem um prazo espec\xEDfico de entrega para cada meio dispon\xEDvel.

23. Mercadorias que, por dimens\xE3o ou peso, exijam forma de postagem diferente podem ter essa forma alterada independentemente da escolha feita pelo cliente.

24. Em grandes eventos e datas festivas (Black Friday, Natal, Ano Novo, etc.), os prazos de entrega podem sofrer altera\xE7\xF5es por causa da alta demanda de postagens.

25. Em caso de cat\xE1strofe natural, greve ou outro motivo de for\xE7a maior fora do nosso controle, os prazos de entrega ou devolu\xE7\xE3o podem ser alterados at\xE9 a normaliza\xE7\xE3o da situa\xE7\xE3o.

26. A entrega \xE9 realizada dentro do prazo e no local indicado no Pedido, sendo de responsabilidade da transportadora ou do modo de envio escolhido pelo cliente na finaliza\xE7\xE3o do pedido.

27. Optando pela entrega via Correios, o cliente deve verificar previamente se h\xE1 restri\xE7\xE3o de entrega para o seu CEP antes de finalizar o pedido.

28. N\xE3o nos responsabilizamos por atraso no recebimento da mercadoria decorrente da n\xE3o observ\xE2ncia, pelo cliente, de restri\xE7\xE3o de entrega j\xE1 informada para o seu CEP.

29. Caso o cliente resida em local de dif\xEDcil acesso, ou onde por impedimento operacional a entrega n\xE3o seja poss\xEDvel, a encomenda ficar\xE1 dispon\xEDvel para retirada no local indicado pelos Correios ou pela transportadora.

30. Em caso de extravio, roubo ou reten\xE7\xE3o fiscalizat\xF3ria da mercadoria durante o transporte, ser\xE1 concedido novo prazo para reposi\xE7\xE3o ou reembolso, conforme o caso.

31. Em caso de atraso na entrega, o cliente deve nos informar em at\xE9 24 horas ap\xF3s verificado o atraso, para que possamos tomar as medidas necess\xE1rias ao nosso alcance.

32. N\xE3o somos respons\xE1veis pela falta de entrega nos casos de: cliente ausente, recebedor n\xE3o localizado, dados cadastrais e/ou endere\xE7o incorretos ou incompletos, recusa do endere\xE7o pelo cliente ou por terceiros no local, mudan\xE7a de endere\xE7o n\xE3o informada, endere\xE7o comercial fechado, \xE1rea de risco, desastre natural, ou qualquer outro motivo fora da nossa esfera de atua\xE7\xE3o.

33. Ao informar o endere\xE7o de entrega, o cliente concorda que qualquer pessoa presente no local no momento da tentativa de entrega pode receber a encomenda em seu nome. Qualquer restri\xE7\xE3o quanto a isso deve ser informada no ato da compra.

34. N\xE3o nos responsabilizamos por danos decorrentes do transporte da mercadoria \u2014 essa responsabilidade compete \xE0 empresa transportadora, conforme os artigos 749 e 750 do C\xF3digo Civil Brasileiro. Caso sejamos acionados nesse sentido, reservamo-nos o direito de indicar a transportadora respons\xE1vel.

35. Em caso de dano \xE0 mercadoria durante o transporte, ser\xE1 concedido novo prazo para reposi\xE7\xE3o.

36. O cliente deve examinar o produto imediatamente ap\xF3s a entrega, que ser\xE1 feita no endere\xE7o indicado na compra a qualquer pessoa ali encontrada.

37. Avarias n\xE3o percept\xEDveis de imediato devem ser comunicadas em at\xE9 24 horas a contar da entrega. Diverg\xEAncias entre o produto recebido e o constante no pedido tamb\xE9m devem ser comunicadas nesse mesmo prazo.

38. Transcorrido esse prazo sem manifesta\xE7\xE3o do cliente, o produto ser\xE1 considerado, conforme a lei, aceito em perfeitas condi\xE7\xF5es.

DIREITO DE ARREPENDIMENTO

39. Nos termos do art. 49 do C\xF3digo de Defesa do Consumidor, o cliente tem at\xE9 7 (sete) dias corridos ap\xF3s o recebimento do produto para desistir da compra, sem necessidade de justificativa, com direito a reembolso integral dos valores pagos, incluindo frete.

PRODUTOS COM USO ORIENTADO

40. Alguns produtos comercializados podem exigir orienta\xE7\xE3o profissional, prescri\xE7\xE3o ou cuidados espec\xEDficos para uso seguro. \xC9 responsabilidade do cliente verificar a adequa\xE7\xE3o do produto \xE0s normas do seu pa\xEDs antes da compra e utiliz\xE1-lo conforme orienta\xE7\xE3o adequada.

PRODUTOS OPENBOX

41. Poderemos realizar a venda de produtos openbox \u2014 aqueles que j\xE1 tiveram sua caixa aberta e seus selos/lacres rompidos. Ao clicar na aba de openbox, o cliente obt\xE9m todas as informa\xE7\xF5es sobre o produto.

42. Produtos openbox podem ter eventual v\xEDcio ou aus\xEAncia de algum acess\xF3rio/componente, sem que isso comprometa sua funcionalidade. O produto openbox n\xE3o possui caracter\xEDstica de produto novo e possui somente a garantia legal de 7 dias. Em hip\xF3tese alguma um produto openbox ser\xE1 substitu\xEDdo por um produto novo.

PRODUTOS EM PR\xC9-VENDA

43. Poderemos realizar vendas em modalidade pr\xE9-venda \u2014 reserva antecipada de produto de interesse do cliente, inclusive produtos ainda n\xE3o lan\xE7ados pelo fabricante.

44. Ao comprar em pr\xE9-venda, o cliente deve estar ciente de poss\xEDveis atrasos e mudan\xE7as na previs\xE3o de entrega, que podem decorrer de: altera\xE7\xE3o da data de lan\xE7amento do produto; atraso na libera\xE7\xE3o por \xF3rg\xE3os fiscalizadores; reten\xE7\xE3o da mercadoria na alf\xE2ndega; bloqueio da entrada da mercadoria no pa\xEDs de destino; atraso da transportadora; ou revis\xE3o dos tributos de importa\xE7\xE3o pela fiscaliza\xE7\xE3o aduaneira.

45. A data de previs\xE3o informada no an\xFAncio \xE9 apenas uma expectativa e pode sofrer altera\xE7\xF5es pelos motivos acima \u2014 n\xE3o nos responsabilizamos por essas altera\xE7\xF5es de prazo. O pagamento do produto em pr\xE9-venda serve para garantir a sua reserva.

PRIVACIDADE E ALTERA\xC7\xD5ES DESTE TERMO

46. Seus dados pessoais s\xE3o usados apenas para processar seu pedido e para contato sobre ele, e n\xE3o s\xE3o vendidos a terceiros. Se voc\xEA aceitar receber comunica\xE7\xE3o de marketing no cadastro, pode cancelar isso a qualquer momento em "Meus dados".

47. Podemos alterar estes termos a qualquer momento, sem aviso pr\xE9vio; pedidos j\xE1 confirmados seguem as condi\xE7\xF5es vigentes no momento da compra.`;
function normalizeStoreThemeColors(c) {
  const keys = ["bg", "surface", "headerBg", "headerText", "accent", "accentText", "text", "textMuted", "footerBg", "footerText"];
  const out = {};
  for (const k of keys) {
    const val = c?.[k];
    out[k] = typeof val === "string" && /^#[0-9a-fA-F]{6}$/.test(val) ? val : "";
  }
  return out;
}
function normalizeStoreThemeFont(f) {
  return {
    url: typeof f?.url === "string" ? f.url.slice(0, MAX_FONT_URL_CHARS) : "",
    // data: URL do arquivo de fonte (base64)
    family: typeof f?.family === "string" ? f.family.slice(0, 80) : ""
  };
}
var HOME_SECTION_IDS = ["announcement", "banners", "howToBuy", "categories", "vitrines", "hero", "sideBanner"];
var HOME_SIZED_SECTION_IDS = ["banners", "sideBanner"];
var CATALOGO_SECTION_IDS = ["filtros", "grade"];
var TAMANHOS_VALIDOS = ["P", "M", "G", "GG"];
function normalizeStorePageSection(s, allowedIds, sizedIds) {
  const id = String(s?.id || "");
  if (!allowedIds.includes(id)) return null;
  const out = {
    id,
    ordem: Number.isFinite(Number(s?.ordem)) ? Math.trunc(Number(s.ordem)) : 0,
    visivel: s?.visivel !== false
  };
  const tamanho = String(s?.tamanho || "");
  if (sizedIds.includes(id) && TAMANHOS_VALIDOS.includes(tamanho)) out.tamanho = tamanho;
  return out;
}
function normalizeStorePages(p) {
  if (!p || typeof p !== "object") return void 0;
  const out = {};
  if (p.home && Array.isArray(p.home.sections)) {
    out.home = {
      sections: p.home.sections.map((s) => normalizeStorePageSection(s, HOME_SECTION_IDS, HOME_SIZED_SECTION_IDS)).filter(Boolean).slice(0, HOME_SECTION_IDS.length)
    };
  }
  if (p.catalogo && (Array.isArray(p.catalogo.sections) || typeof p.catalogo.titulo === "string")) {
    out.catalogo = {
      titulo: String(p.catalogo.titulo || "").slice(0, 80),
      sections: Array.isArray(p.catalogo.sections) ? p.catalogo.sections.map((s) => normalizeStorePageSection(s, CATALOGO_SECTION_IDS, [])).filter(Boolean).slice(0, CATALOGO_SECTION_IDS.length) : []
    };
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function normalizeHeroCtaSize(v) {
  return TAMANHOS_VALIDOS.includes(String(v || "")) ? String(v) : "";
}
function normalizeHeroCtaOrder(v) {
  return String(v || "") === "invertida" ? "invertida" : "";
}
async function getStoreVitrineConfig() {
  const rows = await db.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
  const v = rows[0]?.value || {};
  return {
    heroTitle: String(v.heroTitle || ""),
    heroSubtitle: String(v.heroSubtitle || ""),
    announcement: String(v.announcement || ""),
    featuredProductIds: Array.isArray(v.featuredProductIds) ? v.featuredProductIds.map(String).slice(0, 8) : [],
    banners: Array.isArray(v.banners) ? v.banners : [],
    quickLinks: Array.isArray(v.quickLinks) ? v.quickLinks : [],
    // Banner lateral da home ("Selecionado pra você") — existia no schema mas nunca era
    // gravado por este endpoint (achado da auditoria desta sessão), corrigido aqui.
    sideBannerTitle: String(v.sideBannerTitle || "").slice(0, 120),
    sideBannerSubtitle: String(v.sideBannerSubtitle || "").slice(0, 300),
    // "Como comprar": null = usa os 5 passos padrão fixos (ver StoreHome.tsx).
    howToBuySteps: Array.isArray(v.howToBuySteps) ? v.howToBuySteps.slice(0, 6).map((s) => ({
      title: String(s?.title || "").slice(0, 60),
      desc: String(s?.desc || "").slice(0, 120)
    })) : null,
    howToBuyVisible: v.howToBuyVisible !== false,
    footerText: String(v.footerText || "").slice(0, 200),
    // Seções por página + campos do hero (editor visual avançado, Fase 1).
    pages: normalizeStorePages(v.pages),
    heroCtaSize: normalizeHeroCtaSize(v.heroCtaSize),
    heroCtaOrder: normalizeHeroCtaOrder(v.heroCtaOrder),
    theme: {
      colors: normalizeStoreThemeColors(v.theme?.colors),
      fonts: {
        heading: normalizeStoreThemeFont(v.theme?.fonts?.heading),
        body: normalizeStoreThemeFont(v.theme?.fonts?.body)
      }
    },
    // Vitrines manuais da home: cada uma com título e lista de produtos escolhidos à mão.
    // Vazio = a home usa as 4 vitrines padrão fixas (Mais Vendidos/Emagrecimento/Performance/Novidades).
    vitrines: Array.isArray(v.vitrines) ? v.vitrines.map((vt) => ({
      id: String(vt?.id || ""),
      title: String(vt?.title || ""),
      productIds: Array.isArray(vt?.productIds) ? vt.productIds.map(String).slice(0, 12) : []
    })).slice(0, 20) : [],
    termsText: String(v.termsText || DEFAULT_TERMS),
    termsVersion: String(v.termsVersion || "1")
  };
}
router36.get("/config", async (_req, res) => {
  try {
    res.json(await getStoreVitrineConfig());
  } catch {
    res.json({ heroTitle: "", heroSubtitle: "", announcement: "", featuredProductIds: [] });
  }
});
router36.get("/shipping-zones", async (_req, res) => {
  try {
    const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const rows = await db.select().from(storeShippingZones2).where(eq39(storeShippingZones2.isActive, true)).orderBy(storeShippingZones2.sortOrder, storeShippingZones2.name);
    res.json({ data: rows.map((z) => ({ id: z.id, name: z.name, feeBrl: Number(z.feeBrl) })) });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar regi\xF5es." });
  }
});
async function evaluateCoupon(codeRaw, subtotal) {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "Informe o c\xF3digo do cupom." };
  const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const [c] = await db.select().from(storeCoupons2).where(eq39(storeCoupons2.code, code)).limit(1);
  if (!c || !c.isActive) return { ok: false, reason: "Cupom n\xE3o encontrado ou inativo." };
  const now = /* @__PURE__ */ new Date();
  if (c.validFrom && now < new Date(c.validFrom)) return { ok: false, reason: "Cupom ainda n\xE3o est\xE1 valendo." };
  if (c.validUntil && now > new Date(c.validUntil)) return { ok: false, reason: "Cupom expirado." };
  if (c.maxUses != null && Number(c.usedCount) >= Number(c.maxUses)) return { ok: false, reason: "Cupom esgotado." };
  const min = c.minOrderBrl != null ? Number(c.minOrderBrl) : 0;
  if (subtotal < min) return { ok: false, reason: `Pedido m\xEDnimo de R$ ${min.toFixed(2).replace(".", ",")} pra usar esse cupom.` };
  const value = Number(c.value);
  const discount = c.type === "FIXED" ? Math.min(round23(value), round23(subtotal)) : round23(subtotal * value / 100);
  return { ok: true, coupon: c, discount: round23(discount) };
}
router36.post("/coupon/preview", async (req, res) => {
  try {
    const ip = clientIp2(req);
    if (!rateLimit2(`coupon:${ip}`, 20, 10 * 60 * 1e3)) return res.status(429).json({ error: "Muitas tentativas. Aguarde uns minutos." });
    const subtotal = Number(req.body?.subtotal) || 0;
    const result = await evaluateCoupon(req.body?.code, subtotal);
    if (!result.ok) return res.status(400).json({ error: result.reason });
    res.json({ code: String(req.body.code).trim().toUpperCase(), discount: result.discount, type: result.coupon.type, value: Number(result.coupon.value) });
  } catch {
    res.status(500).json({ error: "Erro ao validar cupom." });
  }
});
router36.get("/admin/pix-test", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    const cfg = await getStoreConfig();
    if (!cfg.pixKey) {
      return res.json({ configured: false, storeName: cfg.storeName, city: cfg.city });
    }
    const { buildPixPayload: buildPixPayload2 } = await Promise.resolve().then(() => (init_pix(), pix_exports));
    const amount = 10;
    const payload = buildPixPayload2({
      pixKey: cfg.pixKey,
      amount,
      merchantName: cfg.storeName,
      merchantCity: cfg.city || "CIDADE",
      txid: "TESTE"
    });
    res.json({ configured: true, pixKey: cfg.pixKey, storeName: cfg.storeName, city: cfg.city, amount, payload });
  } catch (err) {
    res.status(400).json({ error: err.message || "N\xE3o foi poss\xEDvel gerar o teste." });
  }
});
router36.get("/admin/config", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    res.json(await getStoreVitrineConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.put("/admin/config", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const b = req.body || {};
    const current = await getStoreVitrineConfig();
    const termsText = String(b.termsText ?? current.termsText).slice(0, 2e4).trim() || DEFAULT_TERMS;
    const termsVersion = termsText === current.termsText ? current.termsVersion : String((parseInt(current.termsVersion, 10) || 1) + 1);
    const headingFontUrl = b.theme?.fonts?.heading?.url;
    const bodyFontUrl = b.theme?.fonts?.body?.url;
    if (typeof headingFontUrl === "string" && headingFontUrl.length > MAX_FONT_URL_CHARS || typeof bodyFontUrl === "string" && bodyFontUrl.length > MAX_FONT_URL_CHARS) {
      return res.status(400).json({ error: "Arquivo de fonte muito grande. Escolha um arquivo menor." });
    }
    const payload = {
      heroTitle: String(b.heroTitle || "").slice(0, 120),
      heroSubtitle: String(b.heroSubtitle || "").slice(0, 300),
      announcement: String(b.announcement || "").slice(0, 200),
      featuredProductIds: Array.isArray(b.featuredProductIds) ? b.featuredProductIds.map(String).slice(0, 8) : [],
      banners: Array.isArray(b.banners) ? b.banners : [],
      quickLinks: Array.isArray(b.quickLinks) ? b.quickLinks : [],
      sideBannerTitle: String(b.sideBannerTitle || "").slice(0, 120),
      sideBannerSubtitle: String(b.sideBannerSubtitle || "").slice(0, 300),
      howToBuySteps: Array.isArray(b.howToBuySteps) ? b.howToBuySteps.slice(0, 6).map((s) => ({
        title: String(s?.title || "").slice(0, 60),
        desc: String(s?.desc || "").slice(0, 120)
      })) : null,
      howToBuyVisible: b.howToBuyVisible !== false,
      footerText: String(b.footerText || "").slice(0, 200),
      pages: normalizeStorePages(b.pages),
      heroCtaSize: normalizeHeroCtaSize(b.heroCtaSize),
      heroCtaOrder: normalizeHeroCtaOrder(b.heroCtaOrder),
      theme: {
        colors: normalizeStoreThemeColors(b.theme?.colors),
        fonts: {
          heading: normalizeStoreThemeFont(b.theme?.fonts?.heading),
          body: normalizeStoreThemeFont(b.theme?.fonts?.body)
        }
      },
      vitrines: Array.isArray(b.vitrines) ? b.vitrines.map((vt) => ({
        id: String(vt?.id || uuidv418()),
        title: String(vt?.title || "").slice(0, 60),
        productIds: Array.isArray(vt?.productIds) ? vt.productIds.map(String).slice(0, 12) : []
      })).slice(0, 20) : [],
      termsText,
      termsVersion
    };
    const rows = await db.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
    if (rows.length > 0) await db.update(systemSettings).set({ value: payload, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(systemSettings.key, STORE_CONFIG_KEY));
    else await db.insert(systemSettings).values({ key: STORE_CONFIG_KEY, value: payload });
    const auditPayload = {
      ...payload,
      theme: {
        ...payload.theme,
        fonts: {
          heading: { ...payload.theme.fonts.heading, url: payload.theme.fonts.heading.url ? `[${payload.theme.fonts.heading.url.length} chars]` : "" },
          body: { ...payload.theme.fonts.body, url: payload.theme.fonts.body.url ? `[${payload.theme.fonts.body.url.length} chars]` : "" }
        }
      }
    };
    await logAction(req.user.userId, "STORE_CONFIG_UPDATE", "system_settings", STORE_CONFIG_KEY, null, auditPayload);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var STORE_CONFIG_DRAFT_KEY = "store_config_draft";
async function getStoreConfigDraft() {
  const rows = await db.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
  if (rows.length > 0) return rows[0].value;
  const published = await getStoreVitrineConfig();
  await db.insert(systemSettings).values({ key: STORE_CONFIG_DRAFT_KEY, value: published }).onConflictDoNothing({ target: systemSettings.key });
  const [row] = await db.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
  return row.value;
}
router36.get("/admin/config/draft", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    res.json(await getStoreConfigDraft());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.patch("/admin/config/draft", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const current = await getStoreConfigDraft();
    const patch = req.body || {};
    const headingFontUrl = patch.theme?.fonts?.heading?.url;
    const bodyFontUrl = patch.theme?.fonts?.body?.url;
    if (typeof headingFontUrl === "string" && headingFontUrl.length > MAX_FONT_URL_CHARS || typeof bodyFontUrl === "string" && bodyFontUrl.length > MAX_FONT_URL_CHARS) {
      return res.status(400).json({ error: "Arquivo de fonte muito grande. Escolha um arquivo menor." });
    }
    const merged = {
      ...current,
      ...patch,
      theme: {
        colors: { ...current.theme?.colors || {}, ...patch.theme?.colors || {} },
        fonts: {
          heading: patch.theme?.fonts?.heading ? normalizeStoreThemeFont(patch.theme.fonts.heading) : current.theme?.fonts?.heading || normalizeStoreThemeFont(null),
          body: patch.theme?.fonts?.body ? normalizeStoreThemeFont(patch.theme.fonts.body) : current.theme?.fonts?.body || normalizeStoreThemeFont(null)
        }
      },
      // `pages` ganha merge POR PÁGINA (espelha o tratamento de `theme` acima):
      // um patch pode mandar só { pages: { home: {...} } } sem apagar o
      // rascunho de catalogo. DENTRO de cada página o objeto é substituído
      // inteiro (sections é array — merge parcial de array não existe aqui,
      // mesma regra do merge raso do topo pra banners/vitrines). Quem manda
      // pages.catalogo precisa mandar titulo + sections juntos.
      pages: normalizeStorePages({ ...current.pages || {}, ...patch.pages || {} })
    };
    if (patch.theme?.colors) merged.theme.colors = normalizeStoreThemeColors(merged.theme.colors);
    merged.heroCtaSize = normalizeHeroCtaSize(merged.heroCtaSize);
    merged.heroCtaOrder = normalizeHeroCtaOrder(merged.heroCtaOrder);
    await db.update(systemSettings).set({ value: merged, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
    res.json(merged);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.post("/admin/config/discard-draft", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    await db.delete(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
    await db.delete(productGroupsDraft);
    await logAction(req.user.userId, "STORE_DRAFT_DISCARD", "system_settings", STORE_CONFIG_DRAFT_KEY, null, null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.get("/admin/categories/draft", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    const [real2, drafts] = await Promise.all([
      db.select().from(productGroups).where(and33(eq39(productGroups.isActive, true), isNull10(productGroups.deletedAt))),
      db.select().from(productGroupsDraft)
    ]);
    const draftBySource = new Map(drafts.filter((d) => d.sourceGroupId).map((d) => [d.sourceGroupId, d]));
    const merged = real2.map((g) => {
      const d = draftBySource.get(g.id);
      if (d?.deleted) return null;
      return {
        id: g.id,
        draftId: d?.id || null,
        name: d?.name ?? g.name,
        icon: d?.icon ?? g.icon,
        storeVisible: d?.storeVisible ?? g.storeVisible,
        sortOrder: d?.sortOrder ?? g.sortOrder,
        isNew: false,
        hasPendingChanges: !!d
      };
    }).filter(Boolean);
    const newOnes = drafts.filter((d) => !d.sourceGroupId && !d.deleted).map((d) => ({
      id: d.id,
      draftId: d.id,
      name: d.name,
      icon: d.icon,
      storeVisible: d.storeVisible,
      sortOrder: d.sortOrder,
      isNew: true,
      hasPendingChanges: true
    }));
    const all = [...merged, ...newOnes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    res.json({ data: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.post("/admin/categories/draft", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da categoria \xE9 obrigat\xF3rio." });
    const [row] = await db.insert(productGroupsDraft).values({
      sourceGroupId: null,
      name,
      icon: req.body?.icon ? String(req.body.icon) : null,
      storeVisible: req.body?.storeVisible !== false,
      sortOrder: Number(req.body?.sortOrder) || 0
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.put("/admin/categories/draft/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nome da categoria \xE9 obrigat\xF3rio." });
    const patch = {
      name,
      icon: req.body?.icon ? String(req.body.icon) : null,
      storeVisible: req.body?.storeVisible !== false,
      sortOrder: Number(req.body?.sortOrder) || 0
    };
    const [byId] = await db.select().from(productGroupsDraft).where(eq39(productGroupsDraft.id, id)).limit(1);
    if (byId) {
      const [updated] = await db.update(productGroupsDraft).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(productGroupsDraft.id, id)).returning();
      return res.json(updated);
    }
    const [upserted] = await db.insert(productGroupsDraft).values({ sourceGroupId: id, ...patch }).onConflictDoUpdate({
      target: productGroupsDraft.sourceGroupId,
      targetWhere: sql25`${productGroupsDraft.sourceGroupId} IS NOT NULL`,
      set: { ...patch, updatedAt: /* @__PURE__ */ new Date() }
    }).returning();
    res.json(upserted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.delete("/admin/categories/draft/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { id } = req.params;
    const [byId] = await db.select().from(productGroupsDraft).where(eq39(productGroupsDraft.id, id)).limit(1);
    if (byId && !byId.sourceGroupId) {
      await db.delete(productGroupsDraft).where(eq39(productGroupsDraft.id, id));
      return res.json({ success: true });
    }
    const [bySource] = byId ? [byId] : await db.select().from(productGroupsDraft).where(eq39(productGroupsDraft.sourceGroupId, id)).limit(1);
    if (bySource) {
      await db.update(productGroupsDraft).set({ deleted: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(productGroupsDraft.id, bySource.id));
    } else {
      await db.insert(productGroupsDraft).values({ sourceGroupId: id, name: "(apagada)", deleted: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.post("/admin/config/publish", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const blockedNames = [];
    await db.transaction(async (tx) => {
      await tx.execute(sql25`select pg_advisory_xact_lock(729132845)`);
      const drafts = await tx.select().from(productGroupsDraft);
      for (const d of drafts) {
        if (d.sourceGroupId && d.deleted) {
          const [hasProducts] = await tx.select({ count: sql25`count(*)` }).from(products).where(eq39(products.groupId, d.sourceGroupId));
          if (Number(hasProducts.count) > 0) {
            const [g] = await tx.select({ name: productGroups.name }).from(productGroups).where(eq39(productGroups.id, d.sourceGroupId)).limit(1);
            blockedNames.push(g?.name || "categoria");
            continue;
          }
          await tx.update(productGroups).set({ isActive: false, deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq39(productGroups.id, d.sourceGroupId));
        } else if (d.sourceGroupId && !d.deleted) {
          await tx.update(productGroups).set({
            name: d.name,
            icon: d.icon,
            storeVisible: d.storeVisible,
            sortOrder: d.sortOrder,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq39(productGroups.id, d.sourceGroupId));
        } else if (!d.sourceGroupId && !d.deleted) {
          await tx.insert(productGroups).values({
            name: d.name,
            icon: d.icon,
            storeVisible: d.storeVisible,
            sortOrder: d.sortOrder
          });
        }
      }
      if (blockedNames.length > 0) {
        throw Object.assign(new Error(`N\xE3o \xE9 poss\xEDvel apagar: ${blockedNames.join(", ")} \u2014 ainda tem produto vinculado. Use Arquivar em Grupos/Categorias.`), { statusCode: 400 });
      }
      await tx.delete(productGroupsDraft);
      const draftConfig = await tx.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY)).limit(1);
      if (draftConfig.length > 0) {
        const publishedRows = await tx.select().from(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_KEY)).limit(1);
        const publishedValue = publishedRows[0]?.value;
        const value = publishedValue ? { ...draftConfig[0].value, termsText: publishedValue.termsText, termsVersion: publishedValue.termsVersion } : draftConfig[0].value;
        if (publishedRows.length > 0) await tx.update(systemSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(systemSettings.key, STORE_CONFIG_KEY));
        else await tx.insert(systemSettings).values({ key: STORE_CONFIG_KEY, value });
        await tx.delete(systemSettings).where(eq39(systemSettings.key, STORE_CONFIG_DRAFT_KEY));
      }
      await tx.insert(auditLogs).values({
        id: uuidv418(),
        userId: req.user.userId,
        action: "STORE_CONFIG_PUBLISH",
        tableName: "system_settings",
        recordId: STORE_CONFIG_KEY,
        newValues: null
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Erro ao publicar." });
  }
});
router36.get("/admin/coupons", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const rows = await db.select().from(storeCoupons2).orderBy(desc22(storeCoupons2.createdAt));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
function parseCouponBody(b) {
  const code = String(b.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code || code.length < 3) throw new Error("C\xF3digo do cupom precisa de pelo menos 3 caracteres.");
  const type = b.type === "FIXED" ? "FIXED" : "PERCENT";
  const value = Number(b.value);
  if (!(value > 0)) throw new Error("Valor do desconto precisa ser maior que zero.");
  if (type === "PERCENT" && value > 90) throw new Error("Desconto percentual m\xE1ximo: 90%.");
  return {
    code,
    type,
    value: value.toFixed(2),
    minOrderBrl: b.minOrderBrl != null && b.minOrderBrl !== "" ? Number(b.minOrderBrl).toFixed(2) : null,
    maxUses: b.maxUses != null && b.maxUses !== "" ? Math.max(1, parseInt(String(b.maxUses), 10) || 1) : null,
    validFrom: b.validFrom ? new Date(String(b.validFrom)) : null,
    validUntil: b.validUntil ? dayEndUtc(String(b.validUntil)) : null,
    isActive: b.isActive !== false
  };
}
router36.post("/admin/coupons", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const data = parseCouponBody(req.body || {});
    const [created] = await db.insert(storeCoupons2).values(data).returning();
    await logAction(req.user.userId, "STORE_COUPON_CREATE", "store_coupons", created.id, null, { code: data.code });
    res.json({ data: created });
  } catch (err) {
    if (String(err.message || "").includes("unique") || String(err.message || "").includes("duplicate")) {
      return res.status(409).json({ error: "J\xE1 existe um cupom com esse c\xF3digo." });
    }
    res.status(400).json({ error: err.message });
  }
});
router36.put("/admin/coupons/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const data = parseCouponBody(req.body || {});
    const [updated] = await db.update(storeCoupons2).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeCoupons2.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Cupom n\xE3o encontrado." });
    await logAction(req.user.userId, "STORE_COUPON_UPDATE", "store_coupons", updated.id, null, { code: data.code });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.delete("/admin/coupons/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeCoupons: storeCoupons2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [updated] = await db.update(storeCoupons2).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeCoupons2.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Cupom n\xE3o encontrado." });
    await logAction(req.user.userId, "STORE_COUPON_DISABLE", "store_coupons", updated.id, null, { code: updated.code });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.get("/admin/shipping-zones", requireAuth, requirePermission("settings", "manage"), async (_req, res) => {
  try {
    const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const rows = await db.select().from(storeShippingZones2).orderBy(storeShippingZones2.sortOrder, storeShippingZones2.name);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router36.post("/admin/shipping-zones", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Informe o nome da regi\xE3o (cidade/bairro)." });
    const fee = Number(req.body?.feeBrl);
    if (!(fee >= 0)) return res.status(400).json({ error: "Taxa de entrega inv\xE1lida." });
    const [created] = await db.insert(storeShippingZones2).values({
      name,
      feeBrl: fee.toFixed(2),
      sortOrder: parseInt(String(req.body?.sortOrder), 10) || 0,
      isActive: req.body?.isActive !== false
    }).returning();
    await logAction(req.user.userId, "STORE_ZONE_CREATE", "store_shipping_zones", created.id, null, { name });
    res.json({ data: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.put("/admin/shipping-zones/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Informe o nome da regi\xE3o." });
    const fee = Number(req.body?.feeBrl);
    if (!(fee >= 0)) return res.status(400).json({ error: "Taxa de entrega inv\xE1lida." });
    const [updated] = await db.update(storeShippingZones2).set({
      name,
      feeBrl: fee.toFixed(2),
      sortOrder: parseInt(String(req.body?.sortOrder), 10) || 0,
      isActive: req.body?.isActive !== false,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq39(storeShippingZones2.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Regi\xE3o n\xE3o encontrada." });
    await logAction(req.user.userId, "STORE_ZONE_UPDATE", "store_shipping_zones", updated.id, null, { name });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router36.delete("/admin/shipping-zones/:id", requireAuth, requirePermission("settings", "manage"), async (req, res) => {
  try {
    const { storeShippingZones: storeShippingZones2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [updated] = await db.update(storeShippingZones2).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq39(storeShippingZones2.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Regi\xE3o n\xE3o encontrada." });
    await logAction(req.user.userId, "STORE_ZONE_DISABLE", "store_shipping_zones", updated.id, null, { name: updated.name });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var store_default = router36;

// src/server/intelligence.ts
init_db();
init_schema();
init_authMiddleware();
init_fx();
import { Router as Router37 } from "express";
import { and as and34, asc as asc4, eq as eq40, gte as gte10, inArray as inArray16, lte as lte10, sql as sql26 } from "drizzle-orm";
var router37 = Router37();
router37.use(requireAuth);
var r22 = (n) => Math.round(n * 100) / 100;
var num2 = (v) => Number(v || 0);
router37.get("/fx-spread", requirePermission("cash", "view"), async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 7), 180);
    const from = /* @__PURE__ */ new Date();
    from.setDate(from.getDate() - days);
    const fromDay = from.toISOString().slice(0, 10);
    const rows = await db.select().from(fxRates).where(and34(gte10(fxRates.day, fromDay), inArray16(fxRates.pair, ["USDBRL", "BRLPYG"]))).orderBy(asc4(fxRates.day));
    const byPair = { USDBRL: /* @__PURE__ */ new Map(), BRLPYG: /* @__PURE__ */ new Map() };
    for (const r of rows) {
      const m = byPair[r.pair];
      if (!m) continue;
      const cur = m.get(r.day);
      if (cur == null || r.source === "MANUAL") m.set(r.day, num2(r.rate));
    }
    const today = await resolveRates().catch(() => ({}));
    const analyse = (pair, label, goodWhen) => {
      const series = [...byPair[pair].entries()].map(([day, rate]) => ({ day, rate })).sort((a, b) => a.day.localeCompare(b.day));
      const vals = series.map((s) => s.rate);
      const current = today[pair]?.rate ?? (vals.length ? vals[vals.length - 1] : null);
      if (!current || vals.length < 3) return { pair, label, current, enoughData: false, series };
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const min = Math.min(...vals), max = Math.max(...vals);
      const diffPercent = r22((current - avg) / avg * 100);
      const position = max > min ? r22((current - min) / (max - min) * 100) : 50;
      const favorable = goodWhen === "low" ? position <= 35 : position >= 65;
      const bad = goodWhen === "low" ? position >= 75 : position <= 25;
      return {
        pair,
        label,
        enoughData: true,
        current: r22(current),
        avg: r22(avg),
        min: r22(min),
        max: r22(max),
        diffPercent,
        position,
        favorable,
        bad,
        verdict: favorable ? "FAVORAVEL" : bad ? "DESFAVORAVEL" : "NEUTRO",
        series: series.slice(-60)
      };
    };
    const usd = analyse("USDBRL", "D\xF3lar (compra de mercadoria)", "low");
    const pyg = analyse("BRLPYG", "Real \u2192 Guarani (custo de vida)", "high");
    res.json({ days, usd, pyg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router37.post("/import-simulator", requirePermission("cash", "view"), async (req, res) => {
  try {
    const { currency, fxRate, freightAmount, extraCostAmount, items } = req.body || {};
    const cur = ["BRL", "USD", "PYG"].includes(String(currency)) ? String(currency) : "USD";
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Informe ao menos um item." });
    let fx = Number(fxRate);
    if (!(fx > 0)) {
      const rates = await resolveRates();
      fx = cur === "BRL" ? 1 : cur === "USD" ? rates.USDBRL?.rate || 0 : rates.BRLPYG?.rate ? 1 / rates.BRLPYG.rate : 0;
      if (!(fx > 0)) return res.status(400).json({ error: `Sem cota\xE7\xE3o ${cur}\u2192BRL. Informe o c\xE2mbio.` });
    }
    const freight = Math.max(0, Number(freightAmount) || 0);
    const extra = Math.max(0, Number(extraCostAmount) || 0);
    const totalUnits = items.reduce((s, i) => s + (Math.floor(Number(i.quantity)) || 0), 0);
    if (totalUnits <= 0) return res.status(400).json({ error: "Quantidade inv\xE1lida." });
    const perUnitExtra = (freight + extra) / totalUnits;
    const lines = items.map((i) => {
      const qty = Math.floor(Number(i.quantity)) || 0;
      const unitNative = Number(i.unitCost) || 0;
      const landedUnitBrl = r22((unitNative + perUnitExtra) * fx);
      const sellPrice = Number(i.salePrice) || 0;
      const marginUnit = r22(sellPrice - landedUnitBrl);
      const marginPercent = sellPrice > 0 ? r22(marginUnit / sellPrice * 100) : 0;
      const markup = landedUnitBrl > 0 ? r22((sellPrice - landedUnitBrl) / landedUnitBrl * 100) : 0;
      return {
        name: String(i.name || "Item"),
        quantity: qty,
        unitCostNative: unitNative,
        landedUnitBrl,
        salePrice: sellPrice,
        marginUnit,
        marginPercent,
        markup,
        totalCostBrl: r22(landedUnitBrl * qty),
        totalRevenue: r22(sellPrice * qty),
        totalMargin: r22(marginUnit * qty),
        // Preço mínimo para uma margem alvo de 30%
        suggestedPrice30: r22(landedUnitBrl / 0.7)
      };
    });
    const totalCostNative = r22(items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Math.floor(Number(i.quantity)) || 0), 0) + freight + extra);
    const totals = lines.reduce((a, l) => ({
      cost: r22(a.cost + l.totalCostBrl),
      revenue: r22(a.revenue + l.totalRevenue),
      margin: r22(a.margin + l.totalMargin)
    }), { cost: 0, revenue: 0, margin: 0 });
    const scenarios = [-10, -5, 0, 5, 10].map((pct) => {
      const f = fx * (1 + pct / 100);
      const cost = r22(lines.reduce((s, l) => s + (l.unitCostNative + perUnitExtra) * f * l.quantity, 0));
      const margin = r22(totals.revenue - cost);
      return {
        fxChangePercent: pct,
        fxRate: r22(f),
        costBrl: cost,
        marginBrl: margin,
        marginPercent: totals.revenue > 0 ? r22(margin / totals.revenue * 100) : 0
      };
    });
    res.json({
      currency: cur,
      fxRate: r22(fx),
      totalUnits,
      perUnitExtraNative: r22(perUnitExtra),
      totalCostNative,
      lines,
      totals: { ...totals, marginPercent: totals.revenue > 0 ? r22(totals.margin / totals.revenue * 100) : 0 },
      scenarios,
      // Ponto de equilíbrio: até que câmbio o lote ainda dá lucro.
      breakEvenFx: totals.revenue > 0 && totalCostNative > 0 ? r22(totals.revenue / totalCostNative) : null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router37.get("/restock", requirePermission("product", "view"), async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "60"), 10) || 60, 7), 365);
    const from = /* @__PURE__ */ new Date();
    from.setDate(from.getDate() - days);
    const sold = await db.select({
      productId: saleItems.productId,
      qty: sql26`sum(${saleItems.quantity})`,
      revenue: sql26`sum(cast(${saleItems.totalPrice} as numeric))`
    }).from(saleItems).innerJoin(sales, eq40(saleItems.saleId, sales.id)).where(and34(gte10(sales.createdAt, from), sql26`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`)).groupBy(saleItems.productId);
    if (!sold.length) return res.json({ days, data: [] });
    const ids = sold.map((s) => s.productId).filter(Boolean);
    const prods = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      cost: products.costPrice,
      price: products.salePriceA,
      minStock: products.minStock,
      physical: stockBalances.physicalStock,
      reserved: stockBalances.reservedStock
    }).from(products).innerJoin(stockBalances, eq40(products.id, stockBalances.productId)).where(and34(inArray16(products.id, ids), eq40(products.isActive, true)));
    const soldMap = new Map(sold.map((s) => [s.productId, s]));
    const data = prods.map((p) => {
      const s = soldMap.get(p.id);
      const qtySold = num2(s.qty);
      const perDay = qtySold / days;
      const free = num2(p.physical) - num2(p.reserved);
      const daysLeft = perDay > 0 ? Math.floor(free / perDay) : null;
      const target = Math.ceil(perDay * 45);
      const suggestedQty = Math.max(0, target - free);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        sold: qtySold,
        perDay: r22(perDay),
        available: free,
        daysLeft,
        suggestedQty,
        revenue: r22(num2(s.revenue)),
        cost: num2(p.cost),
        price: num2(p.price),
        urgency: daysLeft == null ? "OK" : daysLeft <= 7 ? "CRITICO" : daysLeft <= 20 ? "ATENCAO" : "OK",
        estimatedCostBrl: r22(suggestedQty * num2(p.cost))
      };
    }).filter((p) => p.suggestedQty > 0).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.revenue - a.revenue).slice(0, 40);
    const totalInvest = r22(data.reduce((s, d) => s + d.estimatedCostBrl, 0));
    res.json({ days, data, totalInvest, criticalCount: data.filter((d) => d.urgency === "CRITICO").length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router37.get("/currency-report", requirePermission("reports", "financial"), async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date(Date.now() - 90 * 864e5);
    const dateTo = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : /* @__PURE__ */ new Date();
    const purchases = await db.select({
      currency: purchaseOrders.currency,
      total: sql26`sum(cast(${purchaseOrders.totalAmount} as numeric))`,
      freight: sql26`sum(cast(coalesce(${purchaseOrders.freightAmount}, '0') as numeric))`,
      avgFx: sql26`avg(cast(${purchaseOrders.fxRateToBrl} as numeric))`,
      count: sql26`count(*)`
    }).from(purchaseOrders).where(and34(eq40(purchaseOrders.status, "APPROVED"), gte10(purchaseOrders.approvedAt, dateFrom), lte10(purchaseOrders.approvedAt, dateTo))).groupBy(purchaseOrders.currency);
    const layers = await db.select({
      currency: costLayers.sourceCurrency,
      qty: sql26`sum(${costLayers.qtyOriginal})`,
      costBrl: sql26`sum(${costLayers.qtyOriginal} * cast(${costLayers.unitCostBrl} as numeric))`,
      avgFx: sql26`avg(cast(${costLayers.fxRate} as numeric))`
    }).from(costLayers).where(and34(gte10(costLayers.createdAt, dateFrom), lte10(costLayers.createdAt, dateTo))).groupBy(costLayers.sourceCurrency);
    const [saleAgg] = await db.select({
      revenue: sql26`coalesce(sum(cast(${sales.totalAmount} as numeric)), 0)`,
      count: sql26`count(*)`
    }).from(sales).where(and34(
      gte10(sales.createdAt, dateFrom),
      lte10(sales.createdAt, dateTo),
      sql26`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`,
      eq40(sales.paymentStatus, "PAID")
    ));
    const [consAgg] = await db.select({
      cost: sql26`coalesce(sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric)), 0)`
    }).from(costConsumptions).where(and34(
      gte10(costConsumptions.createdAt, dateFrom),
      lte10(costConsumptions.createdAt, dateTo),
      eq40(costConsumptions.reason, "SALE")
    ));
    const revenue = r22(num2(saleAgg?.revenue));
    const realCost = r22(num2(consAgg?.cost));
    res.json({
      period: { dateFrom: dateFrom.toISOString().slice(0, 10), dateTo: dateTo.toISOString().slice(0, 10) },
      purchasesByCurrency: purchases.map((p) => ({
        currency: p.currency || "BRL",
        totalNative: r22(num2(p.total)),
        freightNative: r22(num2(p.freight)),
        avgFxToBrl: p.avgFx ? r22(num2(p.avgFx)) : null,
        count: Number(p.count),
        totalBrl: p.avgFx ? r22((num2(p.total) + num2(p.freight)) * num2(p.avgFx)) : null
      })),
      stockByCurrency: layers.map((l) => ({
        currency: l.currency || "BRL",
        qty: Number(l.qty),
        costBrl: r22(num2(l.costBrl)),
        avgFx: l.avgFx ? r22(num2(l.avgFx)) : null
      })),
      sales: { revenue, count: Number(saleAgg?.count || 0), realCost, margin: r22(revenue - realCost), marginPercent: revenue > 0 ? r22((revenue - realCost) / revenue * 100) : 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var intelligence_default = router37;

// src/server/statements.ts
init_db();
init_schema();
init_authMiddleware();
init_fx();
import { Router as Router38 } from "express";
import { and as and35, eq as eq41, gte as gte11, inArray as inArray17, lte as lte11, notInArray as notInArray4, sql as sql27 } from "drizzle-orm";
var router38 = Router38();
router38.use(requireAuth);
router38.use(requirePermission("reports", "financial"));
var r23 = (n) => Math.round(n * 100) / 100;
var num3 = (v) => Number(v || 0);
var NOT_CANCELED = sql27`"sales"."order_status" NOT IN ('CANCELED','CANCELLED','RETURNED')`;
var FINANCIAL_CAT = /banc|financ|juro|tarifa|emprest|cart[aã]o de cr[eé]dito/i;
function toBrlSync(rates, amount, currency) {
  const cur = String(currency || "BRL");
  if (cur === "BRL" || !amount) return amount;
  if (cur === "USD") {
    const r = rates.USDBRL?.rate;
    return r ? amount * r : amount;
  }
  if (cur === "PYG") {
    const r = rates.BRLPYG?.rate;
    return r ? amount / r : amount;
  }
  return amount;
}
async function computeDre(fromDate, toDate, rates) {
  const salesList = await db.select({
    id: sales.id,
    series: sales.series,
    customerId: sales.customerId,
    currency: sales.currency,
    subtotalAmount: sales.subtotalAmount,
    discountAmount: sales.discountAmount,
    ivaAmount: sales.ivaAmount,
    totalAmount: sales.totalAmount
  }).from(sales).where(and35(gte11(sales.createdAt, fromDate), lte11(sales.createdAt, toDate), NOT_CANCELED));
  let grossPos = 0, grossStore = 0, discounts = 0, freight = 0, netRevenue = 0;
  const customers2 = /* @__PURE__ */ new Set();
  for (const s of salesList) {
    const cur = String(s.currency || "BRL");
    const gross = toBrlSync(rates, num3(s.subtotalAmount), cur);
    if (String(s.series) === "LOJ") grossStore += gross;
    else grossPos += gross;
    discounts += toBrlSync(rates, num3(s.discountAmount), cur);
    freight += toBrlSync(rates, num3(s.ivaAmount), cur);
    netRevenue += toBrlSync(rates, num3(s.totalAmount), cur);
    if (s.customerId) customers2.add(s.customerId);
  }
  const grossRevenue = grossPos + grossStore;
  const returnRows = await db.select({ amount: saleReturns.totalAmountUsd, currency: sales.currency }).from(saleReturns).innerJoin(sales, eq41(saleReturns.saleId, sales.id)).where(and35(gte11(saleReturns.createdAt, fromDate), lte11(saleReturns.createdAt, toDate), sql27`${sales.createdAt} < ${fromDate}`));
  const returns = returnRows.reduce((s, r) => s + toBrlSync(rates, num3(r.amount), String(r.currency || "BRL")), 0);
  const returnsCount = returnRows.length;
  const netOperating = grossRevenue + freight - discounts - returns;
  const miscLogs = await db.select({ newValues: auditLogs.newValues }).from(auditLogs).where(and35(eq41(auditLogs.action, "MISC_RECEIPT"), gte11(auditLogs.createdAt, fromDate), lte11(auditLogs.createdAt, toDate)));
  const otherItems = /* @__PURE__ */ new Map();
  let otherRevenue = 0;
  for (const l of miscLogs) {
    try {
      const v = JSON.parse(String(l.newValues || "{}"));
      const amt = num3(v.amount);
      if (amt > 0) {
        otherRevenue += amt;
        const k = String(v.description || "Recebimento avulso").slice(0, 60);
        otherItems.set(k, r23((otherItems.get(k) || 0) + amt));
      }
    } catch {
    }
  }
  const totalRevenue = netOperating + otherRevenue;
  let cogs = 0, hasEstimatedCost = false;
  const saleIds = salesList.map((s) => s.id);
  if (saleIds.length) {
    const items = await db.select({
      totalCostAtSale: saleItems.totalCostAtSale,
      quantity: saleItems.quantity,
      unitCost: products.costPrice
    }).from(saleItems).leftJoin(products, eq41(saleItems.productId, products.id)).where(inArray17(saleItems.saleId, saleIds));
    for (const i of items) {
      if (i.totalCostAtSale != null) cogs += num3(i.totalCostAtSale);
      else {
        hasEstimatedCost = true;
        cogs += num3(i.unitCost) * num3(i.quantity);
      }
    }
  }
  const grossProfit = totalRevenue - cogs;
  const [variableExp, fixedExp, cats] = await Promise.all([
    db.select({ amountUsd: expenses.amountUsd, categoryId: expenses.categoryId, description: expenses.description }).from(expenses).where(and35(gte11(expenses.expenseDate, fromDate), lte11(expenses.expenseDate, toDate), eq41(expenses.isFixed, false))),
    db.select({ amountUsd: expenses.amountUsd, categoryId: expenses.categoryId, description: expenses.description }).from(expenses).where(and35(eq41(expenses.isFixed, true), eq41(expenses.isActive, true))),
    db.select().from(expenseCategories)
  ]);
  const monthsCount = Math.max(1, (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth()) + 1);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const groups = /* @__PURE__ */ new Map();
  const push = (categoryId, description, amount, fixed) => {
    const gName = categoryId && catName.get(categoryId) || "Outros";
    const g = groups.get(gName) || { name: gName, total: 0, financial: FINANCIAL_CAT.test(gName), items: /* @__PURE__ */ new Map() };
    g.total = r23(g.total + amount);
    const sub = String(description || "Diversos").trim().slice(0, 60) || "Diversos";
    const it = g.items.get(sub) || { total: 0, fixed };
    it.total = r23(it.total + amount);
    it.fixed = it.fixed || fixed;
    g.items.set(sub, it);
    groups.set(gName, g);
  };
  for (const e of variableExp) push(e.categoryId, e.description, num3(e.amountUsd), false);
  for (const e of fixedExp) push(e.categoryId, e.description, num3(e.amountUsd) * monthsCount, true);
  const expenseGroups = [...groups.values()].map((g) => ({
    name: g.name,
    total: r23(g.total),
    financial: g.financial,
    items: [...g.items.entries()].map(([name, v]) => ({ name, total: v.total, fixed: v.fixed })).sort((a, b) => b.total - a.total)
  })).sort((a, b) => b.total - a.total);
  const opex = r23(expenseGroups.filter((g) => !g.financial).reduce((s, g) => s + g.total, 0));
  const financialExpenses = r23(expenseGroups.filter((g) => g.financial).reduce((s, g) => s + g.total, 0));
  const ebit = grossProfit - opex;
  const netIncome = ebit - financialExpenses;
  return {
    salesCount: salesList.length,
    uniqueCustomers: customers2.size,
    revenue: {
      grossPos: r23(grossPos),
      grossStore: r23(grossStore),
      gross: r23(grossRevenue),
      freight: r23(freight),
      discounts: r23(discounts),
      returns: r23(returns),
      returnsCount,
      netOperating: r23(netOperating),
      other: r23(otherRevenue),
      otherItems: [...otherItems.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
      total: r23(totalRevenue)
    },
    cogs: r23(cogs),
    hasEstimatedCost,
    grossProfit: r23(grossProfit),
    grossMarginPercent: totalRevenue > 0 ? r23(grossProfit / totalRevenue * 100) : 0,
    expenseGroups,
    opex,
    financialExpenses,
    ebit: r23(ebit),
    ebitMarginPercent: totalRevenue > 0 ? r23(ebit / totalRevenue * 100) : 0,
    netIncome: r23(netIncome),
    netMarginPercent: totalRevenue > 0 ? r23(netIncome / totalRevenue * 100) : 0,
    avgTicket: salesList.length > 0 ? r23(netRevenue / salesList.length) : 0,
    profitPerSale: salesList.length > 0 ? r23(netIncome / salesList.length) : 0,
    monthsCount
  };
}
router38.get("/dre", async (req, res) => {
  try {
    const fromDate = req.query.dateFrom ? dayStartUtc(String(req.query.dateFrom)) : new Date((/* @__PURE__ */ new Date()).setDate(1));
    const toDate = req.query.dateTo ? dayEndUtc(String(req.query.dateTo)) : /* @__PURE__ */ new Date();
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(fromDate.getTime() - 1 - spanMs);
    const { resolveRates: resolveRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
    const rates = await resolveRates2().catch(() => ({}));
    const [cur, prev] = await Promise.all([computeDre(fromDate, toDate, rates), computeDre(prevFrom, prevTo, rates)]);
    const cashInRows = await db.select({ amount: payments.amountUsd, currency: sales.currency }).from(payments).innerJoin(sales, eq41(payments.saleId, sales.id)).where(and35(gte11(payments.createdAt, fromDate), lte11(payments.createdAt, toDate), eq41(payments.status, "COMPLETED")));
    const cashInTotal = cashInRows.reduce((s, r) => s + toBrlSync(rates, num3(r.amount), String(r.currency || "BRL")), 0);
    const [realCogsRow] = await db.select({ cost: sql27`coalesce(sum(${costConsumptions.qty} * cast(${costConsumptions.unitCostBrl} as numeric)),0)` }).from(costConsumptions).where(and35(gte11(costConsumptions.createdAt, fromDate), lte11(costConsumptions.createdAt, toDate), eq41(costConsumptions.reason, "SALE")));
    const [personalRow] = await db.select({ total: sql27`coalesce(sum(cast(${personalExpenses.amountBrl} as numeric)),0)` }).from(personalExpenses).where(and35(gte11(personalExpenses.expenseDate, fromDate), lte11(personalExpenses.expenseDate, toDate)));
    const personalWithdrawals = r23(num3(personalRow?.total));
    const topExpenses = cur.expenseGroups.flatMap((g) => g.items.map((i) => ({ group: g.name, name: i.name, total: i.total }))).sort((a, b) => b.total - a.total).slice(0, 10);
    res.json({
      period: { dateFrom: fromDate.toISOString().slice(0, 10), dateTo: toDate.toISOString().slice(0, 10) },
      previousPeriod: { dateFrom: prevFrom.toISOString().slice(0, 10), dateTo: prevTo.toISOString().slice(0, 10) },
      dre: cur,
      previous: prev,
      cashReceived: r23(cashInTotal),
      realCogs: r23(num3(realCogsRow?.cost)),
      personalWithdrawals,
      resultAfterWithdrawals: r23(cur.netIncome - personalWithdrawals),
      topExpenses,
      expenseToRevenuePercent: cur.revenue.total > 0 ? r23((cur.opex + cur.financialExpenses) / cur.revenue.total * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router38.get("/balance", async (_req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const accounts = await db.select().from(financialAccounts).where(and35(eq41(financialAccounts.isActive, true), eq41(financialAccounts.scope, "BUSINESS")));
    const cashAccounts = [];
    const cardAccounts = [];
    let cashBrl = 0, cardBrl = 0, unconverted = 0;
    for (const a of accounts) {
      let brl = null;
      try {
        brl = r23(await toBrl(num3(a.currentBalance), String(a.currency || "BRL")));
      } catch {
        unconverted += 1;
      }
      const row = { name: a.name, currency: a.currency || "BRL", balance: num3(a.currentBalance), balanceBrl: brl };
      if (a.type === "CARD_RECEIVABLE") {
        cardAccounts.push(row);
        if (brl != null) cardBrl += brl;
      } else {
        cashAccounts.push(row);
        if (brl != null) cashBrl += brl;
      }
    }
    const { resolveRates: resolveRates2 } = await Promise.resolve().then(() => (init_fx(), fx_exports));
    const balanceRates = await resolveRates2().catch(() => ({}));
    const openSales = await db.select({ id: sales.id, total: sales.totalAmount, dueDate: sales.dueDate, currency: sales.currency }).from(sales).where(and35(inArray17(sales.paymentStatus, ["PENDING", "PARTIAL"]), NOT_CANCELED));
    const paidBySale = /* @__PURE__ */ new Map();
    if (openSales.length) {
      const paidRows = await db.select({ saleId: payments.saleId, paid: sql27`sum(cast(${payments.amountUsd} as numeric))` }).from(payments).where(and35(inArray17(payments.saleId, openSales.map((s) => s.id)), eq41(payments.status, "COMPLETED"))).groupBy(payments.saleId);
      for (const p of paidRows) if (p.saleId) paidBySale.set(p.saleId, num3(p.paid));
    }
    let receivables = 0, receivablesOverdue = 0;
    for (const s of openSales) {
      const cur = String(s.currency || "BRL");
      const totalBrl = toBrlSync(balanceRates, num3(s.total), cur);
      const paidBrl = toBrlSync(balanceRates, paidBySale.get(s.id) || 0, cur);
      const open = Math.max(0, totalBrl - paidBrl);
      receivables += open;
      if (s.dueDate && new Date(s.dueDate) < now) receivablesOverdue += open;
    }
    receivables = r23(receivables);
    receivablesOverdue = r23(receivablesOverdue);
    const layerRows = await db.select({
      currency: costLayers.sourceCurrency,
      total: sql27`coalesce(sum(${costLayers.qtyRemaining} * cast(${costLayers.unitCostBrl} as numeric)),0)`,
      qty: sql27`coalesce(sum(${costLayers.qtyRemaining}),0)`
    }).from(costLayers).groupBy(costLayers.sourceCurrency);
    const inventoryByCurrency = layerRows.map((l) => ({ currency: l.currency || "BRL", totalBrl: r23(num3(l.total)), qty: Number(l.qty) })).filter((l) => l.totalBrl > 0 || l.qty > 0).sort((a, b) => b.totalBrl - a.totalBrl);
    const inventoryLayers = r23(inventoryByCurrency.reduce((s, l) => s + l.totalBrl, 0));
    const noLayer = await db.select({ qty: stockBalances.physicalStock, cost: products.costPrice }).from(stockBalances).innerJoin(products, eq41(stockBalances.productId, products.id)).where(and35(
      sql27`${stockBalances.physicalStock} > 0`,
      sql27`NOT EXISTS (SELECT 1 FROM cost_layers cl WHERE cl.product_id = ${stockBalances.productId} AND cl.qty_remaining > 0)`
    ));
    const inventoryEstimated = r23(noLayer.reduce((s, p) => s + num3(p.qty) * num3(p.cost), 0));
    const inventory = r23(inventoryLayers + inventoryEstimated);
    const openPayables = await db.select({ amountUsd: payables.amountUsd, paidAmount: payables.paidAmount, dueDate: payables.dueDate }).from(payables).where(notInArray4(payables.status, ["PAID"]));
    let payablesOpen = 0, payablesOverdue = 0;
    for (const p of openPayables) {
      const open = Math.max(0, num3(p.amountUsd) - num3(p.paidAmount));
      payablesOpen += open;
      if (p.dueDate && new Date(p.dueDate) < now) payablesOverdue += open;
    }
    payablesOpen = r23(payablesOpen);
    payablesOverdue = r23(payablesOverdue);
    const totalAssets = r23(cashBrl + cardBrl + receivables + inventory);
    const totalLiabilities = payablesOpen;
    const equity = r23(totalAssets - totalLiabilities);
    const currentRatio = totalLiabilities > 0 ? r23(totalAssets / totalLiabilities) : null;
    const debtToAssets = totalAssets > 0 ? r23(totalLiabilities / totalAssets * 100) : 0;
    const composition = totalAssets > 0 ? {
      cashPercent: r23(cashBrl / totalAssets * 100),
      cardPercent: r23(cardBrl / totalAssets * 100),
      receivablesPercent: r23(receivables / totalAssets * 100),
      inventoryPercent: r23(inventory / totalAssets * 100)
    } : null;
    const personalAccounts = await db.select().from(financialAccounts).where(and35(eq41(financialAccounts.isActive, true), eq41(financialAccounts.scope, "PERSONAL")));
    let personalBrl = 0;
    for (const a of personalAccounts) {
      try {
        personalBrl += await toBrl(num3(a.currentBalance), String(a.currency || "BRL"));
      } catch {
      }
    }
    res.json({
      asOf: now.toISOString(),
      assets: {
        cash: { total: r23(cashBrl), accounts: cashAccounts },
        cardReceivable: { total: r23(cardBrl), accounts: cardAccounts },
        customerReceivables: receivables,
        customerReceivablesOverdue: receivablesOverdue,
        inventory: { total: inventory, fromLayers: inventoryLayers, estimated: inventoryEstimated, byCurrency: inventoryByCurrency },
        total: totalAssets
      },
      liabilities: { payables: payablesOpen, payablesOverdue, total: totalLiabilities },
      equity,
      ratios: { currentRatio, debtToAssets, composition },
      unconvertedAccounts: unconverted,
      personalNetWorthBrl: r23(personalBrl)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var statements_default = router38;

// src/server/performance.ts
var DEFAULT_SLOW_MS = 800;
function asNumber(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
function redactUrl(url) {
  return url.replace(/([?&](?:token|password|senha|secret|key|authorization)=)[^&]+/gi, "$1[redacted]").slice(0, 280);
}
function apiPerformanceLogger(req, res, next) {
  if (process.env.PERF_LOG_ENABLED === "false") {
    return next();
  }
  const startedAt = process.hrtime.bigint();
  const slowMs = asNumber(process.env.PERF_SLOW_MS, DEFAULT_SLOW_MS);
  const logAll = process.env.PERF_LOG_ALL !== "false";
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const roundedDuration = Math.round(durationMs);
    const isSlow = durationMs >= slowMs;
    if (!logAll && !isSlow) return;
    const contentLength = res.getHeader("content-length");
    const lengthInfo = contentLength ? ` bytes=${contentLength}` : "";
    const memoryInfo = isSlow ? ` rss=${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB` : "";
    const prefix = isSlow ? "[PERF][SLOW]" : "[PERF]";
    console.log(
      `${prefix} ${req.method} ${redactUrl(req.originalUrl || req.url)} status=${res.statusCode} time=${roundedDuration}ms${lengthInfo}${memoryInfo}`
    );
  });
  next();
}
function markResponseStart(req, res, next) {
  if (process.env.PERF_HEADER_ENABLED === "false") {
    return next();
  }
  const startedAt = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = ((...args) => {
    if (!res.headersSent) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      res.setHeader("X-Response-Time", `${Math.round(durationMs)}ms`);
    }
    return originalWriteHead(...args);
  });
  next();
}

// api/handler.ts
init_db();
init_schema();
init_audit();
import { v4 as uuidv419 } from "uuid";
function buildCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!allowedOrigins.length) return { origin: false };
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    }
  };
}
var app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
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
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "4mb" }));
app.use("/api", markResponseStart, apiPerformanceLogger);
app.use("/api/auth", auth_default);
app.use("/api/users", users_default);
app.use("/api/products", products_default);
app.use("/api/customers", customers_default);
app.use("/api/groups", groups_default);
app.use("/api/shelves", shelves_default);
app.use("/api/audit", auditRouter_default);
app.use("/api/sales", receipts_default);
app.use("/api/sales", sales_default);
app.use("/api/reports", reports_default);
app.use("/api/health", health_default);
app.use("/api/archived", archived_default);
app.use("/api/cash", cash_default);
app.use("/api/separation", router19);
app.use("/api/delivery", router20);
app.use("/api/serials", router21);
app.use("/api/settings", settings_default);
app.use("/api/suppliers", suppliers_default);
app.use("/api/purchases", purchases_default);
app.use("/api/expenses", expenses_default);
app.use("/api/dashboard", dashboard_default);
app.use("/api/notifications", notifications_default);
app.use("/api/analytics", analytics_default);
app.use("/api/transfers", transfers_default);
app.use("/api/lots", lots_default);
app.use("/api/receivables", receivables_default);
app.use("/api/payables", payables_default);
app.use("/api/finance", finance_default);
app.use("/api/fx", fx_default);
app.use("/api/cost", costLayers_default);
app.use("/api/personal", personal_default);
app.use("/api/store", store_default);
app.use("/api/store/account", customerAuth_default);
app.use("/api/intel", intelligence_default);
app.use("/api/statements", statements_default);
app.use("/api/ai-reports", aiReports_default);
app.use("/api/maintenance", router34);
app.use("/api/master", master_default);
app.get("/api/ping", (_req, res) => {
  res.json({
    status: "ok",
    runtime: "vercel",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null
  });
});
app.post("/api/__preview/product-write-selftest", async (_req, res) => {
  if (process.env.VERCEL_ENV !== "preview") return res.status(404).json({ error: "Not found" });
  let rolledBack = false;
  try {
    await db.transaction(async (tx) => {
      const [actor] = await tx.select({ id: users.id }).from(users).limit(1);
      if (!actor) throw new Error("SELFTEST_NO_USER");
      const id = uuidv419();
      await tx.insert(products).values({
        id,
        sku: `AURA-SELFTEST-${Date.now()}`,
        name: "AURA PREVIEW WRITE SELFTEST",
        unitMeasure: "UN",
        salePriceA: "1.00",
        salePriceB: "1.00",
        salePriceC: "1.00"
      });
      await tx.insert(stockBalances).values({ productId: id, physicalStock: 0, reservedStock: 0 });
      await logAction(actor.id, "SELF_TEST", "products", id, null, { preview: true }, tx);
      throw new Error("__AURA_SELFTEST_ROLLBACK__");
    });
  } catch (error) {
    if (error?.message === "__AURA_SELFTEST_ROLLBACK__") rolledBack = true;
    else {
      console.error("Preview product write selftest failed:", error);
      return res.status(500).json({ ok: false, error: "Product write self-test failed" });
    }
  }
  res.json({ ok: rolledBack, rolledBack });
});
app.use((error, _req, res, _next) => {
  console.error("Erro n\xE3o tratado na API:", error);
  if (!res.headersSent) res.status(500).json({ error: "Erro interno do servidor" });
});
function rebuildApiUrl(req) {
  const rawPath = req.query?.__path;
  const pathParts = Array.isArray(rawPath) ? rawPath.map(String) : String(rawPath || "").split("/").filter(Boolean);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "__path" || value === void 0 || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
    } else {
      query.append(key, String(value));
    }
  }
  const pathname = `/api/${pathParts.map((part) => encodeURIComponent(part)).join("/")}`;
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}
function handler(req, res) {
  req.url = rebuildApiUrl(req);
  return app(req, res);
}
export {
  handler as default
};
