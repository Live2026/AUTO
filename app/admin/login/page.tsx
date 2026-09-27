"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, CalendarCheck, Car, Eye, EyeOff, FileCheck2, Inbox, KeyRound, MailCheck, PartyPopper, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { Button, Field, Spinner, cn } from "@/components/ui";
import { signIn } from "@/lib/admin/session";
import { ensureSeeded, mockDb, recordFailedLogin, recordLogin, sendPasswordReset } from "@/lib/db/mock-backend";
import { ROLE_LABELS } from "@/lib/labels";

const DEMO_PASSWORD = "demo";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "reset" | "sent">("login");
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void ensureSeeded().then(() => setReady(true));
  }, []);
  const staff = useLiveQuery(async () => (ready ? mockDb.staff.toArray() : undefined), [ready]);
  const active = staff?.filter((u) => u.isActive);
  const emailValue = email ?? active?.[0]?.email ?? "";
  const demoUser = active?.find((u) => u.email === emailValue.trim().toLowerCase());

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  const submit = async () => {
    setError(undefined);
    const user = staff?.find((u) => u.email === emailValue.trim().toLowerCase());
    if (!user || password !== DEMO_PASSWORD) {
      void recordFailedLogin(emailValue, "bad_credentials");
      return setError("E-mail ou mot de passe incorrect.");
    }
    if (!user.isActive) {
      void recordFailedLogin(emailValue, "disabled");
      return setError("Ce compte est désactivé. Contactez le super administrateur.");
    }
    setPending(true);
    signIn(user.id);
    await recordLogin(user.id);
    router.replace("/admin");
  };

  const reset = async () => {
    const user = staff?.find((u) => u.email === emailValue.trim().toLowerCase() && u.isActive);
    // Réponse identique que le compte existe ou non (pas de divulgation des e-mails).
    if (user) await sendPasswordReset(user.id, user.id);
    setMode("sent");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <Showcase />

      <main className="relative flex flex-col bg-paper px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:invisible">
            <span className="grid size-10 place-items-center rounded-xl bg-gold font-black text-ink">B</span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold">BRYAN MULTISERVICES</span>
              <span className="block text-xs text-muted">Espace de gestion</span>
            </span>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink">
            <ArrowLeft className="size-4" /> <span className="max-sm:sr-only">Retour au site</span>
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-[400px] py-10">
          {mode === "login" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-line">
                <KeyRound className="size-5 text-gold-deep" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">Bon retour</h1>
              <p className="mt-1.5 mb-7 text-sm text-muted">Connectez-vous pour accéder à l&apos;espace de gestion.</p>

              {!staff ? (
                <div className="grid h-56 place-items-center"><Spinner /></div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                    </p>
                  )}
                  <Field label="E-mail professionnel">
                    <input
                      className="input h-12 bg-white"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      placeholder="prenom@bryan.cg"
                      value={emailValue}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!error}
                    />
                  </Field>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                      <button type="button" onClick={() => { setError(undefined); setMode("reset"); }} className="text-xs font-semibold text-gold-deep hover:underline">
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        className="input h-12 bg-white pr-12"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={onKey}
                        onKeyDown={onKey}
                        aria-invalid={!!error}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted hover:text-ink"
                        aria-label={showPassword ? "Masquer la saisie" : "Afficher la saisie"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {capsLock && <p className="mt-1.5 text-xs font-medium text-amber-700">Verrouillage des majuscules activé.</p>}
                  </div>

                  <Button type="submit" size="lg" className="group w-full" disabled={pending}>
                    {pending ? <Spinner className="size-4" /> : null}
                    Se connecter
                    {!pending && <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />}
                  </Button>

                  {/* Profils de démonstration — disparaîtra avec Supabase Auth */}
                  <div className="rounded-2xl border border-dashed border-gold/50 bg-gold/5 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-gold-deep uppercase">
                      <Sparkles className="size-3.5" /> Mode démonstration
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                        {demoUser ? initials(demoUser.fullName) : "?"}
                      </span>
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Utilisateur (démo)</span>
                        <select
                          className="input h-10 bg-white text-sm"
                          value={demoUser?.id ?? ""}
                          onChange={(e) => {
                            const u = active?.find((x) => x.id === e.target.value);
                            if (u) setEmail(u.email);
                            setError(undefined);
                          }}
                        >
                          {!demoUser && <option value="">Choisir un profil…</option>}
                          {active!.map((u) => (
                            <option key={u.id} value={u.id}>{u.fullName} — {ROLE_LABELS[u.roleId]}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="mt-2.5 text-xs text-muted">
                      Chaque profil voit un menu différent selon ses droits. Mot de passe : <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink ring-1 ring-line">{DEMO_PASSWORD}</kbd>
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}

          {mode === "reset" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void reset();
              }}
            >
              <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-line">
                <KeyRound className="size-5 text-gold-deep" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">Mot de passe oublié</h1>
              <p className="mt-1.5 mb-7 text-sm text-muted">Indiquez votre e-mail professionnel : nous vous envoyons un lien pour en choisir un nouveau.</p>
              <div className="space-y-4">
                <Field label="E-mail professionnel">
                  <input className="input h-12 bg-white" type="email" required autoComplete="username" value={emailValue} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Button type="submit" size="lg" className="w-full">Envoyer le lien</Button>
                <button type="button" onClick={() => setMode("login")} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                  <ArrowLeft className="size-4" /> Retour à la connexion
                </button>
              </div>
            </form>
          )}

          {mode === "sent" && (
            <div className="text-center">
              <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                <MailCheck className="size-6 text-emerald-700" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">Vérifiez vos e-mails</h1>
              <p className="mt-2 mb-7 text-sm text-muted">
                Si un compte actif correspond à <strong className="text-ink">{emailValue}</strong>, un lien de réinitialisation vient d&apos;être envoyé. Il est valable 1 heure.
              </p>
              <Button size="lg" variant="outline" className="w-full" onClick={() => setMode("login")}>
                <ArrowLeft className="size-4" /> Retour à la connexion
              </Button>
            </div>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck className="size-3.5 text-emerald-700" /> Accès réservé au personnel · connexion sécurisée
        </p>
      </main>
    </div>
  );
}

/** Panneau de présentation (ordinateur) : aperçu décoratif de l'espace de gestion. */
function Showcase() {
  return (
    <aside className="surface-dark relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(45%_40%_at_85%_30%,rgba(201,162,39,0.22),transparent_70%),radial-gradient(50%_50%_at_0%_100%,rgba(14,116,144,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(70%_60%_at_60%_35%,#000,transparent)]" />

      <div className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-gold text-lg font-black text-ink shadow-lg shadow-gold/20">B</span>
        <span>
          <span className="block font-extrabold tracking-tight">BRYAN MULTISERVICES</span>
          <span className="block text-xs tracking-widest text-gold uppercase">Espace de gestion</span>
        </span>
      </div>

      {/* Aperçu de l'application */}
      <div aria-hidden className="relative mx-auto my-auto w-full max-w-md py-10">
        <div className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Aujourd&apos;hui</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> En direct
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              [Car, "Vente", "6", "#e0b93a"],
              [CalendarCheck, "Location", "4", "#38bdf8"],
              [PartyPopper, "Événements", "3", "#f472b6"],
            ].map(([I, label, n, color]) => {
              const Icon = I as typeof Car;
              return (
                <div key={label as string} className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                  <Icon className="size-4" style={{ color: color as string }} />
                  <p className="mt-2 text-2xl font-extrabold">{n as string}</p>
                  <p className="text-[11px] text-white/60">{label as string}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {[30, 45, 38, 60, 52, 75, 64, 88, 70, 95, 82, 100].map((h, i) => (
              <span key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-gold/40 to-gold" style={{ height: `${h}%`, opacity: 0.35 + i * 0.055 }} />
            ))}
          </div>
        </div>

        <div className="surface-light absolute -right-4 -bottom-2 w-80 rounded-2xl bg-white p-4 text-ink shadow-2xl shadow-black/40 ring-1 ring-black/5 xl:-right-10">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><Inbox className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Nouvelle demande</p>
              <p className="truncate text-xs text-muted">Location · Land Cruiser Prado · 3 jours</p>
              <p className="mt-1 text-[11px] font-semibold text-gold-deep">LOC-2026-00128 · à l&apos;instant</p>
            </div>
          </div>
        </div>
        <div className="surface-light absolute -top-3 -left-6 hidden rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xl shadow-black/30 xl:flex xl:items-center xl:gap-2">
          <FileCheck2 className="size-4 text-emerald-700" /> Devis accepté en ligne
        </div>
      </div>

      <div className="relative max-w-lg">
        <p className="text-3xl leading-tight font-extrabold tracking-tight">
          Vos demandes, réservations et devis — <span className="text-gold">au même endroit.</span>
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Alertes en direct", "Zéro double réservation", "Devis en un lien", "Droits par rôle"].map((t) => (
            <span key={t} className={cn("rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/10")}>{t}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
