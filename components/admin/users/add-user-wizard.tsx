"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BusinessError, saveStaff } from "@/lib/db/mock-backend";
import { ROLE_INFO, ROLE_LABELS } from "@/lib/labels";
import { normalizePhone } from "@/lib/phone";
import type { RoleId, StaffUser } from "@/lib/types";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button, Field, buttonClass, cn } from "../../ui";
import { Modal } from "../../ui/modal";
import { useStaff } from "../shell";

const ROLES: RoleId[] = ["manager_auto", "manager_rental", "manager_events", "sales", "accountant", "driver", "admin"];

/** Ajout d'un utilisateur en 3 étapes : identité → rôle → invitation (§42). */
export function AddUserWizard({ open, onClose, initialRole }: { open: boolean; onClose: () => void; initialRole?: RoleId }) {
  const me = useStaff();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", jobTitle: "", roleId: initialRole ?? ("manager_auto" as RoleId) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<StaffUser | null>(null);
  const [error, setError] = useState<string>();

  const close = () => {
    setStep(0);
    setForm({ fullName: "", email: "", phone: "", jobTitle: "", roleId: initialRole ?? "manager_auto" });
    setCreated(null);
    setErrors({});
    setError(undefined);
    onClose();
  };

  const validateIdentity = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = "Indiquez le nom complet";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Adresse e-mail invalide";
    if (form.phone && !normalizePhone(form.phone)) e.phone = "Numéro invalide (ex. 06 123 45 67)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setError(undefined);
    const user: StaffUser = {
      id: crypto.randomUUID(),
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizePhone(form.phone) ?? "",
      jobTitle: form.jobTitle.trim() || undefined,
      roleId: form.roleId,
      isActive: true,
      createdAt: new Date().toISOString(),
      invitedBy: me.id,
    };
    try {
      await saveStaff(user, me.id);
      setCreated(user);
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
      if (e instanceof BusinessError && e.code === "email_taken") setStep(0);
    }
  };

  const loginUrl = typeof location !== "undefined" ? `${location.origin}/admin/login` : "/admin/login";
  const inviteText = created
    ? `Bonjour ${created.fullName}, votre accès à l'espace de gestion BRYAN MULTISERVICES est prêt (${ROLE_LABELS[created.roleId]}).\nConnexion : ${loginUrl}\nIdentifiant : ${created.email}`
    : "";

  return (
    <Modal open={open} onClose={close} title={created ? "Utilisateur ajouté" : "Ajouter un utilisateur"} wide>
      {created ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="size-6 shrink-0" />
            <p className="text-sm">
              <strong>{created.fullName}</strong> a été ajouté(e) comme <strong>{ROLE_LABELS[created.roleId]}</strong>. Son accès est actif immédiatement.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Envoyer l&apos;invitation</p>
            <pre className="rounded-xl bg-paper p-3 text-xs whitespace-pre-wrap">{inviteText}</pre>
            <div className="flex flex-wrap gap-2">
              {created.phone && (
                <a className={buttonClass("whatsapp", "sm")} target="_blank" rel="noopener noreferrer" href={buildWhatsAppLink(created.phone, inviteText)}>
                  <MessageCircle className="size-4" /> Par WhatsApp
                </a>
              )}
              <a className={buttonClass("outline", "sm")} href={`mailto:${created.email}?subject=${encodeURIComponent("Votre accès BRYAN MULTISERVICES")}&body=${encodeURIComponent(inviteText)}`}>
                <Mail className="size-4" /> Par e-mail
              </a>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(inviteText)}><Copy className="size-4" /> Copier</Button>
            </div>
            <p className="text-xs text-muted">En production, Supabase Auth envoie automatiquement un e-mail pour choisir le mot de passe. Démo : mot de passe « demo ».</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreated(null); setStep(0); setForm({ fullName: "", email: "", phone: "", jobTitle: "", roleId: form.roleId }); }}>Ajouter un autre</Button>
            <Button onClick={close}>Terminer</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <ol className="grid grid-cols-3 gap-2 text-xs font-semibold">
            {["Identité", "Rôle", "Confirmation"].map((label, i) => (
              <li key={label} className={cn("flex items-center gap-2 rounded-xl px-3 py-2", i === step ? "bg-ink text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-paper text-muted")}>
                <span className={cn("grid size-5 place-items-center rounded-full text-[10px]", i === step ? "bg-gold text-ink" : i < step ? "bg-emerald-600 text-white" : "bg-line")}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" error={errors.fullName} className="sm:col-span-2"><input className="input" autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
              <Field label="E-mail (identifiant de connexion)" error={errors.email ?? (error && step === 0 ? error : undefined)}><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Téléphone / WhatsApp" error={errors.phone} hint="Pour lui envoyer l'invitation"><input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Fonction (facultatif)" className="sm:col-span-2" hint="Ex. Responsable agence Brazzaville"><input className="input" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => {
                const on = form.roleId === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, roleId: r })}
                    aria-pressed={on}
                    className={cn("rounded-2xl border p-4 text-left transition", on ? "border-ink ring-2 ring-ink/10" : "border-line hover:border-ink/30", r === "admin" && "sm:col-span-2")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", ROLE_INFO[r].tone)}>{ROLE_LABELS[r]}</span>
                      <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-ink bg-ink text-white" : "border-line")}>{on && <Check className="size-3" />}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{ROLE_INFO[r].summary}</p>
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {ROLE_INFO[r].can.map((c) => <li key={c} className="rounded-md bg-paper px-2 py-0.5 text-[11px]">{c}</li>)}
                    </ul>
                  </button>
                );
              })}
              {form.roleId === "admin" && <p className="text-sm font-medium text-amber-700 sm:col-span-2">⚠️ Un super administrateur a tous les droits, y compris sur les utilisateurs. Réservez ce rôle à la direction.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-2xl bg-paper p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted">Nom</dt><dd className="font-semibold">{form.fullName}</dd></div>
                <div><dt className="text-xs text-muted">E-mail</dt><dd className="font-semibold">{form.email}</dd></div>
                <div><dt className="text-xs text-muted">Téléphone</dt><dd className="font-semibold">{form.phone || "—"}</dd></div>
                <div><dt className="text-xs text-muted">Rôle</dt><dd><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", ROLE_INFO[form.roleId].tone)}>{ROLE_LABELS[form.roleId]}</span></dd></div>
              </dl>
              <p className="flex gap-2 text-sm text-muted"><ShieldCheck className="size-5 shrink-0 text-emerald-600" />Les droits exacts du rôle sont modifiables dans l&apos;onglet « Rôles & permissions ».</p>
              {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
            </div>
          )}

          <div className="flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => (step === 0 ? close() : setStep(step - 1))}>
              {step === 0 ? "Annuler" : <><ArrowLeft className="size-4" /> Retour</>}
            </Button>
            {step < 2 ? (
              <Button onClick={() => { if (step === 0 && !validateIdentity()) return; setError(undefined); setStep(step + 1); }}>
                Continuer <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="gold" onClick={submit}><Check className="size-4" /> Ajouter l&apos;utilisateur</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
