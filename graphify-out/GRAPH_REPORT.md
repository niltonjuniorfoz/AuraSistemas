# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 231 files · ~685,679 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1425 nodes · 4073 edges · 127 communities (62 shown, 59 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e2af7c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- EditModeContext.tsx
- backupService.ts
- index.ts
- authMiddleware.ts
- App.tsx
- finance.ts
- useEditMode
- Pos.tsx
- apiFetch
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- settings.ts
- storeApiFetch
- requireAuth
- ShopProductCard.tsx
- elementCatalog.ts
- Analytics.tsx
- products.ts
- Toast.tsx
- ThemeCustomizer.tsx
- OrderStatus.tsx
- command.tsx
- server.ts
- components.json
- Layout.tsx
- compilerOptions
- FinancialStatements.tsx
- FontsPanel.tsx
- useAdminTranslation
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- lib/utils.ts
- StockMovementReport.tsx
- AbcReport.tsx
- ErrorBoundary
- ColorsPanel.tsx
- lib/i18n.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- PaymentProof.tsx
- ERP Complete Audit Skill
- local-db.mjs
- ocrService.ts
- vite
- AGENTS.md
- class-variance-authority
- cmdk
- cors
- date-fns
- dotenv
- drizzle-orm
- embedded-postgres
- esbuild
- express
- geoip-lite
- intelligence.ts
- @hookform/resolvers
- i18next
- jsonwebtoken
- flagIcons.tsx
- motion
- multer
- papaparse
- pdfkit
- postgres
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- StoreHome.tsx
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-tooltip
- react-dom
- react-hook-form
- react-i18next
- react-router
- recharts
- tailwind-merge
- @tailwindcss/vite
- @tanstack/react-table
- tw-animate-css
- @types/qrcode
- uuid
- @vitejs/plugin-react
- xlsx
- zod
- zustand
- tailwindcss
- tsx
- @types/bcryptjs
- @types/cors
- @types/express
- @types/geoip-lite
- @radix-ui/react-tabs
- @types/nodemailer
- @types/papaparse
- @types/react
- @types/react-dom
- typescript
- PurchaseOcr.tsx
- @radix-ui/react-toast
- @types/node
- buildPixPayload
- BannerPanel.tsx
- store/i18n.ts
- PremiumCta.tsx
- shopCart.ts
- AnimatedNumber.tsx
- performance.ts
- @google/genai
- qrcode
- @radix-ui/react-select
- react

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 132 edges
2. `cn()` - 89 edges
3. `useAuthStore` - 58 edges
4. `Button()` - 54 edges
5. `Card()` - 49 edges
6. `db` - 46 edges
7. `useEditMode()` - 39 edges
8. `CardContent()` - 37 edges
9. `requireAuth()` - 37 edges
10. `requirePermission()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `initAutomaticBackupSchedule()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts

## Import Cycles
- None detected.

## Communities (127 total, 59 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (41): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisterBalances, cashRegisters, deliveryItems, deliveryPaymentOverrides (+33 more)

### Community 1 - "EditModeContext.tsx"
Cohesion: 0.15
Nodes (14): StoreCatalog, StoreEditor, EditModeContext, EditModeProvider(), EditModeValue, effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections() (+6 more)

### Community 2 - "backupService.ts"
Cohesion: 0.10
Nodes (41): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+33 more)

