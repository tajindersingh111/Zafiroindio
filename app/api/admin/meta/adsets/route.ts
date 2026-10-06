import { NextResponse } from "next/server";
import { readSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

async function handleGET() {
  const config = await readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const sandbox = await readSettings<{ adsets: any[] }>("meta-sandbox");
  return NextResponse.json(sandbox?.adsets ?? []);
}

export const GET = guarded(handleGET);
