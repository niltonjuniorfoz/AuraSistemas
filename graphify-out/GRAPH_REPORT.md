# Graph Report - AuraSistemas  (2026-09-02)

## Corpus Check
- 245 files · ~758,162 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1658 nodes · 4648 edges · 142 communities (74 shown, 62 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ec96a5c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema.ts
- runtime.js
- backupService.ts
- authMiddleware.ts
- elementCatalog.ts
- api.ts
- server.ts
- StoreHome.tsx
- vercel.json
- App.tsx
- store.ts
- Products.tsx
- cn
- Dashboard.tsx
- settings.ts
- storeApiFetch
- dashboard.ts
- badge.tsx
- cash.ts
- Analytics.tsx
- useEditMode
- Toast.tsx
- ThemeCustomizer.tsx
- money.ts
- command.tsx
- admin.ts
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
- main
- EditModeContext.tsx
- PaymentProof.tsx
- ErrorBoundary
- diag.ts
- hardenProductionUsers.ts
- ShopLayout.tsx
- Aura Sistemas
- package.json
- Setup rápido — trabalho em dupla
- Pos.tsx
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
- useStorePrefs
- PurchaseOcr.tsx
- express
- geoip-lite
- useAdminTranslation
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
- particles.tsx
- BannerPanel.tsx
- flagIcons.tsx
- @types/uuid
- @google/genai
- qrcode
- @radix-ui/react-select
- react
- convertCurrency
- getServerCurrencySettings
- formatServerCurrency
- consumeSaleLots
- apiPerformanceLogger
- getAiErrorInfo
- computeDre
- deleteDeadSaleRecords
- handler
- isMaster
- normalizeProductInput
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

## Communities (142 total, 62 thin omitted)

### Community 0 - "schema.ts"
Cohesion: 0.08
Nodes (47): abandonedCarts, accountMovements, auditLogs, cashMovements, cashRegisters, deliveryItems, deliveryPaymentOverrides, deliverySerials (+39 more)

### Community 1 - "runtime.js"
Cohesion: 0.02
Nodes (14): buscarProdutoImpl(), dayEndUtc(), formatBrl(), getAiClient(), getRecentAuditLogsForUser(), getTtlMs(), isMasterRole(), isMasterRole2() (+6 more)

### Community 2 - "backupService.ts"
Cohesion: 0.09
Nodes (42): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+34 more)

### Community 3 - "authMiddleware.ts"
Cohesion: 0.07
Nodes (44): client, configuredMax, db, expenseCategories, permissions, productGroups, productSubgroups, rolePermissions (+36 more)

### Community 4 - "elementCatalog.ts"
Cohesion: 0.16
Nodes (16): bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, ElementoCatalogo, ESTATICOS, getElemento() (+8 more)

### Community 5 - "api.ts"
Cohesion: 0.15
Nodes (26): Button(), buttonVariants, Card(), CardContent(), extractList(), PUBLIC_API_ENDPOINTS, Archived(), ArchiveType (+18 more)

### Community 6 - "server.ts"
Cohesion: 0.06
Nodes (63): loaded, loaded, loaded, app, app, app, handler(), rebuildApiUrl() (+55 more)

### Community 7 - "StoreHome.tsx"
Cohesion: 0.14
Nodes (14): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, SideBannerPanel(), TextPanel(), BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES (+6 more)

### Community 8 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/runtime.js, outputDirectory, rewrites, $schema

### Community 9 - "App.tsx"
Cohesion: 0.04
Nodes (47): AbandonedCarts, AbcReport, Analytics, Archived, AuditLogs, Backup, Brands, Cash (+39 more)

### Community 10 - "store.ts"
Cohesion: 0.07
Nodes (26): customerAddresses, customerWishlist, productGroupsDraft, productImages, storeNewsletterSubscribers, CustomerAuthRequest, hits, requireCustomerAuth() (+18 more)

