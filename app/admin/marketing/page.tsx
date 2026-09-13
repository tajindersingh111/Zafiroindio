"use client";

import { useRouter } from "next/navigation";
import { PageShell, PageHeader, SectionCard, Btn } from "@/components/admin/Shared";

const CAMPAIGN_IDEAS = [
  { title: "Festive Sale Campaign", desc: "Create a coupon-based discount campaign for festivals (Diwali, Dussehra, Holi).", action: "Go to Coupons", href: "/admin/coupons" },
  { title: "Email Newsletter", desc: "Send promotional emails to your customer list with new arrivals and offers.", action: "Coming Soon", href: "#" },
  { title: "Social Media Banner", desc: "Generate product showcase banners for Instagram and Facebook.", action: "Coming Soon", href: "#" },
  { title: "B2B Outreach", desc: "Manage bulk pricing and special rates for B2B clients.", action: "Go to B2B", href: "/admin/b2b" },
  { title: "Loyalty Program", desc: "Reward repeat customers with points and exclusive discounts.", action: "Coming Soon", href: "#" },
];

export default function MarketingPage() {
  const router = useRouter();

  return (
    <PageShell>
      <PageHeader title="Marketing" subtitle="Campaigns, promotions and customer engagement" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CAMPAIGN_IDEAS.map((c) => (
          <SectionCard key={c.title}>
            <h3 className="font-semibold text-ink mb-1">{c.title}</h3>
            <p className="text-sm text-stone mb-4">{c.desc}</p>
            <Btn
              size="sm"
              variant={c.href === "#" ? "secondary" : "primary"}
              onClick={() => c.href !== "#" && router.push(c.href)}
              disabled={c.href === "#"}
            >
              {c.action}
            </Btn>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Quick Links">
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Create Coupon", href: "/admin/coupons" },
            { label: "View Active Coupons", href: "/admin/coupons" },
            { label: "B2B Customers", href: "/admin/b2b" },
            { label: "Sales Report", href: "/admin/reports/sales" },
            { label: "Products Report", href: "/admin/reports/products" },
          ].map((l) => (
            <button key={l.label} onClick={() => router.push(l.href)} className="px-4 py-2 text-sm border border-indigo/40 text-indigo rounded-sm hover:bg-indigo hover:text-paper transition-colors">
              {l.label}
            </button>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
