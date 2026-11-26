import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { rateLimit } from "@/lib/security/rate-limit";
import { checkServiceability } from "@/lib/shipping/shipmozo";

const METROS = ["Bengaluru", "Mumbai", "Delhi", "Jaipur", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad"];

type Place = { area: string; city: string; state: string } | null;

/** City / state for a PIN from India Post (cached a day; null if unknown or the API is down). */
function lookupPlace(pin: string): Promise<Place> {
  return cached(`pin-place:${pin}`, 24 * 3_600_000, async () => {
    try {
      const apiRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: AbortSignal.timeout(3500),
        headers: { "User-Agent": "ZafiroIndio/1.0" },
      });
      if (!apiRes.ok) return null;
      const data = await apiRes.json();
      const po = Array.isArray(data) && data[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
      return po ? { area: po.Name || po.Block || "", city: po.District || po.Division || "", state: po.State || "" } : null;
    } catch (err) {
      console.error("India Post PIN API fetch error:", err);
      return null;
    }
  });
}

/** Product page "check delivery": courier serviceability from ShipMozo, place name from India Post. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = await rateLimit(request, "pincode", { windowMs: 60_000, maxRequests: 30 });
  if (limited) return limited;

  const { code } = await params;
  const pin = (code || "").trim().replace(/\D/g, "");
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    return NextResponse.json({ available: false, message: "Please enter a valid 6-digit Indian PIN Code." }, { status: 400 });
  }

  const [place, courier] = await Promise.all([lookupPlace(pin), checkServiceability(pin)]);

  /**
   * ShipMozo's refusal is logged, not shown.
   *
   * On 26 Nov 2026 `pincode-serviceability` refused every PIN we tried — Mumbai, Delhi, Bengaluru,
   * Chennai, Kolkata, Pune, Chandigarh and Jaipur 302001, next door to our own pickup warehouse —
   * while the account itself reports as connected. Every shopper who checked their PIN was told we
   * don't deliver to them, which is the worst thing this page can say and is plainly untrue: we ship
   * pan-India and the courier is only picked at dispatch. Nothing else reads this answer (it gates no
   * order: see the single call site of checkServiceability), so an unverified "no" must not turn a
   * buyer away. Restore the refusal here once ShipMozo answers correctly for a known-good PIN.
   */
  if (courier && !courier.serviceable) {
    console.warn(`[pincode] ShipMozo says ${pin} is not serviceable — ignoring; check the ShipMozo account if this is real.`);
  }
  if (!place && !courier) {
    // Neither source answered (India Post down, ShipMozo not connected): accept any well-formed PIN.
    return NextResponse.json({ available: true, pincode: pin, estimatedDays: "3–5 business days", message: `Delivery available to PIN code ${pin} · Usually delivered in 3–5 business days` });
  }

  const isMetro = !!place && METROS.some((m) => `${place.city} ${place.state}`.toLowerCase().includes(m.toLowerCase()));
  const days = isMetro ? "2–3 business days" : "4–5 business days";
  const location = place ? [place.area, place.city, place.state].filter(Boolean).join(", ") : `PIN code ${pin}`;
  // Only from an answer we trust: while ShipMozo refuses every PIN, its COD flag is not worth quoting.
  const cod = courier?.serviceable ? courier.cod : undefined;
  const codNote = cod === false ? " · Cash on Delivery not available here (prepaid only)" : "";

  return NextResponse.json({
    available: true,
    pincode: pin,
    area: place?.area,
    city: place?.city,
    state: place?.state,
    location,
    estimatedDays: days,
    cod,
    message: `Delivery available to ${location} · Usually delivered in ${days}${codNote}`,
  });
}
