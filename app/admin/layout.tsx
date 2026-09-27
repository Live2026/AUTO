import type { Metadata, Viewport } from "next";
import { ThemeSync } from "@/lib/admin/theme";
import { THEME_INIT_SCRIPT } from "@/lib/admin/theme-script";

export const metadata: Metadata = {
  title: { default: "Bryan Admin", template: "%s — Bryan Admin" },
  manifest: "/admin/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Bryan Admin", statusBarStyle: "default" },
  icons: { apple: "/icons/admin-192.png" },
};

export const viewport: Viewport = { themeColor: "#c9a227" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <ThemeSync />
      {children}
    </div>
  );
}
