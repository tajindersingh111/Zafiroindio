import type { Order, OrderItem, Product, Expense } from "@/lib/db/types";

export interface ItemProfitabilityBreakdown {
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitCostPrice: number;
  grossRevenue: number;
  discount: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  costSource: "snapshot" | "product_catalog" | "zero_estimate";
}

export interface OrderProfitabilityBreakdown {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  status: string;
  itemCount: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  
  // Direct Costs
  shippingCost: number;
  paymentFee: number;
  packagingCost: number;
  marketingAttribution: number;
  returnCost: number;
  refundAmount: number;
  otherOrderCost: number;
  totalDirectCosts: number;
  
  // Allocated Operating Expense
  allocatedOperatingExpense: number;

  // Net Results
  netProfit: number;
  netMarginPercent: number;
  
  isLossMaking: boolean;
  lowMarginWarning: boolean;
  itemBreakdown: ItemProfitabilityBreakdown[];
}

export interface ProductProfitabilitySummary {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentPrice: number;
  currentCost: number;
  unitsSold: number;
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  directExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  inventoryUnits: number;
  inventoryCostValue: number;
  potentialRetailValue: number;
  potentialGrossProfit: number;
  isLossMaking: boolean;
  lowMarginWarning: boolean;
}

export interface GlobalProfitabilitySummary {
  totalGrossRevenue: number;
  totalDiscounts: number;
  totalNetRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  grossMarginPercent: number;
  
  // Expenses Breakdown
  operatingExpenses: number;
  marketingExpenses: number;
  shippingExpenses: number;
  paymentFees: number;
  returnsCost: number;
  refundsTotal: number;
  totalExpenses: number;
  
  totalNetProfit: number;
  netMarginPercent: number;

  inventoryTotalUnits: number;
  inventoryCostValue: number;
  potentialRetailValue: number;
  potentialGrossProfit: number;
}

/** Calculate Item Level Profitability */
export function calculateItemProfitability(
  item: OrderItem,
  productsMap: Map<string, Product>
): ItemProfitabilityBreakdown {
  const product = productsMap.get(item.productId);
  let unitCost = item.costPrice;
  let costSource: "snapshot" | "product_catalog" | "zero_estimate" = "snapshot";

  if (unitCost === undefined || unitCost === null) {
    if (product && product.costPrice !== undefined) {
      unitCost = product.costPrice;
      costSource = "product_catalog";
    } else {
      unitCost = 0;
      costSource = "zero_estimate";
    }
  }

  const grossRevenue = item.price * item.quantity;
  const discount = (item.discount || 0) * item.quantity;
  const netRevenue = grossRevenue - discount;
  const cogs = unitCost * item.quantity;
  const grossProfit = netRevenue - cogs;
  const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

  return {
    productId: item.productId,
    productName: item.name,
    quantity: item.quantity,
    unitSellingPrice: item.price,
    unitCostPrice: unitCost,
    grossRevenue,
    discount,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPercent,
    costSource
  };
}

/** Calculate Order Level Profitability */
export function calculateOrderProfitability(
  order: Order,
  productsMap: Map<string, Product>,
  allocatedOpExpensePerOrder = 0
): OrderProfitabilityBreakdown {
  const itemBreakdowns = order.items.map((item) => calculateItemProfitability(item, productsMap));

  const grossRevenue = itemBreakdowns.reduce((acc, i) => acc + i.grossRevenue, 0);
  const itemDiscounts = itemBreakdowns.reduce((acc, i) => acc + i.discount, 0);
  const couponDiscount = order.discount || order.couponDiscount || 0;
  const totalDiscount = itemDiscounts + couponDiscount;
  
  const netRevenue = Math.max(0, grossRevenue - totalDiscount);
  const cogs = itemBreakdowns.reduce((acc, i) => acc + i.cogs, 0);
  const grossProfit = netRevenue - cogs;
  const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

  // Direct Costs
  const shippingCost = order.costSnapshot?.shippingCost ?? order.shippingCost ?? 120;
  const paymentFee = order.costSnapshot?.paymentFee ?? (order.paymentMethod === "cod" ? 60 : Math.round(netRevenue * 0.02));
  const packagingCost = order.costSnapshot?.packagingCost ?? 50;
  const marketingAttribution = order.costSnapshot?.marketingAttributionCost ?? 0;
  const returnCost = order.costSnapshot?.returnShippingCost ?? 0;
  const refundAmount = order.costSnapshot?.refundAmount ?? (order.status === "refunded" ? netRevenue : 0);
  const otherOrderCost = order.costSnapshot?.otherOrderCost ?? 0;

  const totalDirectCosts = shippingCost + paymentFee + packagingCost + marketingAttribution + returnCost + otherOrderCost;
  const netProfit = grossProfit - totalDirectCosts - (refundAmount > 0 ? refundAmount : 0) - allocatedOpExpensePerOrder;
  const netMarginPercent = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    orderDate: order.createdAt,
    customerName: order.customerName,
    status: order.status,
    itemCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
    grossRevenue,
    totalDiscount,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPercent,
    shippingCost,
    paymentFee,
    packagingCost,
    marketingAttribution,
    returnCost,
    refundAmount,
    otherOrderCost,
    totalDirectCosts,
    allocatedOperatingExpense: allocatedOpExpensePerOrder,
    netProfit,
    netMarginPercent,
    isLossMaking: netProfit < 0,
    lowMarginWarning: grossMarginPercent < 30,
    itemBreakdown: itemBreakdowns
  };
}

