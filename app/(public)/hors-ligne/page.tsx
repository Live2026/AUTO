import { WifiOff } from "lucide-react";
import { LinkButton } from "@/components/ui";

export const metadata = { title: "Hors-ligne", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-10 text-center">
      <div className="max-w-sm">
        <WifiOff className="mx-auto size-12 text-muted" />
        <h1 className="mt-4 text-2xl font-bold">Vous êtes hors-ligne</h1>
        <p className="mt-2 text-muted">Cette page n&apos;a pas encore été consultée sur ce téléphone. Les pages déjà vues et vos favoris restent accessibles.</p>
        <LinkButton href="/favoris" variant="outline" className="mt-5">Mes favoris</LinkButton>
      </div>
    </div>
  );
}
