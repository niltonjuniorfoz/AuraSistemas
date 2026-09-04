# Graph Report - AuraSistemas  (2026-09-04)

## Corpus Check
- 254 files · ~774,460 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1806 nodes · 4990 edges · 141 communities (80 shown, 55 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `203e5429`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runtime.js
- App.tsx
- authMiddleware.ts
- sales.ts
- schema.ts
- elementCatalog.ts
- lib/i18n.ts
- server.ts
- commerceGuards.ts
- store.ts
- backupService.ts
- cn
- card.tsx
- button.tsx
- cash.ts
- ShopProductCard.tsx
- Dashboard.tsx
- ShopLayout.tsx
- CheckoutPage.tsx
- useEditMode
- ThemeCustomizer.tsx
- CommandPalette.tsx
- Analytics.tsx
- EditModeContext.tsx
- useStorePrefs
- Pos.tsx
- settings.ts
- ollama.ts
- components.json
- Layout.tsx
- compilerOptions
- particles.tsx
- Sales.tsx
- Toast.tsx
- devDependencies
- FinancialStatements.tsx
- scripts
- auth.ts
- main
- processImageWithOllama
- restoreBackupFromBuffer
- dependencies
- "src/server/fx.ts"
- StockTransfers.tsx
- apiFetch
- checkPendingAutomaticBackupNow
- StoreHome.tsx
- useCustomerAuthStore
- approvePurchaseOrder
- getStoreVitrineConfig
- ErrorBoundary
- vercel.json
- package.json
- Aura Sistemas
- ColorsPanel.tsx
- Setup rápido — trabalho em dupla
- StoreHeaderEnhancements.tsx
- convertCurrency
- getServerCurrencySettings
- formatServerCurrency
- storeApiFetch
- ERP Complete Audit Skill
- buildPixPayload
- diag.ts
- consumeSaleLots
- local-db.mjs
- hardenProductionUsers.ts
- StockMovementReport.tsx
- vite
- AGENTS.md
- SideBannerPanel.tsx
- class-variance-authority
- cmdk
- cors
- date-fns
- dotenv
- SectionsPanel.tsx
- drizzle-orm
- express
- @fontsource-variable/inter
- @hookform/resolvers
- i18next
- jsonwebtoken
- lucide-react
- motion
- nodemailer
- OrderStatus.tsx
- transfers.ts
- PaymentProof.tsx
- radix-ui
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-select
- @radix-ui/react-separator
- papaparse
- @radix-ui/react-tabs
- readCurrencyConfig
- @radix-ui/react-tooltip
- apiPerformanceLogger
- react-dom
- react-hook-form
- react-i18next
- formatBrl
- recharts
- tailwind-merge
- @tailwindcss/vite
- @tanstack/react-table
- ensureFirstPurchaseCoupon
- @types/qrcode
- uuid
- @vitejs/plugin-react
- xlsx
- zod
- zustand
- tailwindcss
- @types/bcryptjs
- @types/express
- @types/geoip-lite
- @types/jsonwebtoken
- @types/nodemailer
- @types/papaparse
- @types/pdfkit
- @types/react-dom
- @types/uuid
- typescript
- StoreCoupons.tsx
- Intelligence.tsx
- drizzle-kit
- postgres
- qrcode
- @radix-ui/react-slot
- @radix-ui/react-toast
- react
- react-router
- tw-animate-css

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 137 edges
2. `cn()` - 89 edges
3. `useAuthStore` - 60 edges
4. `Button()` - 55 edges
5. `Card()` - 50 edges
6. `db` - 49 edges
7. `useEditMode()` - 40 edges
8. `requireAuth()` - 39 edges
9. `requirePermission()` - 39 edges
10. `CardContent()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `checkPendingAutomaticBackupNow()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `initAutomaticBackupSchedule()`  [EXTRACTED]
  server.ts → src/server/backupService.ts
- `startServer()` --calls--> `purgeOldCanceledSales()`  [EXTRACTED]
  server.ts → src/server/maintenance.ts
- `startServer()` --indirect_call--> `apiPerformanceLogger()`  [INFERRED]
  server.ts → src/server/performance.ts
- `startServer()` --indirect_call--> `markResponseStart()`  [INFERRED]
  server.ts → src/server/performance.ts

## Import Cycles
- None detected.

## Communities (141 total, 55 thin omitted)

### Community 0 - "runtime.js"
Cohesion: 0.02
Nodes (20): computeDre(), dayEndUtc(), deleteDeadSaleRecords(), getRecentAuditLogsForUser(), getTtlMs(), handler(), isMaster(), isMasterRole() (+12 more)

### Community 1 - "App.tsx"
Cohesion: 0.05
Nodes (55): Archived, Backup, CheckoutPage, CompanySettings, Customers, Email, Fiscal, Groups (+47 more)

### Community 2 - "authMiddleware.ts"
Cohesion: 0.09
Nodes (36): client, configuredMax, db, permissions, productGroups, productSubgroups, rolePermissions, roles (+28 more)

### Community 3 - "sales.ts"
Cohesion: 0.08
Nodes (38): deliveryItems, deliveryPaymentOverrides, deliverySerials, deliveryTasks, maintenanceLogs, productLots, purchaseOcrJobs, purchaseOrderSerials (+30 more)

### Community 4 - "schema.ts"
Cohesion: 0.12
Nodes (32): abandonedCarts, costConsumptions, costLayers, customers, expenseCategories, expenses, financialAccounts, fxRates (+24 more)

### Community 5 - "elementCatalog.ts"
Cohesion: 0.18
Nodes (15): Editable(), bannerElements(), CampoPermitido, Capacidade, DEFAULT_CATALOGO_SECTIONS, DEFAULT_HOME_SECTIONS, ElementoCatalogo, ESTATICOS (+7 more)

### Community 6 - "lib/i18n.ts"
Cohesion: 0.09
Nodes (35): App(), Cash, Currencies, StockModal(), StockModalProps, CURRENCY_SYMBOL, BaseCurrency, currencyCode() (+27 more)

### Community 7 - "server.ts"
Cohesion: 0.07
Nodes (58): app, loaded, loaded, loaded, app, app, handler(), rebuildApiUrl() (+50 more)

### Community 8 - "commerceGuards.ts"
Cohesion: 0.20
Nodes (9): storeCoupons, CouponPolicy, CouponPolicyMap, ensureFirstPurchaseCoupon(), operationsGuardRouter, publicStoreGuardRouter, readCouponPolicies(), storeCouponsAdminRouter (+1 more)

### Community 9 - "store.ts"
Cohesion: 0.06
Nodes (28): customerAddresses, customerWishlist, productGroupsDraft, productImages, storeNewsletterSubscribers, CustomerAuthRequest, hits, requireCustomerAuth() (+20 more)

### Community 10 - "backupService.ts"
Cohesion: 0.09
Nodes (42): sqlClient, assertOriginBackupPayload(), BACKUP_SETTINGS_KEY, BackupRestoreResult, BackupRunResult, backupsDir(), BackupSettings, checkPendingAutomaticBackupNow() (+34 more)

### Community 11 - "cn"
Cohesion: 0.06
Nodes (37): AnimatedGradientText(), AnimatedGradientTextProps, BorderBeam(), BorderBeamProps, CardAction(), CardDescription(), CardFooter(), CardHeader() (+29 more)

### Community 12 - "card.tsx"
Cohesion: 0.07
Nodes (49): AbcReport, CommissionsReport, Finance, SimpleDeliveries, SystemSettings, AiReportModal(), AiReportModalProps, FxSparkline() (+41 more)

### Community 13 - "button.tsx"
Cohesion: 0.09
Nodes (44): Notifications, Shortcuts, StoreSettings, compact(), CompositionDonut(), DarkTooltip(), dayLabel(), RevenueAreaChart() (+36 more)

### Community 14 - "cash.ts"
Cohesion: 0.08
Nodes (31): accountMovements, cashMovements, cashRegisterBalances, cashRegisters, paymentMethodAccounts, profitDistributionRules, CURRENCIES, Currency (+23 more)

### Community 15 - "ShopProductCard.tsx"
Cohesion: 0.16
Nodes (21): CATEGORY_TRANSLATIONS, resources, storefrontLanguage, translateCategoryName(), translateStockStatus(), PremiumCta(), PremiumCtaProps, SIZE_CLASSES (+13 more)

### Community 16 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (26): Dashboard, AnimatedNumber(), AnimatedNumberProps, brl(), RankingBars(), DisplayCurrencySelector(), prefersReducedMotion(), AVATAR_COLORS (+18 more)

### Community 17 - "ShopLayout.tsx"
Cohesion: 0.21
Nodes (13): AssistantWidget(), ChatMsg, applyStoreFonts(), escapeCssString(), applyStoreColors(), getVisitorId(), normalizeInstagramUrl(), ShopLayout() (+5 more)

### Community 18 - "CheckoutPage.tsx"
Cohesion: 0.17
Nodes (19): formatCpf(), isFullName(), isValidCpf(), onlyDigits(), calcOrderTotal(), formatBrl(), parseMoneyInput(), round2() (+11 more)

### Community 19 - "useEditMode"
Cohesion: 0.14
Nodes (18): readFontFile(), useEditMode(), CategoriesPanel(), DraftCategory, EMPTY_FONT, FontSlot(), FontsPanel(), FontValue (+10 more)

### Community 20 - "ThemeCustomizer.tsx"
Cohesion: 0.11
Nodes (19): COLOR_PRESETS, LAYOUTS, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+11 more)

