import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/auth/guard";
import { invalidate } from "@/lib/cache";
import { readSettings, writeSettings } from "@/lib/db/store";
import { getShipmozoConfig, listWarehouses, type ShipmozoWarehouse } from "@/lib/shipping/shipmozo";

export const dynamic = "force-dynamic";

const mask = (v: string) => (v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-4)}`);

/** ShipMozo connection status for Admin → Shipping. The private key never leaves the server. */
async function status() {
  const cfg = await getShipmozoConfig();
  let warehouses: ShipmozoWarehouse[] = [];
  let connectionError: string | null = null;
  if (cfg) {
    try {
      warehouses = await listWarehouses(cfg);
    } catch (e) {
      connectionError = (e as Error).message;
    }
  }
  return {
    configured: !!cfg,
    connected: !!cfg && !connectionError,
    connectionError,
    source: cfg?.source ?? null,
    publicKeyHint: cfg ? mask(cfg.publicKey) : null,
    warehouses,
    warehouseId: cfg?.warehouseId ?? "",
    pickupPincode: cfg?.pickupPincode ?? "",
    autoPush: cfg?.autoPush ?? true,
    itemWeightKg: cfg?.itemWeightKg ?? 1,
    box: cfg?.box ?? { l: 30, w: 25, h: 8 },
    cronConfigured: !!process.env.CRON_SECRET,
    webhookConfigured: !!process.env.SHIPMOZO_WEBHOOK_SECRET,
  };
}

async function handleGET() {
  return NextResponse.json(await status());
}

const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined);

async function handlePATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, any> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const current = (await readSettings<Record<string, unknown>>("settings")) ?? {};
  const next: Record<string, unknown> = { ...current };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

  // Keys: a blank field means "keep the saved one".
  if (str(body.publicKey)) next.shipmozo_public_key = str(body.publicKey);
  if (str(body.privateKey)) next.shipmozo_private_key = str(body.privateKey);
  if (body.clearKeys === true) {
    for (const k of ["shipmozo_public_key", "shipmozo_private_key", "shipmozo_api_key", "shipmozo_secret_key"]) delete next[k];
  }
  if (body.warehouseId !== undefined) next.shipmozo_warehouse_id = str(body.warehouseId) || undefined;
  if (body.pickupPincode !== undefined) {
    const pin = String(body.pickupPincode ?? "").replace(/\D/g, "");
    if (pin && pin.length !== 6) return NextResponse.json({ error: "Pickup PIN code must have 6 digits." }, { status: 400 });
    next.shipmozo_pickup_pincode = pin || undefined;
  }
  if (typeof body.autoPush === "boolean") next.shipmozo_auto_push = body.autoPush;
  if (num(body.itemWeightKg)) next.shipmozo_item_weight_kg = num(body.itemWeightKg);
  if (body.box && typeof body.box === "object") {
    if (num(body.box.l)) next.shipmozo_box_l = num(body.box.l);
    if (num(body.box.w)) next.shipmozo_box_w = num(body.box.w);
    if (num(body.box.h)) next.shipmozo_box_h = num(body.box.h);
  }

  await writeSettings("settings", next);
  invalidate("shipmozo:");
  return NextResponse.json(await status());
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
