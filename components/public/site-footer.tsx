import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { BusinessSettings } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { BrandLogo } from "./brand";

export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  const { company } = settings;
  return (
    <footer className="mt-20 bg-ink pb-28 text-white/70 lg:pb-10">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <BrandLogo light />
          <p className="text-sm">{company.tagline}</p>
          <p className="text-sm">Trouvez votre véhicule, louez selon vos besoins ou construisez votre événement avec nos solutions sur mesure.</p>
          <div className="flex gap-2">
            {(
              [
                ["Facebook", settings.socialLinks.facebook],
                ["Instagram", settings.socialLinks.instagram],
                ["TikTok", settings.socialLinks.tiktok],
              ] as const
            )
              .filter(([, url]) => url)
              .map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-gold hover:text-white">
                  {name}
                </a>
              ))}
          </div>
        </div>
        <FooterCol
          title="Nos pôles"
          links={[
            ["/vehicules", "Vente de véhicules"],
            ["/location", "Location avec ou sans chauffeur"],
            ["/evenementiel", "Événementiel"],
            ["/evenementiel/creer", "Créer mon événement"],
            ["/realisations", "Nos réalisations"],
          ]}
        />
        <FooterCol
          title="Informations"
          links={[
            ["/a-propos", "À propos"],
            ["/contact", "Contact"],
            ["/mes-demandes", "Suivre mes demandes"],
            ["/confidentialite", "Confidentialité"],
            ["/mentions-legales", "Mentions légales"],
          ]}
        />
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-white">Nous trouver</p>
          <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" />{company.address}, {company.city}</p>
          <p className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-gold" />{formatPhone(settings.contactPhones.default)}</p>
          <p className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-gold" />{company.email}</p>
          <p className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-gold" />{company.hours}</p>
        </div>
      </div>
      <div className="container-page flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs">
        <p>© {new Date().getFullYear()} {company.name}. Tous droits réservés.</p>
        <Link href="/admin" className="hover:text-white">Espace employés</Link>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-white">{title}</p>
      <ul className="space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
