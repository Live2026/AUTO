"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { BookingDialog } from "@/components/admin/ops/booking-dialog";
import { Timeline } from "@/components/admin/ops/timeline";
import { PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Button } from "@/components/ui";

export default function CalendarPage() {
  const user = useStaff();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Calendrier central"
        description="Locations, événements, essais, maintenance et chauffeurs — les conflits sont refusés automatiquement (§43)."
        actions={allowed(user, ["rentals.write", "events.write"]) && <Button onClick={() => setOpen(true)}><CalendarPlus className="size-4" /> Nouvelle occupation</Button>}
      />
      <Timeline days={14} />
      {open && <BookingDialog open onClose={() => setOpen(false)} />}
    </>
  );
}
