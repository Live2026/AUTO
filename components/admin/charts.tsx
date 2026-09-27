"use client";

import { Table2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../ui";

// Palette catégorielle des pôles — validée (dataviz/validate_palette : CVD ΔE ≥ 11,6, contraste ≥ 3:1).
export const POLE_SERIES = [
  { key: "sale", label: "Vente", color: "#b08a14" },
  { key: "rental", label: "Location", color: "#0b7fa3" },
  { key: "event", label: "Événement", color: "#be185d" },
  { key: "other", label: "Autre", color: "#6d4bd8" },
] as const;

export type SeriesKey = (typeof POLE_SERIES)[number]["key"];
export interface DayBucket {
  label: string;
  date: string;
  values: Record<SeriesKey, number>;
}

/** Maximum d'axe « propre » et pair (graduations entières : 0, max/2, max). */
function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  const m = Math.ceil(n / step) * step;
  return m % 2 === 0 ? m : m + step;
}

/** Colonnes empilées : demandes reçues par jour et par pôle. */
export function StackedColumns({ data, title }: { data: DayBucket[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const totals = data.map((d) => POLE_SERIES.reduce((s, x) => s + d.values[x.key], 0));
  const max = niceMax(Math.max(1, ...totals));
  const ticks = [0, max / 2, max];
  const H = 160;
  const GAP = 2;

  return (
    <figure className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm text-muted">{title}</figcaption>
        <div className="flex items-center gap-3">
          <ul className="flex flex-wrap gap-3 text-xs text-muted" aria-label="Légende">
            {POLE_SERIES.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setTable((t) => !t)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-black/5" aria-pressed={table}>
            <Table2 className="size-3.5" /> {table ? "Graphique" : "Tableau"}
          </button>
        </div>
      </div>

      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-1.5 font-semibold">Jour</th>
                {POLE_SERIES.map((s) => <th key={s.key} className="py-1.5 text-right font-semibold">{s.label}</th>)}
                <th className="py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.date} className="border-b border-line/60">
                  <td className="py-1.5">{d.label}</td>
                  {POLE_SERIES.map((s) => <td key={s.key} className="py-1.5 text-right">{d.values[s.key]}</td>)}
                  <td className="py-1.5 text-right font-semibold">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          <div className="flex w-6 flex-col-reverse justify-between text-right text-[10px] text-muted" style={{ height: H }}>
            {ticks.map((t) => <span key={t} className="-my-1.5">{t}</span>)}
          </div>
          <div className="relative flex-1" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const segs = POLE_SERIES.filter((s) => d.values[s.key] > 0);
                return (
                  <div
                    key={d.date}
                    className="relative flex h-full flex-1 cursor-default items-end justify-center"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${d.label} : ${totals[i]} demande(s)`}
                  >
                    {hover === i && <div className="absolute inset-y-0 w-full rounded-md bg-black/[0.04]" />}
                    <div className="relative flex w-full max-w-6 flex-col-reverse" style={{ height: `${(totals[i] / max) * 100}%` }}>
                      {segs.map((s, j) => (
                        <div
                          key={s.key}
                          style={{
                            height: `calc(${(d.values[s.key] / totals[i]) * 100}% - ${j < segs.length - 1 ? GAP : 0}px)`,
                            marginTop: j < segs.length - 1 ? GAP : 0,
                            background: s.color,
                            borderTopLeftRadius: j === segs.length - 1 ? 4 : 0,
                            borderTopRightRadius: j === segs.length - 1 ? 4 : 0,
                          }}
                        />
                      ))}
                    </div>
                    {hover === i && (
                      <div className={cn("pointer-events-none absolute bottom-full z-10 mb-2 w-40 rounded-xl border border-line bg-white p-2.5 text-xs shadow-xl", i > data.length - 4 ? "right-0" : i < 3 ? "left-0" : "left-1/2 -translate-x-1/2")}>
                        <p className="mb-1 font-semibold">{d.label} · {totals[i]} demande(s)</p>
                        {POLE_SERIES.map((s) => (
                          <p key={s.key} className="flex items-center justify-between gap-2 text-muted">
                            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
                            <span className="font-semibold text-ink">{d.values[s.key]}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {!table && (
        <div className="mt-1.5 flex gap-2 pl-8 text-[10px] text-muted">
          {data.map((d, i) => (
            <span key={d.date} className="flex-1 text-center">{i % 2 === 0 || data.length <= 7 ? d.label.split(" ")[0] : ""}</span>
          ))}
        </div>
      )}
    </figure>
  );
}

/** Barres horizontales, une seule série (magnitude) : valeur au bout de la barre. */
export function HorizontalBars({ rows, color = "#0b7fa3", onSelect }: { rows: { key: string; label: string; value: number }[]; color?: string; onSelect?: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5 p-4">
      {rows.map((r) => (
        <li key={r.key}>
          <button type="button" onClick={() => onSelect?.(r.key)} className="grid w-full grid-cols-[120px_1fr] items-center gap-3 text-left text-sm hover:opacity-80" disabled={!onSelect}>
            <span className="truncate text-muted">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 rounded-r-[4px]" style={{ width: `${Math.max(r.value ? 3 : 0, (r.value / max) * 85)}%`, background: color }} />
              <span className="text-xs font-semibold">{r.value}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
