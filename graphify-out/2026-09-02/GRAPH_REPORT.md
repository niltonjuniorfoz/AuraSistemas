# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 233 files · ~686,203 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1439 nodes · 4166 edges · 127 communities (63 shown, 58 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e221d8b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- elementCatalog.ts
- backupService.ts
- products.ts
- authMiddleware.ts
- api.ts
- cash.ts
- StoreHome.tsx
- vercel.json
- apiFetch
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- settings.ts
- storeApiFetch
- requireAuth
- ShopProductCard.tsx
- index.ts
- EditModeContext.tsx
- useEditMode
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
- lib/i18n.ts
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- PremiumCta.tsx
- StockMovementReport.tsx
- CategoriesPanel.tsx
- ErrorBoundary
- ColorsPanel.tsx
- Pos.tsx
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- useCustomerAuthStore
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
- purchases.ts
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
- AccountAuth.tsx
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
- themeStore.ts
- @types/cors
- Login.tsx
- @types/geoip-lite
- @radix-ui/react-tabs
- @types/nodemailer
- @types/papaparse
- @types/react
- @types/react-dom
- BannerPanel.tsx
- App.tsx
- @radix-ui/react-toast
- store/i18n.ts
- buildPixPayload
- FontsPanel.tsx
- AnimatedNumber.tsx
- @types/jsonwebtoken
- @types/multer
- Sales.tsx
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
6. `db` - 46 edges
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

## Communities (127 total, 58 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (44): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisters, deliveryItems, deliveryPaymentOverrides, deliverySerials (+36 more)

### Community 1 - "elementCatalog.ts"
Cohesion: 0.17
Nodes (17): bannerElements(), CampoPermitido, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections(), ESTATICOS (+9 more)

### Community 2 - "backupService.ts"
Cohesion: 0.09
Nodes (42): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+34 more)

