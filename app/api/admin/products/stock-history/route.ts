import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";

interface Activity {
  id: string;
  user: string;
  action: string;
  objectType: string;
  objectId: string;
  description: string;
  createdAt: string;
}

export async function GET() {
  const activities = readCollection<Activity>("activity-log");
  const stockHistory = activities.filter(
    (a) => a.objectType === "Product" && a.action === "Update Stock"
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(stockHistory);
}