/** Calculate Product Profitability across catalog */
export function calculateProductProfitabilitySummaries(
  products: Product[],
  orders: Order[],
  expenses: Expense[]
): ProductProfitabilitySummary[] {
  const productsMap = new Map<string, Product>(products.map((p) => [p.id, p]));
  const orderBreakdowns = orders.map((o) => calculateOrderProfitability(o, productsMap));

  const productStats = new Map<string, {
    unitsSold: number;
    grossRevenue: number;
    discounts: number;
    netRevenue: number;
    cogs: number;
  }>();

  orderBreakdowns.forEach((ob) => {
    ob.itemBreakdown.forEach((ib) => {
      const existing = productStats.get(ib.productId) || {
        unitsSold: 0,
        grossRevenue: 0,
        discounts: 0,
        netRevenue: 0,
        cogs: 0
      };
      existing.unitsSold += ib.quantity;
      existing.grossRevenue += ib.grossRevenue;
      existing.discounts += ib.discount;
      existing.netRevenue += ib.netRevenue;
      existing.cogs += ib.cogs;
      productStats.set(ib.productId, existing);
    });
  });

  // Calculate Product-specific direct expenses
  const productExpenses = new Map<string, number>();
  expenses.forEach((e) => {
    if (e.classification === "product" && e.productId) {
      productExpenses.set(e.productId, (productExpenses.get(e.productId) || 0) + e.amount);
    }
  });

  return products.map((p) => {
    const stats = productStats.get(p.id) || { unitsSold: 0, grossRevenue: 0, discounts: 0, netRevenue: 0, cogs: 0 };
    const directExp = productExpenses.get(p.id) || 0;

    const grossProfit = stats.netRevenue - stats.cogs;
    const grossMarginPercent = stats.netRevenue > 0 ? Math.round((grossProfit / stats.netRevenue) * 1000) / 10 : 0;

    const netProfit = grossProfit - directExp;
    const netMarginPercent = stats.netRevenue > 0 ? Math.round((netProfit / stats.netRevenue) * 1000) / 10 : 0;

    const currentCost = p.costPrice || 0;
    const inventoryUnits = p.stock || 0;
    const inventoryCostValue = inventoryUnits * currentCost;
    const potentialRetailValue = inventoryUnits * (p.salePrice || p.price);
    const potentialGrossProfit = potentialRetailValue - inventoryCostValue;

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.categoryId,
      currentPrice: p.price,
      currentCost,
      unitsSold: stats.unitsSold,
      grossRevenue: stats.grossRevenue,
      discounts: stats.discounts,
      netRevenue: stats.netRevenue,
      cogs: stats.cogs,
      grossProfit,
      grossMarginPercent,
      directExpenses: directExp,
      netProfit,
      netMarginPercent,
      inventoryUnits,
      inventoryCostValue,
      potentialRetailValue,
      potentialGrossProfit,
      isLossMaking: netProfit < 0 && stats.unitsSold > 0,
      lowMarginWarning: grossMarginPercent < 30 && stats.unitsSold > 0
    };
  });
}

