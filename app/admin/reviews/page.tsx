"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  review: string;
  status: "pending" | "approved" | "rejected" | "spam";
  createdAt: string;
}

export default function ReviewsPage() {
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  function fetchReviews() {
    setLoading(true);
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((data) => {
        setReviews(data);
        setLoading(false);
      });
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    if (res.ok) {
      addToast(`Review moderated to: ${status}`);
      fetchReviews();
    }
  }

  // Analytics
  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter((r) => r.status === "approved");
  const avgRating = approvedReviews.length > 0
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : 0;

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      starCounts[r.rating - 1] += 1;
    }
  });

  return (
    <PageShell>
      <PageHeader title="Customer Reviews" subtitle="Approve, reject, or moderation spam tags on customer testimonials." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Quick breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Average Rating</p>
                <p className="text-3xl font-display font-bold mt-1 text-indigo">{avgRating.toFixed(1)} / 5.0</p>
              </div>
              <p className="text-xs text-stone mt-2">Based on {approvedReviews.length} approved buyer reviews</p>
            </div>

            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm md:col-span-2">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider mb-2">Rating Distribution</p>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starCounts[stars - 1];
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center text-xs gap-3">
                      <span className="w-12 font-semibold text-stone">{stars} stars</span>
                      <div className="flex-1 bg-paper border border-stone/10 h-2.5 overflow-hidden rounded-sm">
                        <div className="bg-indigo h-full" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-8 text-right text-stone">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Moderation table */}
          <SectionCard title="Product Reviews List">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Customer", "Product", "Rating", "Review content", "Moderation Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.customerName}</p>
                      <p className="text-xs text-stone">{r.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo">{r.productName}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-indigo">{"★".repeat(r.rating)}</span>
                      <span className="text-stone">{"★".repeat(5 - r.rating)}</span>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-xs text-stone italic">"{r.review}"</p>
                      <p className="text-[10px] text-stone mt-1">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === "approved" ? "bg-green-700/10 text-green-800" :
                        r.status === "spam" ? "bg-madder/15 text-madder" :
                        r.status === "rejected" ? "bg-stone/20 text-stone" : "bg-turmeric/20 text-[#8a6519]"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs space-x-2">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => updateStatus(r.id, "approved")} className="text-green-800 hover:underline font-semibold">Approve</button>
                          <button onClick={() => updateStatus(r.id, "rejected")} className="text-stone hover:underline">Reject</button>
                          <button onClick={() => updateStatus(r.id, "spam")} className="text-madder hover:underline">Spam</button>
                        </>
                      )}
                      {r.status !== "pending" && (
                        <button onClick={() => updateStatus(r.id, "pending")} className="text-indigo hover:underline">Reset to Pending</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
