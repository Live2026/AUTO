import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../ui";

type Tone = "auto" | "rent" | "event" | "neutral";

const TONES: Record<Tone, { band: string; eyebrow: string; glow: string }> = {
  auto: { band: "bg-gold-soft/70", eyebrow: "text-gold-deep", glow: "rgba(201,162,39,0.28)" },
  rent: { band: "bg-rent-soft", eyebrow: "text-rent", glow: "rgba(14,116,144,0.22)" },
  event: { band: "bg-event-soft", eyebrow: "text-event", glow: "rgba(190,24,93,0.2)" },
  neutral: { band: "bg-white", eyebrow: "text-gold-deep", glow: "rgba(11,18,32,0.08)" },
};

/** Bandeau d'en-tête commun aux pages publiques : fil d'Ariane, sur-titre, titre, description. */
export function PageHero({
  eyebrow,
  title,
  description,
  tone = "neutral",
  crumbs = [],
  children,
  narrow,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  tone?: Tone;
  crumbs?: [string, string?][];
  children?: ReactNode;
  narrow?: boolean;
}) {
  const t = TONES[tone];
  return (
    <section className={cn("relative overflow-hidden border-b border-line", t.band)}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(50% 120% at 100% 0%, ${t.glow}, transparent 70%)` }} />
      <div className={cn("container-page relative py-8 sm:py-12", narrow && "max-w-4xl")}>
        {crumbs.length > 0 && (
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-ink">Accueil</Link>
            {crumbs.map(([label, href]) => (
              <span key={label} className="inline-flex items-center gap-1">
                <ChevronRight className="size-3.5" />
                {href ? <Link href={href} className="hover:text-ink">{label}</Link> : <span className="text-ink">{label}</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className={cn("eyebrow", t.eyebrow)}>{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg text-zinc-700">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
