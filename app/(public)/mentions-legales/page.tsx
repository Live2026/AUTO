import type { Metadata } from "next";
import { getSettings } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default async function LegalPage() {
  const s = await getSettings();
  return (
    <article className="container-page max-w-3xl space-y-3 py-10 text-zinc-700">
      <h1 className="text-3xl font-extrabold text-ink">Mentions légales</h1>
      <p><strong>Raison sociale :</strong> {s.company.name}</p>
      <p><strong>Adresse :</strong> {s.company.address}, {s.company.city}, République du Congo</p>
      <p><strong>RCCM / NIU :</strong> à compléter</p>
      <p><strong>Contact :</strong> {s.company.email}</p>
      <p><strong>Hébergement :</strong> à compléter (Vercel / Supabase)</p>
    </article>
  );
}
