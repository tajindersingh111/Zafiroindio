import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

export type BulkOrderInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  quantity: string;
  businessName?: string;
  notes?: string;
  status: "PENDING" | "CONTACTED" | "QUOTED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  adminNotes?: string;
};

const COLLECTION_NAME = "bulk_orders";

// Initial seed if empty
const seedInquiries: BulkOrderInquiry[] = [
  {
    id: "bulk-1727800001",
    name: "Rajesh Oberoi",
    email: "rajesh@oberoihotels.com",
    phone: "+91 98110 43210",
    category: "Bedsheets & Sheet Sets",
    quantity: "100 - 500 Pcs",
    businessName: "Oberoi Heritage Resort",
    notes: "Requires 300 Thread Count White Percale Cotton Single & Double Sets with custom block border print.",
    status: "CONTACTED",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    adminNotes: "Sent initial catalog & price list PDF via WhatsApp."
  },
  {
    id: "bulk-1727800002",
    name: "Pooja Malhotra",
    email: "pooja@malhotragifts.in",
    phone: "+91 98712 34567",
    category: "Pillow & Cushion Covers",
    quantity: "500+ Pcs",
    businessName: "Malhotra Corporate Gifts",
    notes: "Festive corporate Diwali gifting boxes with custom luxury ribbon packaging.",
    status: "QUOTED",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    adminNotes: "Quoted ₹450 per unit for 650 sets."
  }
];

function getInquiries(): BulkOrderInquiry[] {
  let list = readCollection<BulkOrderInquiry>(COLLECTION_NAME);
  if (!list || list.length === 0) {
    writeCollection(COLLECTION_NAME, seedInquiries);
    return seedInquiries;
  }
  return list;
}

// GET /api/bulk-orders
export async function GET() {
  try {
    const list = getInquiries();
    // Sort latest first
    const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ success: true, inquiries: sorted });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bulk order inquiries" }, { status: 500 });
  }
}

// POST /api/bulk-orders (Public submission from modal/page)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, category, quantity, businessName, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone number are required." }, { status: 400 });
    }

    const newInquiry: BulkOrderInquiry = {
      id: `bulk-${Date.now()}`,
      name: name.trim(),
      email: (email || "").trim(),
      phone: phone.trim(),
      category: category || "General Wholesale",
      quantity: quantity || "25-50 Pcs",
      businessName: (businessName || "").trim(),
      notes: (notes || "").trim(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const currentList = getInquiries();
    const updatedList = [newInquiry, ...currentList];
    writeCollection(COLLECTION_NAME, updatedList);

    return NextResponse.json({
      success: true,
      message: "Bulk order inquiry submitted successfully.",
      inquiry: newInquiry
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error while saving inquiry." }, { status: 500 });
  }
}

// PATCH /api/bulk-orders (Admin update status or notes)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
    }

    const currentList = getInquiries();
    const index = currentList.findIndex((item) => item.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    if (status) currentList[index].status = status;
    if (adminNotes !== undefined) currentList[index].adminNotes = adminNotes;

    writeCollection(COLLECTION_NAME, currentList);

    return NextResponse.json({
      success: true,
      message: "Inquiry updated successfully.",
      inquiry: currentList[index]
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update inquiry." }, { status: 500 });
  }
}

// DELETE /api/bulk-orders (Admin delete inquiry)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
    }

    const currentList = getInquiries();
    const updatedList = currentList.filter((item) => item.id !== id);
    writeCollection(COLLECTION_NAME, updatedList);

    return NextResponse.json({ success: true, message: "Inquiry deleted successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete inquiry." }, { status: 500 });
  }
}
