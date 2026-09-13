"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn } from "@/components/admin/Shared";

interface Notification {
  id: string;
  type: string;
  message: string;
  status: "read" | "unread" | "dismissed";
  actionUrl: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  function fetchNotifications() {
    setLoading(true);
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      });
  }

  async function handleNotificationClick(n: Notification) {
    // Mark as read first
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, status: "read" })
    });
    router.push(n.actionUrl);
  }

  async function handleDismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "dismissed" })
    });
    if (res.ok) {
      fetchNotifications();
    }
  }

  return (
    <PageShell>
      <PageHeader title="System Notifications Center" subtitle="Review pending alerts, processing statuses, and inventory shortages." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <SectionCard title="Active System Alerts">
          <div className="divide-y divide-stone/20">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-paper/50 transition-colors ${
                  n.status === "unread" ? "bg-paper/20 font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    n.status === "unread" ? "bg-indigo" : "bg-stone/30"
                  }`} />
                  <div>
                    <p className="text-sm text-ink">{n.message}</p>
                    <p className="text-[10px] text-stone uppercase tracking-wider font-semibold mt-1">
                      {n.type} · {new Date(n.createdAt).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDismiss(n.id, e)}
                  className="text-xs text-stone hover:text-madder font-semibold"
                >
                  Dismiss
                </button>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-stone text-center py-10">No active system notifications or alerts.</p>
            )}
          </div>
        </SectionCard>
      )}
    </PageShell>
  );
}
