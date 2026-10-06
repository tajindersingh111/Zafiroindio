import { cookies } from "next/headers";
import { readCollection } from "@/lib/db/store";
import type { AdminUser } from "@/lib/db/types";
import { parseSessionString, SESSION_COOKIE_NAME, type AdminSession } from "@/lib/auth/token";

export * from "@/lib/auth/token";

export async function getCookieSession(): Promise<AdminSession | null> {
  try {
    const store = await cookies();
    return parseSessionString(store.get(SESSION_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

export async function findAdminByEmail(email: string): Promise<AdminUser | undefined> {
  const users = await readCollection<AdminUser>("admin-users");
  const needle = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === needle && u.isActive);
}
