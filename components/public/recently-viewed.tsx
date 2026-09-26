"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { History } from "lucide-react";
import { publicDb } from "@/lib/db/public-db";

/** « Vus récemment » — IndexedDB, sans compte. */
export function RecentlyViewed() {
  const items = useLiveQuery(() => publicDb.recentlyViewed.orderBy("viewedAt").reverse().limit(8).toArray(), []);
  if (!items || items.length === 0) return null;
  return (
    <section className="container-page pt-10">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted"><History className="size-4" />Vus récemment</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {items.map((i) => (
          <Link
            key={i.id}
            href={i.kind === "rental" ? `/location/${i.slug}` : `/vehicules/${i.slug}`}
            className="shrink-0 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-ink/40"
          >
            {i.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
