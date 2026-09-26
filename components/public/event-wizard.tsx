"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "@/lib/db/public-db";
import { trackEvent } from "@/lib/db/mock-backend";
import { formatDateLong, formatNumber, formatXAF } from "@/lib/format";
import { dayInput } from "@/lib/hooks";
import type { EventType, EventTypeRecommendation, Package, Service, ServiceCategory } from "@/lib/types";
import { buildWhatsAppLink, fillTemplate } from "@/lib/whatsapp";
import { Button, Field, Spinner, buttonClass, cn } from "../ui";
import { DynamicIcon } from "./dynamic-icon";
import { ContactFields, EMPTY_CONTACT, RequestSuccess, contactPayload, validateAndSubmit, type ContactValue, type SubmitState } from "./request-form";

const DRAFT_KEY = "event-wizard";
const STEPS = ["Type", "Date", "Lieu", "Invités", "Services", "Budget", "Coordonnées", "Résumé"];
const BUDGETS: [string, number | undefined, number | undefined][] = [
  ["Je ne sais pas encore", undefined, undefined],
  ["Moins de 500 000 FCFA", 0, 500_000],
  ["500 000 – 1 500 000 FCFA", 500_000, 1_500_000],
  ["1 500 000 – 3 000 000 FCFA", 1_500_000, 3_000_000],
  ["3 000 000 – 7 000 000 FCFA", 3_000_000, 7_000_000],
  ["Plus de 7 000 000 FCFA", 7_000_000, undefined],
];

interface WizardData {
  step: number;
  eventType: string;
  date: string;
  dateUnknown: boolean;
  city: string;
  venue: string;
  guests: string;
  serviceIds: string[];
  budget: number;
  message: string;
  contact: ContactValue;
}

const INITIAL: WizardData = {
  step: 0,
  eventType: "",
  date: "",
  dateUnknown: false,
  city: "",
  venue: "",
  guests: "",
  serviceIds: [],
  budget: 0,
  message: "",
  contact: EMPTY_CONTACT,
};