### Community 3 - "products.ts"
Cohesion: 0.08
Nodes (27): logAction(), AuthRequest, cache, CacheEntry, clearApiCache(), getTtlMs(), inflight, withApiCache() (+19 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.12
Nodes (22): expenseCategories, permissions, productGroups, productSubgroups, rolePermissions, roles, users, router (+14 more)

### Community 5 - "api.ts"
Cohesion: 0.12
Nodes (30): ProfitReport, ProtectedRoute(), Reports, AiReportModal(), AiReportModalProps, Button(), buttonVariants, Card() (+22 more)

### Community 6 - "cash.ts"
Cohesion: 0.06
Nodes (42): cashRegisterBalances, financialAccounts, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules, CURRENCIES (+34 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.15
Nodes (13): Marquee(), MarqueeProps, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES, ProductSection() (+5 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/[...path].ts, outputDirectory, rewrites, $schema

### Community 9 - "apiFetch"
Cohesion: 0.08
Nodes (44): AuditLogs, PurchaseForm, CashRegisterBadge(), NotificationBell(), PurchaseItemRow(), useDebounce(), QuickGroupModal(), QuickSubgroupModal() (+36 more)

### Community 10 - "store.ts"
Cohesion: 0.10
Nodes (22): productGroupsDraft, productImages, storeNewsletterSubscribers, CustomerAuthRequest, requireCustomerAuth(), deleteDeadSaleRecords(), CATALOGO_SECTION_IDS, evaluateCoupon() (+14 more)

### Community 11 - "Products.tsx"
Cohesion: 0.13
Nodes (26): StoreOrders, StoreSettings, CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps (+18 more)

### Community 12 - "cn"
Cohesion: 0.09
Nodes (35): Shortcuts, DataTableProps, AnimatedGradientText(), AnimatedGradientTextProps, badgeVariants, CardAction(), CardDescription(), CardFooter() (+27 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (35): Analytics, Dashboard, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline() (+27 more)

### Community 14 - "settings.ts"
Cohesion: 0.08
Nodes (27): brandLogos, companySettings, currencies, emailSettings, expenses, fiscalSettings, printerSettings, systemSettings (+19 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.16
Nodes (13): MyAddresses, storeApiFetch(), requestReset(), submitLogin(), emptyForm, MyAddresses(), remove(), submit() (+5 more)

### Community 16 - "requireAuth"
Cohesion: 0.15
Nodes (11): products, storePageviews, dayEndUtc(), dayStartUtc(), router, requireAuth(), getRecentAuditLogsForUser(), hideMasterLogsCondition (+3 more)

### Community 17 - "ShopProductCard.tsx"
Cohesion: 0.24
Nodes (14): BorderBeam(), BorderBeamProps, MyOrders(), statusClasses, MyWishlist(), translateCategoryName(), translateStockStatus(), PremiumCta() (+6 more)

### Community 18 - "index.ts"
Cohesion: 0.13
Nodes (10): client, db, customerAddresses, customers, customerWishlist, notifications, hits, createNotification() (+2 more)

### Community 19 - "EditModeContext.tsx"
Cohesion: 0.19
Nodes (8): toast, EditModeContext, EditModeProvider(), EditModeValue, brl(), Vitrine, VitrinesPanel(), EditorToolbar()

### Community 20 - "useEditMode"
Cohesion: 0.31
Nodes (9): Editable(), useEditMode(), Capacidade, ElementoCatalogo, InlineActions, InlineToolbar(), CatalogoTituloPanel(), SECAO() (+1 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.18
Nodes (15): onlyDigits(), PaymentProof(), PaymentProofProps, toWa(), add(), emit(), getSnapshot(), items (+7 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.18
Nodes (11): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+3 more)

### Community 23 - "money.ts"
Cohesion: 0.11
Nodes (17): OrderStatus, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl(), parseMoneyInput() (+9 more)

### Community 24 - "command.tsx"
Cohesion: 0.12
Nodes (19): ACTIONS, CommandTrigger(), Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput() (+11 more)

### Community 25 - "server.ts"
Cohesion: 0.08
Nodes (31): app, handler(), rebuildApiUrl(), applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv() (+23 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.19
Nodes (12): CommandPalette(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn(), getStoredPosLayoutMode(), Layout() (+4 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 30 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 31 - "lib/i18n.ts"
Cohesion: 0.06
Nodes (62): AbcReport, Cash, Finance, Purchases, RealMarginReport, Receivables, SimpleDeliveries, Money() (+54 more)

### Community 32 - "auth.ts"
Cohesion: 0.14
Nodes (7): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry

### Community 33 - "devDependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, drizzle-kit, devDependencies, autoprefixer, drizzle-kit, @types/bcryptjs, @types/express, @types/node (+7 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, build:check, build:vercel, clean, db:local, db:push, db:seed (+5 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 37 - "PremiumCta.tsx"
Cohesion: 0.40
Nodes (4): ShimmerButton, ShimmerButtonProps, PremiumCtaProps, SIZE_CLASSES

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 39 - "CategoriesPanel.tsx"
Cohesion: 0.22
Nodes (8): CategoriesPanel(), DraftCategory, DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell(), SideBannerPanel(), TextPanel()

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "Pos.tsx"
Cohesion: 0.16
Nodes (20): Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, defaultQuickCustomerForm, defaultShortcuts (+12 more)

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.17
Nodes (18): isFullName(), applyStoreFonts(), escapeCssString(), applyStoreColors(), EditableFooterText(), getVisitorId(), normalizeInstagramUrl(), ShopLayout() (+10 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "useCustomerAuthStore"
Cohesion: 0.33
Nodes (6): AccountLayout, AccountLayout(), ResetPassword(), CustomerAuthState, StoreCustomer, useCustomerAuthStore

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

### Community 63 - "purchases.ts"
Cohesion: 0.10
Nodes (26): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+18 more)

### Community 76 - "AccountAuth.tsx"
Cohesion: 0.33
Nodes (6): formatCpf(), isValidCpf(), onlyDigits(), AccountAuth(), submitRegister(), Country

### Community 97 - "themeStore.ts"
Cohesion: 0.22
Nodes (8): ColorPreset, Container, DEFAULTS, Density, Direction, LayoutPreset, ThemeMode, ThemeState

### Community 99 - "Login.tsx"
Cohesion: 0.38
Nodes (5): Login, STORE_FALLBACK_NAME, SYSTEM_BRAND, Login(), shouldShowMobileInstallIntro()

### Community 106 - "BannerPanel.tsx"
Cohesion: 0.52
Nodes (5): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel()

### Community 107 - "App.tsx"
Cohesion: 0.05
Nodes (40): AbandonedCarts, App(), Archived, Backup, Brands, CommissionsReport, CompanySettings, Currencies (+32 more)

### Community 113 - "store/i18n.ts"
Cohesion: 0.29
Nodes (5): AssistantWidget(), ChatMsg, CATEGORY_TRANSLATIONS, resources, storefrontLanguage

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 115 - "FontsPanel.tsx"
Cohesion: 0.40
Nodes (5): readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 116 - "AnimatedNumber.tsx"
Cohesion: 0.60
Nodes (3): AnimatedNumber(), AnimatedNumberProps, prefersReducedMotion()

### Community 119 - "Sales.tsx"
Cohesion: 0.21
Nodes (13): Sales, money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), csvCell(), FulfillmentBadge() (+5 more)

## Knowledge Gaps
- **312 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+307 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 425 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `api.ts`, `StockMovementReport.tsx`, `CategoriesPanel.tsx`, `StoreHome.tsx`, `Pos.tsx`, `App.tsx`, `Products.tsx`, `Dashboard.tsx`, `cn`, `EditModeContext.tsx`, `Sales.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `api.ts`, `PremiumCta.tsx`, `StoreHome.tsx`, `apiFetch`, `Products.tsx`, `ShopProductCard.tsx`, `ThemeCustomizer.tsx`, `Sales.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `particles.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `cash.ts` to `store.ts`, `Products.tsx`, `lib/i18n.ts`, `money.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _312 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09085213032581453 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413067552602436 - nodes in this community are weakly interconnected._
- **Should `products.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08309178743961353 - nodes in this community are weakly interconnected._