import express from "express";
import cors, { type CorsOptions } from "cors";

import authRouter from "../src/server/auth";
import usersRouter from "../src/server/users";
import productsRouter from "../src/server/products";
import customersRouter from "../src/server/customers";
import groupsRouter from "../src/server/groups";
import shelvesRouter from "../src/server/shelves";
import auditRouter from "../src/server/auditRouter";
import salesRouter from "../src/server/sales";
import reportsRouter from "../src/server/reports";
import healthRouter from "../src/server/health";
import archivedRouter from "../src/server/archived";
import cashRouter from "../src/server/cash";
import { separationRouter } from "../src/server/separation";
import { deliveryRouter } from "../src/server/delivery";
import { serialsRouter } from "../src/server/serials";
import settingsRouter from "../src/server/settings";
import currencyConfigRouter from "../src/server/currencyConfig";
import receiptsRouter from "../src/server/receipts";
import suppliersRouter from "../src/server/suppliers";
import purchasesRouter from "../src/server/purchases";
import expensesRouter from "../src/server/expenses";
import dashboardRouter from "../src/server/dashboard";
import notificationsRouter from "../src/server/notifications";
import analyticsRouter from "../src/server/analytics";
import transfersRouter from "../src/server/transfers";
import aiReportsRouter from "../src/server/aiReports";
import masterRouter from "../src/server/master";
import lotsRouter from "../src/server/lots";
import receivablesRouter from "../src/server/receivables";
import payablesRouter from "../src/server/payables";
import financeRouter from "../src/server/finance";
import fxRouter from "../src/server/fx";
import costLayersRouter from "../src/server/costLayers";
import personalRouter from "../src/server/personal";
import storeRouter from "../src/server/store";
import customerAuthRouter from "../src/server/customerAuth";
import intelligenceRouter from "../src/server/intelligence";
import statementsRouter from "../src/server/statements";
import { router as maintenanceRouter } from "../src/server/maintenance";
import { apiPerformanceLogger, markResponseStart } from "../src/server/performance";

function buildCorsOptions(): CorsOptions {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) return { origin: false };

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "microphone=(), geolocation=(), payment=()");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (req.path.endsWith(".map")) {
    res.status(404).end();
    return;
  }

  next();
});

app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "4mb" }));
app.use("/api", markResponseStart, apiPerformanceLogger);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/shelves", shelvesRouter);
app.use("/api/audit", auditRouter);
app.use("/api/sales", receiptsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/health", healthRouter);
app.use("/api/archived", archivedRouter);
app.use("/api/cash", cashRouter);
app.use("/api/separation", separationRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/serials", serialsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/currency-config", currencyConfigRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/receivables", receivablesRouter);
app.use("/api/payables", payablesRouter);
app.use("/api/finance", financeRouter);
app.use("/api/fx", fxRouter);
app.use("/api/cost", costLayersRouter);
app.use("/api/personal", personalRouter);
app.use("/api/store", storeRouter);
app.use("/api/store/account", customerAuthRouter);
app.use("/api/intel", intelligenceRouter);
app.use("/api/statements", statementsRouter);
app.use("/api/ai-reports", aiReportsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/master", masterRouter);

app.get("/api/ping", (_req, res) => {
  res.json({
    status: "ok",
    runtime: "vercel",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
});

app.use((error: any, _req: any, res: any, _next: any) => {
  console.error("Erro não tratado na API:", error);
  if (!res.headersSent) res.status(500).json({ error: "Erro interno do servidor" });
});

function rebuildApiUrl(req: any) {
  const rawPath = req.query?.__path;
  const pathParts = Array.isArray(rawPath)
    ? rawPath.map(String)
    : String(rawPath || "")
        .split("/")
        .filter(Boolean);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "__path" || value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
    } else {
      query.append(key, String(value));
    }
  }

  const pathname = `/api/${pathParts.map((part) => encodeURIComponent(part)).join("/")}`;
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export default function handler(req: any, res: any) {
  req.url = rebuildApiUrl(req);
  return app(req, res);
}
