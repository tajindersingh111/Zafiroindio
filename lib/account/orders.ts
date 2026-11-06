import type { Address, Order, OrderStatus, PaymentMethod, PaymentStatus, ProductVariationAttribute } from "@/lib/db/types";

/**
 * What a shopper may see about their own order.
 *
 * Shared by /api/account/orders and the account pages that render it, so the two cannot drift. The
 * shipping address is included (it is theirs); staff-only notes and cost prices are not.
 */
export interface MyOrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  attributes?: ProductVariationAttribute[];
}

export interface MyOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  shipping: Address;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingDate?: string;
  deliveredDate?: string;
  items: MyOrderItem[];
  notes: { note: string; createdAt: string }[];
}

export function toMyOrder(order: Order): MyOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    // Their own name and number, so the detail page can show who it ships to.
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    couponCode: order.couponCode,
    total: order.total,
    shipping: order.shipping,
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery,
    shippingDate: order.shippingDate,
    deliveredDate: order.deliveredDate,
    items: (order.items || []).map((i) => ({
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
      image: i.image,
      attributes: i.attributes,
    })),
    // Only notes the staff marked as customer-visible.
    notes: (order.notes || []).filter((n) => n.isCustomerNote).map((n) => ({ note: n.note, createdAt: n.createdAt })),
  };
}

/** Orders a shopper may still cancel themselves. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["payment_pending", "pending_payment", "paid", "processing", "on_hold"];
