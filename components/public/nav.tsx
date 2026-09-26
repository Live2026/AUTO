"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, Car, Home, KeyRound, Phone } from "lucide-react";
import { cn } from "../ui";

const LINKS = [
  { href: "/vehicules", label: "Véhicules" },
  { href: "/location", label: "Location" },
  { href: "/evenementiel", label: "Événementiel" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive(pathname, l.href) ? "bg-white/10 text-white" : "text-white/70 hover:text-white",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const MOBILE = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/vehicules", label: "Véhicules", icon: Car },
  { href: "/location", label: "Location", icon: KeyRound },
  { href: "/evenementiel", label: "Événement", icon: CalendarHeart },
  { href: "/contact", label: "Contact", icon: Phone },
];

/** Navigation basse mobile (§68). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-5">
        {MOBILE.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-ink" : "text-zinc-500")}
              >
                <Icon className={cn("size-5", active && "text-gold")} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
