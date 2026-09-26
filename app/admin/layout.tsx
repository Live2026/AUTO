import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Bryan Admin", template: "%s — Bryan Admin" },
  manifest: "/admin/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Bryan Admin", statusBarStyle: "default" },
  icons: { apple: "/icons/admin-192.png" },
};

export const viewport: Viewport = { themeColor: "#c9a227" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#f4f4f2]">{children}</div>;
}
