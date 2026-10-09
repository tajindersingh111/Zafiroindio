/**
 * Tiny in-process cache for hot, rarely-changing reads (catalogue, collections, banners).
 *
 * - Single flight: 1,000 simultaneous visitors on a cold cache cause ONE database query, not 1,000.
 * - Stale-while-revalidate: after `ttlMs` the old value is still served instantly while one
 *   background refresh runs, so no visitor ever waits on the database for a warm key.
 * - Survives outages: if a refresh fails, the last good value keeps being served.
 *
 * It is per server instance. Admin writes call `invalidate()` (instant on this instance); other
 * instances pick the change up within `ttlMs`.
 */
type Entry<T> = { value?: T; at: number; inflight?: Promise<T> };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = (store.get(key) as Entry<T> | undefined) ?? { at: 0 };
  store.set(key, entry);

  const refresh = () => {
    entry.inflight ??= load()
      .then((value) => {
        entry.value = value;
        entry.at = Date.now();
        return value;
      })
      .finally(() => {
        entry.inflight = undefined;
      });
    return entry.inflight;
  };

  if (entry.value !== undefined) {
    if (Date.now() - entry.at > ttlMs) {
      refresh().catch((e) => console.error(`[cache] refresh of "${key}" failed, serving last good value:`, e));
    }
    return entry.value;
  }
  return refresh();
}

/** Drop every key that starts with one of the prefixes (no prefix = everything). */
export function invalidate(...prefixes: string[]): void {
  for (const key of store.keys()) {
    if (!prefixes.length || prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}
