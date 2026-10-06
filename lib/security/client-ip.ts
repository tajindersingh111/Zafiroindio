/**
 * Best-effort client IP. Prefers headers that the hosting platform sets itself (they cannot be
 * spoofed by the visitor). For a plain X-Forwarded-For chain we take the LAST entry, which is the
 * one appended by our own reverse proxy, never the first (visitor-controlled) entry.
 */
export function getClientIp(request: Request): string {
  const h = request.headers;
  const platform = h.get("x-vercel-forwarded-for") || h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("fly-client-ip");
  if (platform) return platform.split(",")[0].trim();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
