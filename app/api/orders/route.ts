import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAdminSession } from "@/lib/auth/session";

// GET /api/orders - Authenticated retrieval of orders from Prisma DB
export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSession(request);
    
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized access. Session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          payments: true
        }
      }),
      prisma.order.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching orders." },
      { status: 500 }
    );
  }
}

// Order creation is ONLY permitted via verified Shiprocket Webhook (/api/webhooks/shiprocket-checkout)
export async function POST() {
  return NextResponse.json(
    {
      error: "Direct order placement via client is disabled. Orders are processed securely via Shiprocket Checkout."
    },
    { status: 405 }
  );
}
