"use client";

// Redirect to the new inventory page under products
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner, PageShell } from "@/components/admin/Shared";

export default function InventoryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/products/inventory"); }, [router]);
  return <PageShell><LoadingSpinner /></PageShell>;
}
