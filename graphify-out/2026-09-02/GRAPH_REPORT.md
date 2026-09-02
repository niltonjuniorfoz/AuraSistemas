# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 246 files · ~758,844 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1675 nodes · 4712 edges · 138 communities (72 shown, 60 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a332825`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- runtime.js
- backupService.ts
- index.ts
- elementCatalog.ts
- api.ts
- server.ts
- StoreHome.tsx
- vercel.json
- App.tsx
- store.ts
- authMiddleware.ts
- cn
- Dashboard.tsx
- receipts.ts
- storeApiFetch
- AuthRequest
- badge.tsx
- finance.ts
- Finance.tsx
- useEditMode
- Toast.tsx
- ThemeCustomizer.tsx
- OrderStatus.tsx
- command.tsx
- handler.ts
- components.json
- Login.tsx
- compilerOptions
- FinancialStatements.tsx
- lib/utils.ts
- lib/i18n.ts
- server/customerAuth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- purchases.ts
- EditModeContext.tsx
- PaymentProof.tsx
- ErrorBoundary
- diag.ts
- Sales.tsx
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- Products.tsx
- ERP Complete Audit Skill
- local-db.mjs
- ollama.ts
- vite
- AGENTS.md
- class-variance-authority
- cmdk
- cors
- date-fns
- dotenv
- drizzle-orm
- StockMovementReport.tsx
- HeaderClock.tsx
- express
- buscarProdutoImpl
- useAdminTranslation
- @hookform/resolvers
- i18next
- jsonwebtoken
- restoreBackupFromBuffer
- motion
- @fontsource-variable/inter
- papaparse
- lucide-react
- postgres
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- FontsPanel.tsx
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
- @types/express
- "src/server/fx.ts"
- @types/pdfkit
- runManualBackup
- ColorsPanel.tsx
- @types/geoip-lite
- @radix-ui/react-tabs
- checkPendingAutomaticBackupNow
- @types/papaparse
- @types/bcryptjs
- @types/jsonwebtoken
- approvePurchaseOrder
- apiFetch
- @radix-ui/react-toast
- ShopProductCard.tsx
- buildPixPayload
- @types/react-dom
- getStoreVitrineConfig
- nodemailer
- BannerPanel.tsx
- flagIcons.tsx
- @types/uuid
- FulfillmentBadge
- qrcode
- @radix-ui/react-select
- react
- convertCurrency
- getServerCurrencySettings
- formatServerCurrency
- consumeSaleLots
- apiPerformanceLogger
- processImageWithOllama
- StatusBadge
- drizzle-kit
- tailwindcss
- @types/nodemailer
- typescript

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 132 edges
2. `cn()` - 89 edges
3. `useAuthStore` - 58 edges
4. `Button()` - 54 edges
5. `Card()` - 49 edges
6. `db` - 48 edges
7. `useEditMode()` - 39 edges
8. `CardContent()` - 37 edges
9. `requireAuth()` - 37 edges
10. `requirePermission()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `initAutomaticBackupSchedule()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts

## Import Cycles
- None detected.

## Communities (138 total, 60 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.07
Nodes (48): abandonedCarts, auditLogs, brandLogos, cashMovements, cashRegisterBalances, cashRegisters, companySettings, currencies (+40 more)

### Community 1 - "runtime.js"
Cohesion: 0.02
Nodes (20): computeDre(), dayEndUtc(), deleteDeadSaleRecords(), getRecentAuditLogsForUser(), getTtlMs(), handler(), isMaster(), isMasterRole() (+12 more)

### Community 2 - "backupService.ts"
Cohesion: 0.09
Nodes (42): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+34 more)

### Community 3 - "index.ts"
Cohesion: 0.06
Nodes (41): loaded, app, main(), requiredPassword(), updatePassword(), client, configuredMax, db (+33 more)

### Community 4 - "elementCatalog.ts"
Cohesion: 0.16
Nodes (16): bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, ElementoCatalogo, ESTATICOS, getElemento() (+8 more)

