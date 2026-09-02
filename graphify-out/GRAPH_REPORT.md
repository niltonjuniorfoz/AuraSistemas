# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 233 files · ~686,156 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1438 nodes · 4165 edges · 120 communities (54 shown, 60 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de79b6a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- EditModeContext.tsx
- backupService.ts
- users.ts
- authMiddleware.ts
- App.tsx
- finance.ts
- StoreHome.tsx
- vercel.json
- apiFetch
- store.ts
- api.ts
- cn
- Dashboard.tsx
- settings.ts
- storeApiFetch
- index.ts
- ShopProductCard.tsx
- SimpleDeliveries.tsx
- Analytics.tsx
- products.ts
- Toast.tsx
- ThemeCustomizer.tsx
- money.ts
- command.tsx
- server.ts
- components.json
- Layout.tsx
- compilerOptions
- FinancialStatements.tsx
- particles.tsx
- useAdminTranslation
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- lib/utils.ts
- StockMovementReport.tsx
- StatusBadge
- ErrorBoundary
- ColorsPanel.tsx
- lib/i18n.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
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
- main
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
- ReceiptModal.tsx
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
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `initAutomaticBackupSchedule()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts

## Import Cycles
- None detected.

## Communities (120 total, 60 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (38): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisterBalances, cashRegisters, deliveryItems, deliveryPaymentOverrides (+30 more)

### Community 1 - "EditModeContext.tsx"
Cohesion: 0.09
Nodes (30): StoreCatalog, StoreEditor, Editable(), EditModeContext, EditModeProvider(), EditModeValue, bannerElements(), CampoPermitido (+22 more)

### Community 2 - "backupService.ts"
Cohesion: 0.10
Nodes (41): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+33 more)

### Community 3 - "users.ts"
Cohesion: 0.14
Nodes (17): logAction(), cache, CacheEntry, clearApiCache(), getTtlMs(), inflight, withApiCache(), router (+9 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.07
Nodes (32): expenseCategories, permissions, productGroups, productSubgroups, rolePermissions, roles, stockTransferItems, stockTransfers (+24 more)

### Community 5 - "App.tsx"
Cohesion: 0.06
Nodes (53): AbandonedCarts, Archived, AuditLogs, Backup, Brands, CompanySettings, Customers, Email (+45 more)

### Community 6 - "finance.ts"
Cohesion: 0.10
Nodes (28): financialAccounts, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules, MONEY_EPSILON, convertBrlToAccountCurrency() (+20 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.09
Nodes (31): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, readFontFile(), useEditMode(), CatalogoTituloPanel(), CategoriesPanel() (+23 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/[...path].ts, outputDirectory, rewrites, $schema

### Community 9 - "apiFetch"
Cohesion: 0.09
Nodes (37): Login, ProtectedRoute(), CashRegisterBadge(), NotificationBell(), apiFetch(), extractList(), AbandonedCarts(), Archived() (+29 more)

### Community 10 - "store.ts"
Cohesion: 0.06
Nodes (29): customerAddresses, customerWishlist, emailSettings, notifications, productGroupsDraft, productImages, storeNewsletterSubscribers, CustomerAuthRequest (+21 more)

### Community 11 - "api.ts"
Cohesion: 0.16
Nodes (20): CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps, Modal(), QuickGroupModal() (+12 more)

### Community 12 - "cn"
Cohesion: 0.11
Nodes (29): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+21 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.06
Nodes (47): CommissionsReport, Dashboard, Pos, ProductsFinancialReport, AiReportModal(), AiReportModalProps, DisplayCurrencySelector(), Money() (+39 more)

### Community 14 - "settings.ts"
Cohesion: 0.09
Nodes (25): brandLogos, companySettings, currencies, fiscalSettings, printerSettings, systemSettings, formatAmount(), formatServerCurrency() (+17 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.15
Nodes (13): MyAddresses, MyProfile, storeApiFetch(), emptyForm, MyAddresses(), remove(), submit(), MyProfile() (+5 more)

### Community 16 - "index.ts"
Cohesion: 0.09
Nodes (35): client, db, costConsumptions, costLayers, customers, expenses, fxRates, products (+27 more)

### Community 17 - "ShopProductCard.tsx"
Cohesion: 0.13
Nodes (25): MyOrders, MyWishlist, StoreProduct, MyOrders(), statusClasses, MyWishlist(), CATEGORY_TRANSLATIONS, resources (+17 more)

### Community 18 - "SimpleDeliveries.tsx"
Cohesion: 0.43
Nodes (6): SimpleDeliveries, dateOnly(), deliveryLabels, formatDeliveryAddress(), SimpleDeliveries(), todayIso()

### Community 19 - "Analytics.tsx"
Cohesion: 0.14
Nodes (15): Analytics, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars() (+7 more)

### Community 20 - "products.ts"
Cohesion: 0.10
Nodes (20): productLots, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency(), consumeFifo(), round2(), addLotStock() (+12 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.14
Nodes (20): onlyDigits(), PaymentProof(), PaymentProofProps, toWa(), add(), emit(), getSnapshot(), items (+12 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "money.ts"
Cohesion: 0.11
Nodes (17): OrderStatus, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl(), parseMoneyInput() (+9 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.09
Nodes (33): app, handler(), rebuildApiUrl(), applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv() (+25 more)

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

### Community 30 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 31 - "useAdminTranslation"
Cohesion: 0.08
Nodes (37): AbcReport, Finance, Payables, Purchases, RealMarginReport, Receivables, Sales, Shortcuts (+29 more)

### Community 32 - "auth.ts"
Cohesion: 0.14
Nodes (7): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry

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
Cohesion: 0.15
Nodes (8): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, ShimmerButton, ShimmerButtonProps

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "lib/i18n.ts"
Cohesion: 0.10
Nodes (36): App(), Cash, Currencies, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window (+28 more)

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.10
Nodes (28): AccountLayout, ShopLayout, formatCpf(), isFullName(), isValidCpf(), onlyDigits(), AccountAuth(), requestReset() (+20 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

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

### Community 63 - "main"
Cohesion: 0.47
Nodes (6): main(), pick(), r2(), r4(), rand(), randInt()

### Community 107 - "PurchaseOcr.tsx"
Cohesion: 0.27
Nodes (12): PurchaseOcr, loadList(), getBaseCurrency(), PurchaseForm(), loadAll(), PurchaseImport(), loadAll(), ExtendedOcrItem (+4 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 119 - "ReceiptModal.tsx"
Cohesion: 0.25
Nodes (8): AnimatedNumber(), AnimatedNumberProps, money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), prefersReducedMotion()

## Knowledge Gaps
- **311 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+306 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 424 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `lib/utils.ts`, `App.tsx`, `StatusBadge`, `apiFetch`, `api.ts`, `PurchaseOcr.tsx`, `SimpleDeliveries.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `particles.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `EditModeContext.tsx`, `StockTransfers.tsx`, `App.tsx`, `StockMovementReport.tsx`, `StoreHome.tsx`, `lib/i18n.ts`, `api.ts`, `PurchaseOcr.tsx`, `Dashboard.tsx`, `SimpleDeliveries.tsx`, `Analytics.tsx`, `ReceiptModal.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `finance.ts` to `schema.ts`, `App.tsx`, `lib/i18n.ts`, `store.ts`, `money.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _311 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09294199860237597 - nodes in this community are weakly interconnected._
- **Should `EditModeContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09268292682926829 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09639953542392567 - nodes in this community are weakly interconnected._