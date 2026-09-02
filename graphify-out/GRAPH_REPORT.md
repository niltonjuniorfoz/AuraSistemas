# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 231 files · ~685,549 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1400 nodes · 3905 edges · 116 communities (58 shown, 58 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ad24e08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- App.tsx
- backupService.ts
- index.ts
- authMiddleware.ts
- useAuthStore
- cash.ts
- StoreHome.tsx
- Pos.tsx
- apiFetch
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- settings.ts
- ShopLayout.tsx
- AuthRequest
- ShopProductCard.tsx
- useEditMode
- charts.tsx
- products.ts
- Toast.tsx
- ThemeCustomizer.tsx
- qrcode
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
- badge.tsx
- ErrorBoundary
- ColorsPanel.tsx
- lib/i18n.ts
- main
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
- @types/node
- buildPixPayload
- bcryptjs

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

## Communities (116 total, 58 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.09
Nodes (45): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisters, deliveryItems, deliveryPaymentOverrides, deliverySerials (+37 more)

### Community 1 - "App.tsx"
Cohesion: 0.03
Nodes (63): AbandonedCarts, AbcReport, AccountLayout, Analytics, Archived, AuditLogs, Backup, Brands (+55 more)

### Community 2 - "backupService.ts"
Cohesion: 0.07
Nodes (53): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), sqlClient (+45 more)

### Community 3 - "index.ts"
Cohesion: 0.10
Nodes (25): client, db, notifications, productGroupsDraft, logAction(), cache, CacheEntry, clearApiCache() (+17 more)

### Community 4 - "authMiddleware.ts"
Cohesion: 0.10
Nodes (25): customers, permissions, productGroups, productSubgroups, rolePermissions, roles, users, router (+17 more)

### Community 5 - "useAuthStore"
Cohesion: 0.13
Nodes (28): ProtectedRoute(), AiReportModal(), AiReportModalProps, Button(), buttonVariants, Card(), CardContent(), Login() (+20 more)

### Community 6 - "cash.ts"
Cohesion: 0.08
Nodes (28): cashRegisterBalances, financialAccounts, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules, CURRENCIES (+20 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.09
Nodes (29): toast, BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), categoryIcon(), ICON_BY_KEY, ICON_OPTIONS (+21 more)

### Community 8 - "Pos.tsx"
Cohesion: 0.07
Nodes (37): BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps (+29 more)

### Community 9 - "apiFetch"
Cohesion: 0.12
Nodes (27): CashRegisterBadge(), NotificationBell(), apiFetch(), extractList(), isPublicApi(), loadList(), PUBLIC_API_ENDPOINTS, redirectToLogin() (+19 more)

### Community 10 - "store.ts"
Cohesion: 0.08
Nodes (24): customerAddresses, customerWishlist, productImages, storeNewsletterSubscribers, CustomerAuthRequest, hits, requireCustomerAuth(), router (+16 more)

### Community 11 - "Products.tsx"
Cohesion: 0.16
Nodes (20): CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps, Modal(), PurchaseItemRow() (+12 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.09
Nodes (30): AnimatedNumber(), AnimatedNumberProps, DisplayCurrencySelector(), Money(), MoneyProps, SystemCurrency, prefersReducedMotion(), CommissionsReport() (+22 more)

### Community 14 - "settings.ts"
Cohesion: 0.09
Nodes (25): brandLogos, companySettings, currencies, emailSettings, fiscalSettings, printerSettings, systemSettings, formatAmount() (+17 more)

### Community 15 - "ShopLayout.tsx"
Cohesion: 0.15
Nodes (21): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), AccountAuth(), Country, AccountLayout(), MyProfile() (+13 more)

### Community 16 - "AuthRequest"
Cohesion: 0.13
Nodes (18): expenseCategories, expenses, products, storePageviews, dayEndUtc(), dayStartUtc(), router, AuthRequest (+10 more)

