"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner } from "@/components/admin/Shared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RestockRec {
  id: string;
  name: string;
  sku: string;
  stock: number;
  dailyVelocity: number;
  daysRemaining: number;
  recommendedQty: number;
}

interface ForecastResponse {
  forecast30d: {
    revenueMin: number; revenueMax: number;
    ordersMin: number; ordersMax: number;
    soldMin: number; soldMax: number;
    aovMin: number; aovMax: number;
  };
  restockRecommendations: RestockRec[];
  seasonalTrends: string[];
  chartData: any[];
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function AIForecastingPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai/forecast")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <PageShell><LoadingSpinner /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="AI Sales & Restock Forecasting" subtitle="Expected sales volumes, product demand velocities, and stock replenishment recommendations." />

      {/* Chart: Actual vs Forecast */}
      <SectionCard title="Revenue Trend: Actual vs AI Forecast Range">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#a99d8020" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: unknown) => [v ? fmt(Number(v)) : "—"]} />
              <Legend />
              {/* Actual Line */}
              <Line type="monotone" dataKey="actual" stroke="#212f52" strokeWidth={2.5} name="Actual Monthly Revenue" activeDot={{ r: 6 }} connectNulls />
              {/* Forecast Min/Max */}
              <Line type="monotone" dataKey="forecastMin" stroke="#a83a26" strokeDasharray="5 5" name="Forecast Min Estimate" connectNulls />
              <Line type="monotone" dataKey="forecastMax" stroke="green" strokeDasharray="5 5" name="Forecast Max Estimate" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-stone mt-2 italic text-center">Charts display actual historical sales revenue plotted alongside projected range estimates.</p>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Restocks Table */}
        <SectionCard title="Restock Recommendations Audit" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Product", "Stock", "Daily Velocity", "Est. Days Left", "Recommended Qty"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.restockRecommendations.map((rec) => (
                <tr key={rec.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{rec.name}</p>
                    <p className="text-[10px] text-stone">SKU: {rec.sku}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{rec.stock} units</td>
                  <td className="px-4 py-3 text-xs">{rec.dailyVelocity} / day</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-sm text-xs font-bold ${
                      rec.daysRemaining <= 10 ? "bg-madder/10 text-madder animate-pulse" : "bg-turmeric/20 text-[#8a6519]"
                    }`}>
                      {rec.daysRemaining} days remaining
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-green-800">+{rec.recommendedQty} units</td>
                </tr>
              ))}
              {data.restockRecommendations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone">All products have sufficient stock levels (over 30 days remaining).</td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>

        {/* Seasonal Trends */}
        <SectionCard title="Recurring Seasonal Trends">
          <div className="space-y-4">
            {data.seasonalTrends.map((trend, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs text-ink leading-relaxed">
                <span className="text-indigo font-bold">•</span>
                <span>{trend}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
