import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

interface Notification {
  id: string;
  type: string;
  message: string;
  status: "read" | "unread" | "dismissed";
  actionUrl: string;
  createdAt: string;
}

async function handleGET() {
  const notifications = await readCollection<Notification>("notifications");
  // Filter out dismissed notifications
  const visible = notifications.filter((n) => n.status !== "dismissed");
  return NextResponse.json(visible);
}

async function handlePATCH(request: Request) {
  try {
    const { id, status } = await request.json() as { id: string; status: Notification["status"] };
    const notifications = await readCollection<Notification>("notifications");
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx < 0) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    notifications[idx].status = status;
    await writeCollection("notifications", notifications);
    return NextResponse.json(notifications[idx]);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