### Community 17 - "ShopProductCard.tsx"
Cohesion: 0.12
Nodes (25): storeApiFetch(), emptyForm, MyAddresses(), MyOrders(), statusClasses, MyWishlist(), CATEGORY_TRANSLATIONS, resources (+17 more)

### Community 18 - "useEditMode"
Cohesion: 0.11
Nodes (29): Editable(), EditModeProvider(), useEditMode(), bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS (+21 more)

### Community 19 - "charts.tsx"
Cohesion: 0.16
Nodes (13): brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars(), RevenueAreaChart(), Analytics() (+5 more)

### Community 20 - "products.ts"
Cohesion: 0.18
Nodes (11): addCostLayer(), consumeFifo(), restoreSaleLayers(), round2(), round4(), router, generateAiContent(), getAiErrorInfo() (+3 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.24
Nodes (12): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+4 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "qrcode"
Cohesion: 0.67
Nodes (3): qrcode, qrcode, PixQr()

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "server.ts"
Cohesion: 0.10
Nodes (15): stockTransferItems, stockTransfers, router, router, router, purgeOldOcrJobs(), router, router (+7 more)

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

### Community 30 - "FontsPanel.tsx"
Cohesion: 0.31
Nodes (7): applyStoreFonts(), escapeCssString(), readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 31 - "useAdminTranslation"
Cohesion: 0.18
Nodes (16): formatDate(), setBrlExchangeRate(), useAdminTranslation, Finance(), fmtCur(), METHODS, PAIR_LABEL, TYPE_ICON (+8 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (8): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry, router

### Community 33 - "devDependencies"
Cohesion: 0.15
Nodes (13): autoprefixer, drizzle-kit, devDependencies, autoprefixer, drizzle-kit, @types/jsonwebtoken, @types/multer, @types/pdfkit (+5 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, @fontsource-variable/inter, @google/genai, lucide-react, nodemailer, dependencies, clsx, @fontsource-variable/inter (+5 more)

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

### Community 39 - "badge.tsx"
Cohesion: 0.09
Nodes (25): Badge(), badgeVariants, AbcReport(), classStyle, firstOfMonth(), today(), brl(), cur() (+17 more)

### Community 40 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 41 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 42 - "lib/i18n.ts"
Cohesion: 0.12
Nodes (32): money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), currencyCode(), CurrencyDisplayPart, currencyLabel() (+24 more)

### Community 43 - "main"
Cohesion: 0.47
Nodes (6): main(), pick(), r2(), r4(), rand(), randInt()

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

### Community 63 - "purchases.ts"
Cohesion: 0.09
Nodes (26): costConsumptions, costLayers, fxRates, purchaseOrderItems, purchaseOrders, purchaseOrderSerials, supplierInvoiceFiles, suppliers (+18 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

## Knowledge Gaps
- **364 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+359 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `qrcode`, `Layout.tsx`, `package.json`, `vite`, `class-variance-authority`, `cmdk`, `cors`, `date-fns`, `dotenv`, `drizzle-orm`, `express`, `geoip-lite`, `@hookform/resolvers`, `i18next`, `jsonwebtoken`, `motion`, `multer`, `papaparse`, `pdfkit`, `postgres`, `radix-ui`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, `react-dom`, `react-hook-form`, `react-i18next`, `react-router`, `recharts`, `tailwind-merge`, `@tailwindcss/vite`, `@tanstack/react-table`, `tw-animate-css`, `@types/qrcode`, `uuid`, `@vitejs/plugin-react`, `xlsx`, `zod`, `zustand`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`, `bcryptjs`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `react` connect `Layout.tsx` to `dependencies`, `Products.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `apiFetch` to `App.tsx`, `StockTransfers.tsx`, `useAuthStore`, `StockMovementReport.tsx`, `badge.tsx`, `Pos.tsx`, `StoreHome.tsx`, `lib/i18n.ts`, `App`, `Products.tsx`, `Dashboard.tsx`, `useEditMode`, `charts.tsx`, `Toast.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `useAdminTranslation`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _364 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09085213032581453 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06801346801346801 - nodes in this community are weakly interconnected._