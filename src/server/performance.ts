import { Request, Response, NextFunction } from "express";

const DEFAULT_SLOW_MS = 800;

function asNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function redactUrl(url: string) {
  return url
    .replace(/([?&](?:token|password|senha|secret|key|authorization)=)[^&]+/gi, "$1[redacted]")
    .slice(0, 280);
}

export function apiPerformanceLogger(req: Request, res: Response, next: NextFunction) {
  if (process.env.PERF_LOG_ENABLED === "false") {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  const slowMs = asNumber(process.env.PERF_SLOW_MS, DEFAULT_SLOW_MS);
  const logAll = process.env.PERF_LOG_ALL !== "false";

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const roundedDuration = Math.round(durationMs);
    const isSlow = durationMs >= slowMs;

    if (!logAll && !isSlow) return;

    const contentLength = res.getHeader("content-length");
    const lengthInfo = contentLength ? ` bytes=${contentLength}` : "";
    const memoryInfo = isSlow ? ` rss=${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB` : "";
    const prefix = isSlow ? "[PERF][SLOW]" : "[PERF]";

    console.log(
      `${prefix} ${req.method} ${redactUrl(req.originalUrl || req.url)} status=${res.statusCode} time=${roundedDuration}ms${lengthInfo}${memoryInfo}`
    );
  });

  next();
}

export function markResponseStart(req: Request, res: Response, next: NextFunction) {
  if (process.env.PERF_HEADER_ENABLED === "false") {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res) as typeof res.writeHead;

  res.writeHead = ((...args: Parameters<typeof res.writeHead>) => {
    if (!res.headersSent) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      res.setHeader("X-Response-Time", `${Math.round(durationMs)}ms`);
    }
    return originalWriteHead(...args);
  }) as typeof res.writeHead;

  next();
}
