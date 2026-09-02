# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 235 files · ~686,719 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1454 nodes · 4187 edges · 121 communities (58 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b59a3de6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- elementCatalog.ts
- backupService.ts
- users.ts
- authMiddleware.ts
- App.tsx
- finance.ts
- StoreHome.tsx
- vercel.json
- PurchaseOcr.tsx
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- settings.ts
- storeApiFetch
- dashboard.ts
- purchases.ts
- Pos.tsx
- Analytics.tsx
- StoreEditor.tsx
- Toast.tsx
- ThemeCustomizer.tsx
- StockMovementReport.tsx
- command.tsx
- server.ts
- components.json
- Layout.tsx
- compilerOptions
- FinancialStatements.tsx
- lib/utils.ts
- lib/i18n.ts
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- products.ts
- ErrorBoundary
- ColorsPanel.tsx
- hardenProductionUsers.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- useAdminTranslation
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
- Login.tsx
- @hookform/resolvers
- i18next
- jsonwebtoken
- motion
- multer
- papaparse
- pdfkit
- postgres
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- main
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
- vercel-bootstrap.mjs
- @types/geoip-lite
- @radix-ui/react-tabs
- particles.tsx
- @types/papaparse
- drizzle-kit
- apiFetch
- @radix-ui/react-toast
- ShopProductCard.tsx
- buildPixPayload
- tailwindcss
- tsx
- Sales.tsx
- @types/uuid
- @google/genai
- qrcode
- @radix-ui/react-select
- react
- typescript

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

## Communities (121 total, 57 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (35): abandonedCarts, auditLogs, cashMovements, cashRegisterBalances, cashRegisters, customerAddresses, customerWishlist, deliveryItems (+27 more)

### Community 1 - "elementCatalog.ts"
Cohesion: 0.12
Nodes (25): StoreCatalog, Editable(), bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, effectiveCatalogoSections() (+17 more)

### Community 2 - "backupService.ts"
Cohesion: 0.09
Nodes (42): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+34 more)

