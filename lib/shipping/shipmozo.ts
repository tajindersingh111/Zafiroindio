import { cached } from "@/lib/cache";
import { getDoc, readSettings, updateDoc, upsertDoc } from "@/lib/db/store";
import { normalizePhone } from "@/lib/orders/contact";
import type { Order, OrderStatus, ShipmentRecord, ShipmozoOrderInfo } from "@/lib/db/types";

/**
 * ShipMozo (courier aggregator) client.
 *
 * API: https://shipping-api.com/app/api/v1, authenticated with the `public-key` / `private-key` pair
 * from ShipMozo panel → Settings → API. Every response is {"result":"1"|"0","message":…,"data":…};
 * result "0" is an error whose message is passed to the admin verbatim (it names the bad field).
 *
 * Flow for one order: push-order (free, the order appears in the ShipMozo panel) → assign-courier /
 * auto-assign-order (books the courier, debits the ShipMozo wallet, returns the AWB) → schedule-pickup.
 * Tracking is pulled with track-order (cron + on demand); a ShipMozo webhook is only a hint to pull.
 */

const BASE_URL = (process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1").replace(/\/$/, "");

export class ShipmozoError extends Error {}

export interface ShipmozoConfig {
  publicKey: string;
  privateKey: string;
  source: "env" | "settings";
  warehouseId?: string;
  pickupPincode?: string;
  /** Send each newly confirmed order to ShipMozo automatically (no courier is booked). */
  autoPush: boolean;
  itemWeightKg: number;
  box: { l: number; w: number; h: number };
}

export interface Parcel {
  weightKg: number;
  l: number;
  w: number;
  h: number;
}

type Settings = Record<string, unknown> & { storeAddress?: { postalCode?: string } };

const text = (v: unknown): string | undefined => ((typeof v === "string" || typeof v === "number") && String(v).trim() ? String(v).trim() : undefined);
const positive = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

async function loadConfig(): Promise<ShipmozoConfig | null> {
  const s = (await readSettings<Settings>("settings")) ?? {};
  const envPublic = text(process.env.SHIPMOZO_PUBLIC_KEY);
  const envPrivate = text(process.env.SHIPMOZO_PRIVATE_KEY);
  // Keys from the environment win; otherwise the ones saved in Admin → Shipping (older saves used api/secret names).
  const publicKey = envPublic ?? text(s.shipmozo_public_key) ?? text(s.shipmozo_api_key);
  const privateKey = envPrivate ?? text(s.shipmozo_private_key) ?? text(s.shipmozo_secret_key);
  if (!publicKey || !privateKey) return null;
  const pin = (v: unknown) => (text(v)?.replace(/\D/g, "").length === 6 ? text(v)!.replace(/\D/g, "") : undefined);
  return {
    publicKey,
    privateKey,
    source: envPublic && envPrivate ? "env" : "settings",
    warehouseId: text(process.env.SHIPMOZO_WAREHOUSE_ID) ?? text(s.shipmozo_warehouse_id),
    pickupPincode: pin(process.env.SHIPMOZO_PICKUP_PINCODE) ?? pin(s.shipmozo_pickup_pincode),
    autoPush: (s.shipmozo_auto_push ?? s.shipmozo_enabled ?? true) !== false,
    itemWeightKg: positive(s.shipmozo_item_weight_kg, 1),
    box: { l: positive(s.shipmozo_box_l, 30), w: positive(s.shipmozo_box_w, 25), h: positive(s.shipmozo_box_h, 8) },
  };
}

/** ShipMozo settings, or null when no key pair is configured. Cached for a minute (Admin → Shipping clears it). */
export function getShipmozoConfig(): Promise<ShipmozoConfig | null> {
  return cached("shipmozo:config", 60_000, loadConfig);
}

async function requireConfig(): Promise<ShipmozoConfig> {
  const cfg = await getShipmozoConfig();
  if (!cfg) throw new ShipmozoError("ShipMozo is not connected. Add the public and private API keys in Admin → Shipping.");
  return cfg;
}

// ───────────────────────── HTTP ─────────────────────────

function errorText(json: any): string {
  const parts: string[] = [];
  const add = (v: unknown, key?: string) => {
    if (v === undefined || v === null || v === "") return;
    if (typeof v === "string" || typeof v === "number") parts.push(key ? `${key}: ${v}` : String(v));
    else if (Array.isArray(v)) v.forEach((x) => add(x, key));
    else if (typeof v === "object") Object.entries(v as Record<string, unknown>).forEach(([k, x]) => add(x, k));
  };
  add(json?.message ?? json?.error ?? json?.errors);
  // Validation failures sometimes carry the field errors in `data`.
  if (json?.data && typeof json.data === "object" && !Array.isArray(json.data)) add(json.data);
  else if (Array.isArray(json?.data) && json.data.every((x: unknown) => typeof x === "string")) add(json.data);
  return Array.from(new Set(parts)).join("; ").slice(0, 400);
}

async function call<T = any>(cfg: ShipmozoConfig, method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json", "public-key": cfg.publicKey, "private-key": cfg.privateKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new ShipmozoError(`ShipMozo is unreachable right now (${(e as Error).message}). Try again in a minute.`);
  }
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error(`[shipmozo] ${path}: HTTP ${res.status}, non-JSON response:`, raw.slice(0, 300));
    throw new ShipmozoError(`ShipMozo ${path} failed (HTTP ${res.status}).`);
  }
  if (!["1", "true", "success"].includes(String(json?.result ?? json?.status).toLowerCase())) {
    console.error(`[shipmozo] ${path} rejected:`, res.status, raw.slice(0, 600));
    throw new ShipmozoError(`ShipMozo: ${errorText(json) || `${path} failed (HTTP ${res.status})`}`);
  }
  return json.data as T;
}

