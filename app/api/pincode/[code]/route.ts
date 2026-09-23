import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const cleanCode = (code || "").trim().replace(/\D/g, "");

  if (cleanCode.length !== 6) {
    return NextResponse.json(
      { available: false, message: "Please enter a valid 6-digit Indian PIN Code." },
      { status: 400 }
    );
  }

  try {
    // Query Official India Post Postal PIN Code API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const apiRes = await fetch(`https://api.postalpincode.in/pincode/${cleanCode}`, {
      signal: controller.signal,
      headers: { "User-Agent": "ZafiroIndio/1.0" }
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data) && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const areaName = po.Name || po.Block || "";
        const city = po.District || po.Division || "";
        const state = po.State || "";
        const locationStr = [areaName, city, state].filter(Boolean).join(", ");

        // Determine estimated delivery timeline based on region
        const isMetro = ["Bengaluru", "Mumbai", "Delhi", "Jaipur", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad"].some(
          m => city.toLowerCase().includes(m.toLowerCase()) || state.toLowerCase().includes(m.toLowerCase())
        );

        const days = isMetro ? "2–3 business days" : "4–5 business days";
        const expressDays = isMetro ? "1–2 business days" : "2–3 business days";

        return NextResponse.json({
          available: true,
          pincode: cleanCode,
          area: areaName,
          city: city,
          state: state,
          location: locationStr,
          estimatedDays: days,
          expressDays: expressDays,
          message: `Delivery available to ${locationStr} · Usually delivered in ${days}`
        });
      }
    }
  } catch (err) {
    console.error("India Post PIN API fetch error:", err);
  }

  // Fallback heuristic for valid 6-digit PIN codes if Postal API is temporarily down
  if (/^[1-9][0-9]{5}$/.test(cleanCode)) {
    return NextResponse.json({
      available: true,
      pincode: cleanCode,
      estimatedDays: "3–5 business days",
      expressDays: "1–2 business days",
      message: `Delivery available to PIN code ${cleanCode} · Usually delivered in 3–5 business days`
    });
  }

  return NextResponse.json(
    { available: false, message: "PIN code not serviceable or invalid. Please check again." },
    { status: 404 }
  );
}
