import { QuoteEditor } from "@/components/admin/quote-editor";

export const metadata = { title: "Devis" };

export default async function QuoteEditorPage(props: PageProps<"/admin/devis/[id]">) {
  const { id } = await props.params;
  return <QuoteEditor id={id} />;
}
