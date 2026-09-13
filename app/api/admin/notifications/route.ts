import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

interface Notification {
  id: string;
  type: string;
  message: string;
  status: "read" | "unread" | "dismissed";
  actionUrl: string;
  createdAt: string;
}

export async function GET() {
  const notifications = readCollection<Notification>("notifications");
  // Filter out dismissed notifications
  const visible = notifications.filter((n) => n.status !== "dismissed");
  return NextResponse.json(visible);
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json() as { id: string; status: Notification["status"] };
    const notifications = readCollection<Notification>("notifications");
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx < 0) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    notifications[idx].status = status;
    writeCollection("notifications", notifications);
    return NextResponse.json(notifications[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
