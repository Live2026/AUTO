import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
      <div>
        <p className="font-mono text-6xl font-black text-gold">404</p>
        <h1 className="mt-3 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-muted">Ce contenu n&apos;existe plus ou a été déplacé.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-xl bg-ink px-5 py-3 font-semibold text-white">Accueil</Link>
          <Link href="/vehicules" className="rounded-xl border border-line bg-white px-5 py-3 font-semibold">Véhicules</Link>
        </div>
      </div>
    </div>
  );
}
