import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

interface Goals {
  monthly: number;
  yearly: number;
}

async function handleGET() {
  const goals = await readSettings<Goals>("goals") || { monthly: 500000, yearly: 6000000 };
  return NextResponse.json(goals);
}

async function handlePATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Goals>;
    const current = await readSettings<Goals>("goals") || { monthly: 500000, yearly: 6000000 };
    const updated = { ...current, ...body };
    await writeSettings("goals", updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
