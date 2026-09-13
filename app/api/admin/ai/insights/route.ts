import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    sales: [
      "Bedsheet sales increased by 28% over the past 14 days, driven by Jaipur Botanical Bloom.",
      "AOV reached ₹2,840, representing an 8% gain month-over-month.",
    ],
    products: [
      " Begonia Hand Block Rug stock is below threshold (8 units remaining). Restock recommended.",
      "Cleopatra Golden Bloom Bedsheet is currently the top-converting product (4.8 rating).",
    ],
    customers: [
      "B2B Homestay accounts generated ₹269,000 in August volume.",
      "Repeat customer retention rate is holding steady at 38%.",
    ],
  });
}
