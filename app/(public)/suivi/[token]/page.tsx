import type { Metadata } from "next";
import { TrackingView } from "@/components/public/tracking-view";

export const metadata: Metadata = { title: "Suivi de ma demande", robots: { index: false, follow: false } };

export default async function TrackingPage(props: PageProps<"/suivi/[token]">) {
  const { token } = await props.params;
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Suivi de ma demande</h1>
      <TrackingView token={token} />
    </div>
  );
}
