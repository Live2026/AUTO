import type { Metadata } from "next";
import { MyRequestsList } from "@/components/public/favorites-list";

export const metadata: Metadata = { title: "Mes demandes", robots: { index: false } };

export default function MyRequestsPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Mes demandes</h1>
      <p className="mt-1 mb-6 text-muted">Retrouvez les demandes envoyées depuis ce téléphone et suivez leur avancement.</p>
      <MyRequestsList />
    </div>
  );
}
