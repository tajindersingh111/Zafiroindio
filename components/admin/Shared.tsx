"use client";

export { useToast } from "./AdminShell";

import { ReactNode } from "react";

// ── Stat Card ────────────────────────────────────────────────

export function StatCard({
  label, value, sub, accent = "indigo", trend, icon,
}: {
  label: string; value: string; sub?: string;
  accent?: "indigo" | "madder" | "turmeric" | "green";
  trend?: { value: number; label?: string };
  icon?: ReactNode;
}) {
  const bars = { indigo: "bg-indigo", madder: "bg-madder", turmeric: "bg-turmeric", green: "bg-green-600" };
  const trendColor = trend ? (trend.value >= 0 ? "text-green-700" : "text-madder") : "";
  return (
    <div className="border border-stone/20 rounded-sm bg-cream-card p-5 relative overflow-hidden transition-all duration-200 hover:border-stone/40">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${bars[accent]}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-stone font-medium">{label}</p>
        {icon && <span className="text-stone opacity-60">{icon}</span>}
      </div>
      <p className="font-sans font-semibold text-2xl md:text-3xl text-ink leading-none mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-semibold ${trendColor}`}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
        {sub && <p className="text-[11px] text-stone font-normal">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  // Order statuses
  pending_payment: "bg-turmeric/15 text-[#8a6519] border border-turmeric/20",
  processing: "bg-indigo/10 text-indigo border border-indigo/20",
  on_hold: "bg-stone/15 text-ink-soft border border-stone/20",
  completed: "bg-green-700/10 text-green-800 border border-green-700/20",
  cancelled: "bg-stone/15 text-stone border border-stone/20",
  failed: "bg-madder/10 text-madder border border-madder/20",
  refunded: "bg-madder/10 text-madder border border-madder/20",
  // Stock
  in_stock: "bg-green-700/10 text-green-800 border border-green-700/20",
  low_stock: "bg-turmeric/15 text-[#8a6519] border border-turmeric/20",
  out_of_stock: "bg-madder/10 text-madder border border-madder/20",
  // Payment
  paid: "bg-green-700/10 text-green-800 border border-green-700/20",
  pending: "bg-turmeric/15 text-[#8a6519] border border-turmeric/20",
  partially_paid: "bg-indigo/10 text-indigo border border-indigo/20",
  // Product
  active: "bg-green-700/10 text-green-800 border border-green-700/20",
  draft: "bg-stone/15 text-stone border border-stone/20",
  archived: "bg-stone/15 text-ink-soft border border-stone/20",
  // Customer
  retail: "bg-indigo/10 text-indigo border border-indigo/20",
  b2b: "bg-madder/10 text-madder border border-madder/20",
  guest: "bg-stone/15 text-stone border border-stone/20",
  // Coupon
  true: "bg-green-700/10 text-green-800 border border-green-700/20",
  false: "bg-stone/15 text-stone border border-stone/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  on_hold: "On Hold",
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  partially_paid: "Partial",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_MAP[status] ?? "bg-stone/15 text-ink-soft border border-stone/20";
  const label = STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ── Page Shell & Header ──────────────────────────────────────

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="px-6 md:px-8 py-8 space-y-8">{children}</div>;
}

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-sans font-semibold text-2xl text-indigo tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-stone mt-1 font-normal leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Data Table ───────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, emptyMessage = "No records found.",
  selectedIds, onSelectAll, onSelectRow,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
}) {
  const hasCheckboxes = !!selectedIds;
  const allSelected = hasCheckboxes && rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  return (
    <div className="overflow-x-auto border border-stone/20 rounded-sm bg-cream-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone/20 bg-paper/50">
            {hasCheckboxes && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  className="rounded-sm border-stone/50 accent-indigo"
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={String(col.key)} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone ${col.className ?? ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (hasCheckboxes ? 1 : 0)} className="px-4 py-12 text-center text-stone text-sm">{emptyMessage}</td></tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-stone/10 last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-paper" : ""} ${selectedIds?.includes(row.id) ? "bg-indigo/5" : ""}`}
              >
                {hasCheckboxes && (
                  <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => onSelectRow?.(row.id, e.target.checked)}
                      className="rounded-sm border-stone/50 accent-indigo"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────

export function Pagination({
  page, totalPages, onPage,
}: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1 <= 5 ? i + 1 : i === 5 ? -1 : totalPages;
    if (page >= totalPages - 3) return i === 0 ? 1 : i === 1 ? -1 : totalPages - 6 + i;
    return i === 0 ? 1 : i === 1 ? -1 : i === 5 ? -1 : i === 6 ? totalPages : page - 2 + i;
  });
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-sm text-sm border border-stone/30 disabled:opacity-40 hover:bg-paper transition-colors">←</button>
      {pages.map((p, i) =>
        p === -1 ? <span key={`dots-${i}`} className="px-2 text-stone">…</span> : (
          <button key={p} onClick={() => onPage(p)} className={`px-3 py-1.5 rounded-sm text-sm border transition-colors ${p === page ? "bg-indigo text-white border-indigo" : "border-stone/30 hover:bg-paper"}`}>{p}</button>
        )
      )}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-sm text-sm border border-stone/30 disabled:opacity-40 hover:bg-paper transition-colors">→</button>
    </div>
  );
}

// ── Search + Filter Bar ──────────────────────────────────────

export function SearchBar({
  value, onChange, placeholder = "Search…", className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink placeholder-stone focus:outline-none focus:ring-2 focus:ring-madder/40 focus:border-madder transition-colors"
      />
    </div>
  );
}

export function FilterSelect({
  value, onChange, options, placeholder = "All",
}: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40 focus:border-madder transition-colors cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm", onConfirm, onCancel, danger = false,
}: {
  open: boolean; title: string; message: string;
  confirmLabel?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-xs">
      <div className="bg-cream-card rounded-sm border border-stone/20 shadow-xl w-full max-w-sm p-6">
        <h3 className="font-sans font-semibold text-lg text-indigo mb-2">{title}</h3>
        <p className="text-xs text-ink-soft mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs border border-stone/30 rounded-sm text-ink-soft hover:bg-paper transition-colors font-medium">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs rounded-sm text-white transition-colors font-medium ${danger ? "bg-madder hover:bg-madder-deep" : "bg-indigo hover:bg-indigo-deep"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────

export function EmptyState({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-paper-deep border border-stone/20 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
      </div>
      <h3 className="font-sans font-semibold text-base text-indigo mb-1">{title}</h3>
      {description && <p className="text-xs text-stone max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────

export function Btn({
  children, onClick, variant = "primary", size = "md", disabled, type = "button", className,
}: {
  children: ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md"; disabled?: boolean; type?: "button" | "submit";
  className?: string;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-sm transition-all duration-200 disabled:opacity-50 uppercase tracking-wider font-sans cursor-pointer";
  const sizes = { sm: "px-3 py-1.5 text-[11px]", md: "px-4 py-2 text-xs" };
  const variants = {
    primary: "bg-indigo hover:bg-indigo-deep text-white shadow-xs",
    secondary: "bg-paper border border-stone/30 text-ink hover:bg-paper-deep",
    danger: "bg-madder/10 border border-madder/30 text-madder hover:bg-madder hover:text-white",
    ghost: "text-indigo hover:bg-indigo/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={variant === "primary" ? { color: "#ffffff" } : undefined}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

// ── Loading ──────────────────────────────────────────────────

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className ?? ""}`}>
      <svg className="animate-spin w-7 h-7 text-indigo/30" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────

export function SectionCard({
  title, subtitle, action, children, className,
}: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`border border-stone/20 rounded-sm bg-cream-card overflow-hidden ${className ?? ""}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone/20 bg-paper/30">
          <div>
            {title && <h2 className="font-sans font-semibold text-sm text-indigo">{title}</h2>}
            {subtitle && <p className="text-[11px] text-stone mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={title || action ? "p-5" : ""}>{children}</div>
    </div>
  );
}
