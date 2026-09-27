"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarCheck, FileCheck2, Inbox, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Spinner } from "@/components/ui";
import { signIn } from "@/lib/admin/session";
import { ensureSeeded, mockDb, recordLogin } from "@/lib/db/mock-backend";
import { ROLE_LABELS } from "@/lib/labels";

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    void ensureSeeded().then(() => setReady(true));
  }, []);
  const staff = useLiveQuery(async () => (ready ? (await mockDb.staff.toArray()).filter((u) => u.isActive) : undefined), [ready]);
  const selected = userId || staff?.[0]?.id || "";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Présentation (ordinateur) */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_100%_0%,rgba(201,162,39,0.3),transparent_70%),radial-gradient(50%_60%_at_0%_100%,rgba(14,116,144,0.3),transparent_70%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold text-lg font-black text-ink">B</span>
          <span>
            <span className="block font-extrabold">BRYAN MULTISERVICES</span>
            <span className="block text-xs tracking-widest text-gold uppercase">Espace de gestion</span>
          </span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <p className="text-4xl leading-tight font-extrabold tracking-tight">Toutes vos demandes, réservations et devis au même endroit.</p>
          <ul className="mt-8 space-y-4 text-white/85">
            {[
              [Inbox, "Les demandes du site arrivent en direct, avec alerte et son."],
              [CalendarCheck, "Réservations sans double emploi : les conflits sont refusés."],
              [FileCheck2, "Devis envoyés en un lien, acceptés en ligne par le client."],
            ].map(([I, t]) => {
              const Icon = I as typeof Inbox;
              return (
                <li key={t as string} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-gold"><Icon className="size-4" /></span>
                  <span className="pt-1.5 text-sm">{t as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/50">Automobile • Location • Événementiel</p>
      </aside>

      {/* Formulaire */}
      <div className="grid place-items-center bg-paper p-4 sm:p-8">
        <form
          className="w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (password !== "demo") return setError("Mot de passe incorrect (démo : « demo »).");
            signIn(selected);
            void recordLogin(selected);
            router.replace("/admin");
          }}
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-gold font-black text-ink">B</span>
            <div>
              <p className="font-extrabold">Bryan Admin</p>
              <p className="text-xs text-muted">Espace réservé au personnel</p>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Connexion</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Accès réservé à l&apos;équipe BRYAN MULTISERVICES.</p>
          {!staff ? (
            <div className="grid h-40 place-items-center"><Spinner /></div>
          ) : (
            <div className="card space-y-4 p-5 shadow-xl shadow-black/5">
              <Field label="Utilisateur (démo)" hint="Chaque profil a des permissions différentes (R12).">
                <select className="input" value={selected} onChange={(e) => setUserId(e.target.value)}>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName} — {ROLE_LABELS[u.roleId]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mot de passe" error={error} hint="Démo : demo">
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </Field>
              <Button type="submit" size="lg" className="w-full"><LockKeyhole className="size-4" /> Se connecter</Button>
            </div>
          )}
          <p className="mt-5 text-center text-xs text-muted">En production : Supabase Auth (e-mail + mot de passe, réinitialisation).</p>
          <p className="mt-2 text-center text-xs"><Link href="/" className="font-semibold text-muted underline hover:text-ink">← Retour au site</Link></p>
        </form>
      </div>
    </div>
  );
}
