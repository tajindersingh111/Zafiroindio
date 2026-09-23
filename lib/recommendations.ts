/**
 * Zafiro Indio — Dwell-Time Based Recommendation Engine
 *
 * Tracks how long a user views each product (active tab time only,
 * using Page Visibility API). Stores data in localStorage.
 * Computes a "interest score" from time spent + recency + view count.
 */

const STORAGE_KEY = "zafiro_product_interest";
const MAX_RECORDS = 50; // keep only the top 50 most-viewed slugs

export interface ProductInterest {
  slug: string;
  totalSeconds: number;     // cumulative active viewing time
  viewCount: number;        // how many times product page was opened
  lastViewed: number;       // Unix ms timestamp of most recent view
}

export interface InterestStore {
  [slug: string]: ProductInterest;
}

/* ─── Read ──────────────────────────────────────────────── */
export function readStore(): InterestStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InterestStore) : {};
  } catch {
    return {};
  }
}

/* ─── Write ─────────────────────────────────────────────── */
function writeStore(store: InterestStore) {
  if (typeof window === "undefined") return;
  try {
    // Prune to MAX_RECORDS if needed (remove least interesting)
    const entries = Object.values(store);
    if (entries.length > MAX_RECORDS) {
      const sorted = entries.sort((a, b) => getScore(b) - getScore(a));
      const pruned: InterestStore = {};
      sorted.slice(0, MAX_RECORDS).forEach((e) => (pruned[e.slug] = e));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // storage full or blocked — silently ignore
  }
}

/* ─── Record a viewing session ──────────────────────────── */
export function recordViewSession(slug: string, seconds: number) {
  if (seconds < 1) return; // ignore flicker visits < 1 second
  const store = readStore();
  const existing = store[slug];
  store[slug] = {
    slug,
    totalSeconds: (existing?.totalSeconds ?? 0) + seconds,
    viewCount: (existing?.viewCount ?? 0) + 1,
    lastViewed: Date.now(),
  };
  writeStore(store);
}

/* ─── Compute interest score ────────────────────────────── */
// Score = time-weighted + recency bonus + view-count bonus
// Time: sqrt(totalSeconds) so 400s isn't 100x better than 4s
// Recency: exponential decay with 7-day half-life
// ViewCount: log bonus for multiple visits
export function getScore(interest: ProductInterest): number {
  const now = Date.now();
  const ageMs = now - interest.lastViewed;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decayHalfLife = 7; // days
  const recencyFactor = Math.pow(0.5, ageDays / decayHalfLife);
  const timeScore = Math.sqrt(Math.max(0, interest.totalSeconds));
  const countBonus = Math.log1p(interest.viewCount) * 5;
  return (timeScore + countBonus) * recencyFactor;
}

/* ─── Get ranked recommendations ───────────────────────── */
export interface RecommendationResult {
  slug: string;
  score: number;
  totalSeconds: number;
  viewCount: number;
  lastViewed: number;
}

export function getRankedRecommendations(
  exclude: string[] = [],
  limit = 8
): RecommendationResult[] {
  const store = readStore();
  return Object.values(store)
    .filter((i) => !exclude.includes(i.slug))
    .map((i) => ({ ...i, score: getScore(i) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ─── Get recently viewed (by timestamp) ────────────────── */
export function getRecentlyViewed(
  exclude: string[] = [],
  limit = 8
): RecommendationResult[] {
  const store = readStore();
  return Object.values(store)
    .filter((i) => !exclude.includes(i.slug))
    .map((i) => ({ ...i, score: getScore(i) }))
    .sort((a, b) => b.lastViewed - a.lastViewed)
    .slice(0, limit);
}

/* ─── Format dwell time for display ─────────────────────── */
export function formatDwellTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/* ─── Clear all data ────────────────────────────────────── */
export function clearInterestData() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