### Community 11 - "Products.tsx"
Cohesion: 0.13
Nodes (26): BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, CompositionDonut(), ConfirmModal(), ConfirmModalProps (+18 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (31): DataTableProps, CardAction(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), DropdownMenu(), DropdownMenuCheckboxItem() (+23 more)

### Community 13 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (24): AiReportModal(), AiReportModalProps, AnimatedNumber(), AnimatedNumberProps, DisplayCurrencySelector(), prefersReducedMotion(), AVATAR_COLORS, CHART_METRIC_LABELS (+16 more)

### Community 14 - "settings.ts"
Cohesion: 0.10
Nodes (22): brandLogos, companySettings, currencies, emailSettings, fiscalSettings, printerSettings, systemSettings, formatAmount() (+14 more)

### Community 15 - "storeApiFetch"
Cohesion: 0.11
Nodes (21): AccountLayout, MyAddresses, MyProfile, ResetPassword, storeApiFetch(), AccountAuth(), requestReset(), submitLogin() (+13 more)

### Community 16 - "dashboard.ts"
Cohesion: 0.11
Nodes (27): costConsumptions, costLayers, customers, expenses, financialAccounts, fxRates, payables, personalExpenses (+19 more)

### Community 17 - "badge.tsx"
Cohesion: 0.09
Nodes (26): Shortcuts, Badge(), badgeVariants, AbcReport(), classStyle, firstOfMonth(), today(), brl() (+18 more)

### Community 18 - "cash.ts"
Cohesion: 0.13
Nodes (18): cashRegisterBalances, paymentMethodAccounts, CURRENCIES, Currency, CURRENCY_LABEL, isValidCurrency(), MONEY_EPSILON, findMasterByPassword() (+10 more)

### Community 19 - "Analytics.tsx"
Cohesion: 0.16
Nodes (13): brl(), compact(), DarkTooltip(), dayLabel(), FxSparkline(), RankingBars(), RevenueAreaChart(), Analytics() (+5 more)

### Community 20 - "useEditMode"
Cohesion: 0.17
Nodes (15): StoreCatalog, StoreEditor, Editable(), EditModeProvider(), useEditMode(), effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections() (+7 more)

### Community 21 - "Toast.tsx"
Cohesion: 0.27
Nodes (11): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+3 more)

### Community 22 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 23 - "money.ts"
Cohesion: 0.11
Nodes (17): OrderStatus, inputNumber(), PriceCurrencyInput(), PriceCurrencyInputProps, BaseCurrency, calcOrderTotal(), formatBrl(), parseMoneyInput() (+9 more)

### Community 24 - "command.tsx"
Cohesion: 0.13
Nodes (18): ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+10 more)

### Community 25 - "admin.ts"
Cohesion: 0.10
Nodes (21): app, loaded, notifications, stockTransferItems, stockTransfers, router, router, router (+13 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "Layout.tsx"
Cohesion: 0.12
Nodes (18): Login, CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn() (+10 more)

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
Cohesion: 0.11
Nodes (36): App(), money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), currencyCode(), CurrencyDisplayPart (+28 more)

### Community 32 - "auth.ts"
Cohesion: 0.14
Nodes (7): LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LoginAttempt, loginAttempts, ME_CACHE_TTL_MS, meCache, MeCacheEntry

### Community 33 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, embedded-postgres, esbuild, devDependencies, autoprefixer, embedded-postgres, esbuild, tsx (+9 more)

### Community 34 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, @fontsource-variable/inter, lucide-react, nodemailer, dependencies, bcryptjs, clsx (+5 more)

### Community 35 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:check, build:vercel, build:vercel:api, clean, db:harden, db:local (+7 more)

### Community 36 - "StockTransfers.tsx"
Cohesion: 0.35
Nodes (10): formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput(), todayIso() (+2 more)

