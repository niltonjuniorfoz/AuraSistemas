# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 235 files · ~686,480 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1447 nodes · 4139 edges · 127 communities (64 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7847e339`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- startServer
- backupService.ts
- index.ts
- server.ts
- App.tsx
- finance.ts
- StoreHome.tsx
- vercel.json
- CommissionsReport.tsx
- store.ts
- api.ts
- cn
- Dashboard.tsx
- server/currency.ts
- storeApiFetch
- cash.ts
- badge.tsx
- purchases.ts
- Finance.tsx
- useEditMode
- Toast.tsx
- ThemeCustomizer.tsx
- Pos.tsx
- command.tsx
- authMiddleware.ts
- components.json
- Layout.tsx
- compilerOptions
- FinancialStatements.tsx
- lib/utils.ts
- Cash.tsx
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- intelligence.ts
- settings.ts
- PaymentProof.tsx
- ErrorBoundary
- diag.ts
- hardenProductionUsers.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- StockMovementReport.tsx
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
- lib/i18n.ts
- @hookform/resolvers
- i18next
- jsonwebtoken
- restoreBackupFromBuffer
- motion
- multer
- papaparse
- pdfkit
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
- @types/node
- @types/pdfkit
- @types/cors
- ColorsPanel.tsx
- @types/geoip-lite
- @radix-ui/react-tabs
- AnimatedNumber.tsx
- @types/papaparse
- @types/bcryptjs
- @types/jsonwebtoken
- @types/multer
- apiFetch
- @radix-ui/react-toast
- ShopProductCard.tsx
- buildPixPayload
- @types/react-dom
- StoreSettings.tsx
- particles.tsx
- runManualBackup
- ReceiptModal.tsx
- @types/uuid
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
6. `db` - 47 edges
7. `useEditMode()` - 39 edges
8. `CardContent()` - 37 edges
9. `requireAuth()` - 37 edges
10. `requirePermission()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --calls--> `purgeOldOcrJobs()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts

## Import Cycles
- None detected.

## Communities (127 total, 57 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.08
Nodes (46): abandonedCarts, auditLogs, cashMovements, cashRegisterBalances, cashRegisters, deliveryItems, deliveryPaymentOverrides, deliverySerials (+38 more)

### Community 1 - "startServer"
Cohesion: 0.19
Nodes (12): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), initAutomaticBackupSchedule() (+4 more)

### Community 2 - "backupService.ts"
Cohesion: 0.14
Nodes (24): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, BackupSettings, checkPendingAutomaticBackupNow(), cleanupOldDropboxBackups() (+16 more)

### Community 3 - "index.ts"
Cohesion: 0.11
Nodes (20): client, configuredMax, db, logAction(), requireAuth(), isMaster(), requireMaster(), router (+12 more)

### Community 4 - "server.ts"
Cohesion: 0.10
Nodes (15): router, router, router, router, router, router, router, purgeOldOcrJobs() (+7 more)

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (53): AbandonedCarts, Archived, Backup, Customers, Email, Fiscal, Groups, Login (+45 more)

