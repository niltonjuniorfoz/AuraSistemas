import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";

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

export function createVercelApiApp(registerRoutes: (app: Express) => void) {
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
  registerRoutes(app);

  app.use((error: any, _req: any, res: any, _next: any) => {
    console.error("Erro não tratado na API:", error);
    if (!res.headersSent) res.status(500).json({ error: "Erro interno do servidor" });
  });

  return app;
}

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

export function createVercelHandler(app: Express) {
  return function handler(req: any, res: any) {
    req.url = rebuildApiUrl(req);
    return app(req, res);
  };
}
