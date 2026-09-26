"use client";

import { useState } from "react";
import { QrCodeCard } from "@/components/admin/qr-code";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Panel } from "@/components/admin/ui";
import { Field } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { promotions, vehicles } from "@/lib/mock/catalog";
import { can } from "@/lib/permissions";

const SCOPE: Record<string, [string, string]> = {
  sale: ["Automobile", "bg-gold-soft text-[#7a5f0c]"],
  rental: ["Location", "bg-rent-soft text-rent"],
  event: ["Événementiel", "bg-event-soft text-event"],
};

export default function MarketingPage() {
  const user = useStaff();
  const [path, setPath] = useState("/vehicules");
  const [campaign, setCampaign] = useState("flyer-octobre");
  if (!can(user.roleId, "marketing.write")) return <Forbidden />;
  const origin = typeof location !== "undefined" ? location.origin : "";
  const url = `${origin}${path}${path.includes("?") ? "&" : "?"}utm_source=qr&utm_campaign=${encodeURIComponent(campaign)}`;
  return (
    <>
      <PageHeader title="Marketing" description="Promotions, bannières et QR codes pour flyers, vitrines et pare-brise (§45–48)." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Promotions actives">
          <ul className="divide-y divide-line">
            {promotions.map((p) => (
              <li key={p.id} className="p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SCOPE[p.scope][1]}`}>{SCOPE[p.scope][0]}</span>
                  <span className="font-semibold">{p.title}</span>
                </div>
                <p className="mt-1 text-muted">{p.description}</p>
                <p className="mt-1 text-xs text-muted">Du {formatDate(p.startsAt)} au {formatDate(p.endsAt)}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-line p-4 text-xs text-muted">Création / planification des promotions et bannières : table promotions & banners (Supabase), écran d&apos;édition au branchement.</p>
        </Panel>
        <Panel title="Générateur de QR code de campagne">
          <div className="space-y-4 p-4">
            <Field label="Page cible">
              <select className="input" value={path} onChange={(e) => setPath(e.target.value)}>
                <option value="/vehicules">Catalogue véhicules</option>
                <option value="/vehicules?tab=promotions">Promotions automobile</option>
                <option value="/location">Location</option>
                <option value="/evenementiel/creer">Créer mon événement</option>
                <option value="/evenementiel/creer?type=mariage">Devis mariage</option>
                {vehicles.filter((v) => v.isForSale && v.status === "available").map((v) => (
                  <option key={v.id} value={`/vehicules/${v.slug}`}>Fiche {v.brand} {v.model} {v.year}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom de campagne" hint="Mesuré dans Analytics (utm_campaign).">
              <input className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            </Field>
            <QrCodeCard url={url} filename={`qr-${campaign}`} />
          </div>
        </Panel>
      </div>
    </>
  );
}
