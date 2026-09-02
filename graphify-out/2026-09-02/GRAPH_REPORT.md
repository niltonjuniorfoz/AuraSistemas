# Graph Report - AuraSistemas  (2026-09-01)

## Corpus Check
- 231 files · ~428,139 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1399 nodes · 3910 edges · 113 communities (56 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `375ecdda`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- App.tsx
- backupService.ts
- index.ts
- server.ts
- api.ts
- cash.ts
- StoreHome.tsx
- lib/i18n.ts
- apiFetch
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- receipts.ts
- ShopLayout.tsx
- AuthRequest
- ShopProductCard.tsx
- elementCatalog.ts
- Finance.tsx
- products.ts
- Toast.tsx
- ThemeCustomizer.tsx
- money.ts
- command.tsx
- SimpleDeliveries.tsx
- components.json
- Layout.tsx
- compilerOptions
- FinancialStatements.tsx
- storeApiFetch
- Pos.tsx
- auth.ts
- devDependencies
- dependencies
- scripts
- StockTransfers.tsx
- lib/utils.ts
- StockMovementReport.tsx
- Money.tsx
- ErrorBoundary
- ColorsPanel.tsx
- Sales.tsx
- StoreEditor.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- buildPixPayload
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
- @google/genai
- @hookform/resolvers
- i18next
- jsonwebtoken
- autoprefixer
- motion
- multer
- papaparse
- pdfkit
- postgres
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
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
- App
- @radix-ui/react-toast

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 124 edges
2. `cn()` - 88 edges
3. `useAuthStore` - 58 edges
4. `Button()` - 54 edges
5. `Card()` - 49 edges
6. `db` - 46 edges
7. `useEditMode()` - 39 edges
8. `CardContent()` - 37 edges
9. `requireAuth()` - 37 edges
10. `requirePermission()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `StoreSettings()` --references--> `qrcode`  [EXTRACTED]
  src/pages/StoreSettings.tsx → package.json
- `lazyNamed()` --references--> `react`  [EXTRACTED]
  src/App.tsx → package.json
- `DataTable()` --references--> `react`  [EXTRACTED]
  src/components/DataTable.tsx → package.json
- `Finance()` --references--> `react`  [EXTRACTED]
  src/pages/Finance.tsx → package.json
- `Payables()` --references--> `react`  [EXTRACTED]
  src/pages/Payables.tsx → package.json

## Import Cycles
- None detected.

## Communities (113 total, 57 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.08
Nodes (42): abandonedCarts, customers, deliveryItems, deliveryPaymentOverrides, deliverySerials, deliveryTasks, expenseCategories, maintenanceLogs (+34 more)

### Community 1 - "App.tsx"
Cohesion: 0.03
Nodes (63): AbandonedCarts, AbcReport, AccountLayout, Analytics, Archived, AuditLogs, Backup, Brands (+55 more)

### Community 2 - "backupService.ts"
Cohesion: 0.06
Nodes (59): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), sqlClient (+51 more)

### Community 3 - "index.ts"
Cohesion: 0.10
Nodes (25): client, db, brandLogos, fiscalSettings, printerSettings, systemSettings, logAction(), cache (+17 more)

### Community 4 - "server.ts"
Cohesion: 0.09
Nodes (26): roles, stockTransferItems, stockTransfers, users, router, router, hideMasterLogsCondition, isMasterRole() (+18 more)

### Community 5 - "api.ts"
Cohesion: 0.12
Nodes (31): ProtectedRoute(), Button(), buttonVariants, Card(), CardContent(), ArchiveType, brl(), cur() (+23 more)

### Community 6 - "cash.ts"
Cohesion: 0.07
Nodes (36): accountMovements, cashMovements, cashRegisterBalances, cashRegisters, financialAccounts, fxRates, payables, paymentMethodAccounts (+28 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.10
Nodes (33): toast, BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), readFontFile(), EditModeContext, EditModeValue (+25 more)

### Community 8 - "lib/i18n.ts"
Cohesion: 0.12
Nodes (34): PurchaseItemRow(), useDebounce(), CURRENCY_SYMBOL, currencyCode(), CurrencyDisplayPart, currencyLabel(), currencySymbol(), dictionaries (+26 more)

### Community 9 - "apiFetch"
Cohesion: 0.11
Nodes (23): CashRegisterBadge(), NotificationBell(), badgeVariants, apiFetch(), extractList(), isPublicApi(), loadList(), PUBLIC_API_ENDPOINTS (+15 more)

### Community 10 - "store.ts"
Cohesion: 0.07
Nodes (28): customerAddresses, customerWishlist, emailSettings, notifications, productGroupsDraft, productImages, CustomerAuthRequest, hits (+20 more)

### Community 11 - "Products.tsx"
Cohesion: 0.13
Nodes (27): CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps, Modal(), QuickGroupModal() (+19 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.12
Nodes (22): AnimatedNumber(), AnimatedNumberProps, DisplayCurrencySelector(), prefersReducedMotion(), AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey, Dashboard() (+14 more)

### Community 14 - "receipts.ts"
Cohesion: 0.12
Nodes (21): companySettings, currencies, emailLogs, printLogs, saleItemLots, stockMovements, formatAmount(), formatServerCurrency() (+13 more)

### Community 15 - "ShopLayout.tsx"
Cohesion: 0.11
Nodes (24): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), AssistantWidget(), ChatMsg, applyStoreFonts(), escapeCssString() (+16 more)

### Community 16 - "AuthRequest"
Cohesion: 0.11
Nodes (20): auditLogs, expenses, storeOrders, storePageviews, dayEndUtc(), dayStartUtc(), router, AuthRequest (+12 more)

### Community 17 - "ShopProductCard.tsx"
Cohesion: 0.18
Nodes (18): MyOrders(), statusClasses, MyWishlist(), CATEGORY_TRANSLATIONS, resources, translateCategoryName(), translateStockStatus(), PremiumCta() (+10 more)

### Community 18 - "elementCatalog.ts"
Cohesion: 0.14
Nodes (23): Editable(), bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, effectiveCatalogoSections(), effectiveHomeSections() (+15 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.11
Nodes (19): brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars(), RevenueAreaChart(), Analytics() (+11 more)

### Community 20 - "products.ts"
Cohesion: 0.06
Nodes (43): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+35 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.17
Nodes (16): onlyDigits(), PaymentProof(), PaymentProofProps, toWa(), add(), emit(), getSnapshot(), items (+8 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "money.ts"
Cohesion: 0.11
Nodes (19): qrcode, qrcode, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl() (+11 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "SimpleDeliveries.tsx"
Cohesion: 0.53
Nodes (5): dateOnly(), deliveryLabels, formatDeliveryAddress(), SimpleDeliveries(), todayIso()

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.12
Nodes (18): react, react, lazyNamed(), CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock() (+10 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 29 - "FinancialStatements.tsx"
Cohesion: 0.23
Nodes (13): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort(), DreLine() (+5 more)

### Community 30 - "storeApiFetch"
Cohesion: 0.22
Nodes (11): storeApiFetch(), AccountAuth(), Country, AccountLayout(), emptyForm, MyAddresses(), MyProfile(), ResetPassword() (+3 more)

### Community 31 - "Pos.tsx"
Cohesion: 0.11
Nodes (30): BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, formatDate(), useAdminTranslation, Payables() (+22 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (8): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry, router

### Community 33 - "devDependencies"
Cohesion: 0.15
Nodes (13): drizzle-kit, devDependencies, drizzle-kit, @types/jsonwebtoken, @types/multer, @types/node, @types/pdfkit, @types/uuid (+5 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, build:check, clean, db:local, db:push, db:seed, db:studio (+4 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.35
Nodes (10): formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput(), todayIso() (+2 more)

### Community 37 - "lib/utils.ts"
Cohesion: 0.12
Nodes (13): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, Marquee(), MarqueeProps, Circle, hexToRgb() (+5 more)

### Community 38 - "StockMovementReport.tsx"
Cohesion: 0.31
Nodes (9): csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels, StockMovementReport() (+1 more)

### Community 39 - "Money.tsx"
Cohesion: 0.18
Nodes (13): AiReportModal(), AiReportModalProps, Money(), MoneyProps, SystemCurrency, AbcReport(), classStyle, firstOfMonth() (+5 more)

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "Sales.tsx"
Cohesion: 0.33
Nodes (8): money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), csvCell(), getTodayString(), Sales()

### Community 43 - "StoreEditor.tsx"
Cohesion: 0.17
Nodes (7): categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, EditModeProvider(), EditorToolbar(), SECAO(), StoreHome()

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

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

## Knowledge Gaps
- **364 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+359 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `money.ts`, `Layout.tsx`, `package.json`, `vite`, `class-variance-authority`, `cmdk`, `cors`, `date-fns`, `dotenv`, `drizzle-orm`, `express`, `geoip-lite`, `@google/genai`, `@hookform/resolvers`, `i18next`, `jsonwebtoken`, `motion`, `multer`, `papaparse`, `pdfkit`, `postgres`, `radix-ui`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, `react-dom`, `react-hook-form`, `react-i18next`, `react-router`, `recharts`, `tailwind-merge`, `@tailwindcss/vite`, `@tanstack/react-table`, `tw-animate-css`, `@types/qrcode`, `uuid`, `@vitejs/plugin-react`, `xlsx`, `zod`, `zustand`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `react` connect `Layout.tsx` to `Finance.tsx`, `dependencies`, `Products.tsx`, `Pos.tsx`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `App.tsx`, `api.ts`, `StoreHome.tsx`, `lib/i18n.ts`, `Products.tsx`, `Dashboard.tsx`, `Finance.tsx`, `Toast.tsx`, `command.tsx`, `SimpleDeliveries.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `Pos.tsx`, `StockTransfers.tsx`, `StockMovementReport.tsx`, `Money.tsx`, `Sales.tsx`, `StoreEditor.tsx`, `App`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _364 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07683000604960677 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059395801331285206 - nodes in this community are weakly interconnected._