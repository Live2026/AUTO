import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";
import type { EventType, Realisation } from "@/lib/types";
import { DynamicIcon } from "./dynamic-icon";
import { RealisationCover } from "./realisation-media";

export function RealisationVisual({ realisation, icon, className }: { realisation: Realisation; icon?: string; className?: string }) {
  const [a, b] = realisation.palette;
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <div className="absolute -top-10 -right-10 size-48 rounded-full bg-white/15" />
      <div className="absolute -bottom-16 -left-8 size-56 rounded-full bg-black/10" />
      <DynamicIcon name={icon ?? "Sparkles"} className="absolute right-6 bottom-6 size-16 text-white/70" />
    </div>
  );
}

export function RealisationCard({ realisation, eventType }: { realisation: Realisation; eventType?: EventType }) {
  return (
    <article className="group card relative overflow-hidden">
      <RealisationCover realisation={realisation} icon={eventType?.icon} className="aspect-[4/3] w-full" />
      <div className="p-4">
        <p className="eyebrow text-event">{eventType?.name}</p>
        <h3 className="mt-1 font-bold">
          <Link href={`/realisations/${realisation.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {realisation.title}
          </Link>
        </h3>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{realisation.city}</span>
          {realisation.guests && <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{formatNumber(realisation.guests)} invités</span>}
          <span>{formatDate(realisation.eventDate, { month: "long" })}</span>
        </p>
      </div>
    </article>
  );
}
