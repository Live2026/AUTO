"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { BusinessError, createBooking, getSettings, mockDb } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { BOOKING_KIND_LABELS, BOOKING_STATUS_LABELS } from "@/lib/labels";
import type { BookingKind, BookingStatus, VehicleBooking } from "@/lib/types";
import { Button, Field } from "../../ui";
import { Modal } from "../../ui/modal";
import { useStaff } from "../shell";

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Poser une option / confirmer une occupation — contrôle anti-chevauchement (R3). */
export function BookingDialog({
  open,
  onClose,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  defaults?: { vehicleId?: string; kind?: BookingKind; start?: string; end?: string; requestId?: string; eventId?: string };
}) {
  const user = useStaff();
  const vehicles = useLiveQuery(() => mockDb.vehicles.toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [form, setForm] = useState({
    vehicleId: defaults?.vehicleId ?? "",
    kind: defaults?.kind ?? ("rental" as BookingKind),
    status: "hold" as BookingStatus,
    start: toLocalInput(defaults?.start),
    end: toLocalInput(defaults?.end),
    notes: "",
  });
  const [error, setError] = useState<{ message: string; conflict?: VehicleBooking }>();
  const [done, setDone] = useState(false);

  const eligible = (vehicles ?? []).filter((v) => {
    if (v.status === "sold" || v.status === "withdrawn") return false;
    if (form.kind === "rental") return v.isForRent;
    if (form.kind === "event") return v.isForEvents;
    if (form.kind === "test_drive") return v.isForSale;
    return true;
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await createBooking(
        {
          vehicleId: form.vehicleId,
          kind: form.kind,
          status: form.status,
          start: new Date(form.start).toISOString(),
          end: new Date(form.end).toISOString(),
          requestId: defaults?.requestId,
          eventId: defaults?.eventId,
          notes: form.notes || undefined,
        },
        user.id,
      );
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 900);
    } catch (err) {
      if (err instanceof BusinessError) setError({ message: err.message, conflict: err.details as VehicleBooking | undefined });
      else setError({ message: String(err) });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Occupation véhicule">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BookingKind, vehicleId: "" })}>
              {Object.entries(BOOKING_KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookingStatus })}>
              <option value="hold">{BOOKING_STATUS_LABELS.hold} ({settings?.holdDurationHours ?? 24} h)</option>
              <option value="confirmed">{BOOKING_STATUS_LABELS.confirmed}</option>
              <option value="in_progress">{BOOKING_STATUS_LABELS.in_progress}</option>
            </select>
          </Field>
        </div>
        <Field label="Véhicule">
          <select className="input" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
            <option value="">Choisir…</option>
            {eligible.map((v) => (
              <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year} — {v.reference}{v.status === "reserved" ? " (réservé vente)" : ""}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début"><input className="input" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></Field>
          <Field label="Fin"><input className="input" type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required /></Field>
        </div>
        {form.kind === "rental" && <p className="text-xs text-muted">Un tampon de {settings?.rentalBufferHours ?? 2} h est ajouté après chaque location (nettoyage, contrôle).</p>}
        <Field label="Notes"><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <p className="font-semibold">{error.message}</p>
            {error.conflict && (
              <p className="mt-1">
                Conflit : {BOOKING_KIND_LABELS[error.conflict.kind]} ({BOOKING_STATUS_LABELS[error.conflict.status]}) du {formatDateTime(error.conflict.start)} au {formatDateTime(error.conflict.blockedEnd)}.
              </p>
            )}
          </div>
        )}
        <Button type="submit" className="w-full" variant={done ? "gold" : "primary"}>{done ? "Enregistré ✓" : "Enregistrer"}</Button>
      </form>
    </Modal>
  );
}