### Community 21 - "CommandPalette.tsx"
Cohesion: 0.12
Nodes (19): AdminExchangeBadge(), ACTIONS, Nav, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput() (+11 more)

### Community 22 - "Analytics.tsx"
Cohesion: 0.28
Nodes (5): Analytics, Analytics(), fmtDuration(), intFmt(), PERIODS

### Community 23 - "EditModeContext.tsx"
Cohesion: 0.16
Nodes (12): StoreCatalog, StoreEditor, EditModeContext, EditModeProvider(), EditModeValue, applyCatalogTitleColor(), CatalogoTituloPanel(), normalizeColor() (+4 more)

### Community 24 - "useStorePrefs"
Cohesion: 0.19
Nodes (11): MyOrders, MyOrders(), statusClasses, basePriceToBrl(), CURRENCIES, CurrencyConfig, formatBrlPrice(), normalizeCodes() (+3 more)

### Community 25 - "Pos.tsx"
Cohesion: 0.11
Nodes (27): Pos, BarcodeDetectorLike, BarcodeScannerModal(), BarcodeScannerModalProps, loadHtml5Qrcode(), Window, ceilAuto(), CurrencyConfig (+19 more)

### Community 26 - "settings.ts"
Cohesion: 0.07
Nodes (33): brandLogos, companySettings, currencies, emailLogs, emailSettings, fiscalSettings, printerSettings, printLogs (+25 more)