### Community 6 - "finance.ts"
Cohesion: 0.09
Nodes (35): accountMovements, financialAccounts, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules, MONEY_EPSILON (+27 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.10
Nodes (23): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, CategoriesPanel(), DraftCategory, DEFAULT_STEPS_KEYS, HowToBuyPanel() (+15 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/handler.ts, outputDirectory, rewrites, $schema

### Community 9 - "CommissionsReport.tsx"
Cohesion: 0.60
Nodes (4): CommissionsReport, CommissionsReport(), firstOfMonth(), today()

### Community 10 - "store.ts"
Cohesion: 0.06
Nodes (32): checks, handler(), safeMessage(), brandLogos, customerAddresses, customerWishlist, notifications, productGroupsDraft (+24 more)

### Community 11 - "api.ts"
Cohesion: 0.16
Nodes (22): CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps, Modal(), PurchaseItemRow() (+14 more)

### Community 12 - "cn"
Cohesion: 0.09
Nodes (33): DataTableProps, AnimatedGradientText(), AnimatedGradientTextProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+25 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.11
Nodes (22): Dashboard, brl(), RankingBars(), DisplayCurrencySelector(), AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey, Dashboard() (+14 more)

### Community 14 - "server/currency.ts"
Cohesion: 0.19
Nodes (13): currencies, formatAmount(), formatServerCurrency(), getServerCurrencySettings(), normalizeCurrencyMode(), normalizeExchangeRate(), number(), ServerCurrencyMode (+5 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.14
Nodes (14): MyAddresses, MyProfile, ResetPassword, storeApiFetch(), emptyForm, MyAddresses(), remove(), submit() (+6 more)

### Community 16 - "cash.ts"
Cohesion: 0.10
Nodes (21): companySettings, customers, expenseCategories, expenses, payments, productGroups, products, productSubgroups (+13 more)

### Community 17 - "badge.tsx"
Cohesion: 0.09
Nodes (26): AbcReport, Intelligence, Shortcuts, SimpleDeliveries, StoreOrders, Badge(), badgeVariants, AbcReport() (+18 more)

### Community 18 - "purchases.ts"
Cohesion: 0.14
Nodes (16): purchaseOcrJobs, purchaseOrderSerials, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency(), addCostLayer(), consumeFifo() (+8 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.08
Nodes (24): Analytics, Brands, Finance, Personal, compact(), DarkTooltip(), dayLabel(), FxSparkline() (+16 more)

### Community 20 - "useEditMode"
Cohesion: 0.10
Nodes (33): StoreCatalog, StoreEditor, Editable(), EditModeContext, EditModeProvider(), EditModeValue, useEditMode(), bannerElements() (+25 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.18
Nodes (16): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+8 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "Pos.tsx"
Cohesion: 0.07
Nodes (39): OrderStatus, Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, inputNumber() (+31 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "authMiddleware.ts"
Cohesion: 0.09
Nodes (22): permissions, rolePermissions, roles, stockTransferItems, stockTransfers, hideMasterLogsCondition, isMasterRole(), listRecentAuditLogs() (+14 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.12
Nodes (17): CashRegisterBadge(), CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn() (+9 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 30 - "lib/utils.ts"
Cohesion: 0.20
Nodes (6): BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, ShimmerButton, ShimmerButtonProps

### Community 31 - "Cash.tsx"
Cohesion: 0.16
Nodes (18): App(), Cash, CompanySettings, Currencies, CURRENCY_SYMBOL, currencyCode(), currencyLabel(), currencySymbol() (+10 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (8): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry, router

### Community 33 - "devDependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, drizzle-kit, devDependencies, autoprefixer, drizzle-kit, tailwindcss, tsx, @types/nodemailer (+7 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:check, build:vercel, clean, db:harden, db:local, db:push (+6 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 37 - "intelligence.ts"
Cohesion: 0.13
Nodes (17): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+9 more)

### Community 38 - "settings.ts"
Cohesion: 0.13
Nodes (13): fiscalSettings, printerSettings, systemSettings, cache, CacheEntry, clearApiCache(), getTtlMs(), inflight (+5 more)

### Community 39 - "PaymentProof.tsx"
Cohesion: 0.60
Nodes (4): onlyDigits(), PaymentProof(), PaymentProofProps, toWa()

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "diag.ts"
Cohesion: 0.67
Nodes (3): handler(), modulesToCheck, sanitize()

### Community 42 - "hardenProductionUsers.ts"
Cohesion: 0.83
Nodes (3): main(), requiredPassword(), updatePassword()

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.11
Nodes (26): AccountLayout, ShopLayout, formatCpf(), isFullName(), isValidCpf(), onlyDigits(), AccountAuth(), requestReset() (+18 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

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

### Community 63 - "lib/i18n.ts"
Cohesion: 0.11
Nodes (34): Purchases, Sales, AiReportModal(), AiReportModalProps, Money(), MoneyProps, CurrencyDisplayPart, dictionaries (+26 more)

### Community 67 - "restoreBackupFromBuffer"
Cohesion: 0.18
Nodes (12): backupsDir(), createLocalBackupFile(), exportDatabaseJson(), getPublicTables(), getTableColumnTypes(), getTableDependencies(), gzip, insertRestoreRows() (+4 more)

### Community 76 - "FontsPanel.tsx"
Cohesion: 0.31
Nodes (7): applyStoreFonts(), escapeCssString(), readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 99 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 102 - "AnimatedNumber.tsx"
Cohesion: 0.60
Nodes (3): AnimatedNumber(), AnimatedNumberProps, prefersReducedMotion()

### Community 107 - "apiFetch"
Cohesion: 0.11
Nodes (30): AuditLogs, PurchaseOcr, apiFetch(), extractList(), isPublicApi(), loadList(), redirectToLogin(), getBaseCurrency() (+22 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.10
Nodes (27): MyOrders, MyWishlist, StoreProduct, MyOrders(), statusClasses, MyWishlist(), CodeFlag(), FLAG_BY_CODE (+19 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 116 - "StoreSettings.tsx"
Cohesion: 0.40
Nodes (5): StoreSettings, brl(), emptyCoupon, emptyZone, StoreSettings()

### Community 117 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 118 - "runManualBackup"
Cohesion: 0.60
Nodes (5): getBackupSettings(), isDropboxConfigured(), normalizeBackupSettings(), runManualBackup(), saveBackupSettings()

### Community 119 - "ReceiptModal.tsx"
Cohesion: 0.53
Nodes (5): money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber()

## Knowledge Gaps
- **315 isolated node(s):** `modulesToCheck`, `checks`, `$schema`, `style`, `rsc` (+310 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 427 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `App.tsx`, `api.ts`, `apiFetch`, `badge.tsx`, `particles.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/utils.ts`, `lib/i18n.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `App.tsx`, `StoreHome.tsx`, `CommissionsReport.tsx`, `api.ts`, `Dashboard.tsx`, `StockMovementReport.tsx`, `badge.tsx`, `lib/i18n.ts`, `Finance.tsx`, `Pos.tsx`, `useEditMode`, `StoreSettings.tsx`, `ReceiptModal.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `Cash.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `finance.ts` to `store.ts`, `cash.ts`, `badge.tsx`, `Pos.tsx`, `Cash.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `modulesToCheck`, `checks`, `$schema` to the rest of the system?**
  _315 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08143839238498149 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11336032388663968 - nodes in this community are weakly interconnected._