import { Suspense } from "react";
import { ActivityLog } from "@/components/admin/audit/activity-log";

export const metadata = { title: "Journal d'activité" };

export default function JournalPage() {
  return (
    <Suspense>
      <ActivityLog />
    </Suspense>
  );
}