/** Calculate Global Store Profitability */
export function calculateGlobalProfitability(
  products: Product[],
  orders: Order[],
  expenses: Expense[]
): GlobalProfitabilitySummary {
  const productsMap = new Map<string, Product>(products.map((p) => [p.id, p]));
  
  // Calculate total operating expenses
  const operatingExpenses = expenses
    .filter((e) => e.classification === "operating")
    .reduce((acc, e) => acc + e.amount, 0);

  const marketingExpenses = expenses
    .filter((e) => e.classification === "marketing" || e.category === "sales_marketing")
    .reduce((acc, e) => acc + e.amount, 0);

  const completedOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "failed");
  const allocatedOpPerOrder = completedOrders.length > 0 ? operatingExpenses / completedOrders.length : 0;

  const orderBreakdowns = orders.map((o) => calculateOrderProfitability(o, productsMap, allocatedOpPerOrder));

  const totalGrossRevenue = orderBreakdowns.reduce((acc, o) => acc + o.grossRevenue, 0);
  const totalDiscounts = orderBreakdowns.reduce((acc, o) => acc + o.totalDiscount, 0);
  const totalNetRevenue = orderBreakdowns.reduce((acc, o) => acc + o.netRevenue, 0);
  const totalCOGS = orderBreakdowns.reduce((acc, o) => acc + o.cogs, 0);
  const totalGrossProfit = totalNetRevenue - totalCOGS;
  const grossMarginPercent = totalNetRevenue > 0 ? Math.round((totalGrossProfit / totalNetRevenue) * 1000) / 10 : 0;

  const shippingExpenses = orderBreakdowns.reduce((acc, o) => acc + o.shippingCost, 0);
  const paymentFees = orderBreakdowns.reduce((acc, o) => acc + o.paymentFee, 0);
  const returnsCost = orderBreakdowns.reduce((acc, o) => acc + o.returnCost, 0);
  const refundsTotal = orderBreakdowns.reduce((acc, o) => acc + o.refundAmount, 0);

  const otherDirectExpenses = expenses
    .filter((e) => e.classification === "product")
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = operatingExpenses + marketingExpenses + shippingExpenses + paymentFees + returnsCost + otherDirectExpenses;
  const totalNetProfit = totalGrossProfit - totalExpenses - refundsTotal;
  const netMarginPercent = totalNetRevenue > 0 ? Math.round((totalNetProfit / totalNetRevenue) * 1000) / 10 : 0;

  // Inventory Valuation
  const inventoryTotalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const inventoryCostValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.costPrice || 0)), 0);
  const potentialRetailValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.salePrice || p.price)), 0);
  const potentialGrossProfit = potentialRetailValue - inventoryCostValue;

  return {
    totalGrossRevenue,
    totalDiscounts,
    totalNetRevenue,
    totalCOGS,
    totalGrossProfit,
    grossMarginPercent,
    operatingExpenses,
    marketingExpenses,
    shippingExpenses,
    paymentFees,
    returnsCost,
    refundsTotal,
    totalExpenses,
    totalNetProfit,
    netMarginPercent,
    inventoryTotalUnits,
    inventoryCostValue,
    potentialRetailValue,
    potentialGrossProfit
  };
}

/** Profitability Price Simulator & Break-Even Calculator */
export function simulatePricing(params: {
  sellingPrice: number;
  discount?: number;
  productCost: number;
  shippingCost?: number;
  paymentFee?: number;
  marketingCost?: number;
  otherCosts?: number;
}) {
  const sellingPrice = Number(params.sellingPrice) || 0;
  const discount = Number(params.discount) || 0;
  const netRevenue = Math.max(0, sellingPrice - discount);
  const cogs = Number(params.productCost) || 0;
  const grossProfit = netRevenue - cogs;
  const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

  const shipping = Number(params.shippingCost) || 120;
  const gatewayFee = Number(params.paymentFee) || Math.round(netRevenue * 0.02);
  const marketing = Number(params.marketingCost) || 200;
  const other = Number(params.otherCosts) || 50;

  const totalDirectCosts = shipping + gatewayFee + marketing + other;
  const netProfit = grossProfit - totalDirectCosts;
  const netMarginPercent = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;

  const minBreakEvenPrice = cogs + totalDirectCosts;

  return {
    sellingPrice,
    discount,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPercent,
    totalDirectCosts,
    netProfit,
    netMarginPercent,
    minBreakEvenPrice,
    isLossMaking: netProfit < 0,
    lowMarginWarning: grossMarginPercent < 30
  };
}