### Community 37 - "main"
Cohesion: 0.47
Nodes (6): main(), pick(), r2(), r4(), rand(), randInt()

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

### Community 42 - "hardenProductionUsers.ts"
Cohesion: 0.83
Nodes (3): main(), requiredPassword(), updatePassword()

### Community 43 - "ShopLayout.tsx"
Cohesion: 0.17
Nodes (18): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), submitRegister(), Country, AssistantWidget(), ChatMsg (+10 more)

### Community 44 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 45 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 46 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 47 - "Pos.tsx"
Cohesion: 0.24
Nodes (15): Pos, defaultQuickCustomerForm, defaultShortcuts, getInitialActiveNote(), getInitialPosLayoutMode(), getMaxOpenNotes(), getTodayDateInputValue(), isTouchMobileViewport() (+7 more)

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

### Community 59 - "useStorePrefs"
Cohesion: 0.24
Nodes (11): MyOrders, MyWishlist, MyOrders(), statusClasses, MyWishlist(), remove(), CURRENCIES, defaultRates() (+3 more)

### Community 60 - "PurchaseOcr.tsx"
Cohesion: 0.26
Nodes (12): loadList(), CURRENCY_SYMBOL, getBaseCurrency(), PurchaseForm(), loadAll(), PurchaseImport(), loadAll(), ExtendedOcrItem (+4 more)

### Community 63 - "useAdminTranslation"
Cohesion: 0.13
Nodes (25): Money(), MoneyProps, formatDate(), SystemCurrency, useAdminTranslation, Finance(), fmtCur(), METHODS (+17 more)

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
Nodes (29): ProtectedRoute(), CashRegisterBadge(), NotificationBell(), toast, apiFetch(), isPublicApi(), redirectToLogin(), AbandonedCarts() (+21 more)

### Community 113 - "ShopProductCard.tsx"
Cohesion: 0.19
Nodes (16): StoreProduct, CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName(), translateStockStatus(), PremiumCta(), PremiumCtaProps (+8 more)

### Community 114 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 116 - "getStoreVitrineConfig"
Cohesion: 0.25
Nodes (8): getStoreConfigDraft(), getStoreVitrineConfig(), normalizeHeroCtaOrder(), normalizeHeroCtaSize(), normalizeStorePages(), normalizeStorePageSection(), normalizeStoreThemeColors(), normalizeStoreThemeFont()

### Community 117 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

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

### Community 132 - "getAiErrorInfo"
Cohesion: 0.67
Nodes (3): generateAiContent(), getAiErrorInfo(), sendFriendlyAiError()

## Knowledge Gaps
- **324 isolated node(s):** `app`, `loaded`, `loaded`, `loaded`, `loaded` (+319 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 513 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `StockTransfers.tsx`, `api.ts`, `EditModeContext.tsx`, `StoreHome.tsx`, `App.tsx`, `Products.tsx`, `Dashboard.tsx`, `Pos.tsx`, `badge.tsx`, `FinancialStatements.tsx`, `Analytics.tsx`, `useEditMode`, `command.tsx`, `Layout.tsx`, `PurchaseOcr.tsx`, `useAdminTranslation`, `lib/i18n.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `cash.ts` to `authMiddleware.ts`, `store.ts`, `badge.tsx`, `money.ts`, `lib/i18n.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `db` connect `authMiddleware.ts` to `auth.ts`, `schema.ts`, `backupService.ts`, `server.ts`, `hardenProductionUsers.ts`, `store.ts`, `settings.ts`, `dashboard.ts`, `cash.ts`, `admin.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `app`, `loaded`, `loaded` to the rest of the system?**
  _324 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07923497267759563 - nodes in this community are weakly interconnected._
- **Should `runtime.js` be split into smaller, more focused modules?**
  _Cohesion score 0.024859663191659984 - nodes in this community are weakly interconnected._
- **Should `backupService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413067552602436 - nodes in this community are weakly interconnected._