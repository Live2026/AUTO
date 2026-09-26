"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BellRing, Download, KeyRound, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Avatar, PageHeader, useStaff } from "@/components/admin/shell";
import { Panel } from "@/components/admin/ui";
import { Button, Field } from "@/components/ui";
import { BusinessError, mockDb, saveStaff } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { ALL_PERMISSIONS, can } from "@/lib/permissions";

function notificationPermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export default function ProfilePage() {
  const user = useStaff();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone, email: user.email });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [permTick, setPermTick] = useState(0);
  const permission = useSyncExternalStore(
    () => () => undefined,
    () => `${notificationPermission()}#${permTick}`,
    () => "default#0",
  ).split("#")[0];
  const activity = useLiveQuery(() => mockDb.audit.filter((a) => a.actorId === user.id).reverse().sortBy("occurredAt"), [user.id]);

  return (
    <>
      <PageHeader title="Mon profil" description="Vos informations, la sécurité de votre compte et les alertes de cet appareil." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel title="Identité">
          <form
            className="space-y-4 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveStaff({ ...user, ...form }, user.id);
                setMsg({ ok: true, text: "Profil enregistré ✓" });
              } catch (err) {
                setMsg({ ok: false, text: err instanceof BusinessError ? err.message : String(err) });
              }
            }}
          >
            <div className="flex items-center gap-4">
              <Avatar user={user} size="lg" />
              <div>
                <p className="text-lg font-bold">{user.fullName}</p>
                <span className={user.roleId === "admin" ? "rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink" : "rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold"}>
                  {ROLE_LABELS[user.roleId]}
                </span>
              </div>
            </div>
            <Field label="Nom complet"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="E-mail de connexion"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            {msg && <p className={msg.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-rose-600"}>{msg.text}</p>}
            <Button type="submit">Enregistrer</Button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Notifications de cet appareil">
            <div id="notifications" className="space-y-3 p-4 text-sm">
              <p className="flex gap-2"><BellRing className="size-5 shrink-0 text-gold" />Recevez une alerte (son + notification système) dès qu&apos;une demande ou un devis arrive, même si l&apos;onglet est en arrière-plan.</p>
              <p>État : <strong>{permission === "granted" ? "activées ✓" : permission === "denied" ? "bloquées par le navigateur" : permission === "unsupported" ? "non prises en charge" : "non activées"}</strong></p>
              {permission !== "granted" && permission !== "unsupported" && (
                <Button
                  onClick={async () => {
                    await Notification.requestPermission();
                    setPermTick((t) => t + 1);
                  }}
                >
                  Activer les notifications
                </Button>
              )}
              <p className="text-xs text-muted">Sur iPhone : installez d&apos;abord l&apos;application (Partager → Sur l&apos;écran d&apos;accueil). En production, les alertes arrivent aussi par Web Push et e-mail.</p>
            </div>
          </Panel>
          <Panel title="Sécurité">
            <div className="space-y-3 p-4 text-sm">
              <p className="flex gap-2"><KeyRound className="size-5 shrink-0 text-muted" />Changement de mot de passe et réinitialisation par e-mail : Supabase Auth (au branchement).</p>
              <p className="flex gap-2"><Download className="size-5 shrink-0 text-muted" />Installez l&apos;application admin : menu du navigateur → « Installer Bryan Admin ».</p>
            </div>
          </Panel>
          <Panel title="Mes droits">
            <ul className="grid gap-1.5 p-4 text-sm sm:grid-cols-2">
              {ALL_PERMISSIONS.filter(([p]) => can(user.roleId, p)).map(([p, label]) => (
                <li key={p} className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" />{label}</li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Mon activité récente" className="lg:col-span-2">
          <ul className="divide-y divide-line text-sm">
            {activity?.length === 0 && <li className="p-4 text-muted">Aucune action pour le moment.</li>}
            {activity?.slice(0, 15).map((a) => (
              <li key={a.id} className="flex gap-3 p-3"><span className="w-32 shrink-0 text-muted">{formatDateTime(a.occurredAt)}</span>{a.summary}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
