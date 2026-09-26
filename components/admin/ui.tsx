import type { ReactNode } from "react";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_TONE, REQUEST_STATUS_LABELS, REQUEST_STATUS_TONE, REQUEST_TYPE_LABELS } from "@/lib/labels";
import type { QuoteStatus, RequestStatus, RequestType } from "@/lib/types";
import { Badge, cn } from "../ui";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge className={REQUEST_STATUS_TONE[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={QUOTE_STATUS_TONE[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}

const TYPE_TONE: Record<RequestType, string> = {
  sale: "bg-gold-soft text-[#7a5f0c] ring-gold/30",
  test_drive: "bg-gold-soft text-[#7a5f0c] ring-gold/30",
  appointment: "bg-gold-soft text-[#7a5f0c] ring-gold/30",
  trade_in: "bg-gold-soft text-[#7a5f0c] ring-gold/30",
  rental: "bg-rent-soft text-rent ring-rent/20",
  event: "bg-event-soft text-event ring-event/20",
  callback: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  other: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

export function TypeBadge({ type }: { type: RequestType }) {
  return <Badge className={TYPE_TONE[type]}>{REQUEST_TYPE_LABELS[type]}</Badge>;
}

export function StatCard({ label, value, hint, tone = "text-ink", icon, accent }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string; icon?: ReactNode; accent?: string }) {
  return (
    <div className="card relative overflow-hidden p-4">
      {accent && <span className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", accent)} aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon}
      </div>
      <p className={cn("mt-1 text-2xl font-extrabold tracking-tight", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string, number?][] }) {
  return (
    <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
      {items.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition", value === key ? "bg-ink text-white" : "text-muted hover:text-ink")}
        >
          {label}
          {count !== undefined && <span className={cn("ml-1.5 text-xs", value === key ? "text-white/70" : "text-muted")}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return (
    <div className="grid h-48 place-items-center">
      <span className="inline-block size-6 animate-spin rounded-full border-2 border-ink border-r-transparent" />
    </div>
  );
}
