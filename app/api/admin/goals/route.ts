import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";

interface Goals {
  monthly: number;
  yearly: number;
}

export async function GET() {
  const goals = readSettings<Goals>("goals") || { monthly: 500000, yearly: 6000000 };
  return NextResponse.json(goals);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Goals>;
    const current = readSettings<Goals>("goals") || { monthly: 500000, yearly: 6000000 };
    const updated = { ...current, ...body };
    writeSettings("goals", updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
