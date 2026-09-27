import type { MetadataRoute } from "next";

// Manifest public (docs/03 §5). L'admin a le sien : /admin/manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BRYAN MULTISERVICES",
    short_name: "Bryan",
    description: "Automobile • Location • Événementiel",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    lang: "fr",
    categories: ["business", "shopping", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Véhicules", url: "/vehicules" },
      { name: "Location", url: "/location" },
      { name: "Créer mon événement", url: "/evenementiel/creer" },
    ],
  };
}
