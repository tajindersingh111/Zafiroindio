// ============================================================
// Zafiro Admin — Core Data Types
// ============================================================

// ── Products ────────────────────────────────────────────────

export type ProductType = "simple" | "variable" | "digital" | "downloadable";
export type ProductStatus = "active" | "draft" | "archived";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type TaxClass = "standard" | "reduced" | "zero" | "none";

export interface ProductVariationAttribute {
  name: string;  // e.g. "Color"
  value: string; // e.g. "Black"
}

export interface ProductVariation {
  id: string;
  sku: string;
  attributes: ProductVariationAttribute[];
  price: number;
  salePrice?: number;
  stock: number;
  stockStatus: StockStatus;
  image?: string;
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
}

export interface CostBreakdown {
  fabricCost?: number;
  printingCost?: number;
  stitchingCost?: number;
  packagingCost?: number;
  otherCost?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  status: ProductStatus;
  description: string;
  shortDescription: string;
  sku: string;
  price: number;
  salePrice?: number;
  mrp?: number;
  costPrice?: number;
  costBreakdown?: CostBreakdown;
  categoryId: string;
  subcategoryId?: string;
  brandId?: string;
  tags: string[];
  images: string[];   // URL array; first is thumbnail
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
  taxClass: TaxClass;
  stock: number;
  stockStatus: StockStatus;
  lowStockThreshold: number;
  manageStock: boolean;
  backordersAllowed: boolean;
  codAllowed?: boolean;          // Whether Cash on Delivery is allowed for this product
  codShippingCharge?: number;    // Custom COD shipping charge for this product (e.g. ₹120)
  freeShipping?: boolean;        // Whether product is eligible for free shipping
  attributes: Record<string, string[]>; // e.g. { "Color": ["Black","White"], "Size": ["M","L"] }
  variations: ProductVariation[];       // populated for variable products
  createdAt: string;
  updatedAt: string;
}

// ── Categories & Brands ─────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description: string;
  image?: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  createdAt: string;
}

export interface Attribute {
  id: string;
  name: string;   // e.g. "Color"
  values: string[]; // e.g. ["Red","Blue","Green"]
  createdAt: string;
}

// ── Orders ──────────────────────────────────────────────────

export type OrderStatus =
  | "payment_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "payment_failed"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "return_requested"
  | "return_approved"
  | "returned"
  | "pending_payment"
  | "on_hold"
  | "completed"
  | "failed";

export type PaymentStatus = "pending" | "paid" | "failed" | "partially_paid" | "refunded" | "refund_pending";
export type PaymentMethod = "cod" | "upi" | "card" | "netbanking" | "wallet" | "gateway" | "partial" | "razorpay";

export interface OrderCostSnapshot {
  shippingCost?: number;
  paymentFee?: number;
  packagingCost?: number;
  marketingAttributionCost?: number;
  returnShippingCost?: number;
  refundAmount?: number;
  otherOrderCost?: number;
}

