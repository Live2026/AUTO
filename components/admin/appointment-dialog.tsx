"use client";

import { useState } from "react";
import { BusinessError, confirmAppointment, listStaffSync } from "@/lib/db/mock-backend";
import { APPOINTMENT_KIND_LABELS } from "@/lib/labels";
import type { Appointment } from "@/lib/types";
import { Button, Field } from "../ui";
import { Modal } from "../ui/modal";
import { useStaff } from "./shell";

function localInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86_400_000);
  if (!iso) d.setHours(10, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Planifier / confirmer un rendez-vous — un essai bloque le véhicule (R3, A11). */
export function AppointmentDialog({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const user = useStaff();
  const [when, setWhen] = useState(() => localInput(appointment?.startsAt));
  const [duration, setDuration] = useState(60);
  const [staffId, setStaffId] = useState(appointment?.staffId ?? user.id);
  const [error, setError] = useState<string>();
  if (!appointment) return null;
  return (
    <Modal open onClose={onClose} title={`${APPOINTMENT_KIND_LABELS[appointment.kind]} — planifier`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(undefined);
          try {
            await confirmAppointment(appointment.id, new Date(when).toISOString(), duration, staffId, user.id);
            onClose();
          } catch (err) {
            setError(err instanceof BusinessError ? err.message : String(err));
          }
        }}
      >
        {appointment.preferredSlot && <p className="rounded-xl bg-paper p-3 text-sm">Préférence du client : <strong>{appointment.preferredSlot}</strong></p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date et heure"><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required /></Field>
          <Field label="Durée">
            <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Field>
        </div>
        <Field label="Conseiller">
          <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {listStaffSync().filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </Field>
        {appointment.kind === "test_drive" && <p className="text-xs text-muted">Le véhicule sera bloqué sur ce créneau dans le calendrier ; un conflit est refusé.</p>}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
        <Button type="submit" className="w-full">Confirmer le rendez-vous</Button>
      </form>
    </Modal>
  );
}
