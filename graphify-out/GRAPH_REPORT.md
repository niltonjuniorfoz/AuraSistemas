# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 235 files · ~686,612 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1451 nodes · 4183 edges · 128 communities (64 shown, 58 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48cdc618`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sales.ts
- elementCatalog.ts
- backupService.ts
- index.ts
- authMiddleware.ts
- App.tsx
- cash.ts
- StoreHome.tsx
- vercel.json
- PurchaseOcr.tsx
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- receipts.ts
- storeApiFetch
- AuthRequest
- useStorePrefs
- badge.tsx
- Finance.tsx
- useEditMode
- Toast.tsx
- ThemeCustomizer.tsx
- Pos.tsx
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
- schema.ts
- StockMovementReport.tsx
- EditModeContext.tsx
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
- flagIcons.tsx
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
- PaymentProof.tsx
- drizzle-kit
- BannerPanel.tsx
- apiFetch
- @radix-ui/react-toast
- ShopProductCard.tsx
- buildPixPayload
- FontsPanel.tsx
- AnimatedNumber.tsx
- tailwindcss
- tsx
- ReceiptModal.tsx
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
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --calls--> `purgeOldOcrJobs()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts

## Import Cycles
- None detected.

## Communities (128 total, 58 thin omitted)

### Community 0 - "sales.ts"
Cohesion: 0.08
Nodes (38): deliveryItems, deliverySerials, deliveryTasks, maintenanceLogs, productLots, productSerials, purchaseOcrJobs, purchaseOrderSerials (+30 more)

### Community 1 - "elementCatalog.ts"
Cohesion: 0.16
Nodes (16): bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, ElementoCatalogo, ESTATICOS, getElemento() (+8 more)

### Community 2 - "backupService.ts"
Cohesion: 0.07
Nodes (53): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), sqlClient (+45 more)

### Community 3 - "index.ts"
Cohesion: 0.11
Nodes (21): client, configuredMax, db, stockMovements, logAction(), cache, CacheEntry, clearApiCache() (+13 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.10
Nodes (22): auditLogs, deliveryPaymentOverrides, roles, supplierInvoiceFiles, users, hideMasterLogsCondition, isMasterRole(), listRecentAuditLogs() (+14 more)

### Community 5 - "App.tsx"
Cohesion: 0.09
Nodes (48): AbandonedCarts, Archived, AuditLogs, Backup, CompanySettings, Currencies, Email, Fiscal (+40 more)

### Community 6 - "cash.ts"
Cohesion: 0.07
Nodes (35): accountMovements, cashMovements, cashRegisterBalances, cashRegisters, financialAccounts, payables, paymentMethodAccounts, personalCategories (+27 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.14
Nodes (14): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, SideBannerPanel(), TextPanel(), BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES (+6 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/handler.ts, outputDirectory, rewrites, $schema

### Community 9 - "PurchaseOcr.tsx"
Cohesion: 0.27
Nodes (12): PurchaseOcr, loadList(), getBaseCurrency(), PurchaseForm(), loadAll(), PurchaseImport(), loadAll(), ExtendedOcrItem (+4 more)

### Community 10 - "store.ts"
Cohesion: 0.07
Nodes (26): customerAddresses, customerWishlist, notifications, productGroupsDraft, productImages, storeNewsletterSubscribers, storeOrders, CustomerAuthRequest (+18 more)

### Community 11 - "Products.tsx"
Cohesion: 0.14
Nodes (22): Customers, Groups, Products, Suppliers, Users, ConfirmModal(), ConfirmModalProps, HardDeleteModal() (+14 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (27): Dashboard, ProfitReport, AiReportModal(), AiReportModalProps, DisplayCurrencySelector(), Money(), MoneyProps, SystemCurrency (+19 more)

### Community 14 - "receipts.ts"
Cohesion: 0.16
Nodes (15): emailLogs, printLogs, formatAmount(), formatServerCurrency(), getServerCurrencySettings(), normalizeCurrencyMode(), normalizeExchangeRate(), number() (+7 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.11
Nodes (21): AccountLayout, MyAddresses, MyProfile, ResetPassword, storeApiFetch(), AccountAuth(), requestReset(), submitLogin() (+13 more)

### Community 16 - "AuthRequest"
Cohesion: 0.12
Nodes (26): costConsumptions, costLayers, customers, expenses, fxRates, payments, products, purchaseOrderItems (+18 more)

### Community 17 - "useStorePrefs"
Cohesion: 0.24
Nodes (11): MyOrders, MyWishlist, MyOrders(), statusClasses, MyWishlist(), remove(), CURRENCIES, defaultRates() (+3 more)

### Community 18 - "badge.tsx"
Cohesion: 0.08
Nodes (30): AbcReport, Notifications, Shortcuts, SimpleDeliveries, StoreOrders, StoreSettings, Badge(), badgeVariants (+22 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.07
Nodes (28): Analytics, App(), Brands, Finance, Personal, brl(), compact(), DarkTooltip() (+20 more)

### Community 20 - "useEditMode"
Cohesion: 0.17
Nodes (15): StoreCatalog, StoreEditor, Editable(), EditModeProvider(), useEditMode(), effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections() (+7 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.27
Nodes (11): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+3 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "Pos.tsx"
Cohesion: 0.07
Nodes (36): OrderStatus, Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, inputNumber() (+28 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.09
Nodes (41): app, handler(), rebuildApiUrl(), router, router, router, router, router (+33 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.18
Nodes (13): CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn(), getStoredPosLayoutMode() (+5 more)

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
Cohesion: 0.12
Nodes (30): Cash, StockModal(), StockModalProps, CURRENCY_SYMBOL, currencyCode(), CurrencyDisplayPart, currencyLabel(), currencySymbol() (+22 more)

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

### Community 37 - "schema.ts"
Cohesion: 0.09
Nodes (21): abandonedCarts, brandLogos, companySettings, currencies, emailSettings, expenseCategories, fiscalSettings, permissions (+13 more)

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 39 - "EditModeContext.tsx"
Cohesion: 0.18
Nodes (11): EditModeContext, EditModeValue, CategoriesPanel(), DraftCategory, DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell() (+3 more)

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
Cohesion: 0.17
Nodes (18): ShopLayout, formatCpf(), isFullName(), isValidCpf(), onlyDigits(), calcOrderTotal(), submitRegister(), Country (+10 more)

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
Cohesion: 0.16
Nodes (19): Payables, Purchases, Receivables, Sales, CompositionDonut(), DataTable(), formatDate(), useAdminTranslation (+11 more)

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
Cohesion: 0.40
Nodes (5): push, report, run(), sanitize(), secrets

### Community 102 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 104 - "PaymentProof.tsx"
Cohesion: 0.60
Nodes (4): onlyDigits(), PaymentProof(), PaymentProofProps, toWa()

### Community 106 - "BannerPanel.tsx"
Cohesion: 0.52
Nodes (5): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel()

### Community 107 - "apiFetch"
Cohesion: 0.11
Nodes (23): CommissionsReport, CashRegisterBadge(), NotificationBell(), apiFetch(), isPublicApi(), redirectToLogin(), AbandonedCarts(), CommissionsReport() (+15 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.16
Nodes (18): StoreProduct, CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName(), translateStockStatus(), PremiumCta(), PremiumCtaProps (+10 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 115 - "FontsPanel.tsx"
Cohesion: 0.40
Nodes (5): readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 116 - "AnimatedNumber.tsx"
Cohesion: 0.60
Nodes (3): AnimatedNumber(), AnimatedNumberProps, prefersReducedMotion()

### Community 119 - "ReceiptModal.tsx"
Cohesion: 0.53
Nodes (5): money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber()

## Knowledge Gaps
- **317 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+312 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 430 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `App.tsx`, `particles.tsx`, `PurchaseOcr.tsx`, `useAdminTranslation`, `badge.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/utils.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `App.tsx`, `StockMovementReport.tsx`, `EditModeContext.tsx`, `StoreHome.tsx`, `PurchaseOcr.tsx`, `Products.tsx`, `Dashboard.tsx`, `useAdminTranslation`, `badge.tsx`, `Finance.tsx`, `Pos.tsx`, `useEditMode`, `ReceiptModal.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `cash.ts` to `badge.tsx`, `store.ts`, `lib/i18n.ts`, `Pos.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _317 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sales.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07619738751814223 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06801346801346801 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11336032388663968 - nodes in this community are weakly interconnected._