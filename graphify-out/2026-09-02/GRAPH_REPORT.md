# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 234 files · ~686,424 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1444 nodes · 4176 edges · 124 communities (60 shown, 58 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00f4343a`
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
- SimpleDeliveries.tsx
- StockMovementReport.tsx
- PanelShell.tsx
- ErrorBoundary
- ColorsPanel.tsx
- hardenProductionUsers.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- @types/bcryptjs
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
- products.ts
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
- useCustomerAuthStore
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
- @types/geoip-lite
- @radix-ui/react-tabs
- @types/papaparse
- @types/react-dom
- BannerPanel.tsx
- apiFetch
- @radix-ui/react-toast
- ShopProductCard.tsx
- buildPixPayload
- FontsPanel.tsx
- AnimatedNumber.tsx
- @types/jsonwebtoken
- @types/multer
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

## Communities (124 total, 58 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (38): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisterBalances, cashRegisters, deliveryItems, deliveryPaymentOverrides (+30 more)

### Community 1 - "elementCatalog.ts"
Cohesion: 0.17
Nodes (17): bannerElements(), CampoPermitido, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections(), ESTATICOS (+9 more)

### Community 2 - "backupService.ts"
Cohesion: 0.09
Nodes (45): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+37 more)

### Community 3 - "users.ts"
Cohesion: 0.14
Nodes (17): logAction(), cache, CacheEntry, clearApiCache(), getTtlMs(), inflight, withApiCache(), router (+9 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.12
Nodes (25): client, configuredMax, db, permissions, productGroups, productSubgroups, rolePermissions, roles (+17 more)

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (51): AbandonedCarts, App(), Backup, Currencies, Email, Fiscal, Login, MasterPanel (+43 more)

### Community 6 - "finance.ts"
Cohesion: 0.12
Nodes (24): paymentMethodAccounts, personalCategories, profitDistributionRules, findMasterByPassword(), convertBrlToAccountCurrency(), convertCurrency(), METHOD_ACCOUNT_TYPES, postMovement() (+16 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.17
Nodes (12): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES, ProductSection(), ScrollArrows() (+4 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/handler.ts, outputDirectory, rewrites, $schema

### Community 9 - "PurchaseOcr.tsx"
Cohesion: 0.13
Nodes (21): AuditLogs, PurchaseForm, PurchaseImport, PurchaseOcr, PurchaseItemRow(), useDebounce(), extractList(), loadList() (+13 more)

### Community 10 - "store.ts"
Cohesion: 0.07
Nodes (28): customerAddresses, customerWishlist, notifications, productGroupsDraft, productImages, storeNewsletterSubscribers, CustomerAuthRequest, hits (+20 more)

### Community 11 - "Products.tsx"
Cohesion: 0.12
Nodes (25): Archived, Customers, Groups, Suppliers, Users, ConfirmModal(), ConfirmModalProps, HardDeleteModal() (+17 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.12
Nodes (20): Dashboard, DisplayCurrencySelector(), AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey, Dashboard(), feedMeta(), FULFILLMENT_LABEL (+12 more)

### Community 14 - "settings.ts"
Cohesion: 0.09
Nodes (24): brandLogos, companySettings, currencies, emailSettings, fiscalSettings, printerSettings, systemSettings, formatAmount() (+16 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.13
Nodes (16): MyAddresses, MyProfile, ResetPassword, storeApiFetch(), requestReset(), submitLogin(), emptyForm, MyAddresses() (+8 more)

### Community 16 - "AuthRequest"
Cohesion: 0.10
Nodes (32): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+24 more)

### Community 17 - "useStorePrefs"
Cohesion: 0.27
Nodes (10): MyOrders, MyWishlist, MyOrders(), statusClasses, MyWishlist(), CURRENCIES, defaultRates(), formatPrice() (+2 more)

### Community 18 - "badge.tsx"
Cohesion: 0.09
Nodes (25): AbcReport, Intelligence, Shortcuts, StoreOrders, StoreSettings, Badge(), badgeVariants, AbcReport() (+17 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.10
Nodes (22): Analytics, Finance, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline() (+14 more)

### Community 20 - "useEditMode"
Cohesion: 0.16
Nodes (15): StoreCatalog, StoreEditor, Editable(), EditModeContext, EditModeProvider(), EditModeValue, useEditMode(), Capacidade (+7 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.15
Nodes (18): onlyDigits(), PaymentProof(), PaymentProofProps, toWa(), add(), emit(), getSnapshot(), items (+10 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "Pos.tsx"
Cohesion: 0.06
Nodes (39): OrderStatus, Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, inputNumber() (+31 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.07
Nodes (38): app, handler(), rebuildApiUrl(), applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv() (+30 more)

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

### Community 30 - "lib/utils.ts"
Cohesion: 0.12
Nodes (13): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, Circle, hexToRgb() (+5 more)

### Community 31 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (46): Cash, CompanySettings, Purchases, Sales, CompositionDonut(), DataTable(), Money(), MoneyProps (+38 more)

### Community 32 - "auth.ts"
Cohesion: 0.14
Nodes (7): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry

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

### Community 37 - "SimpleDeliveries.tsx"
Cohesion: 0.43
Nodes (6): SimpleDeliveries, dateOnly(), deliveryLabels, formatDeliveryAddress(), SimpleDeliveries(), todayIso()

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 39 - "PanelShell.tsx"
Cohesion: 0.21
Nodes (9): DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell(), SideBannerPanel(), TextPanel(), brl(), Vitrine (+1 more)

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
Cohesion: 0.18
Nodes (15): ShopLayout, isFullName(), AssistantWidget(), ChatMsg, applyStoreFonts(), escapeCssString(), applyStoreColors(), EditableFooterText() (+7 more)

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

### Community 63 - "products.ts"
Cohesion: 0.07
Nodes (31): payables, productLots, purchaseOrderSerials, suppliers, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency() (+23 more)

### Community 76 - "useCustomerAuthStore"
Cohesion: 0.20
Nodes (11): AccountLayout, formatCpf(), isValidCpf(), onlyDigits(), AccountAuth(), submitRegister(), Country, AccountLayout() (+3 more)

### Community 106 - "BannerPanel.tsx"
Cohesion: 0.52
Nodes (5): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel()

### Community 107 - "apiFetch"
Cohesion: 0.11
Nodes (25): Brands, CommissionsReport, Notifications, CashRegisterBadge(), NotificationBell(), apiFetch(), isPublicApi(), PUBLIC_API_ENDPOINTS (+17 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.19
Nodes (16): StoreProduct, CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName(), translateStockStatus(), PremiumCta(), PremiumCtaProps (+8 more)

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
- **313 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+308 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 426 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `App.tsx`, `SimpleDeliveries.tsx`, `PurchaseOcr.tsx`, `badge.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/utils.ts`, `lib/i18n.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `App.tsx`, `SimpleDeliveries.tsx`, `StockMovementReport.tsx`, `StoreHome.tsx`, `PurchaseOcr.tsx`, `Products.tsx`, `Dashboard.tsx`, `badge.tsx`, `Finance.tsx`, `Pos.tsx`, `useEditMode`, `Toast.tsx`, `ReceiptModal.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `Pos.tsx` to `schema.ts`, `store.ts`, `badge.tsx`, `lib/i18n.ts`, `products.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _313 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08874912648497554 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08599290780141844 - nodes in this community are weakly interconnected._
- **Should `users.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1402116402116402 - nodes in this community are weakly interconnected._