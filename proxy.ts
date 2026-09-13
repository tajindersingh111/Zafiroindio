import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "zafiro-admin-session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days
const SECRET = process.env.SESSION_SECRET || "zafiro-default-super-signed-cookie-secret-key-19038";

// Section permissions mapping
const SECTION_MAP: Record<string, string> = {
  orders: "orders",
  inventory: "inventory",
  products: "inventory",
  customers: "customers",
  analytics: "analytics",
  reports: "analytics",
  marketing: "marketing",
  meta: "marketing",
  intelligence: "analytics",
  b2b: "b2b",
  users: "users",
  settings: "settings",
  shipping: "settings",
  taxes: "settings"
};

const ALL_SECTIONS = ["overview", "orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings"];

const PERMISSIONS: Record<string, string[]> = {
  "super_admin": ALL_SECTIONS,
  "Super Admin": ALL_SECTIONS,
  "inventory_manager": ["overview", "inventory"],
  "Inventory Manager": ["overview", "inventory"],
  "order_manager": ["overview", "orders", "customers"],
  "Order Manager": ["overview", "orders", "customers"],
  "marketing": ["overview", "marketing", "analytics"],
  "Marketing": ["overview", "marketing", "analytics"],
  "b2b_sales": ["overview", "b2b", "customers"],
  "B2B Sales": ["overview", "b2b", "customers"]
};

// Edge-compatible signature validation
async function verify(message: string, sigBase64Url: string, secretKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(secretKey);
    const msgBuf = encoder.encode(message);
    
    let base64 = sigBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }
    
    const cryptoSubtle = typeof crypto !== "undefined" ? crypto.subtle : (await import("crypto")).webcrypto.subtle;
    const key = await cryptoSubtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return await cryptoSubtle.verify("HMAC", key, sigBytes, msgBuf);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Inject x-pathname header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const cookie = request.cookies.get(SESSION_COOKIE);
  const isApi = pathname.startsWith("/api/");

  // Exclude auth login API path
  if (pathname === "/api/admin/auth/login") {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  // If already authenticated and visiting /admin/login, redirect to /admin
  if (pathname === "/admin/login") {
    if (cookie?.value) {
      const parts = cookie.value.split(".");
      if (parts.length === 2) {
        const [payloadBase64, signature] = parts;
        const isValid = await verify(payloadBase64, signature, SECRET);
        if (isValid) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  if (!cookie?.value) {
    if (isApi) {
      if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
        return NextResponse.json({ error: "Unauthorized. Authentication required." }, { status: 401 });
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        }
      });
    }
    if (pathname.startsWith("/admin")) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  try {
    const raw = cookie.value;
    const parts = raw.split(".");
    if (parts.length !== 2) {
      const response = isApi 
        ? NextResponse.json({ error: "Invalid session structure" }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const [payloadBase64, signature] = parts;
    
    // Verify cryptographic signature
    const isValid = await verify(payloadBase64, signature, SECRET);
    if (!isValid) {
      const response = isApi 
        ? NextResponse.json({ error: "Tampered session signature detected." }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const session = JSON.parse(atob(payloadBase64));
    
    // Check session age expiration
    if (Date.now() - session.issuedAt > SESSION_DURATION * 1000) {
      const response = isApi 
        ? NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 })
        : NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    // Role-based Access Control authorization checks
    const role = session.role;
    const allowedSections = session.allowedSections || PERMISSIONS[role] || [];

    const partsPath = pathname.split("/");
    const sectionIndex = partsPath.indexOf("admin") + 1;
    const rawSection = partsPath[sectionIndex] || "overview";

    const requiredSection = SECTION_MAP[rawSection] || "overview";

    if (requiredSection !== "overview" && !allowedSections.includes(requiredSection)) {
      if (isApi) {
        if (pathname.startsWith("/api/admin")) {
          return NextResponse.json({ error: "Forbidden. Insufficient role permissions." }, { status: 403 });
        }
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          }
        });
      }
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin?error=unauthorized", request.url));
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  } catch (error) {
    const response = isApi 
      ? NextResponse.json({ error: "Invalid session." }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*"
  ]
};
