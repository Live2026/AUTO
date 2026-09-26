import { Suspense } from "react";
import { RequestsBoard } from "@/components/admin/crm/requests-board";

export const metadata = { title: "Demandes" };

export default function CrmPage() {
  return (
    <Suspense>
      <RequestsBoard />
    </Suspense>
  );
}