export function EventWizard({
  eventTypes,
  categories,
  services,
  packages,
  recommendations,
  cities,
  whatsappNumber,
  whatsappTemplate,
}: {
  eventTypes: EventType[];
  categories: ServiceCategory[];
  services: Service[];
  packages: Package[];
  recommendations: EventTypeRecommendation[];
  cities: string[];
  whatsappNumber: string;
  whatsappTemplate: string;
}) {
  const params = useSearchParams();
  const [data, setData] = useState<WizardData>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const topRef = useRef<HTMLDivElement>(null);

  // Reprise du brouillon IndexedDB + préremplissage via l'URL (?type=, ?services=)
  useEffect(() => {
    let alive = true;
    loadDraft<WizardData>(DRAFT_KEY).then((draft) => {
      if (!alive) return;
      const typeParam = params.get("type");
      const servicesParam = params.get("services")?.split(",").filter(Boolean);
      let next = draft ? { ...INITIAL, ...draft, contact: { ...EMPTY_CONTACT, ...draft.contact, consent: false } } : INITIAL;
      if (typeParam && eventTypes.some((e) => e.slug === typeParam)) next = { ...next, eventType: typeParam, step: Math.max(next.step, 1) };
      if (servicesParam?.length) next = { ...next, serviceIds: [...new Set([...next.serviceIds, ...servicesParam])] };
      setData(next);
      setLoaded(true);
      void trackEvent("form_start", { props: { type: "event" } });
    });
    return () => {
      alive = false;
    };
  }, [params, eventTypes]);

  useEffect(() => {
    if (loaded && state.kind === "idle") void saveDraft(DRAFT_KEY, data);
  }, [data, loaded, state.kind]);

  const type = eventTypes.find((e) => e.slug === data.eventType);
  const recommended = useMemo(() => {
    if (!type) return { services: new Set<string>(), packages: [] as Package[] };
    const recs = recommendations.filter((r) => r.eventTypeId === type.id);
    return {
      services: new Set(recs.map((r) => r.serviceId).filter(Boolean) as string[]),
      packages: packages.filter((p) => recs.some((r) => r.packageId === p.id) || p.eventTypeId === type.id),
    };
  }, [type, recommendations, packages]);

  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const go = (step: number) => {
    set({ step });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const canNext = [
    !!data.eventType,
    data.dateUnknown || !!data.date,
    !!data.city,
    true,
    true,
    true,
    true,
    true,
  ][data.step];

  const selectedServices = services.filter((s) => data.serviceIds.includes(s.id));
  const [budgetLabel, budgetMin, budgetMax] = BUDGETS[data.budget];

  const submit = async () => {
    const payload = {
      ...contactPayload(data.contact),
      type: "event" as const,
      eventType: data.eventType,
      eventDate: data.dateUnknown ? undefined : data.date,
      eventCity: data.city,
      venue: data.venue || undefined,
      guestsCount: data.guests ? Number(data.guests) : undefined,
      budgetMin,
      budgetMax,
      serviceIds: data.serviceIds,
      subject: type ? `${type.name}${data.guests ? ` — ${data.guests} invités` : ""}` : undefined,
      message: data.message || undefined,
      sourcePage: "/evenementiel/creer",
    };
    const errs = await validateAndSubmit(payload, `${type?.name ?? "Événement"} — ${data.city}`, setState);
    setErrors(errs);
    if (Object.keys(errs).length) go(6);
  };

  useEffect(() => {
    if (state.kind === "sent" || state.kind === "queued") void clearDraft(DRAFT_KEY);
  }, [state.kind]);

  if (state.kind === "sent" || state.kind === "queued") {
    const summaryText = [
      `${type?.name ?? "Événement"}`,
      data.guests && `${data.guests} invités`,
      data.city,
      data.dateUnknown ? "date à définir" : formatDateLong(data.date),
      ...selectedServices.map((s) => `✓ ${s.name}`),
    ]
      .filter(Boolean)
      .join("\n");
    return (
      <div className="card mx-auto max-w-xl p-6">
        <RequestSuccess state={state} whatsappNumber={whatsappNumber}>
          <p className="text-sm text-muted">Votre dossier événement est créé. Un conseiller prépare votre devis.</p>
          {state.kind === "sent" && (
            <a
              className={buttonClass("outline", "sm", "mx-auto")}
              target="_blank"
              rel="noopener noreferrer"
              href={buildWhatsAppLink(whatsappNumber, `Bonjour BRYAN MULTISERVICES, voici ma demande ${state.reference} :\n${summaryText}`)}
            >
              Envoyer le résumé sur WhatsApp
            </a>
          )}
        </RequestSuccess>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="grid h-64 place-items-center">
        <Spinner className="size-6 text-event" />
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-24">
      {/* Progression */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">Étape {data.step + 1} / {STEPS.length} · <span className="text-event">{STEPS[data.step]}</span></p>
          {data.step > 0 && (
            <button type="button" className="text-muted hover:text-ink" onClick={() => { setData(INITIAL); void clearDraft(DRAFT_KEY); }}>
              Recommencer
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-8 gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={`Aller à l'étape ${s}`}
              disabled={i > data.step}
              onClick={() => go(i)}
              className={cn("h-1.5 rounded-full transition", i <= data.step ? "bg-event" : "bg-line")}
            />
          ))}
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        {data.step === 0 && (
          <Step title="Quel événement organisez-vous ?">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {eventTypes.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    set({ eventType: e.slug });
                    go(1);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition",
                    data.eventType === e.slug ? "border-event bg-event-soft" : "border-line hover:border-event/40",
                  )}
                >
                  <DynamicIcon name={e.icon} className="size-7 text-event" />
                  <span className="text-sm font-semibold">{e.name}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {data.step === 1 && (
          <Step title="Quelle est la date ?">
            <Field label="Date de l'événement">
              <input type="date" className="input" min={dayInput(0)} disabled={data.dateUnknown} value={data.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-event" checked={data.dateUnknown} onChange={(e) => set({ dateUnknown: e.target.checked })} />
              La date n&apos;est pas encore fixée
            </label>
          </Step>
        )}

        {data.step === 2 && (
          <Step title="Où aura lieu l'événement ?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville">
                <select className="input" value={data.city} onChange={(e) => set({ city: e.target.value })}>
                  <option value="">Choisir…</option>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lieu / salle (facultatif)">
                <input className="input" value={data.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Ex. Salle Les Palmiers" />
              </Field>
            </div>
          </Step>
        )}

        {data.step === 3 && (
          <Step title="Combien d'invités attendez-vous ?">
            <div className="mb-4 flex flex-wrap gap-2">
              {["30", "50", "100", "150", "250", "500"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set({ guests: g })}
                  className={cn("rounded-full border px-4 py-2 text-sm font-semibold", data.guests === g ? "border-event bg-event text-white" : "border-line")}
                >
                  {g}
                </button>
              ))}
            </div>
            <Field label="Nombre d'invités (approximatif)">
              <input className="input" inputMode="numeric" value={data.guests} onChange={(e) => set({ guests: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </Step>
        )}

        {data.step === 4 && (
          <Step title="Quels services recherchez-vous ?" subtitle={type ? `Nos recommandations pour un ${type.name.toLowerCase()} sont signalées.` : undefined}>
            {recommended.packages.length > 0 && (
              <div className="mb-5 space-y-2">
                {recommended.packages.map((p) => {
                  const ids = p.items.map((i) => i.serviceId);
                  const active = ids.every((id) => data.serviceIds.includes(id));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set({ serviceIds: active ? data.serviceIds.filter((id) => !ids.includes(id)) : [...new Set([...data.serviceIds, ...ids])] })}
                      className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition", active ? "border-event bg-event-soft" : "border-dashed border-event/40")}
                    >
                      <Sparkles className="mt-0.5 size-5 shrink-0 text-event" />
                      <span className="flex-1">
                        <span className="block font-bold">Pack {p.name}{p.priceVisible && p.price ? ` — ${formatXAF(p.price)}` : ""}</span>
                        <span className="block text-sm text-muted">{p.description}</span>
                      </span>
                      {active && <Check className="size-5 text-event" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="space-y-5">
              {categories.map((cat) => {
                const list = services
                  .filter((s) => s.categoryId === cat.id)
                  .sort((a, b) => Number(recommended.services.has(b.id)) - Number(recommended.services.has(a.id)));
                if (!list.length) return null;
                return (
                  <div key={cat.id}>
                    <p className="mb-2 text-sm font-semibold text-muted">{cat.name}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((s) => {
                        const on = data.serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => set({ serviceIds: on ? data.serviceIds.filter((x) => x !== s.id) : [...data.serviceIds, s.id] })}
                            className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition", on ? "border-event bg-event-soft" : "border-line hover:border-event/40")}
                            aria-pressed={on}
                          >
                            <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border", on ? "border-event bg-event text-white" : "border-line")}>
                              {on && <Check className="size-4" />}
                            </span>
                            <span className="flex-1 text-sm">
                              <span className="font-semibold">{s.name}</span>
                              {recommended.services.has(s.id) && <span className="ml-2 rounded-full bg-event/10 px-2 py-0.5 text-[10px] font-bold text-event uppercase">Recommandé</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Step>
        )}

        {data.step === 5 && (
          <Step title="Avez-vous un budget indicatif ?" subtitle="Facultatif — cela nous aide à vous proposer les bonnes options.">
            <div className="grid gap-2">
              {BUDGETS.map(([label], i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set({ budget: i })}
                  className={cn("rounded-xl border px-4 py-3 text-left text-sm font-semibold", data.budget === i ? "border-event bg-event-soft" : "border-line")}
                >
                  {label}
                </button>
              ))}
            </div>
          </Step>
        )}

        {data.step === 6 && (
          <Step title="Vos coordonnées" subtitle="Aucun compte à créer : un conseiller vous recontacte.">
            <ContactFields value={data.contact} onChange={(contact) => set({ contact })} errors={errors} />
            <Field label="Précisions (facultatif)" className="mt-4">
              <textarea className="input min-h-20" value={data.message} onChange={(e) => set({ message: e.target.value })} placeholder="Thème, horaires, besoins particuliers…" />
            </Field>
          </Step>
        )}

        {data.step === 7 && (
          <Step title="Résumé de votre événement">
            <div className="rounded-2xl bg-ink p-5 font-mono text-sm text-white">
              <p className="text-lg font-bold text-gold uppercase">{type?.name}</p>
              {data.guests && <p>{formatNumber(Number(data.guests))} invités</p>}
              <p>{data.city}{data.venue ? ` — ${data.venue}` : ""}</p>
              <p>{data.dateUnknown ? "Date à définir" : formatDateLong(data.date)}</p>
              {selectedServices.length > 0 && (
                <ul className="mt-3 space-y-0.5">
                  {selectedServices.map((s) => (
                    <li key={s.id}>✓ {s.name}</li>
                  ))}
                </ul>
              )}
              {data.budget > 0 && <p className="mt-3 text-white/70">Budget : {budgetLabel}</p>}
            </div>
            <dl className="mt-4 text-sm">
              <dt className="text-muted">Contact</dt>
              <dd className="font-semibold">{data.contact.fullName} · {data.contact.phone}</dd>
            </dl>
            {state.kind === "error" && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.message}</p>}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="event" size="lg" onClick={submit} disabled={state.kind === "sending"}>
                {state.kind === "sending" && <Spinner />} Demander mon devis
              </Button>
              <a
                className={buttonClass("whatsapp", "lg")}
                target="_blank"
                rel="noopener noreferrer"
                href={buildWhatsAppLink(whatsappNumber, fillTemplate(whatsappTemplate, { type_evenement: type?.name.toLowerCase() ?? "événement" }))}
              >
                Discuter sur WhatsApp
              </a>
            </div>
          </Step>
        )}

        {/* Navigation */}
        {data.step > 0 && data.step < 7 && (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={() => go(data.step - 1)}>
              <ArrowLeft className="size-4" /> Retour
            </Button>
            <Button
              variant="event"
              disabled={!canNext}
              onClick={() => {
                if (data.step === 6) {
                  const c = data.contact;
                  const errs: Record<string, string> = {};
                  if (c.fullName.trim().length < 2) errs.fullName = "Indiquez votre nom";
                  if (!c.phone.trim()) errs.phone = "Le numéro de téléphone est obligatoire";
                  if (!c.consent) errs.consent = "Votre accord est nécessaire pour être recontacté";
                  setErrors(errs);
                  if (Object.keys(errs).length) return;
                }
                go(data.step + 1);
              }}
            >
              {data.step === 4 && data.serviceIds.length === 0 ? "Passer" : "Continuer"} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
        {data.step === 7 && (
          <button type="button" className="mt-4 text-sm text-muted hover:text-ink" onClick={() => go(6)}>
            ← Modifier mes informations
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Votre saisie est enregistrée sur cet appareil : vous pouvez reprendre plus tard.</p>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
