import express from "express";
import cors from "cors";

let appPromise: Promise<any> | null = null;

function buildCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) return { origin: false };

  return {
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}

function safeRuntimeError(error: unknown) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/(password|secret|token)=([^&\s]+)/gi, "$1=[REDACTED]")
    .slice(0, 700);
}

async function createApp() {
  const [authModule, usersModule, productsModule, customersModule, groupsModule, shelvesModule, auditRouterModule, salesModule, reportsModule, healthModule, archivedModule, cashModule, separationModule, deliveryModule, serialsModule, settingsModule, receiptsModule, suppliersModule, purchasesModule, expensesModule, dashboardModule, notificationsModule, analyticsModule, transfersModule, aiReportsModule, masterModule, lotsModule, receivablesModule, payablesModule, financeModule, fxModule, costLayersModule, personalModule, storeModule, customerAuthModule, intelligenceModule, statementsModule, maintenanceModule, performanceModule] = await Promise.all([
    import("../src/server/auth"), import("../src/server/users"), import("../src/server/products"), import("../src/server/customers"), import("../src/server/groups"), import("../src/server/shelves"), import("../src/server/auditRouter"), import("../src/server/sales"), import("../src/server/reports"), import("../src/server/health"), import("../src/server/archived"), import("../src/server/cash"), import("../src/server/separation"), import("../src/server/delivery"), import("../src/server/serials"), import("../src/server/settings"), import("../src/server/receipts"), import("../src/server/suppliers"), import("../src/server/purchases"), import("../src/server/expenses"), import("../src/server/dashboard"), import("../src/server/notifications"), import("../src/server/analytics"), import("../src/server/transfers"), import("../src/server/aiReports"), import("../src/server/master"), import("../src/server/lots"), import("../src/server/receivables"), import("../src/server/payables"), import("../src/server/finance"), import("../src/server/fx"), import("../src/server/costLayers"), import("../src/server/personal"), import("../src/server/store"), import("../src/server/customerAuth"), import("../src/server/intelligence"), import("../src/server/statements"), import("../src/server/maintenance"), import("../src/server/performance")
  ]);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "microphone=(), geolocation=(), payment=()");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (req.path.endsWith(".map")) return res.status(404).end();
    next();
  });

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "4mb" }));
  app.use("/api", performanceModule.markResponseStart, performanceModule.apiPerformanceLogger);
  app.use("/api/auth", authModule.default);
  app.use("/api/users", usersModule.default);
  app.use("/api/products", productsModule.default);
  app.use("/api/customers", customersModule.default);
  app.use("/api/groups", groupsModule.default);
  app.use("/api/shelves", shelvesModule.default);
  app.use("/api/audit", auditRouterModule.default);
  app.use("/api/sales", receiptsModule.default);
  app.use("/api/sales", salesModule.default);
  app.use("/api/reports", reportsModule.default);
  app.use("/api/health", healthModule.default);
  app.use("/api/archived", archivedModule.default);
  app.use("/api/cash", cashModule.default);
  app.use("/api/separation", separationModule.separationRouter);
  app.use("/api/delivery", deliveryModule.deliveryRouter);
  app.use("/api/serials", serialsModule.serialsRouter);
  app.use("/api/settings", settingsModule.default);
  app.use("/api/suppliers", suppliersModule.default);
  app.use("/api/purchases", purchasesModule.default);
  app.use("/api/expenses", expensesModule.default);
  app.use("/api/dashboard", dashboardModule.default);
  app.use("/api/notifications", notificationsModule.default);
  app.use("/api/analytics", analyticsModule.default);
  app.use("/api/transfers", transfersModule.default);
  app.use("/api/lots", lotsModule.default);
  app.use("/api/receivables", receivablesModule.default);
  app.use("/api/payables", payablesModule.default);
  app.use("/api/finance", financeModule.default);
  app.use("/api/fx", fxModule.default);
  app.use("/api/cost", costLayersModule.default);
  app.use("/api/personal", personalModule.default);
  app.use("/api/store", storeModule.default);
  app.use("/api/store/account", customerAuthModule.default);
  app.use("/api/intel", intelligenceModule.default);
  app.use("/api/statements", statementsModule.default);
  app.use("/api/ai-reports", aiReportsModule.default);
  app.use("/api/maintenance", maintenanceModule.router);
  app.use("/api/master", masterModule.default);
  app.get("/api/ping", (_req: any, res: any) => res.json({ status: "ok", runtime: "vercel" }));
  app.use((error: any, _req: any, res: any, _next: any) => {
    console.error("Erro não tratado na API:", error);
    if (!res.headersSent) res.status(500).json({ error: "Erro interno do servidor" });
  });
  return app;
}

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

function rebuildApiUrl(req: any) {
  const rawPath = req.query?.__path;
  const pathParts = Array.isArray(rawPath) ? rawPath.map(String) : String(rawPath || "").split("/").filter(Boolean);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "__path" || value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
    else query.append(key, String(value));
  }
  const pathname = `/api/${pathParts.map((part) => encodeURIComponent(part)).join("/")}`;
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export default async function handler(req: any, res: any) {
  try {
    req.url = rebuildApiUrl(req);
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("Falha ao inicializar API no Vercel:", error);
    if (!res.headersSent) return res.status(500).json({ error: "Erro ao inicializar servidor", detail: safeRuntimeError(error) });
  }
}
