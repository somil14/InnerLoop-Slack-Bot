const cache = new Map();

export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
}

export function setCache(key, value, ttlSeconds) {
  const expiresAt =
    typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : undefined;

  cache.set(key, { value, expiresAt });
}