### Community 3 - "users.ts"
Cohesion: 0.14
Nodes (17): productGroupsDraft, logAction(), cache, CacheEntry, clearApiCache(), getTtlMs(), inflight, withApiCache() (+9 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.14
Nodes (25): client, configuredMax, db, expenseCategories, permissions, rolePermissions, roles, shelves (+17 more)

### Community 5 - "App.tsx"
Cohesion: 0.06
Nodes (47): AccountLayout, Archived, AuditLogs, Backup, Customers, Email, Fiscal, Groups (+39 more)

### Community 6 - "finance.ts"
Cohesion: 0.14
Nodes (20): accountMovements, financialAccounts, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules, findMasterByPassword() (+12 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.09
Nodes (32): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, readFontFile(), EditModeContext, EditModeValue, useEditMode() (+24 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/handler.ts, outputDirectory, rewrites, $schema

### Community 9 - "PurchaseOcr.tsx"
Cohesion: 0.12
Nodes (23): ProductsFinancialReport, PurchaseForm, PurchaseImport, PurchaseOcr, AiReportModal(), AiReportModalProps, PurchaseItemRow(), useDebounce() (+15 more)

### Community 10 - "store.ts"
Cohesion: 0.09
Nodes (20): customers, storeOrders, CustomerAuthRequest, hits, requireCustomerAuth(), createNotification(), CATALOGO_SECTION_IDS, getStoreConfigDraft() (+12 more)

### Community 11 - "Products.tsx"
Cohesion: 0.17
Nodes (21): CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps, Modal(), QuickGroupModal() (+13 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (38): AbcReport, Dashboard, SimpleDeliveries, AnimatedNumber(), AnimatedNumberProps, DisplayCurrencySelector(), Money(), MoneyProps (+30 more)

### Community 14 - "settings.ts"
Cohesion: 0.09
Nodes (26): brandLogos, companySettings, currencies, emailLogs, emailSettings, fiscalSettings, printerSettings, printLogs (+18 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.11
Nodes (21): MyAddresses, storeApiFetch(), AccountAuth(), requestReset(), submitLogin(), Country, AccountLayout(), emptyForm (+13 more)

### Community 16 - "dashboard.ts"
Cohesion: 0.08
Nodes (29): costConsumptions, costLayers, expenses, fxRates, payments, productGroups, products, purchaseOrderItems (+21 more)

### Community 17 - "purchases.ts"
Cohesion: 0.14
Nodes (19): purchaseOcrJobs, purchaseOrderSerials, addCostLayer(), restoreSaleLayers(), round4(), router, fetchApiRates(), FX_PAIRS (+11 more)

### Community 18 - "Pos.tsx"
Cohesion: 0.16
Nodes (20): Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, defaultQuickCustomerForm, defaultShortcuts (+12 more)

### Community 19 - "Analytics.tsx"
Cohesion: 0.14
Nodes (15): Analytics, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars() (+7 more)

### Community 20 - "StoreEditor.tsx"
Cohesion: 0.29
Nodes (3): StoreEditor, EditModeProvider(), EditorToolbar()

### Community 21 - "Toast.tsx"
Cohesion: 0.14
Nodes (20): onlyDigits(), PaymentProof(), PaymentProofProps, toWa(), add(), emit(), getSnapshot(), items (+12 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "StockMovementReport.tsx"
Cohesion: 0.07
Nodes (29): OrderStatus, StockMovementReport, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl() (+21 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.07
Nodes (40): app, handler(), rebuildApiUrl(), applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv() (+32 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.16
Nodes (14): CashRegisterBadge(), CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn() (+6 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 30 - "lib/utils.ts"
Cohesion: 0.15
Nodes (8): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, ShimmerButton, ShimmerButtonProps

### Community 31 - "lib/i18n.ts"
Cohesion: 0.13
Nodes (30): App(), Cash, CompanySettings, Currencies, currencyCode(), CurrencyDisplayPart, currencyLabel(), currencySymbol() (+22 more)

### Community 32 - "auth.ts"
Cohesion: 0.14
Nodes (7): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry

### Community 33 - "devDependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, devDependencies, autoprefixer, @types/bcryptjs, @types/jsonwebtoken, @types/multer, @types/nodemailer, @types/react (+7 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:check, build:vercel, build:vercel:bootstrap, clean, db:harden, db:local (+7 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 37 - "products.ts"
Cohesion: 0.09
Nodes (23): productLots, productSubgroups, saleItemLots, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency(), consumeFifo() (+15 more)

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "hardenProductionUsers.ts"
Cohesion: 0.83
Nodes (3): main(), requiredPassword(), updatePassword()

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.15
Nodes (22): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), submitRegister(), AssistantWidget(), ChatMsg, applyStoreFonts() (+14 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "useAdminTranslation"
Cohesion: 0.15
Nodes (19): Finance, ProfitReport, Purchases, Receivables, formatDate(), useAdminTranslation, Finance(), fmtCur() (+11 more)

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

### Community 63 - "Login.tsx"
Cohesion: 0.38
Nodes (5): Login, STORE_FALLBACK_NAME, SYSTEM_BRAND, Login(), shouldShowMobileInstallIntro()

### Community 76 - "main"
Cohesion: 0.47
Nodes (6): main(), pick(), r2(), r4(), rand(), randInt()

### Community 99 - "vercel-bootstrap.mjs"
Cohesion: 0.28
Nodes (8): adminPasswordLength, hasStrongPassword(), masterPasswordLength, passwordLength(), report, run(), sanitize(), secrets

### Community 102 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 107 - "apiFetch"
Cohesion: 0.06
Nodes (51): AbandonedCarts, Brands, CommissionsReport, Intelligence, Notifications, ProductDetails, RealMarginReport, Shortcuts (+43 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.13
Nodes (20): MyOrders(), statusClasses, CodeFlag(), FLAG_BY_CODE, CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName() (+12 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 119 - "Sales.tsx"
Cohesion: 0.29
Nodes (9): Sales, money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), csvCell(), getTodayString() (+1 more)

## Knowledge Gaps
- **318 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+313 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 431 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `App.tsx`, `StoreHome.tsx`, `PurchaseOcr.tsx`, `Products.tsx`, `Dashboard.tsx`, `useAdminTranslation`, `Pos.tsx`, `Analytics.tsx`, `StockMovementReport.tsx`, `StoreEditor.tsx`, `Sales.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `App.tsx`, `particles.tsx`, `PurchaseOcr.tsx`, `Products.tsx`, `apiFetch`, `Dashboard.tsx`, `ThemeCustomizer.tsx`, `Sales.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/utils.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `StockMovementReport.tsx` to `schema.ts`, `finance.ts`, `store.ts`, `apiFetch`, `lib/i18n.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _318 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08653061224489796 - nodes in this community are weakly interconnected._
- **Should `elementCatalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12258064516129032 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413067552602436 - nodes in this community are weakly interconnected._