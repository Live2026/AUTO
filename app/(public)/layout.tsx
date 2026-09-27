import { InstallPrompt, OfflineBanner } from "@/components/pwa";
import { FloatingWhatsApp } from "@/components/public/floating-whatsapp";
import { BottomNav } from "@/components/public/nav";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getSettings } from "@/lib/data/catalog";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <OfflineBanner />
      <SiteHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <FloatingWhatsApp settings={settings} />
      <BottomNav />
      <InstallPrompt />
    </>
  );
}
