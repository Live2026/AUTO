"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusinessError, createManualRequest } from "@/lib/db/mock-backend";
import { CHANNEL_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";
import type { RequestChannel, RequestType } from "@/lib/types";
import { Button, Field } from "../../ui";
import { Modal } from "../../ui/modal";
import { useStaff } from "../shell";

/** Création manuelle d'une demande reçue par WhatsApp / téléphone / en agence (US5.5). */
export function NewRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useStaff();
  const router = useRouter();
  const [form, setForm] = useState({ type: "sale" as RequestType, channel: "whatsapp" as RequestChannel, fullName: "", phone: "", message: "" });
  const [error, setError] = useState<string>();
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle demande">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const id = await createManualRequest(form, user.id);
            onClose();
            router.push(`/admin/crm/${id}`);
          } catch (err) {
            setError(err instanceof BusinessError ? err.message : String(err));
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}>
              {Object.entries(REQUEST_TYPE_LABELS).filter(([k]) => k !== "event").map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Canal">
            <select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as RequestChannel })}>
              {Object.entries(CHANNEL_LABELS).filter(([k]) => k !== "web_form").map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Nom du client"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
        <Field label="Téléphone" hint="Un contact existant est retrouvé automatiquement par son numéro (R2)."><input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Message / besoin"><textarea className="input min-h-20" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <p className="text-xs text-muted">Pour un événement, utilisez l&apos;assistant public « Créer mon événement » avec le client.</p>
        <Button type="submit" className="w-full">Créer la demande</Button>
      </form>
    </Modal>
  );
}