### Community 27 - "ollama.ts"
Cohesion: 0.17
Nodes (19): normalizeOcrResult(), OcrResult, processImageWithOllama(), processInvoiceOcr(), processPdfWithOllama(), extractJsonObject(), getOllamaBaseUrl(), getOllamaErrorInfo() (+11 more)

### Community 28 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 29 - "Layout.tsx"
Cohesion: 0.15
Nodes (15): CommandPalette(), CommandTrigger(), buttons, GlobalCalculator(), HeaderClock(), pad(), cn(), getStoredPosLayoutMode() (+7 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 31 - "particles.tsx"
Cohesion: 0.47
Nodes (5): Circle, hexToRgb(), MousePosition, Particles(), ParticlesProps

### Community 32 - "Sales.tsx"
Cohesion: 0.29
Nodes (9): Sales, money(), onlyDigits(), ReceiptModal(), ReceiptModalProps, toWhatsAppNumber(), csvCell(), getTodayString() (+1 more)

### Community 33 - "Toast.tsx"
Cohesion: 0.27
Nodes (11): add(), emit(), getSnapshot(), items, listeners, remove(), STYLE, subscribe() (+3 more)

### Community 34 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, embedded-postgres, esbuild, devDependencies, autoprefixer, embedded-postgres, esbuild, tsx (+9 more)

### Community 35 - "FinancialStatements.tsx"
Cohesion: 0.21
Nodes (14): FinancialStatements, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), brl(), brlShort() (+6 more)

### Community 36 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:check, build:vercel, build:vercel:api, clean, db:harden, db:local (+7 more)

### Community 37 - "auth.ts"
Cohesion: 0.09
Nodes (22): loaded, app, auditLogs, hideMasterLogsCondition, isMasterRole(), listRecentAuditLogs(), router, LOGIN_MAX_ATTEMPTS (+14 more)

### Community 38 - "main"
Cohesion: 0.47
Nodes (6): main(), pick(), r2(), r4(), rand(), randInt()

### Community 39 - "processImageWithOllama"
Cohesion: 0.16
Nodes (14): extractJsonObject(), getOllamaBaseUrl(), getOllamaErrorInfo(), getOllamaModel(), isOllamaConfigured(), normalizeBaseUrl(), normalizeOcrResult(), ollamaChat() (+6 more)

### Community 40 - "restoreBackupFromBuffer"
Cohesion: 0.17
Nodes (13): assertOriginBackupPayload(), backupsDir(), createLocalBackupFile(), exportDatabaseJson(), getPublicTables(), getTableColumnTypes(), getTableDependencies(), insertRestoreRows() (+5 more)

### Community 41 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, clsx, geoip-lite, multer, dependencies, bcryptjs, clsx, geoip-lite (+5 more)