/** First non-empty value under any of `keys`, searching nested objects/arrays (response shapes differ per endpoint). */
function find(obj: unknown, keys: string[], depth = 0): unknown {
  if (!obj || typeof obj !== "object" || depth > 4) return undefined;
  if (!Array.isArray(obj)) {
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  for (const v of Object.values(obj)) {
    const hit = find(v, keys, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

const findText = (obj: unknown, keys: string[]) => text(find(obj, keys));

const AWB_KEYS = ["awb_number", "awb", "awb_code", "awb_no", "tracking_number"];
const COURIER_KEYS = ["courier_company", "courier_name", "courier_company_name", "carrier_name", "courier"];
const LABEL_KEYS = ["label_url", "label", "label_link", "shipping_label", "label_pdf", "label_print_url"];

const httpUrl = (v: string | undefined) => (v && /^https?:\/\//i.test(v) ? v : undefined);

// ───────────────────────── Warehouses / pickup ─────────────────────────

export interface ShipmozoWarehouse {
  id: string;
  name: string;
  pincode?: string;
  address?: string;
  isDefault: boolean;
}

export async function listWarehouses(cfg?: ShipmozoConfig): Promise<ShipmozoWarehouse[]> {
  const c = cfg ?? (await requireConfig());
  const data = await call(c, "GET", "get-warehouses");
  const rows: unknown[] = Array.isArray(data) ? data : Array.isArray((data as any)?.warehouses) ? (data as any).warehouses : [];
  return rows
    .map((w) => ({
      id: findText(w, ["id", "warehouse_id"]) ?? "",
      name: findText(w, ["address_title", "warehouse_name", "name", "title"]) ?? "Warehouse",
      pincode: findText(w, ["pincode", "pin_code", "pickup_pincode", "zip"]),
      address: findText(w, ["address_line_one", "address", "address_line1"]),
      isDefault: ["1", "true", "yes"].includes(String(find(w, ["default", "is_default", "default_warehouse", "is_primary"]) ?? "").toLowerCase()),
    }))
    .filter((w) => w.id);
}

/** Warehouse id and pickup pincode: configured values first, else ShipMozo's default warehouse, else the store address. */
async function pickupPoint(cfg: ShipmozoConfig): Promise<{ warehouseId?: string; pincode?: string }> {
  let list: ShipmozoWarehouse[] = [];
  try {
    list = await cached(`shipmozo:warehouses:${cfg.publicKey}`, 10 * 60_000, () => listWarehouses(cfg));
  } catch (e) {
    console.error("[shipmozo] could not list warehouses:", (e as Error).message);
  }
  const chosen = cfg.warehouseId ? list.find((w) => w.id === cfg.warehouseId) : (list.find((w) => w.isDefault) ?? list[0]);
  let pincode = cfg.pickupPincode ?? chosen?.pincode;
  if (!pincode) {
    const s = await readSettings<Settings>("settings");
    pincode = text(s?.storeAddress?.postalCode);
  }
  return { warehouseId: cfg.warehouseId ?? chosen?.id, pincode };
}

// ───────────────────────── Order → ShipMozo payloads ─────────────────────────

export function defaultParcel(order: Order, cfg: ShipmozoConfig): Parcel {
  const units = order.items.reduce((n, i) => n + i.quantity, 0) || 1;
  const weightKg = Math.max(0.5, Math.round(units * cfg.itemWeightKg * 100) / 100);
  return { weightKg, ...cfg.box };
}

function cleanParcel(p: Partial<Parcel> | undefined, fallback: Parcel): Parcel {
  return {
    weightKg: positive(p?.weightKg, fallback.weightKg),
    l: positive(p?.l, fallback.l),
    w: positive(p?.w, fallback.w),
    h: positive(p?.h, fallback.h),
  };
}

const isCod = (order: Order) => order.paymentMethod === "cod";

function destination(order: Order) {
  const a = order.shipping?.address1 ? order.shipping : order.billing;
  const phone = normalizePhone(a?.phone || order.customerPhone);
  const pin = String(a?.postalCode ?? "").replace(/\D/g, "");
  const problems: string[] = [];
  if (!a?.address1) problems.push("street address");
  if (!a?.city) problems.push("city");
  if (!a?.state) problems.push("state");
  if (pin.length !== 6) problems.push("6-digit PIN code");
  if (phone.length !== 10) problems.push("10-digit phone");
  if (problems.length) throw new ShipmozoError(`Order ${order.orderNumber} is missing: ${problems.join(", ")}. Fix the shipping address first.`);
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || order.customerName || "Customer";
  return { a, phone, pin, name };
}

/** YYYY-MM-DD in India time. */
function istDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

function orderPayload(order: Order, parcel: Parcel, warehouseId?: string) {
  const { a, phone, pin, name } = destination(order);
  return {
    order_id: order.orderNumber,
    order_date: istDate(order.createdAt),
    order_type: "NON ESSENTIALS",
    consignee_name: name,
    consignee_phone: Number(phone),
    consignee_alternate_phone: "",
    consignee_email: a.email || order.customerEmail || "",
    consignee_address_line_one: a.address1,
    consignee_address_line_two: [a.address2, a.company].filter(Boolean).join(", "),
    consignee_pin_code: Number(pin),
    consignee_city: a.city,
    consignee_state: a.state,
    product_detail: order.items.map((i) => ({
      name: i.name.slice(0, 120),
      sku_number: i.sku || i.productId,
      quantity: i.quantity,
      discount: "",
      hsn: "",
      unit_price: i.price,
      product_category: "Other",
    })),
    payment_type: isCod(order) ? "COD" : "PREPAID",
    cod_amount: isCod(order) ? String(order.total) : "",
    shipping_charges: order.shippingCost ? String(order.shippingCost) : "",
    weight: Math.round(parcel.weightKg * 1000), // grams
    length: parcel.l,
    width: parcel.w,
    height: parcel.h,
    warehouse_id: warehouseId ?? "",
    gst_ewaybill_number: "",
    gstin_number: "",
  };
}

const SHIPPABLE: OrderStatus[] = ["paid", "processing", "completed"];

async function loadShippableOrder(orderId: string): Promise<Order> {
  const order = await getDoc<Order>("orders", orderId);
  if (!order) throw new ShipmozoError("Order not found.");
  if (!SHIPPABLE.includes(order.status) && !order.trackingNumber) {
    const why =
      order.status === "on_hold"
        ? "It is ON HOLD (unknown product or short stock). Resolve it and set it to Processing first."
        : `Its status is "${order.status.replace(/_/g, " ")}".`;
    throw new ShipmozoError(`Order ${order.orderNumber} can't be shipped. ${why}`);
  }
  return order;
}

async function saveShipmozoInfo(orderId: string, patch: Partial<ShipmozoOrderInfo>, extra: Partial<Order> = {}, note?: string): Promise<Order | undefined> {
  const now = new Date().toISOString();
  const { result } = await updateDoc<Order, Order>("orders", orderId, (o) => {
    const doc: Order = {
      ...o,
      ...extra,
      shipmozo: { ...(o.shipmozo ?? { orderId: o.orderNumber, pushedAt: now }), ...patch },
      notes: note ? [{ id: `nte-${Date.now()}`, note, isCustomerNote: false, createdAt: now }, ...(o.notes || [])] : o.notes,
      updatedAt: now,
    };
    return { doc, result: doc };
  });
  return result;
}

const alreadyExists = (e: unknown) => e instanceof ShipmozoError && /already|exist|duplicate/i.test(e.message);

/**
 * Sends the order to ShipMozo (no courier booked, nothing charged). Safe to repeat: an order that is
 * already there is updated with the new parcel instead.
 */
export async function pushOrder(orderId: string, parcelIn?: Partial<Parcel>): Promise<Order> {
  const cfg = await requireConfig();
  const order = await loadShippableOrder(orderId);
  const parcel = cleanParcel(parcelIn ?? order.shipmozo?.parcel, defaultParcel(order, cfg));
  const { warehouseId } = await pickupPoint(cfg);
  const payload = orderPayload(order, parcel, warehouseId);

  let data: unknown;
  if (order.shipmozo?.pushedAt) {
    const prev = order.shipmozo.parcel;
    if (prev && prev.weightKg === parcel.weightKg && prev.l === parcel.l && prev.w === parcel.w && prev.h === parcel.h) return order;
    data = await call(cfg, "POST", "update-order", payload).catch((e) => {
      // Courier already booked / ShipMozo doesn't allow edits: keep the booked parcel.
      console.warn(`[shipmozo] update-order ${order.orderNumber}:`, (e as Error).message);
      return null;
    });
    if (data === null) return order;
  } else {
    try {
      data = await call(cfg, "POST", "push-order", payload);
    } catch (e) {
      if (!alreadyExists(e)) throw e;
      data = await call(cfg, "POST", "update-order", payload).catch(() => ({}));
    }
  }

  const saved = await saveShipmozoInfo(
    order.id,
    { orderId: order.orderNumber, referenceId: findText(data, ["reference_id", "refrence_id", "shipmozo_order_id", "id"]) ?? order.shipmozo?.referenceId, pushedAt: order.shipmozo?.pushedAt ?? new Date().toISOString(), parcel },
    {},
    order.shipmozo?.pushedAt ? undefined : `Sent to ShipMozo (${parcel.weightKg} kg, ${parcel.l}×${parcel.w}×${parcel.h} cm).`
  );
  return saved ?? order;
}

// ───────────────────────── Rates / courier booking ─────────────────────────

export interface CourierRate {
  courierId: string;
  name: string;
  price: number;
  eta?: string;
}

export async function getRates(orderId: string, parcelIn?: Partial<Parcel>): Promise<{ parcel: Parcel; pickupPincode?: string; rates: CourierRate[] }> {
  const cfg = await requireConfig();
  const order = await loadShippableOrder(orderId);
  const parcel = cleanParcel(parcelIn ?? order.shipmozo?.parcel, defaultParcel(order, cfg));
  const { pin } = destination(order);
  const { pincode } = await pickupPoint(cfg);
  if (!pincode) throw new ShipmozoError("Pickup PIN code unknown. Set the warehouse / pickup PIN code in Admin → Shipping.");

  const data = await call(cfg, "POST", "rate-calculator", {
    order_id: "",
    pickup_pincode: Number(pincode),
    delivery_pincode: Number(pin),
    payment_type: isCod(order) ? "COD" : "PREPAID",
    shipment_type: "FORWARD",
    order_amount: order.total,
    type_of_package: "SPS",
    rov_type: "ROV_OWNER",
    cod_amount: isCod(order) ? String(order.total) : "",
    weight: Math.round(parcel.weightKg * 1000),
    dimensions: [{ no_of_box: "1", length: String(parcel.l), width: String(parcel.w), height: String(parcel.h) }],
  });
  const rows: unknown[] = Array.isArray(data) ? data : ((find(data, ["rates", "couriers", "courier_list", "data"]) as unknown[]) ?? []);
  const rates = (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      courierId: findText(r, ["courier_id", "id", "courier_company_id"]) ?? "",
      name: findText(r, ["name", "courier_name", "courier_company", "courier", "carrier_name"]) ?? "Courier",
      price: Number(find(r, ["total_charges", "total_charge", "total", "total_amount", "rate", "freight_charges", "charges"]) ?? NaN),
      eta: findText(r, ["estimated_delivery", "estimated_delivery_days", "expected_delivery_date", "edd", "tat", "delivery_days"]),
    }))
    .filter((r) => r.courierId && Number.isFinite(r.price))
    .sort((a, b) => a.price - b.price);
  return { parcel, pickupPincode: pincode, rates };
}

/** ShipMozo's own view of the order (AWB, courier, label) — used to recover after a half-finished booking. */
async function orderDetail(cfg: ShipmozoConfig, orderNumber: string): Promise<unknown> {
  try {
    return await call(cfg, "GET", `get-order-detail/${encodeURIComponent(orderNumber)}`);
  } catch (e) {
    console.warn(`[shipmozo] get-order-detail ${orderNumber}:`, (e as Error).message);
    return null;
  }
}

export interface ShipResult {
  awb: string;
  courierName: string;
  labelUrl?: string;
  pickupScheduled: boolean;
  pickupMessage?: string;
  order: Order;
}

/**
 * Books a courier for the order and stores the AWB. `courierId` comes from getRates(); without it
 * ShipMozo's auto-assign rules decide, falling back to the cheapest quote.
 */
export async function shipOrder(orderId: string, opts: { courierId?: string; parcel?: Partial<Parcel>; siteUrl?: string } = {}): Promise<ShipResult> {
  const cfg = await requireConfig();
  let order = await loadShippableOrder(orderId);
  if (order.trackingNumber) {
    return { awb: order.trackingNumber, courierName: order.courierName ?? "Courier", labelUrl: order.shipmozo?.labelUrl, pickupScheduled: !!order.shipmozo?.pickupScheduled, order };
  }

  order = await pushOrder(order.id, opts.parcel);
  const ref = order.orderNumber;

  let booked: unknown = null;
  // A previous attempt may have booked the courier but failed before saving the AWB.
  const before = await orderDetail(cfg, ref);
  if (findText(before, AWB_KEYS)) booked = before;

  if (!booked) {
    if (opts.courierId) {
      booked = await call(cfg, "POST", "assign-courier", { order_id: ref, courier_id: Number(opts.courierId) || opts.courierId });
    } else {
      try {
        booked = await call(cfg, "POST", "auto-assign-order", { order_id: ref });
      } catch (autoErr) {
        const { rates } = await getRates(order.id, order.shipmozo?.parcel).catch(() => ({ rates: [] as CourierRate[] }));
        if (!rates.length) throw autoErr;
        booked = await call(cfg, "POST", "assign-courier", { order_id: ref, courier_id: Number(rates[0].courierId) || rates[0].courierId });
      }
    }
  }

  let awb = findText(booked, AWB_KEYS);
  let detail: unknown = null;
  if (!awb) {
    detail = await orderDetail(cfg, ref);
    awb = findText(detail, AWB_KEYS);
  }
  if (!awb) throw new ShipmozoError(`ShipMozo accepted the courier request for ${ref} but returned no AWB yet. Check the order in the ShipMozo panel, then press Dispatch again to fetch it.`);
  const courierName = findText(booked, COURIER_KEYS) ?? findText(detail, COURIER_KEYS) ?? "ShipMozo";

  let pickupScheduled = false;
  let pickupMessage: string | undefined;
  try {
    const p = await call(cfg, "POST", "schedule-pickup", { order_id: ref });
    pickupScheduled = true;
    pickupMessage = findText(p, ["pickup_scheduled_date", "pickup_date", "message", "Info"]);
  } catch (e) {
    pickupMessage = (e as Error).message; // e.g. courier picks up automatically, or already scheduled
  }

  const labelUrl = httpUrl(findText(booked, LABEL_KEYS)) ?? httpUrl(findText(detail ?? (await orderDetail(cfg, ref)), LABEL_KEYS));
  const site = (opts.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const now = new Date().toISOString();

  const saved = await saveShipmozoInfo(
    order.id,
    { courierId: opts.courierId ?? findText(booked, ["courier_id", "courier_company_id"]), labelUrl, pickupScheduled, lastStatus: "SHIPMENT_CREATED" },
    {
      trackingNumber: awb,
      courierName,
      trackingUrl: site ? `${site}/track?q=${encodeURIComponent(order.orderNumber)}` : order.trackingUrl,
      status: order.status === "paid" ? "processing" : order.status,
    },
    `Courier booked on ShipMozo: ${courierName}, AWB ${awb}. ${pickupScheduled ? "Pickup scheduled" : "Pickup not scheduled"}${pickupMessage ? ` (${pickupMessage})` : ""}.`
  );

  const prev = await getDoc<ShipmentRecord>("shipments", `shp-${order.id}`);
  const parcel = saved?.shipmozo?.parcel ?? order.shipmozo?.parcel;
  await upsertDoc<ShipmentRecord>("shipments", {
    ...prev,
    id: `shp-${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    courierName,
    trackingNumber: awb,
    trackingUrl: saved?.trackingUrl,
    labelUrl,
    isLiveCourier: true,
    status: "SHIPMENT_CREATED",
    weight: parcel?.weightKg,
    dimensions: parcel ? `${parcel.l}x${parcel.w}x${parcel.h}` : undefined,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });

  return { awb, courierName, labelUrl, pickupScheduled, pickupMessage, order: saved ?? order };
}

/**
 * Picks up a courier booked directly in the ShipMozo panel: if ShipMozo has an AWB for an order we
 * pushed, store it here so tracking and customer updates work. Returns the AWB, if any.
 */
export async function fetchBookingFromPanel(order: Order, siteUrl?: string): Promise<string | undefined> {
  if (order.trackingNumber || !order.shipmozo?.pushedAt) return order.trackingNumber;
  const cfg = await requireConfig();
  const detail = await call(cfg, "GET", `get-order-detail/${encodeURIComponent(order.shipmozo.orderId)}`);
  const awb = findText(detail, AWB_KEYS);
  if (!awb) return undefined;
  const courierName = findText(detail, COURIER_KEYS) ?? "ShipMozo";
  const labelUrl = httpUrl(findText(detail, LABEL_KEYS));
  const site = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const now = new Date().toISOString();
  const saved = await saveShipmozoInfo(
    order.id,
    { labelUrl: labelUrl ?? order.shipmozo.labelUrl },
    { trackingNumber: awb, courierName, trackingUrl: site ? `${site}/track?q=${encodeURIComponent(order.orderNumber)}` : order.trackingUrl, status: order.status === "paid" ? "processing" : order.status },
    `Courier booked in the ShipMozo panel: ${courierName}, AWB ${awb}.`
  );
  const prev = await getDoc<ShipmentRecord>("shipments", `shp-${order.id}`);
  await upsertDoc<ShipmentRecord>("shipments", {
    ...prev,
    id: `shp-${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    courierName,
    trackingNumber: awb,
    trackingUrl: saved?.trackingUrl,
    labelUrl,
    isLiveCourier: true,
    status: prev?.status ?? "SHIPMENT_CREATED",
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });
  return awb;
}

/** Cancels the ShipMozo booking of a cancelled order (best effort; the courier must not have picked it up). */
export async function cancelShipment(order: Order): Promise<{ ok: boolean; message?: string }> {
  if (!order.shipmozo?.pushedAt) return { ok: true };
  const cfg = await getShipmozoConfig();
  if (!cfg) return { ok: false, message: "ShipMozo not configured" };
  try {
    await call(cfg, "POST", "cancel-order", { order_id: order.shipmozo.orderId, awb_number: order.trackingNumber ?? "" });
    await saveShipmozoInfo(order.id, { lastStatus: "CANCELLED" }, {}, "Cancelled on ShipMozo.");
    return { ok: true };
  } catch (e) {
    const message = (e as Error).message;
    await saveShipmozoInfo(order.id, {}, {}, `Could not cancel on ShipMozo: ${message} — cancel it in the ShipMozo panel.`).catch(() => {});
    return { ok: false, message };
  }
}

// ───────────────────────── Serviceability ─────────────────────────

const yes = (v: unknown) => v === true || ["1", "y", "yes", "true", "available"].includes(String(v ?? "").trim().toLowerCase());

/**
 * Whether any ShipMozo courier delivers from our pickup point to `deliveryPin` (cached 12 h).
 * Null when it can't be determined (not configured, ShipMozo down, unknown answer).
 */
export async function checkServiceability(deliveryPin: string): Promise<{ serviceable: boolean; cod?: boolean } | null> {
  const cfg = await getShipmozoConfig();
  if (!cfg) return null;
  const { pincode } = await pickupPoint(cfg);
  if (!pincode) return null;
  try {
    return await cached(`shipmozo:pin:${pincode}:${deliveryPin}`, 12 * 3_600_000, async () => {
      let data: unknown;
      try {
        data = await call(cfg, "POST", "pincode-serviceability", { pickup_pincode: Number(pincode), delivery_pincode: Number(deliveryPin) });
      } catch (e) {
        if (e instanceof ShipmozoError && /not serviceable|non[- ]?serviceable|not available|no courier/i.test(e.message)) return { serviceable: false };
        throw e;
      }
      if (Array.isArray(data)) {
        return { serviceable: data.length > 0, cod: data.some((c) => yes(find(c, ["cod", "cod_available", "is_cod_available", "cod_serviceable"]))) };
      }
      const flag = find(data, ["serviceable", "is_serviceable", "serviceability", "prepaid", "prepaid_available"]);
      const cod = find(data, ["cod", "cod_available", "is_cod_available", "cod_serviceable"]);
      if (flag === undefined && cod === undefined) throw new ShipmozoError("unrecognised serviceability answer");
      return { serviceable: flag === undefined ? yes(cod) : yes(flag), cod: cod === undefined ? undefined : yes(cod) };
    });
  } catch (e) {
    console.warn(`[shipmozo] serviceability ${deliveryPin}:`, (e as Error).message);
    return null;
  }
}

// ───────────────────────── Tracking ─────────────────────────

export interface TrackingInfo {
  status: string;
  courier?: string;
  expectedDelivery?: string;
  events: { date?: string; status: string; location?: string }[];
}

export async function trackAwb(awb: string, cfg?: ShipmozoConfig): Promise<TrackingInfo> {
  const c = cfg ?? (await requireConfig());
  const data = await call(c, "GET", `track-order?awb_number=${encodeURIComponent(awb)}`);
  const scans = find(data, ["scan_detail", "scan_details", "scans", "tracking_history", "shipment_track_activities", "history"]);
  const events = (Array.isArray(scans) ? scans : [])
    .map((s) => ({
      date: findText(s, ["date", "scan_date", "status_time", "date_time", "updated_at", "time"]),
      status: findText(s, ["status", "activity", "scan_status", "remark", "remarks", "description"]) ?? "",
      location: findText(s, ["location", "scan_location", "city"]),
    }))
    .filter((e) => e.status);
  return {
    status: findText(data, ["current_status", "shipment_status", "status", "tracking_status"]) ?? events[0]?.status ?? "",
    courier: findText(data, COURIER_KEYS),
    expectedDelivery: findText(data, ["expected_delivery_date", "edd", "estimated_delivery_date", "expected_date"]),
    events,
  };
}
