# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 235 files · ~686,258 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1445 nodes · 4096 edges · 124 communities (60 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68b54c07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sales.ts
- server.ts
- backupService.ts
- index.ts
- schema.ts
- App.tsx
- finance.ts
- StoreHome.tsx
- vercel.json
- card.tsx
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- receipts.ts
- storeApiFetch
- AuthRequest
- Shortcuts.tsx
- Pos.tsx
- Finance.tsx
- useEditMode
- Toast.tsx
- ThemeCustomizer.tsx
- money.ts
- command.tsx
- authMiddleware.ts
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
- purchases.ts
- AbcReport.tsx
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
- useAdminTranslation
- @hookform/resolvers
- i18next
- jsonwebtoken
- performance.ts
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
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --calls--> `initAutomaticBackupSchedule()`  [EXTRACTED]
  server.ts → src/server/backupService.ts

## Import Cycles
- None detected.

## Communities (124 total, 57 thin omitted)

### Community 0 - "sales.ts"
Cohesion: 0.07
Nodes (33): cashMovements, cashRegisterBalances, cashRegisters, customers, payments, productLots, saleItemLots, MONEY_EPSILON (+25 more)

### Community 1 - "server.ts"
Cohesion: 0.14
Nodes (19): applyProductionSecurityHeaders(), buildCorsOptions(), ensureRuntimeSchema(), ensureTransferChecklistSchema(), resetMasterPasswordFromEnv(), runRuntimeDbTask(), startServer(), router (+11 more)

### Community 2 - "backupService.ts"
Cohesion: 0.10
Nodes (41): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+33 more)

### Community 3 - "index.ts"
Cohesion: 0.08
Nodes (29): client, configuredMax, db, fiscalSettings, printerSettings, products, stockMovements, logAction() (+21 more)

### Community 4 - "schema.ts"
Cohesion: 0.11
Nodes (33): abandonedCarts, auditLogs, deliveryItems, deliveryPaymentOverrides, deliverySerials, deliveryTasks, expenseCategories, maintenanceLogs (+25 more)

### Community 5 - "App.tsx"
Cohesion: 0.05
Nodes (38): AbandonedCarts, AccountLayout, App(), Backup, Cash, CompanySettings, Customers, Fiscal (+30 more)