### Community 5 - "api.ts"
Cohesion: 0.10
Nodes (41): Archived, AuditLogs, Customers, Groups, ProtectedRoute(), Reports, Users, ConfirmModal() (+33 more)

### Community 6 - "server.ts"
Cohesion: 0.07
Nodes (45): loaded, loaded, app, app, applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema() (+37 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.14
Nodes (14): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, SideBannerPanel(), TextPanel(), BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES (+6 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/runtime.js, outputDirectory, rewrites, $schema

### Community 9 - "App.tsx"
Cohesion: 0.05
Nodes (42): AbandonedCarts, Backup, Brands, Cash, CompanySettings, Currencies, Email, Fiscal (+34 more)

### Community 10 - "store.ts"
Cohesion: 0.09
Nodes (27): productGroupsDraft, productImages, storeNewsletterSubscribers, formatBrl(), MONEY_EPSILON, round2(), availableStockExpr, buscarProdutoImpl() (+19 more)

### Community 11 - "authMiddleware.ts"
Cohesion: 0.13
Nodes (19): permissions, productGroups, products, productSubgroups, rolePermissions, roles, shelves, users (+11 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (29): DataTableProps, BorderBeam(), BorderBeamProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+21 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.11
Nodes (23): Dashboard, AnimatedNumber(), AnimatedNumberProps, DisplayCurrencySelector(), prefersReducedMotion(), AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey (+15 more)

### Community 14 - "receipts.ts"
Cohesion: 0.16
Nodes (15): emailLogs, printLogs, formatAmount(), formatServerCurrency(), getServerCurrencySettings(), normalizeCurrencyMode(), normalizeExchangeRate(), number() (+7 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.14
Nodes (17): AccountLayout, MyAddresses, storeApiFetch(), AccountLayout(), emptyForm, MyAddresses(), remove(), submit() (+9 more)

### Community 16 - "AuthRequest"
Cohesion: 0.12
Nodes (19): customers, expenseCategories, expenses, personalCategories, personalExpenses, profitDistributionRules, storePageviews, dayEndUtc() (+11 more)

### Community 17 - "badge.tsx"
Cohesion: 0.13
Nodes (18): AbcReport, Shortcuts, SimpleDeliveries, Badge(), badgeVariants, AbcReport(), classStyle, firstOfMonth() (+10 more)

### Community 18 - "finance.ts"
Cohesion: 0.18
Nodes (16): accountMovements, financialAccounts, payables, paymentMethodAccounts, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency() (+8 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.10
Nodes (23): Analytics, Finance, Personal, brl(), compact(), CompositionDonut(), DarkTooltip(), dayLabel() (+15 more)

### Community 20 - "useEditMode"
Cohesion: 0.17
Nodes (15): StoreCatalog, StoreEditor, Editable(), EditModeProvider(), useEditMode(), effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections() (+7 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.27
Nodes (11): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+3 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (21): COLOR_PRESETS, LAYOUTS, ThemeCustomizer(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader() (+13 more)

### Community 23 - "OrderStatus.tsx"
Cohesion: 0.29
Nodes (3): OrderStatus, statusClasses, statusIcons

### Community 24 - "command.tsx"
Cohesion: 0.12
Nodes (19): ACTIONS, CommandTrigger(), Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput() (+11 more)

### Community 25 - "handler.ts"
Cohesion: 0.10
Nodes (23): app, loaded, app, handler(), rebuildApiUrl(), stockTransferItems, stockTransfers, router (+15 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Login.tsx"
Cohesion: 0.38
Nodes (5): Login, STORE_FALLBACK_NAME, SYSTEM_BRAND, Login(), shouldShowMobileInstallIntro()

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 30 - "lib/utils.ts"
Cohesion: 0.14
Nodes (11): AnimatedGradientText(), AnimatedGradientTextProps, Marquee(), MarqueeProps, Circle, hexToRgb(), MousePosition, Particles() (+3 more)

### Community 31 - "lib/i18n.ts"
Cohesion: 0.08
Nodes (50): App(), Money(), MoneyProps, PurchaseItemRow(), useDebounce(), QuickGroupModal(), QuickSubgroupModal(), StockModal() (+42 more)

### Community 32 - "server/customerAuth.ts"
Cohesion: 0.11
Nodes (13): customerAddresses, customerWishlist, formatCpf(), isValidCpf(), onlyDigits(), AccountAuth(), requestReset(), submitLogin() (+5 more)

### Community 33 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, embedded-postgres, esbuild, devDependencies, autoprefixer, embedded-postgres, esbuild, tsx (+9 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, geoip-lite, multer, dependencies, bcryptjs, clsx, geoip-lite (+5 more)

### Community 35 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:check, build:vercel, build:vercel:api, clean, db:harden, db:local (+7 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 37 - "purchases.ts"
Cohesion: 0.10
Nodes (29): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+21 more)

### Community 38 - "EditModeContext.tsx"
Cohesion: 0.18
Nodes (11): EditModeContext, EditModeValue, CategoriesPanel(), DraftCategory, DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell() (+3 more)

### Community 39 - "PaymentProof.tsx"
Cohesion: 0.60
Nodes (4): onlyDigits(), PaymentProof(), PaymentProofProps, toWa()

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "diag.ts"
Cohesion: 0.67
Nodes (3): handler(), modulesToCheck, sanitize()

### Community 42 - "Sales.tsx"
Cohesion: 0.29
Nodes (9): Sales, money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), csvCell(), getTodayString() (+1 more)

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.15
Nodes (19): isFullName(), calcOrderTotal(), APP_VERSION, AssistantWidget(), ChatMsg, applyStoreFonts(), escapeCssString(), applyStoreColors() (+11 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "Products.tsx"
Cohesion: 0.10
Nodes (31): Pos, Products, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, Modal() (+23 more)

### Community 48 - "ERP Complete Audit Skill"
Cohesion: 0.40
Nodes (4): 1. Corretude e Links (Routing Integrity), 2. C�digo Fantasma (Dead Code Elimination), 3. Caminhos Corretos (Fluxo de Venda), ERP Complete Audit Skill

### Community 49 - "local-db.mjs"
Cohesion: 0.50
Nodes (3): dataDir, __dirname, pg

### Community 50 - "ollama.ts"
Cohesion: 0.17
Nodes (19): normalizeOcrResult(), OcrResult, processImageWithOllama(), processInvoiceOcr(), processPdfWithOllama(), extractJsonObject(), getOllamaBaseUrl(), getOllamaErrorInfo() (+11 more)

### Community 51 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 59 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 63 - "useAdminTranslation"
Cohesion: 0.14
Nodes (19): Payables, ProfitReport, Purchases, RealMarginReport, Receivables, AiReportModal(), AiReportModalProps, DataTable() (+11 more)

### Community 67 - "restoreBackupFromBuffer"
Cohesion: 0.17
Nodes (13): assertOriginBackupPayload(), backupsDir(), createLocalBackupFile(), exportDatabaseJson(), getPublicTables(), getTableColumnTypes(), getTableDependencies(), insertRestoreRows() (+5 more)

### Community 76 - "FontsPanel.tsx"
Cohesion: 0.40
Nodes (5): readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 96 - ""src/server/fx.ts""
Cohesion: 0.17
Nodes (12): fetchApiRates(), getCachedPermission(), getPermissionCacheTtlMs(), isPrivilegedRole(), logAction(), requireAuth(), requirePermission(), resolveRates() (+4 more)

### Community 98 - "runManualBackup"
Cohesion: 0.27
Nodes (10): cleanupOldDropboxBackups(), formatDropboxError(), getBackupSettings(), getDropboxFolder(), isDropboxConfigured(), normalizeBackupSettings(), postDropboxApi(), runManualBackup() (+2 more)

### Community 99 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 102 - "checkPendingAutomaticBackupNow"
Cohesion: 0.31
Nodes (9): checkPendingAutomaticBackupNow(), failedAttemptIsCoolingDown(), getScheduledDateForToday(), localDateKey(), normalizeHHMM(), timeZoneOffsetMs(), wasScheduledBackupSuccessful(), zonedLocalTimeToUtc() (+1 more)

### Community 106 - "approvePurchaseOrder"
Cohesion: 0.29
Nodes (8): addCostLayer(), addLotStock(), approvePurchaseOrder(), cancelSaleTx(), createPayableForPurchase(), restoreSaleLayers(), restoreSaleLots(), syncStoreOrderFromSale()

### Community 107 - "apiFetch"
Cohesion: 0.09
Nodes (30): CommissionsReport, CashRegisterBadge(), CommandPalette(), buttons, GlobalCalculator(), cn(), getStoredPosLayoutMode(), Layout() (+22 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.17
Nodes (19): MyOrders(), statusClasses, MyWishlist(), CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName(), translateStockStatus() (+11 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 116 - "getStoreVitrineConfig"
Cohesion: 0.25
Nodes (8): getStoreConfigDraft(), getStoreVitrineConfig(), normalizeHeroCtaOrder(), normalizeHeroCtaSize(), normalizeStorePages(), normalizeStorePageSection(), normalizeStoreThemeColors(), normalizeStoreThemeFont()

### Community 118 - "BannerPanel.tsx"
Cohesion: 0.52
Nodes (5): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel()

### Community 127 - "convertCurrency"
Cohesion: 0.40
Nodes (5): convertBrlToAccountCurrency(), convertCurrency(), postMovement(), reverseSaleMovements(), routePayment()

### Community 128 - "getServerCurrencySettings"
Cohesion: 0.40
Nodes (5): ensureCompanySettingsCompat2(), getReceiptData(), getServerCurrencySettings(), normalizeCurrencyMode(), normalizeExchangeRate()

### Community 129 - "formatServerCurrency"
Cohesion: 0.40
Nodes (5): formatAmount(), formatServerCurrency(), generateA4Doc(), loadImageBuffer(), number()

### Community 130 - "consumeSaleLots"
Cohesion: 0.50
Nodes (4): consumeFifo(), consumeLotStock(), consumeSaleLots(), markSaleDelivered()

### Community 131 - "apiPerformanceLogger"
Cohesion: 0.67
Nodes (3): apiPerformanceLogger(), asNumber(), redactUrl()

### Community 132 - "processImageWithOllama"
Cohesion: 0.16
Nodes (14): extractJsonObject(), getOllamaBaseUrl(), getOllamaErrorInfo(), getOllamaModel(), isOllamaConfigured(), normalizeBaseUrl(), normalizeOcrResult(), ollamaChat() (+6 more)

## Knowledge Gaps
- **326 isolated node(s):** `app`, `loaded`, `loaded`, `loaded`, `loaded` (+321 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 513 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `api.ts`, `EditModeContext.tsx`, `StoreHome.tsx`, `App.tsx`, `Sales.tsx`, `Dashboard.tsx`, `Products.tsx`, `badge.tsx`, `useAdminTranslation`, `Finance.tsx`, `useEditMode`, `command.tsx`, `StockMovementReport.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `api.ts`, `StatusBadge`, `Sales.tsx`, `badge.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `FulfillmentBadge`, `lib/i18n.ts`, `FinancialStatements.tsx`, `lib/utils.ts`, `useAdminTranslation`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `store.ts` to `schema.ts`, `App.tsx`, `finance.ts`, `lib/i18n.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `app`, `loaded`, `loaded` to the rest of the system?**
  _326 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07161125319693094 - nodes in this community are weakly interconnected._
- **Should `runtime.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0241280458671763 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413067552602436 - nodes in this community are weakly interconnected._