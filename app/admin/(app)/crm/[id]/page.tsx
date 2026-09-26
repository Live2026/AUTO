import { RequestDetailView } from "@/components/admin/crm/request-detail";

export const metadata = { title: "Demande" };

export default async function RequestPage(props: PageProps<"/admin/crm/[id]">) {
  const { id } = await props.params;
  return <RequestDetailView id={id} />;
}
