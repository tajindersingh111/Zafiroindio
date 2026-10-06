import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIp(mapped[1]) : false;
}

/** Fetch a public https image without following redirects into the private network. Size-capped. */
export async function fetchPublicImage(rawUrl: string, maxBytes = 8 * 1024 * 1024): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image URL.");
  }
  if (url.protocol !== "https:") throw new Error("Only https image URLs are allowed.");
  if (url.username || url.password) throw new Error("Credentials in URL are not allowed.");

  const addrs = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("URL points to a disallowed address.");

  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!res.ok || !res.body) throw new Error("Failed to fetch image from provided URL.");
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("Image is too large.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Image is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
