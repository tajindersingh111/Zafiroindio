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

  if (courier && !courier.serviceable) {
    return NextResponse.json({ available: false, pincode: pin, message: "Sorry, our couriers don't deliver to this PIN code yet. Please try another address." });
  }
  if (!place && !courier) {
    // Neither source answered (India Post down, ShipMozo not connected): accept any well-formed PIN.
    return NextResponse.json({ available: true, pincode: pin, estimatedDays: "3–5 business days", message: `Delivery available to PIN code ${pin} · Usually delivered in 3–5 business days` });
  }

  const isMetro = !!place && METROS.some((m) => `${place.city} ${place.state}`.toLowerCase().includes(m.toLowerCase()));
  const days = isMetro ? "2–3 business days" : "4–5 business days";
  const location = place ? [place.area, place.city, place.state].filter(Boolean).join(", ") : `PIN code ${pin}`;
  const codNote = courier?.cod === false ? " · Cash on Delivery not available here (prepaid only)" : "";

  return NextResponse.json({
    available: true,
    pincode: pin,
    area: place?.area,
    city: place?.city,
    state: place?.state,
    location,
    estimatedDays: days,
    cod: courier?.cod,
    message: `Delivery available to ${location} · Usually delivered in ${days}${codNote}`,
  });
}
