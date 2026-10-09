import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

interface Journey {
  id: string;
  name: string;
  trigger: string;
  status: string;
  steps: any[];
  analytics: any;
}

async function handleGET() {
  const journeys = await readSettings<Journey[]>("ai-journeys") || [];
  return NextResponse.json(journeys);
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json() as Partial<Journey>;
    const journeys = await readSettings<Journey[]>("ai-journeys") || [];
    const newJourney: Journey = {
      id: "jou-" + Math.random().toString(36).substring(2, 9),
      name: body.name ?? "New Journey Pathway",
      trigger: body.trigger ?? "Order Completed",
      status: "Active",
      steps: body.steps ?? [],
      analytics: {
        entered: 0,
        completed: 0,
        purchases: 0,
        revenue: 0,
        conversionRate: 0
      }
    };
    journeys.push(newJourney);
    await writeSettings("ai-journeys", journeys);
    return NextResponse.json(newJourney);
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

async function handlePATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Journey> & { id: string };
    const journeys = await readSettings<Journey[]>("ai-journeys") || [];
    const idx = journeys.findIndex((j) => j.id === body.id);
    if (idx < 0) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    journeys[idx] = { ...journeys[idx], ...body };
    await writeSettings("ai-journeys", journeys);
    return NextResponse.json(journeys[idx]);
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const PATCH = guarded(handlePATCH);
