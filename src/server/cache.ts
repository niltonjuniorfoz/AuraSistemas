type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

function getTtlMs(defaultTtlMs: number) {
  const parsed = Number(process.env.API_CACHE_TTL_MS || String(defaultTtlMs));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultTtlMs;
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    inflight.clear();
    return;
  }

  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

export async function withApiCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const effectiveTtl = getTtlMs(ttlMs);
  if (effectiveTtl <= 0) return loader();

  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  if (cached) cache.delete(key);

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + effectiveTtl });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}