### Community 42 - ""src/server/fx.ts""
Cohesion: 0.17
Nodes (12): fetchApiRates(), getCachedPermission(), getPermissionCacheTtlMs(), isPrivilegedRole(), logAction(), requireAuth(), requirePermission(), resolveRates() (+4 more)

### Community 43 - "StockTransfers.tsx"
Cohesion: 0.30
Nodes (11): StockTransfers, formatDate(), formatFileSize(), initialForm(), isLate(), isPdfInvoice(), StockTransfers(), toDateInput() (+3 more)

### Community 44 - "apiFetch"
Cohesion: 0.10
Nodes (35): AbandonedCarts, AuditLogs, Brands, PurchaseImport, CashRegisterBadge(), NotificationBell(), PurchaseItemRow(), useDebounce() (+27 more)

### Community 45 - "checkPendingAutomaticBackupNow"
Cohesion: 0.15
Nodes (19): checkPendingAutomaticBackupNow(), cleanupOldDropboxBackups(), failedAttemptIsCoolingDown(), formatDropboxError(), getBackupSettings(), getDropboxFolder(), getScheduledDateForToday(), isDropboxConfigured() (+11 more)

### Community 46 - "StoreHome.tsx"
Cohesion: 0.17
Nodes (12): StoreHome, categoryIcon(), ICON_BY_KEY, ICON_OPTIONS, BANNER_SIZE_CLASSES, CTA_SIZE_CLASSES, ProductSection(), ScrollArrows() (+4 more)

### Community 47 - "useCustomerAuthStore"
Cohesion: 0.20
Nodes (9): AccountLayout, MyProfile, ResetPassword, AccountAuth(), AccountLayout(), ResetPassword(), CustomerAuthState, StoreCustomer (+1 more)

### Community 48 - "approvePurchaseOrder"
Cohesion: 0.29
Nodes (8): addCostLayer(), addLotStock(), approvePurchaseOrder(), cancelSaleTx(), createPayableForPurchase(), restoreSaleLayers(), restoreSaleLots(), syncStoreOrderFromSale()

### Community 49 - "getStoreVitrineConfig"
Cohesion: 0.25
Nodes (8): getStoreConfigDraft(), getStoreVitrineConfig(), normalizeHeroCtaOrder(), normalizeHeroCtaSize(), normalizeStorePages(), normalizeStorePageSection(), normalizeStoreThemeColors(), normalizeStoreThemeFont()

### Community 50 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, buildCommand, functions, api/runtime.js, outputDirectory, rewrites, $schema

### Community 52 - "package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 53 - "Aura Sistemas"
Cohesion: 0.29
Nodes (6): Aura Sistemas, Como Instalar e Rodar, Configuração do Ambiente (.env), Login Inicial Padrão, Principais Comandos, Tecnologias e Arquitetura

### Community 54 - "ColorsPanel.tsx"
Cohesion: 0.52
Nodes (5): ColorsPanel(), contrastRatio(), DEFAULT_STORE_COLORS, relativeLuminance(), STORE_COLOR_TOKENS

### Community 55 - "Setup rápido — trabalho em dupla"
Cohesion: 0.33
Nodes (5): 1. Clonar e entrar na branch, 2. Instalar e rodar, 3. Variáveis de ambiente, 4. Regra de trabalho, Setup rápido — trabalho em dupla

### Community 56 - "StoreHeaderEnhancements.tsx"
Cohesion: 0.06
Nodes (47): isStorefrontPath(), resetStoreScroller(), saveActionLabel(), scrollDashboardContentToTop(), ScrollToTop(), CodeFlag(), FLAG_BY_CODE, ATTRIBUTES (+39 more)

### Community 57 - "convertCurrency"
Cohesion: 0.40
Nodes (5): convertBrlToAccountCurrency(), convertCurrency(), postMovement(), reverseSaleMovements(), routePayment()

### Community 58 - "getServerCurrencySettings"
Cohesion: 0.40
Nodes (5): ensureCompanySettingsCompat2(), getReceiptData(), getServerCurrencySettings(), normalizeCurrencyMode(), normalizeExchangeRate()

### Community 59 - "formatServerCurrency"
Cohesion: 0.40
Nodes (5): formatAmount(), formatServerCurrency(), generateA4Doc(), loadImageBuffer(), number()

### Community 60 - "storeApiFetch"
Cohesion: 0.14
Nodes (15): MyAddresses, MyWishlist, storeApiFetch(), requestReset(), submitLogin(), emptyForm, MyAddresses(), remove() (+7 more)