### Community 3 - "index.ts"
Cohesion: 0.18
Nodes (14): client, db, logAction(), cache, CacheEntry, clearApiCache(), getTtlMs(), inflight (+6 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.13
Nodes (21): permissions, productGroups, productSubgroups, rolePermissions, roles, users, router, hideMasterLogsCondition (+13 more)

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (53): AbandonedCarts, AccountLayout, Archived, AuditLogs, Backup, Cash, CompanySettings, Email (+45 more)

### Community 6 - "finance.ts"
Cohesion: 0.13
Nodes (22): payables, paymentMethodAccounts, MONEY_EPSILON, convertBrlToAccountCurrency(), convertCurrency(), METHOD_ACCOUNT_TYPES, postMovement(), PostOpts (+14 more)

### Community 7 - "useEditMode"
Cohesion: 0.19
Nodes (13): useEditMode(), DraftCategory, DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell(), SideBannerPanel(), TextPanel() (+5 more)

### Community 8 - "Pos.tsx"
Cohesion: 0.16
Nodes (20): Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, defaultQuickCustomerForm, defaultShortcuts (+12 more)

### Community 9 - "apiFetch"
Cohesion: 0.06
Nodes (46): Brands, CommissionsReport, Intelligence, Notifications, StoreOrders, StoreSettings, CashRegisterBadge(), NotificationBell() (+38 more)

### Community 10 - "store.ts"
Cohesion: 0.06
Nodes (37): customerAddresses, customerWishlist, emailSettings, notifications, productGroupsDraft, productImages, storeNewsletterSubscribers, formatBrl() (+29 more)

### Community 11 - "Products.tsx"
Cohesion: 0.15
Nodes (21): Customers, Groups, Products, Users, ConfirmModal(), ConfirmModalProps, HardDeleteModal(), HardDeleteModalProps (+13 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.12
Nodes (17): Dashboard, ProfitReport, AiReportModal(), AiReportModalProps, AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey, Dashboard() (+9 more)

### Community 14 - "settings.ts"
Cohesion: 0.09
Nodes (24): brandLogos, companySettings, currencies, fiscalSettings, printerSettings, systemSettings, formatAmount(), formatServerCurrency() (+16 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.11
Nodes (20): MyAddresses, storeApiFetch(), AccountAuth(), requestReset(), submitLogin(), Country, AccountLayout(), emptyForm (+12 more)

### Community 16 - "requireAuth"
Cohesion: 0.09
Nodes (27): customers, expenseCategories, expenses, financialAccounts, personalCategories, personalExpenses, products, profitDistributionRules (+19 more)

### Community 17 - "ShopProductCard.tsx"
Cohesion: 0.23
Nodes (15): MyOrders, MyWishlist, StoreProduct, MyOrders(), statusClasses, MyWishlist(), translateCategoryName(), translateStockStatus() (+7 more)

### Community 18 - "elementCatalog.ts"
Cohesion: 0.17
Nodes (16): Editable(), bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, ElementoCatalogo, ESTATICOS (+8 more)

### Community 19 - "Analytics.tsx"
Cohesion: 0.14
Nodes (15): Analytics, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars() (+7 more)

### Community 20 - "products.ts"
Cohesion: 0.08
Nodes (30): productLots, purchaseOrderSerials, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency(), addCostLayer(), consumeFifo() (+22 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.24
Nodes (12): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+4 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "OrderStatus.tsx"
Cohesion: 0.29
Nodes (3): OrderStatus, statusClasses, statusIcons

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.07
Nodes (30): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), stockTransferItems (+22 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.15
Nodes (15): CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn(), getStoredPosLayoutMode() (+7 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 30 - "FontsPanel.tsx"
Cohesion: 0.40
Nodes (5): readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 31 - "useAdminTranslation"
Cohesion: 0.08
Nodes (39): Finance, Payables, Purchases, RealMarginReport, Receivables, Sales, Shortcuts, SimpleDeliveries (+31 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (8): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry, router

### Community 33 - "devDependencies"
Cohesion: 0.15
Nodes (13): autoprefixer, drizzle-kit, devDependencies, autoprefixer, drizzle-kit, @types/jsonwebtoken, @types/multer, @types/pdfkit (+5 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, build:check, clean, db:local, db:push, db:seed, db:studio (+4 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 37 - "lib/utils.ts"
Cohesion: 0.14
Nodes (11): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, Circle, hexToRgb() (+3 more)

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 39 - "AbcReport.tsx"
Cohesion: 0.47
Nodes (5): AbcReport, AbcReport(), classStyle, firstOfMonth(), today()

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "lib/i18n.ts"
Cohesion: 0.08
Nodes (49): App(), Currencies, DisplayCurrencySelector(), Money(), MoneyProps, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps (+41 more)

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.20
Nodes (17): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), calcOrderTotal(), submitRegister(), applyStoreFonts(), escapeCssString() (+9 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "PaymentProof.tsx"
Cohesion: 0.60
Nodes (4): onlyDigits(), PaymentProof(), PaymentProofProps, toWa()

### Community 48 - "ERP Complete Audit Skill"
Cohesion: 0.40
Nodes (4): 1. Corretude e Links (Routing Integrity), 2. C�digo Fantasma (Dead Code Elimination), 3. Caminhos Corretos (Fluxo de Venda), ERP Complete Audit Skill

### Community 49 - "local-db.mjs"
Cohesion: 0.50
Nodes (3): dataDir, __dirname, pg

### Community 50 - "ocrService.ts"
Cohesion: 0.67
Nodes (3): getAiClient(), OcrResult, processInvoiceOcr()

### Community 51 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 63 - "intelligence.ts"
Cohesion: 0.13
Nodes (17): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+9 more)

### Community 76 - "StoreHome.tsx"
Cohesion: 0.17
Nodes (12): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES, ProductSection(), ScrollArrows() (+4 more)

### Community 107 - "PurchaseOcr.tsx"
Cohesion: 0.27
Nodes (12): PurchaseOcr, loadList(), getBaseCurrency(), PurchaseForm(), loadAll(), PurchaseImport(), loadAll(), ExtendedOcrItem (+4 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 115 - "BannerPanel.tsx"
Cohesion: 0.52
Nodes (5): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel()

### Community 116 - "store/i18n.ts"
Cohesion: 0.29
Nodes (5): AssistantWidget(), ChatMsg, CATEGORY_TRANSLATIONS, resources, storefrontLanguage

### Community 117 - "PremiumCta.tsx"
Cohesion: 0.40
Nodes (4): ShimmerButton, ShimmerButtonProps, PremiumCtaProps, SIZE_CLASSES

### Community 118 - "shopCart.ts"
Cohesion: 0.47
Nodes (5): CartItem, load(), save(), ShopCartState, useShopCart

### Community 119 - "AnimatedNumber.tsx"
Cohesion: 0.60
Nodes (3): AnimatedNumber(), AnimatedNumberProps, prefersReducedMotion()

### Community 120 - "performance.ts"
Cohesion: 0.83
Nodes (3): apiPerformanceLogger(), asNumber(), redactUrl()

## Knowledge Gaps
- **306 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 418 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **59 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `App.tsx`, `lib/utils.ts`, `PurchaseOcr.tsx`, `PremiumCta.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `EditModeContext.tsx`, `StockTransfers.tsx`, `App.tsx`, `StockMovementReport.tsx`, `AbcReport.tsx`, `Pos.tsx`, `useEditMode`, `lib/i18n.ts`, `Products.tsx`, `PurchaseOcr.tsx`, `Dashboard.tsx`, `StoreHome.tsx`, `Analytics.tsx`, `Toast.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `finance.ts` to `schema.ts`, `apiFetch`, `lib/i18n.ts`, `store.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08711433756805807 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09639953542392567 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._