import Link from "next/link";

export function BrandLogo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="BRYAN MULTISERVICES — accueil">
      <span className="grid size-9 place-items-center rounded-xl bg-gold font-black text-ink shadow-sm">B</span>
      <span className="leading-none">
        <span className={`block text-[15px] font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>BRYAN</span>
        <span className="block text-[9.5px] font-semibold tracking-[0.22em] text-gold">MULTISERVICES</span>
      </span>
    </Link>
  );
}