export interface OrderItem {
  productId: string;
  variationId?: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;          // unit price at time of order
  costPrice?: number;     // CRITICAL: COST SNAPSHOT AT TIME OF ORDER
  discount: number;       // per-item discount amount
  tax: number;            // per-item tax amount
  total: number;          // (price - discount + tax) * qty
  image?: string;
  attributes?: ProductVariationAttribute[];
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface OrderNote {
  id: string;
  note: string;
  isCustomerNote: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;    // null for guest orders
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  type: "retail" | "b2b";
  status: OrderStatus;
  items: OrderItem[];
  billing: Address;
  shipping: Address;
  couponCode?: string;
  couponDiscount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  costSnapshot?: OrderCostSnapshot;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  notes: OrderNote[];
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  shippingDate?: string;
  estimatedDelivery?: string;
  deliveredDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Customers ───────────────────────────────────────────────

export type CustomerType = "retail" | "b2b" | "guest";
export type CustomerStatus = "active" | "inactive" | "blocked";

export interface Customer {
  id: string;
  type: CustomerType;
  status: CustomerStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  billing?: Address;
  shipping?: Address;
  totalOrders: number;
  totalSpent: number;
  lastOrderId?: string;
  lastOrderDate?: string;
  registeredAt: string;
  updatedAt: string;
}

// ── Coupons ─────────────────────────────────────────────────

export type CouponType = "fixed_cart" | "percent" | "fixed_product";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  amount: number;             // value (% or ₹)
  minimumSpend?: number;
  maximumSpend?: number;
  usageLimit?: number;        // total uses
  usageLimitPerCustomer?: number;
  usageCount: number;
  startDate?: string;
  expiryDate?: string;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Payments ────────────────────────────────────────────────

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  date: string;
}

// ── Shipping ─────────────────────────────────────────────────

export type ShippingMethodType = "flat_rate" | "free" | "local_delivery" | "weight_based" | "store_pickup";

export interface ShippingMethod {
  id: string;
  type: ShippingMethodType;
  name: string;
  cost: number;
  freeAbove?: number;
  perKgRate?: number;
  isActive: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string[]; // country/state codes
  methods: ShippingMethod[];
  createdAt: string;
}

// ── Tax ─────────────────────────────────────────────────────

export interface TaxRate {
  id: string;
  taxClass: TaxClass;
  name: string;         // e.g. "GST 18%"
  country: string;
  state?: string;
  rate: number;         // percentage, e.g. 18
  isActive: boolean;
}

// ── Admin Users ─────────────────────────────────────────────

export type AdminRole =
  | "super_admin"
  | "order_manager"
  | "inventory_manager"
  | "marketing"
  | "b2b_sales";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  allowedSections?: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// ── Store Settings ───────────────────────────────────────────

export interface StoreSettings {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: Address;
  currency: string;
  currencySymbol: string;
  currencyPosition: "before" | "after";
  timezone: string;
  logoUrl?: string;
  lowStockThreshold: number;
  defaultCodFee?: number;
  defaultShippingFee?: number;
  freeShippingMinOrder?: number;
}

// ── Analytics ────────────────────────────────────────────────

export interface RevenuePoint {
  date: string;
  gross: number;
  net: number;
  orders: number;
}

// ── Expense & Profitability ───────────────────────────────────

export type ExpenseClassification = "product" | "order" | "marketing" | "operating";
export type ExpenseCategory = "business" | "sales_marketing" | "fulfillment" | "payment";
export type ExpenseAllocation = "equal" | "attribution" | "none";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  classification: ExpenseClassification;
  allocation: ExpenseAllocation;
  productId?: string;
  orderId?: string;
  notes?: string;
  expenseDate: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  previousCost: number;
  newCost: number;
  changedBy: string;
  reason: string;
  createdAt: string;
}

// ── Billing & Invoices ────────────────────────────────────────

export interface BusinessSnapshot {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: Address;
  gstin?: string;
  pan?: string;
  logoUrl?: string;
}

export interface CustomerInvoiceSnapshot {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billing: Address;
  shipping: Address;
}

export interface InvoiceItemSnapshot {
  productId: string;
  variationId?: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  attributes?: { name: string; value: string }[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  invoiceDate: string;
  businessSnapshot: BusinessSnapshot;
  customerSnapshot: CustomerInvoiceSnapshot;
  itemsSnapshot: InvoiceItemSnapshot[];
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Webhooks, Refunds, Returns & Shipments ────────────────────

export interface RefundRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string;
  status: "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";
  gatewayRefundId?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  status: "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "RECEIVED" | "COMPLETED";
  refundAmount: number;
  adminNotes?: string;
  requestedDate: string;
  approvedDate?: string;
  receivedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: "SHIPMENT_CREATED" | "PICKED_UP" | "IN_TRANSIT" | "REACHED_HUB" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "RTO" | "RETURNED";
  weight?: number;
  dimensions?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  provider: "razorpay" | "shiprocket" | "custom";
  eventType: string;
  processedAt: string;
  payloadSummary?: string;
}