### Community 61 - "ERP Complete Audit Skill"
Cohesion: 0.40
Nodes (4): 1. Corretude e Links (Routing Integrity), 2. C�digo Fantasma (Dead Code Elimination), 3. Caminhos Corretos (Fluxo de Venda), ERP Complete Audit Skill

### Community 62 - "buildPixPayload"
Cohesion: 0.70
Nodes (4): buildPixPayload(), crc16(), field(), onlyAscii()

### Community 63 - "diag.ts"
Cohesion: 0.67
Nodes (3): handler(), modulesToCheck, sanitize()

### Community 64 - "consumeSaleLots"
Cohesion: 0.50
Nodes (4): consumeFifo(), consumeLotStock(), consumeSaleLots(), markSaleDelivered()

### Community 65 - "local-db.mjs"
Cohesion: 0.50
Nodes (3): dataDir, __dirname, pg

### Community 66 - "hardenProductionUsers.ts"
Cohesion: 0.83
Nodes (3): main(), requiredPassword(), updatePassword()

### Community 67 - "StockMovementReport.tsx"
Cohesion: 0.27
Nodes (10): StockMovementReport, csvCell(), directionClasses, directionLabels, formatDateTime(), monthStart(), movementBadgeVariant(), movementLabels (+2 more)

### Community 68 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 70 - "SideBannerPanel.tsx"
Cohesion: 0.38
Nodes (7): BANNER_COMPRESS_OPTS, compressImage(), loadImage(), readFile(), BannerPanel(), FALLBACKS, SideBannerPanel()

### Community 76 - "SectionsPanel.tsx"
Cohesion: 0.36
Nodes (7): effectiveCatalogoSections(), effectiveHomeSections(), effectiveSections(), SecaoPagina, SECTION_LABELS, SectionsPanel(), EditableAnnouncementBar()

### Community 86 - "OrderStatus.tsx"
Cohesion: 0.29
Nodes (3): OrderStatus, statusClasses, statusIcons

### Community 87 - "transfers.ts"
Cohesion: 0.22
Nodes (4): stockTransferItems, stockTransfers, TRANSFER_INVOICE_MIME_TYPES, upload

### Community 88 - "PaymentProof.tsx"
Cohesion: 0.60
Nodes (4): onlyDigits(), PaymentProof(), PaymentProofProps, toWa()

### Community 96 - "readCurrencyConfig"
Cohesion: 0.50
Nodes (4): normalizeEnabled(), normalizeMode(), positiveNumber(), readCurrencyConfig()

### Community 98 - "apiPerformanceLogger"
Cohesion: 0.67
Nodes (3): apiPerformanceLogger(), asNumber(), redactUrl()

### Community 102 - "formatBrl"
Cohesion: 0.67
Nodes (3): buildUsdtWhatsappUrl(), buscarProdutoImpl(), formatBrl()

### Community 107 - "ensureFirstPurchaseCoupon"
Cohesion: 0.67
Nodes (3): ensureFirstPurchaseCoupon(), readCouponPolicies(), writeCouponPolicies()

### Community 127 - "StoreCoupons.tsx"
Cohesion: 0.38
Nodes (6): StoreCoupons, Coupon, emptyForm(), FormState, inputDate(), StoreCoupons()

### Community 130 - "Intelligence.tsx"
Cohesion: 0.53
Nodes (4): Intelligence, brl(), cur(), Intelligence()

## Knowledge Gaps
- **368 isolated node(s):** `app`, `loaded`, `loaded`, `loaded`, `loaded` (+363 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 569 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `apiFetch` to `Sales.tsx`, `App.tsx`, `Intelligence.tsx`, `FinancialStatements.tsx`, `StockMovementReport.tsx`, `lib/i18n.ts`, `StockTransfers.tsx`, `card.tsx`, `button.tsx`, `StoreHome.tsx`, `Dashboard.tsx`, `useEditMode`, `CommandPalette.tsx`, `Analytics.tsx`, `EditModeContext.tsx`, `Pos.tsx`, `Layout.tsx`, `StoreCoupons.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `Sales.tsx`, `App.tsx`, `FinancialStatements.tsx`, `StockTransfers.tsx`, `card.tsx`, `button.tsx`, `apiFetch`, `ThemeCustomizer.tsx`, `CommandPalette.tsx`, `Layout.tsx`, `particles.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `MONEY_EPSILON` connect `cash.ts` to `store.ts`, `CheckoutPage.tsx`, `button.tsx`, `lib/i18n.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `app`, `loaded`, `loaded` to the rest of the system?**
  _368 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runtime.js` be split into smaller, more focused modules?**
  _Cohesion score 0.022512097622554177 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04748490945674044 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08961748633879782 - nodes in this community are weakly interconnected._