### Community 6 - "finance.ts"
Cohesion: 0.08
Nodes (36): accountMovements, financialAccounts, fxRates, payables, paymentMethodAccounts, personalCategories, personalExpenses, profitDistributionRules (+28 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.11
Nodes (20): categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, DEFAULT_STEPS_KEYS, HowToBuyPanel(), stepsFromDraft(), PanelShell(), SideBannerPanel() (+12 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/handler.ts, outputDirectory, rewrites, $schema

### Community 9 - "card.tsx"
Cohesion: 0.13
Nodes (22): Brands, CommissionsReport, Intelligence, Notifications, Button(), buttonVariants, Card(), CardContent() (+14 more)

### Community 10 - "store.ts"
Cohesion: 0.06
Nodes (32): brandLogos, customerAddresses, customerWishlist, emailSettings, notifications, productGroupsDraft, productImages, storeNewsletterSubscribers (+24 more)

### Community 11 - "Products.tsx"
Cohesion: 0.11
Nodes (32): StoreOrders, StoreSettings, CompositionDonut(), ConfirmModal(), ConfirmModalProps, DataTable(), HardDeleteModal(), HardDeleteModalProps (+24 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.12
Nodes (20): Dashboard, DisplayCurrencySelector(), AVATAR_COLORS, CHART_METRIC_LABELS, ChartMetricKey, Dashboard(), feedMeta(), FULFILLMENT_LABEL (+12 more)

### Community 14 - "receipts.ts"
Cohesion: 0.15
Nodes (17): companySettings, currencies, emailLogs, printLogs, formatAmount(), formatServerCurrency(), getServerCurrencySettings(), normalizeCurrencyMode() (+9 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.12
Nodes (20): MyAddresses, storeApiFetch(), AccountAuth(), requestReset(), submitLogin(), AccountLayout(), emptyForm, MyAddresses() (+12 more)

### Community 16 - "AuthRequest"
Cohesion: 0.12
Nodes (15): expenses, sales, storePageviews, dayEndUtc(), dayStartUtc(), router, AuthRequest, getRecentAuditLogsForUser() (+7 more)

### Community 17 - "Shortcuts.tsx"
Cohesion: 0.33
Nodes (6): Shortcuts, badgeVariants, actionDescriptions, defaultShortcuts, reservedKeys, Shortcuts()

### Community 18 - "Pos.tsx"
Cohesion: 0.24
Nodes (15): Pos, defaultQuickCustomerForm, defaultShortcuts, getInitialActiveNote(), getInitialPosLayoutMode(), getMaxOpenNotes(), getTodayDateInputValue(), isTouchMobileViewport() (+7 more)

### Community 19 - "Finance.tsx"
Cohesion: 0.10
Nodes (22): Analytics, Finance, Personal, brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline() (+14 more)

### Community 20 - "useEditMode"
Cohesion: 0.11
Nodes (31): Editable(), EditModeContext, EditModeProvider(), EditModeValue, useEditMode(), bannerElements(), CampoPermitido, Capacidade (+23 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.15
Nodes (19): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+11 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "money.ts"
Cohesion: 0.11
Nodes (17): OrderStatus, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl(), parseMoneyInput() (+9 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "authMiddleware.ts"
Cohesion: 0.10
Nodes (16): stockTransferItems, stockTransfers, router, getCachedPermission(), getPermissionCacheTtlMs(), isPrivilegedRole(), permissionCache, PermissionCacheEntry (+8 more)

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
Cohesion: 0.10
Nodes (36): Currencies, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, PurchaseItemRow(), useDebounce() (+28 more)

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

### Community 37 - "purchases.ts"
Cohesion: 0.09
Nodes (26): main(), pick(), r2(), r4(), rand(), randInt(), costConsumptions, costLayers (+18 more)

### Community 38 - "AbcReport.tsx"
Cohesion: 0.47
Nodes (5): AbcReport, AbcReport(), classStyle, firstOfMonth(), today()

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
Cohesion: 0.16
Nodes (20): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), submitRegister(), Country, AssistantWidget(), ChatMsg (+12 more)

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

### Community 63 - "useAdminTranslation"
Cohesion: 0.13
Nodes (23): ProductsFinancialReport, Sales, SimpleDeliveries, AiReportModal(), AiReportModalProps, Money(), MoneyProps, formatDate() (+15 more)

### Community 67 - "performance.ts"
Cohesion: 0.83
Nodes (3): apiPerformanceLogger(), asNumber(), redactUrl()

### Community 76 - "FontsPanel.tsx"
Cohesion: 0.31
Nodes (7): applyStoreFonts(), escapeCssString(), readFontFile(), EMPTY_FONT, FontSlot(), FontsPanel(), FontValue

### Community 102 - "AnimatedNumber.tsx"
Cohesion: 0.60
Nodes (3): AnimatedNumber(), AnimatedNumberProps, prefersReducedMotion()

### Community 107 - "apiFetch"
Cohesion: 0.07
Nodes (52): Archived, AuditLogs, Email, Printers, ProductsCatalogReport, ProtectedRoute(), Purchases, CashRegisterBadge() (+44 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.11
Nodes (25): MyOrders(), statusClasses, CodeFlag(), FLAG_BY_CODE, CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName() (+17 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 119 - "ReceiptModal.tsx"
Cohesion: 0.53
Nodes (5): money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber()

## Knowledge Gaps
- **314 isolated node(s):** `modulesToCheck`, `$schema`, `style`, `rsc`, `tsx` (+309 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 428 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `App.tsx`, `StoreHome.tsx`, `card.tsx`, `Products.tsx`, `Dashboard.tsx`, `Shortcuts.tsx`, `Pos.tsx`, `Finance.tsx`, `useEditMode`, `Toast.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/i18n.ts`, `StockTransfers.tsx`, `AbcReport.tsx`, `StockMovementReport.tsx`, `useAdminTranslation`, `ReceiptModal.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `StockTransfers.tsx`, `card.tsx`, `Products.tsx`, `apiFetch`, `Shortcuts.tsx`, `ThemeCustomizer.tsx`, `command.tsx`, `Layout.tsx`, `FinancialStatements.tsx`, `lib/utils.ts`, `useAdminTranslation`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `sales.ts` to `finance.ts`, `store.ts`, `Products.tsx`, `money.ts`, `lib/i18n.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `modulesToCheck`, `$schema`, `style` to the rest of the system?**
  _314 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sales.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06763285024154589 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09639953542392567 - nodes in this community are weakly interconnected._