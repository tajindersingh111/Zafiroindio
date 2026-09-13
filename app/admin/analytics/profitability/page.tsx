"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Package,
  Layers,
  BarChart3,
  Calculator,
  ShieldAlert,
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Info
} from "lucide-react";
import type {
  GlobalProfitabilitySummary,
  ProductProfitabilitySummary,
  OrderProfitabilityBreakdown
} from "@/lib/analytics/profitability";

export default function ProfitabilityDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [globalData, setGlobalData] = useState<GlobalProfitabilitySummary | null>(null);
  const [productSummaries, setProductSummaries] = useState<ProductProfitabilitySummary[]>([]);
  const [orderBreakdowns, setOrderBreakdowns] = useState<OrderProfitabilityBreakdown[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("netProfitDesc");
  const [showSimulator, setShowSimulator] = useState(false);

  // Price Simulator state
  const [simSellingPrice, setSimSellingPrice] = useState("2499");
  const [simDiscount, setSimDiscount] = useState("300");
  const [simCost, setSimCost] = useState("850");
  const [simShipping, setSimShipping] = useState("120");
  const [simGateway, setSimGateway] = useState("50");
  const [simMarketing, setSimMarketing] = useState("200");
  const [simOther, setSimOther] = useState("50");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/profitability");
      const data = await res.json();
      if (res.ok) {
        setGlobalData(data.global);
        setProductSummaries(data.products || []);
        setOrderBreakdowns(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch profitability analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Sorting products
  const sortedProducts = [...productSummaries].filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case "netProfitDesc":
        return b.netProfit - a.netProfit;
      case "netProfitAsc":
        return a.netProfit - b.netProfit;
      case "grossProfitDesc":
        return b.grossProfit - a.grossProfit;
      case "grossMarginDesc":
        return b.grossMarginPercent - a.grossMarginPercent;
      case "grossMarginAsc":
        return a.grossMarginPercent - b.grossMarginPercent;
      case "revenueDesc":
        return b.netRevenue - a.netRevenue;
      case "unitsSoldDesc":
        return b.unitsSold - a.unitsSold;
      default:
        return b.netProfit - a.netProfit;
    }
  });

  // Profitability Calculator Computation
  const simPriceNum = parseFloat(simSellingPrice) || 0;
  const simDiscountNum = parseFloat(simDiscount) || 0;
  const simNetRev = Math.max(0, simPriceNum - simDiscountNum);
  const simCostNum = parseFloat(simCost) || 0;
  const simGrossProfit = simNetRev - simCostNum;
  const simGrossMargin = simNetRev > 0 ? Math.round((simGrossProfit / simNetRev) * 1000) / 10 : 0;

  const simShippingNum = parseFloat(simShipping) || 0;
  const simGatewayNum = parseFloat(simGateway) || 0;
  const simMarketingNum = parseFloat(simMarketing) || 0;
  const simOtherNum = parseFloat(simOther) || 0;
  const simTotalDirectCosts = simShippingNum + simGatewayNum + simMarketingNum + simOtherNum;

  const simNetProfit = simGrossProfit - simTotalDirectCosts;
  const simNetMargin = simNetRev > 0 ? Math.round((simNetProfit / simNetRev) * 1000) / 10 : 0;
  const simBreakEvenPrice = simCostNum + simTotalDirectCosts;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/30 pb-5">
        <div>
          <h1 className="text-3xl font-serif tracking-wide text-amber-100 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-400" />
            Product Profitability & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real backend cost accounting across COGS, shipping, gateway fees, ad spend, and net margins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulator(true)}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium px-4 py-2 rounded-lg border border-amber-500/30 transition-all text-sm"
          >
            <Calculator className="w-4 h-4 text-amber-400" /> Launch Price Simulator
          </button>
          <button
            onClick={fetchAnalytics}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Global Financial Metrics Cards */}
      {globalData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              Net Realized Revenue
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-2 font-mono">
              ₹{globalData.totalNetRevenue.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Gross ₹{globalData.totalGrossRevenue.toLocaleString("en-IN")} - Discounts ₹{globalData.totalDiscounts.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              Cost of Goods Sold (COGS)
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-2 font-mono">
              ₹{globalData.totalCOGS.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-400 mt-1">Product manufacturing/procurement cost</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              Gross Profit & Margin
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300 mt-2 font-mono">
              ₹{globalData.totalGrossProfit.toLocaleString("en-IN")}
            </div>
            <div className="text-xs font-semibold text-cyan-400 mt-1">
              Gross Margin: {globalData.grossMarginPercent}%
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              Net Profit & Net Margin
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl font-bold mt-2 font-mono ${globalData.totalNetProfit >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
              ₹{globalData.totalNetProfit.toLocaleString("en-IN")}
            </div>
            <div className={`text-xs font-semibold mt-1 ${globalData.netMarginPercent >= 20 ? "text-emerald-400" : globalData.netMarginPercent >= 0 ? "text-amber-400" : "text-rose-400"}`}>
              Net Margin: {globalData.netMarginPercent}%
            </div>
          </div>
        </div>
      )}

      {/* Expense Allocation Breakdown */}
      {globalData && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" /> Overhead & Expense Accounting Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Operating Expenses</div>
              <div className="text-sm font-mono font-bold text-slate-200 mt-1">₹{globalData.operatingExpenses.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Marketing & Ads</div>
              <div className="text-sm font-mono font-bold text-purple-300 mt-1">₹{globalData.marketingExpenses.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Shipping & Courier</div>
              <div className="text-sm font-mono font-bold text-amber-300 mt-1">₹{globalData.shippingExpenses.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Payment Gateway Fees</div>
              <div className="text-sm font-mono font-bold text-emerald-300 mt-1">₹{globalData.paymentFees.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Returns & Exchanges</div>
              <div className="text-sm font-mono font-bold text-rose-300 mt-1">₹{globalData.returnsCost.toLocaleString("en-IN")}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Refunds Issued</div>
              <div className="text-sm font-mono font-bold text-rose-400 mt-1">₹{globalData.refundsTotal.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Valuation Section */}
      {globalData && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-900/30 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-serif text-amber-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> Stock Inventory Valuation
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Calculated using true unit manufacturing cost rather than retail selling price.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Total Units</span>
              <span className="text-slate-200 font-bold">{globalData.inventoryTotalUnits.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Cost Value (COGS)</span>
              <span className="text-amber-300 font-bold">₹{globalData.inventoryCostValue.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Potential Retail Value</span>
              <span className="text-slate-300 font-bold">₹{globalData.potentialRetailValue.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Potential Gross Profit</span>
              <span className="text-emerald-400 font-bold">₹{globalData.potentialGrossProfit.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Profitability Table & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-serif text-amber-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" /> Product Profitability Breakdown
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search product or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
            >
              <option value="netProfitDesc">Sort: Highest Net Profit</option>
              <option value="netProfitAsc">Sort: Least Profitable</option>
              <option value="grossProfitDesc">Sort: Highest Gross Profit</option>
              <option value="grossMarginDesc">Sort: Highest Gross Margin %</option>
              <option value="grossMarginAsc">Sort: Lowest Gross Margin %</option>
              <option value="revenueDesc">Sort: Highest Net Revenue</option>
              <option value="unitsSoldDesc">Sort: Most Units Sold</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Product Name & SKU</th>
                  <th className="py-3.5 px-4 text-center">Units Sold</th>
                  <th className="py-3.5 px-4 text-right">Net Revenue</th>
                  <th className="py-3.5 px-4 text-right">Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Total COGS</th>
                  <th className="py-3.5 px-4 text-right">Gross Profit</th>
                  <th className="py-3.5 px-4 text-right">Gross Margin</th>
                  <th className="py-3.5 px-4 text-right">Direct Expenses</th>
                  <th className="py-3.5 px-4 text-right">Net Profit</th>
                  <th className="py-3.5 px-4 text-right">Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                      Calculating product profitability metrics...
                    </td>
                  </tr>
                ) : sortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-sans">
                        <div className="font-medium text-slate-100">{p.productName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {p.sku || p.productId}</div>
                        {p.isLossMaking && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold mt-1 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                            <ShieldAlert className="w-3 h-3" /> ⚠️ Loss-Making Product
                          </span>
                        )}
                        {!p.isLossMaking && p.lowMarginWarning && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold mt-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                            <AlertTriangle className="w-3 h-3" /> Low Margin (&lt;30%)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">
                        {p.unitsSold}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-200">
                        ₹{p.netRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right text-amber-400">
                        ₹{p.currentCost.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-300">
                        ₹{p.cogs.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-cyan-300">
                        ₹{p.grossProfit.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-cyan-400">
                        {p.grossMarginPercent}%
                      </td>
                      <td className="py-4 px-4 text-right text-purple-300">
                        ₹{p.directExpenses.toLocaleString("en-IN")}
                      </td>
                      <td className={`py-4 px-4 text-right font-bold text-base ${p.netProfit >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                        ₹{p.netProfit.toLocaleString("en-IN")}
                      </td>
                      <td className={`py-4 px-4 text-right font-bold ${p.netMarginPercent >= 20 ? "text-emerald-400" : p.netMarginPercent >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                        {p.netMarginPercent}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Price Simulator Modal */}
      {showSimulator && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-900/40 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-serif text-amber-100 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-amber-400" /> Product Profitability & Price Simulator
              </h3>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Cost & Pricing Parameters</h4>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={simSellingPrice}
                    onChange={(e) => setSimSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Applied Discount (₹)</label>
                  <input
                    type="number"
                    value={simDiscount}
                    onChange={(e) => setSimDiscount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Product Manufacturing Cost (₹)</label>
                  <input
                    type="number"
                    value={simCost}
                    onChange={(e) => setSimCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Shipping Cost (₹)</label>
                    <input
                      type="number"
                      value={simShipping}
                      onChange={(e) => setSimShipping(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Payment Fee (₹)</label>
                    <input
                      type="number"
                      value={simGateway}
                      onChange={(e) => setSimGateway(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Marketing Cost (₹)</label>
                    <input
                      type="number"
                      value={simMarketing}
                      onChange={(e) => setSimMarketing(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Other Costs (₹)</label>
                    <input
                      type="number"
                      value={simOther}
                      onChange={(e) => setSimOther(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Calculation Results */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
                    Live Profitability Analysis
                  </h4>

                  <div className="space-y-2.5 mt-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Realized Revenue:</span>
                      <span className="font-bold text-slate-200">₹{simNetRev.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Gross Profit:</span>
                      <span className="font-bold text-cyan-300">₹{simGrossProfit.toLocaleString("en-IN")} ({simGrossMargin}%)</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Direct Overhead Costs:</span>
                      <span className="text-purple-300">₹{simTotalDirectCosts.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-800 pt-2 text-base">
                      <span className="text-slate-300 font-sans font-bold">Estimated Net Profit:</span>
                      <span className={`font-bold ${simNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹{simNetProfit.toLocaleString("en-IN")} ({simNetMargin}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-amber-900/40 p-3 rounded-lg space-y-1">
                  <div className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" /> Minimum Break-Even Selling Price
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-200">
                    ₹{simBreakEvenPrice.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Price needed to cover COGS (₹{simCostNum}) and direct expenses (₹{simTotalDirectCosts}).
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSimulator(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-sm transition-all"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
