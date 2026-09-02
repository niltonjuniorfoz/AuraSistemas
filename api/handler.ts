const checks = [
  ["db", () => import("../src/db/index")],
  ["auth", () => import("../src/server/auth")],
  ["users", () => import("../src/server/users")],
  ["products", () => import("../src/server/products")],
  ["customers", () => import("../src/server/customers")],
  ["groups", () => import("../src/server/groups")],
  ["shelves", () => import("../src/server/shelves")],
  ["auditRouter", () => import("../src/server/auditRouter")],
  ["sales", () => import("../src/server/sales")],
  ["reports", () => import("../src/server/reports")],
  ["health", () => import("../src/server/health")],
  ["archived", () => import("../src/server/archived")],
  ["cash", () => import("../src/server/cash")],
  ["separation", () => import("../src/server/separation")],
  ["delivery", () => import("../src/server/delivery")],
  ["serials", () => import("../src/server/serials")],
  ["settings", () => import("../src/server/settings")],
  ["receipts", () => import("../src/server/receipts")],
  ["suppliers", () => import("../src/server/suppliers")],
  ["purchases", () => import("../src/server/purchases")],
  ["expenses", () => import("../src/server/expenses")],
  ["dashboard", () => import("../src/server/dashboard")],
  ["notifications", () => import("../src/server/notifications")],
  ["analytics", () => import("../src/server/analytics")],
  ["transfers", () => import("../src/server/transfers")],
  ["aiReports", () => import("../src/server/aiReports")],
  ["master", () => import("../src/server/master")],
  ["lots", () => import("../src/server/lots")],
  ["receivables", () => import("../src/server/receivables")],
  ["payables", () => import("../src/server/payables")],
  ["finance", () => import("../src/server/finance")],
  ["fx", () => import("../src/server/fx")],
  ["costLayers", () => import("../src/server/costLayers")],
  ["personal", () => import("../src/server/personal")],
  ["store", () => import("../src/server/store")],
  ["customerAuth", () => import("../src/server/customerAuth")],
  ["intelligence", () => import("../src/server/intelligence")],
  ["statements", () => import("../src/server/statements")],
  ["maintenance", () => import("../src/server/maintenance")],
  ["performance", () => import("../src/server/performance")]
] as const;

function safeMessage(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]").slice(0, 700);
}

export default async function handler(_req: any, res: any) {
  const loaded: string[] = [];
  for (const [name, load] of checks) {
    try {
      await load();
      loaded.push(name);
    } catch (error) {
      return res.status(500).json({ status: "error", failedModule: name, loaded, message: safeMessage(error) });
    }
  }
  return res.status(200).json({ status: "ok", runtime: "vercel-import-check", loaded });
}
