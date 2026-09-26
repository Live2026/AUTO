import Link from "next/link";
import { Heart } from "lucide-react";
import type { BusinessSettings } from "@/lib/types";
import { phoneNumber, whatsappNumber } from "@/lib/whatsapp";
import { BrandLogo } from "./brand";
import { CallButton, WhatsAppButton } from "./contact-links";
import { DesktopNav } from "./nav";

export function SiteHeader({ settings }: { settings: BusinessSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLogo light />
        <DesktopNav />
        <div className="flex items-center gap-2">
          <Link href="/favoris" className="rounded-xl p-2.5 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Mes favoris">
            <Heart className="size-5" />
          </Link>
          <CallButton number={phoneNumber(settings)} size="sm" variant="ghost" className="text-white hover:bg-white/10 max-sm:hidden" />
          <CallButton number={phoneNumber(settings)} size="sm" variant="ghost" iconOnly className="text-white hover:bg-white/10 sm:hidden" />
          <WhatsAppButton number={whatsappNumber(settings)} size="sm" className="max-md:hidden" />
        </div>
      </div>
    </header>
  );
}
