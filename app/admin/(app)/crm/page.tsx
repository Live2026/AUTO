import { Suspense } from "react";
import { RequestsBoardRoute } from "@/components/admin/crm/requests-board";

export const metadata = { title: "Demandes" };

export default function CrmPage() {
  return (
    <Suspense>
      <RequestsBoardRoute />
    </Suspense>
  );
}
