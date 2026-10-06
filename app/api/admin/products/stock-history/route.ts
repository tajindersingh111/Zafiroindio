import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

interface Activity {
  id: string;
  user: string;
  action: string;
  objectType: string;
  objectId: string;
  description: string;
  createdAt: string;
}

async function handleGET() {
  const activities = await readCollection<Activity>("activity-log");
  const stockHistory = activities.filter(
    (a) => a.objectType === "Product" && a.action === "Update Stock"
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(stockHistory);
}

export const GET = guarded(handleGET);
