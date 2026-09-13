"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner } from "@/components/admin/Shared";

interface InsightsData {
  sales: string[];
  products: string[];
  customers: string[];
  inventory: string[];
  marketing: string[];
}

export default function ZafiroIntelligencePage() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/insights")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data);
        setLoading(false);
      });
  }, []);

  return (
    <PageShell>
      <PageHeader title="Zafiro Insights" subtitle="Dynamic AI-powered analysis of your e-commerce store performance." />

      {loading ? (
        <LoadingSpinner />
      ) : insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Insights */}
          <SectionCard title="Sales Performance Insights">
            <ul className="space-y-3">
              {insights.sales.map((insight, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-ink leading-relaxed">
                  <span className="text-indigo mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.sales.length === 0 && <p className="text-stone text-xs">No sales insights generated.</p>}
            </ul>
          </SectionCard>

          {/* Product Insights */}
          <SectionCard title="Product & Category Insights">
            <ul className="space-y-3">
              {insights.products.map((insight, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-ink leading-relaxed">
                  <span className="text-indigo mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.products.length === 0 && <p className="text-stone text-xs">No product insights generated.</p>}
            </ul>
          </SectionCard>

          {/* Customer Insights */}
          <SectionCard title="Customer & Buyer Insights">
            <ul className="space-y-3">
              {insights.customers.map((insight, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-ink leading-relaxed">
                  <span className="text-indigo mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.customers.length === 0 && <p className="text-stone text-xs">No customer insights generated.</p>}
            </ul>
          </SectionCard>

          {/* Inventory Insights */}
          <SectionCard title="Smart Inventory Insights">
            <ul className="space-y-3">
              {insights.inventory.map((insight, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-ink leading-relaxed">
                  <span className="text-indigo mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.inventory.length === 0 && <p className="text-stone text-xs">No inventory insights generated.</p>}
            </ul>
          </SectionCard>

          {/* Marketing Insights */}
          <SectionCard title="Coupons & Marketing Insights" className="md:col-span-2">
            <ul className="space-y-3">
              {insights.marketing.map((insight, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-sm text-ink leading-relaxed">
                  <span className="text-indigo mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.marketing.length === 0 && <p className="text-stone text-xs">No marketing insights generated.</p>}
            </ul>
          </SectionCard>
        </div>
      ) : (
        <p className="text-stone">Could not generate insights at this time.</p>
      )}
    </PageShell>
  );
}
