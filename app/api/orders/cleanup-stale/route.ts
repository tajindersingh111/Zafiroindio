import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secretKey = process.env.CRON_SECRET || process.env.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET;

    if (secretKey && authHeader !== `Bearer ${secretKey}`) {
      const headerSecret = request.headers.get("x-cron-secret");
      if (headerSecret !== secretKey) {
        return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const minutes = Math.max(5, Number(searchParams.get("minutes") || 30));
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    const staleOrders = await prisma.order.findMany({
      where: {
        status: "payment_pending",
        createdAt: { lt: cutoffTime }
      },
      include: { items: true }
    });

    if (staleOrders.length === 0) {
      return NextResponse.json({ success: true, cancelledCount: 0, message: "No stale pending orders found." });
    }

    let restoredItemsCount = 0;

    for (const order of staleOrders) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "cancelled", cancelReason: "Stale pending checkout timeout" }
        });

        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity }
              }
            }).catch(() => {});
            restoredItemsCount += item.quantity;
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      cancelledOrdersCount: staleOrders.length,
      restoredItemsCount,
      cutoffTime: cutoffTime.toISOString()
    });
  } catch (error: any) {
    console.error("Cleanup stale orders error:", error);
    return NextResponse.json({ error: error?.message || "Stale cleanup error." }, { status: 500 });
  }
}
