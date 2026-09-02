const modulesToCheck = [
  "../src/db",
  "../src/server/auth",
  "../src/server/users",
  "../src/server/products",
  "../src/server/customers",
  "../src/server/groups",
  "../src/server/shelves",
  "../src/server/auditRouter",
  "../src/server/sales",
  "../src/server/reports",
  "../src/server/health",
  "../src/server/archived",
  "../src/server/cash",
  "../src/server/separation",
  "../src/server/delivery",
  "../src/server/serials",
  "../src/server/settings",
  "../src/server/receipts",
  "../src/server/suppliers",
  "../src/server/purchases",
  "../src/server/expenses",
  "../src/server/dashboard",
  "../src/server/notifications",
  "../src/server/analytics",
  "../src/server/transfers",
  "../src/server/aiReports",
  "../src/server/master",
  "../src/server/lots",
  "../src/server/receivables",
  "../src/server/payables",
  "../src/server/finance",
  "../src/server/fx",
  "../src/server/costLayers",
  "../src/server/personal",
  "../src/server/store",
  "../src/server/customerAuth",
  "../src/server/intelligence",
  "../src/server/statements",
  "../src/server/maintenance",
  "../src/server/performance"
] as const;

function sanitize(value: unknown) {
  return String(value || "Unknown error")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]")
    .slice(0, 500);
}

export default async function handler(_req: any, res: any) {
  const checked: string[] = [];

  try {
    for (const modulePath of modulesToCheck) {
      await import(modulePath);
      checked.push(modulePath);
    }

    res.status(200).json({
      status: "ok",
      runtime: "vercel-diagnostic",
      checkedModules: checked.length,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      jwtConfigured: Boolean(process.env.JWT_SECRET)
    });
  } catch (error: any) {
    const failedModule = modulesToCheck[checked.length] || "unknown";
    res.status(500).json({
      status: "error",
      runtime: "vercel-diagnostic",
      failedModule,
      checkedModules: checked.length,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      jwtConfigured: Boolean(process.env.JWT_SECRET),
      errorName: sanitize(error?.name),
      errorMessage: sanitize(error?.message)
    });
  }
}
