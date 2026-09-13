import type { Product, StoreSettings } from "@/lib/db/types";

export interface ShippingCalculationResult {
  isAllowed: boolean;
  error?: string;
  baseShippingCost: number;
  codFee: number;
  totalShippingCost: number;
  isFreeShipping: boolean;
  freeShippingReason?: string;
}

export function calculateShippingAndCodFee(params: {
  items: { productId: string; quantity: number; price: number }[];
  productsMap: Map<string, Product>;
  paymentMethod: string;
  storeSettings?: StoreSettings;
}): ShippingCalculationResult {
  const { items, productsMap, paymentMethod, storeSettings } = params;

  const defaultShippingFee = storeSettings?.defaultShippingFee ?? 99;
  const defaultCodFee = storeSettings?.defaultCodFee ?? 60;
  const freeMinOrder = storeSettings?.freeShippingMinOrder ?? 2000;

  let subtotal = 0;
  let hasCodBlockedProduct = false;
  let blockedProductName = "";
  let allItemsHaveFreeShipping = items.length > 0;
  let customCodShippingTotal = 0;
  let hasCustomCodCharge = false;

  for (const item of items) {
    const product = productsMap.get(item.productId);
    const itemPrice = product?.salePrice ?? product?.price ?? item.price;
    subtotal += itemPrice * item.quantity;

    if (product) {
      // Check COD restriction
      if (product.codAllowed === false) {
        hasCodBlockedProduct = true;
        blockedProductName = product.name;
      }

      // Check Free Shipping restriction
      if (!product.freeShipping) {
        allItemsHaveFreeShipping = false;
      }

      // Custom Product COD Shipping Charge
      if (product.codShippingCharge !== undefined && product.codShippingCharge !== null && product.codShippingCharge > 0) {
        hasCustomCodCharge = true;
        customCodShippingTotal += Number(product.codShippingCharge) * item.quantity;
      }
    } else {
      allItemsHaveFreeShipping = false;
    }
  }

  // 1. Validate COD Eligibility
  const isCod = paymentMethod.toLowerCase() === "cod";
  if (isCod && hasCodBlockedProduct) {
    return {
      isAllowed: false,
      error: `Cash on Delivery (COD) is disabled for product: ${blockedProductName}. Please select an online payment method.`,
      baseShippingCost: 0,
      codFee: 0,
      totalShippingCost: 0,
      isFreeShipping: false
    };
  }

  // 2. Compute Base Shipping Fee
  let baseShippingCost = defaultShippingFee;
  let isFreeShipping = false;
  let freeShippingReason = "";

  if (allItemsHaveFreeShipping) {
    baseShippingCost = 0;
    isFreeShipping = true;
    freeShippingReason = "All items in cart qualify for Free Shipping";
  } else if (subtotal >= freeMinOrder) {
    baseShippingCost = 0;
    isFreeShipping = true;
    freeShippingReason = `Order subtotal (₹${subtotal.toLocaleString("en-IN")}) exceeds free shipping threshold (₹${freeMinOrder.toLocaleString("en-IN")})`;
  }

  // 3. Compute COD Fee / Custom Product COD Charge
  let codFee = 0;
  if (isCod) {
    if (hasCustomCodCharge) {
      codFee = customCodShippingTotal;
    } else {
      codFee = defaultCodFee;
    }
  }

  const totalShippingCost = baseShippingCost + codFee;

  return {
    isAllowed: true,
    baseShippingCost,
    codFee,
    totalShippingCost,
    isFreeShipping,
    freeShippingReason
  };
}
