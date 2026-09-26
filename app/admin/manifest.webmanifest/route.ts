// Manifest de la PWA admin (scope /admin/) — installée sur les téléphones du personnel.
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      id: "/admin/",
      name: "Bryan Admin",
      short_name: "Bryan Admin",
      description: "Gestion BRYAN MULTISERVICES : CRM, flotte, événements, devis",
      start_url: "/admin",
      scope: "/admin/",
      display: "standalone",
      background_color: "#0b1220",
      theme_color: "#c9a227",
      lang: "fr",
      icons: [
        { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
