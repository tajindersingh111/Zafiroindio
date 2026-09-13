import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Zafiro Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
