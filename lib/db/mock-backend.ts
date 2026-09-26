"use client";

// ============================================================================
// Backend de démonstration (IndexedDB « bryan-mock »).
// Reproduit les règles de la base Supabase (supabase/migrations) côté navigateur :
// références (R1), contacts (R2), anti-chevauchement (R3/R4), pipeline (R6),
// devis (R7), notifications, analytics, audit (R13).
// Quand Supabase sera branché, chaque fonction sera remplacée par l'appel RPC / la
// requête équivalente — les écrans n'auront pas à changer.
// ============================================================================

import Dexie, { type EntityTable } from "dexie";
import * as catalog from "../mock/catalog";
import { DEFAULT_ROLE_PERMISSIONS, can } from "../permissions";
import { normalizePhone } from "../phone";
import { businessYear, formatReference, requestPrefix } from "../rules/references";
import { addHours, findConflict, isBlocking } from "../rules/rental";
import { buildSnapshot } from "../rules/quote";
import { CLOSED_STATUSES, REQUEST_TYPE_LABELS, ROLE_LABELS } from "../labels";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  Appointment,
  AuditLog,
  Banner,
  BookingKind,
  BusinessSettings,
  EventType,
  MediaAsset,
  Package,
  Promotion,
  Realisation,
  Recommendation,
  RoleDef,
  RoleId,
  VehicleCategory,
  BookingStatus,
  Contact,
  CrmRequest,
  Driver,
  DriverAssignment,
  EventDossier,
  NoteKind,
  PublicRequestPayload,
  PublicRequestResult,
  Quote,
  QuoteItem,
  QuoteSnapshot,
  RequestHistoryEntry,
  RequestNote,
  RequestType,
  Service,
  StaffNotification,
  StaffUser,
  Vehicle,
  VehicleBooking,
} from "../types";

class MockDB extends Dexie {
  contacts!: EntityTable<Contact, "id">;
  requests!: EntityTable<CrmRequest, "id">;
  history!: EntityTable<RequestHistoryEntry, "id">;
  notes!: EntityTable<RequestNote, "id">;
  appointments!: EntityTable<Appointment, "id">;
  events!: EntityTable<EventDossier, "id">;
  bookings!: EntityTable<VehicleBooking, "id">;
  driverAssignments!: EntityTable<DriverAssignment, "id">;
  quotes!: EntityTable<Quote, "id">;
  notifications!: EntityTable<StaffNotification, "id">;
  analytics!: EntityTable<AnalyticsEvent, "id">;
  audit!: EntityTable<AuditLog, "id">;
  vehicles!: EntityTable<Vehicle, "id">;
  drivers!: EntityTable<Driver, "id">;
  services!: EntityTable<Service, "id">;
  counters!: EntityTable<{ key: string; value: number }, "key">;
  meta!: EntityTable<{ key: string; value: string }, "key">;
  categories!: EntityTable<VehicleCategory, "id">;
  eventTypes!: EntityTable<EventType, "id">;
  packages!: EntityTable<Package, "id">;
  recommendations!: EntityTable<Recommendation, "id">;
  realisations!: EntityTable<Realisation, "id">;
  promotions!: EntityTable<Promotion, "id">;
  banners!: EntityTable<Banner, "id">;
  media!: EntityTable<MediaAsset, "id">;
  staff!: EntityTable<StaffUser, "id">;
  roles!: EntityTable<RoleDef, "id">;
  settings!: EntityTable<{ key: "business"; value: BusinessSettings }, "key">;

  constructor() {
    super("bryan-mock");
    this.version(1).stores({
      contacts: "id, &phoneE164, createdAt",
      requests: "id, &reference, type, status, assignedTo, contactId, &trackingToken, createdAt",
      history: "id, requestId, changedAt",
      notes: "id, requestId, createdAt",
      appointments: "id, requestId",
      events: "id, &requestId",
      bookings: "id, vehicleId, status, start",
      driverAssignments: "id, driverId, bookingId",
      quotes: "id, &reference, requestId, &publicToken, status",
      notifications: "id, recipientId, createdAt",
      analytics: "++id, eventName, occurredAt",
      audit: "++id, occurredAt, tableName",
      vehicles: "id, &slug, status",
      drivers: "id",
      services: "id",
      counters: "key",
      meta: "key",
    });
    this.version(2).stores({
      categories: "id, &slug",
      eventTypes: "id, &slug",
      packages: "id, &slug",
      recommendations: "id, eventTypeId",
      realisations: "id, &slug",
      promotions: "id, scope",
      banners: "id, placement",
      media: "id, createdAt",
      staff: "id, &email",
      roles: "id",
      settings: "key",
    });
  }
}

export const mockDb = new MockDB();

// ⚠️ Les fonctions de lecture ci-dessous sont utilisées dans useLiveQuery : elles ne doivent
// attendre QUE des promesses Dexie (sinon le suivi des changements est perdu). L'initialisation
// (ensureSeeded) est donc faite en amont : AdminShell, QuoteView, TrackingView, useBookings.

export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const SEED_VERSION = "3";
const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

async function nextReference(prefix: string): Promise<string> {
  const year = businessYear();
  const key = `${prefix}-${year}`;
  const current = (await mockDb.counters.get(key))?.value ?? 0;
  await mockDb.counters.put({ key, value: current + 1 });
  return formatReference(prefix, year, current + 1);
}

async function audit(actorId: string | undefined, tableName: string, recordId: string, action: AuditLog["action"], summary: string) {
  await mockDb.audit.add({ occurredAt: nowIso(), actorId, tableName, recordId, action, summary });
}

async function notify(n: Omit<StaffNotification, "id" | "createdAt">) {
  await mockDb.notifications.add({ ...n, id: uid(), createdAt: nowIso() });
}

// Caches synchrones (personnel, paramètres) mis à jour par AdminShell / useLiveCatalog.
let staffCache: StaffUser[] = catalog.staffUsers;
export function setStaffCache(list: StaffUser[]) {
  staffCache = list;
}

async function currentSettings(): Promise<BusinessSettings> {
  return (await mockDb.settings.get("business"))?.value ?? catalog.settings;
}

/**
 * Destinataires d'une nouvelle demande (§69) :
 * - le responsable affecté ;
 * - TOUJOURS les super administrateurs (ils voient toutes les commandes) ;
 * - si personne n'est affecté : tous ceux qui ont la permission notifications.new_requests.
 */
async function newRequestRecipients(req: CrmRequest): Promise<string[]> {
  const staff = (await mockDb.staff.toArray()).filter((u) => u.isActive);
  const ids = new Set<string>();
  if (req.assignedTo) ids.add(req.assignedTo);
  for (const u of staff) {
    if (u.roleId === "admin") ids.add(u.id);
    else if (!req.assignedTo && can(u.roleId, "notifications.new_requests")) ids.add(u.id);
  }
  return [...ids];
}

async function notifyNewRequest(req: CrmRequest, contact: Contact) {
  const vehicle = req.vehicleId ? await mockDb.vehicles.get(req.vehicleId) : undefined;
  const body = [
    `Type : ${REQUEST_TYPE_LABELS[req.type]}`,
    vehicle ? `Véhicule : ${vehicle.brand} ${vehicle.model} ${vehicle.year}` : null,
    `Client : ${contact.fullName}`,
    `Téléphone : ${contact.phoneE164}`,
  ]
    .filter(Boolean)
    .join("\n");
  for (const recipientId of await newRequestRecipients(req)) {
    await notify({ recipientId, kind: "new_request", title: `Nouvelle demande ${req.reference}`, body, link: `/admin/crm/${req.id}`, requestId: req.id });
  }
}

async function logHistory(req: CrmRequest, prev: Partial<CrmRequest> | null, actorId?: string) {
  await mockDb.history.add({
    id: uid(),
    requestId: req.id,
    fromStatus: prev?.status,
    toStatus: req.status,
    fromAssignee: prev?.assignedTo,
    toAssignee: req.assignedTo,
    changedBy: actorId,
    changedAt: nowIso(),
  });
}

// ---------------------------------------------------------------------------
// Initialisation des données de démonstration
// ---------------------------------------------------------------------------

let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) seeding = seed();
  return seeding;
}

async function seed() {
  const version = await mockDb.meta.get("seed");
  if (version?.value === SEED_VERSION) return;
  await mockDb.transaction("rw", mockDb.tables, async () => {
    await Promise.all(mockDb.tables.map((t) => t.clear()));
    await mockDb.vehicles.bulkPut(catalog.vehicles);
    await mockDb.drivers.bulkPut(catalog.drivers);
    await mockDb.services.bulkPut(catalog.services);
    await mockDb.categories.bulkPut(catalog.vehicleCategories);
    await mockDb.eventTypes.bulkPut(catalog.eventTypes);
    await mockDb.packages.bulkPut(catalog.packages);
    await mockDb.recommendations.bulkPut(catalog.recommendations.map((r, i) => ({ ...r, id: `rec-${i + 1}` })));
    await mockDb.realisations.bulkPut(catalog.realisations);
    await mockDb.promotions.bulkPut(catalog.promotions);
    await mockDb.banners.bulkPut(catalog.banners);
    await mockDb.staff.bulkPut(catalog.staffUsers);
    await mockDb.roles.bulkPut(
      (Object.keys(DEFAULT_ROLE_PERMISSIONS) as RoleId[]).map((id) => ({ id, label: ROLE_LABELS[id], permissions: DEFAULT_ROLE_PERMISSIONS[id], isSystem: true })),
    );
    await mockDb.settings.put({ key: "business", value: catalog.settings });
    await seedCrm();
    await seedAnalytics();
    await mockDb.meta.put({ key: "seed", value: SEED_VERSION });
  });
}

function atDay(offsetDays: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function seedCrm() {
  const people: [string, string, string?][] = [
    ["Jean-Pierre Mavoungou", "+242061234001", "jp.mavoungou@example.cg"],
    ["Marie Mabiala", "+242055000002", "marie.mabiala@example.cg"],
    ["Société PetroServices", "+242066000003", "achats@petroservices.cg"],
    ["Armand Ngouabi", "+242064000004"],
    ["Esther Kouka", "+242069000005", "esther.k@example.cg"],
    ["Didier Samba", "+242053000006"],
    ["Clarisse Bouanga", "+242068000007"],
    ["Hôtel Atlantic Palace", "+242067000008", "reservation@atlantic.cg"],
    ["Fiston Malonga", "+242057000009"],
    ["Prisca Nzaou", "+242061000010", "prisca.nzaou@example.cg"],
  ];
  const contacts: Contact[] = people.map(([fullName, phoneE164, email], i) => ({
    id: `c-${i + 1}`,
    fullName,
    phoneE164,
    whatsappE164: phoneE164,
    email,
    consentAt: ago(60 * 24 * (12 - i)),
    createdAt: ago(60 * 24 * (12 - i)),
    updatedAt: ago(60 * 24 * (12 - i)),
  }));
  await mockDb.contacts.bulkAdd(contacts);

  type Seed = Partial<CrmRequest> & { type: RequestType; contact: number; minutesAgo: number };
  const seeds: Seed[] = [
    { type: "sale", contact: 0, minutesAgo: 12, vehicleId: "veh-rav4-2022", status: "new", message: "Le prix est-il négociable ? Je peux passer samedi." },
    { type: "rental", contact: 7, minutesAgo: 45, vehicleId: "veh-hiace-2022", status: "new", startAt: atDay(5, 7), endAt: atDay(8, 20), pickupCity: "Pointe-Noire", withDriver: true, message: "Navette pour un groupe de clients de l'hôtel." },
    { type: "event", contact: 1, minutesAgo: 60 * 5, status: "offer_sent", message: "Mariage civil + religieux, cortège de 5 voitures." },
    { type: "test_drive", contact: 3, minutesAgo: 60 * 20, vehicleId: "veh-tucson-2023", status: "contacted" },
    { type: "sale", contact: 4, minutesAgo: 60 * 26, vehicleId: "veh-gle-2022", status: "in_discussion", message: "Intéressée, reprise possible de mon RAV4 2017 ?" },
    { type: "rental", contact: 2, minutesAgo: 60 * 30, vehicleId: "veh-prado-2023", status: "confirmed", startAt: atDay(-2, 8), endAt: atDay(3, 18), pickupCity: "Pointe-Noire", withDriver: true, message: "Mission terrain Dolisie." },
    { type: "event", contact: 2, minutesAgo: 60 * 50, status: "in_discussion", message: "Séminaire de 3 jours, 40 participants." },
    { type: "sale", contact: 5, minutesAgo: 60 * 72, vehicleId: "veh-patrol-2021", status: "waiting_client", message: "Acompte versé, en attente du solde." },
    { type: "callback", contact: 6, minutesAgo: 60 * 90, status: "to_contact", message: "Rappeler pour financement." },
    { type: "rental", contact: 8, minutesAgo: 60 * 110, vehicleId: "veh-corolla-2020", status: "lost", lostReason: "Prix", startAt: atDay(-5, 9), endAt: atDay(-3, 9) },
    { type: "sale", contact: 9, minutesAgo: 60 * 150, vehicleId: "veh-pajero-2019", status: "completed", message: "Vente conclue." },
    { type: "trade_in", contact: 4, minutesAgo: 60 * 26 - 5, status: "to_contact", details: { brand: "Toyota", model: "RAV4", year: 2017, mileageKm: 112000, condition: "Bon état" }, message: "Je souhaite échanger mon véhicule." },
    { type: "event", contact: 9, minutesAgo: 60 * 200, status: "completed", message: "Anniversaire 50 ans." },
    { type: "appointment", contact: 5, minutesAgo: 95, vehicleId: "veh-gle-2022", status: "new", details: { appointmentKind: "visit", preferredSlot: "Samedi matin" }, message: "Je souhaite voir le GLE avec mon épouse." },
    { type: "test_drive", contact: 6, minutesAgo: 60 * 3, vehicleId: "veh-rav4-2022", status: "to_contact", details: { preferredSlot: "En semaine, l'après-midi" } },
  ];

  const assign: Partial<Record<RequestType, string>> = catalog.settings.defaultAssignees;
  let n = 0;
  for (const s of seeds) {
    n++;
    const reference = await nextReference(requestPrefix(s.type));
    const createdAt = ago(s.minutesAgo);
    const req: CrmRequest = {
      id: `r-${n}`,
      reference,
      type: s.type,
      status: s.status ?? "new",
      channel: n % 4 === 0 ? "whatsapp" : "web_form",
      contactId: contacts[s.contact].id,
      assignedTo: s.status === "new" && n === 1 ? undefined : assign[s.type] ?? "u-sales",
      vehicleId: s.vehicleId,
      message: s.message,
      startAt: s.startAt,
      endAt: s.endAt,
      pickupCity: s.pickupCity,
      withDriver: s.withDriver,
      details: s.details ?? {},
      trackingToken: uid(),
      lostReason: s.lostReason,
      consent: true,
      sourcePage: s.vehicleId ? `/vehicules/${catalog.vehicles.find((v) => v.id === s.vehicleId)?.slug}` : "/",
      firstContactedAt: ["new", "to_contact"].includes(s.status ?? "new") ? undefined : ago(s.minutesAgo - 30),
      closedAt: CLOSED_STATUSES.includes(s.status ?? "new") ? ago(s.minutesAgo - 600) : undefined,
      createdAt,
      updatedAt: createdAt,
    };
    await mockDb.requests.add(req);
    await mockDb.history.add({ id: uid(), requestId: req.id, toStatus: "new", toAssignee: req.assignedTo, changedAt: createdAt });
    if (req.status !== "new") {
      await mockDb.history.add({ id: uid(), requestId: req.id, fromStatus: "new", toStatus: req.status, toAssignee: req.assignedTo, fromAssignee: req.assignedTo, changedBy: req.assignedTo, changedAt: ago(s.minutesAgo - 30) });
      await mockDb.notes.add({ id: uid(), requestId: req.id, kind: "call", body: "Client joint par téléphone, très intéressé.", authorId: req.assignedTo, createdAt: ago(s.minutesAgo - 30) });
    }
  }

  // Dossiers événements
  await mockDb.events.bulkAdd([
    { id: "ev-1", requestId: "r-3", eventTypeId: "et-mariage", title: "Mariage Mabiala", eventDate: atDay(21).slice(0, 10), city: "Pointe-Noire", venue: "Salle Les Palmiers", guestsCount: 150, budgetMin: 1_500_000, budgetMax: 2_500_000, serviceIds: ["sv-voiture-maries", "sv-cortege", "sv-navette", "sv-deco"], createdAt: ago(60 * 5) },
    { id: "ev-2", requestId: "r-7", eventTypeId: "et-entreprise", title: "Séminaire PetroServices", eventDate: atDay(35).slice(0, 10), city: "Pointe-Noire", guestsCount: 40, serviceIds: ["sv-transfert", "sv-navette", "sv-sono", "sv-hotesses"], createdAt: ago(60 * 50) },
    { id: "ev-3", requestId: "r-13", eventTypeId: "et-anniversaire", title: "50 ans Prisca", eventDate: atDay(-10).slice(0, 10), city: "Pointe-Noire", guestsCount: 90, serviceIds: ["sv-deco", "sv-animation", "sv-sono"], createdAt: ago(60 * 200) },
  ]);

  await mockDb.appointments.bulkAdd([
    { id: uid(), requestId: "r-14", kind: "visit", status: "requested", vehicleId: "veh-gle-2022", preferredSlot: "Samedi matin", createdAt: ago(95) },
    { id: uid(), requestId: "r-15", kind: "test_drive", status: "requested", vehicleId: "veh-rav4-2022", preferredSlot: "En semaine, l'après-midi", createdAt: ago(180) },
  ]);
  await mockDb.appointments.add({ id: uid(), requestId: "r-4", kind: "test_drive", status: "confirmed", vehicleId: "veh-tucson-2023", preferredSlot: "Samedi matin", startsAt: atDay(1, 10), endsAt: atDay(1, 11), staffId: "u-auto", createdAt: ago(60 * 20) });

  // Occupations véhicules
  const booking = (b: Omit<VehicleBooking, "id" | "blockedEnd" | "createdAt">): VehicleBooking => ({
    ...b,
    id: uid(),
    blockedEnd: b.kind === "rental" ? addHours(b.end, catalog.settings.rentalBufferHours) : b.end,
    createdAt: ago(60 * 24),
  });
  await mockDb.bookings.bulkAdd([
    booking({ vehicleId: "veh-prado-2023", kind: "rental", status: "in_progress", start: atDay(-2, 8), end: atDay(3, 18), requestId: "r-6" }),
    booking({ vehicleId: "veh-hiace-2022", kind: "rental", status: "hold", start: atDay(5, 7), end: atDay(8, 20), requestId: "r-2", holdExpiresAt: addHours(nowIso(), 20) }),
    booking({ vehicleId: "veh-s-class-2021", kind: "event", status: "confirmed", start: atDay(21, 9), end: atDay(21, 23), requestId: "r-3", eventId: "ev-1" }),
    booking({ vehicleId: "veh-fortuner-2022", kind: "event", status: "hold", start: atDay(21, 9), end: atDay(21, 23), requestId: "r-3", eventId: "ev-1", holdExpiresAt: addHours(nowIso(), 22) }),
    booking({ vehicleId: "veh-tucson-2023", kind: "test_drive", status: "confirmed", start: atDay(1, 10), end: atDay(1, 11), requestId: "r-4" }),
    booking({ vehicleId: "veh-hilux-2021", kind: "maintenance", status: "confirmed", start: atDay(2, 8), end: atDay(4, 17), notes: "Vidange + pneus" }),
    booking({ vehicleId: "veh-corolla-2020", kind: "rental", status: "confirmed", start: atDay(10, 8), end: atDay(14, 8) }),
  ]);
  const prado = await mockDb.bookings.where("vehicleId").equals("veh-prado-2023").first();
  await mockDb.driverAssignments.bulkAdd([
    { id: uid(), driverId: "dr-1", bookingId: prado?.id, start: atDay(-2, 8), end: atDay(3, 18), status: "in_progress", createdAt: ago(60 * 24) },
    { id: uid(), driverId: "dr-2", eventId: "ev-1", start: atDay(21, 9), end: atDay(21, 23), status: "confirmed", createdAt: ago(60 * 24) },
  ]);

  // Devis
  const q1Ref = await nextReference("QUOTE");
  const q1: Quote = {
    id: "q-1",
    reference: q1Ref,
    requestId: "r-3",
    status: "sent",
    currency: "XAF",
    taxRate: 0,
    discountAmount: 50_000,
    feesAmount: 0,
    validUntil: atDay(12).slice(0, 10),
    publicToken: "demo-devis-mariage",
    currentVersion: 1,
    clientNote: "Tarifs valables pour la date du mariage, décoration florale incluse sur la voiture des mariés.",
    items: [
      { id: uid(), label: "Mercedes Classe S — voiture des mariés, chauffeur en tenue", serviceId: "sv-voiture-maries", quantity: 1, unitPrice: 250_000, discountAmount: 0, sortOrder: 1 },
      { id: uid(), label: "Véhicules de cortège (SUV)", serviceId: "sv-cortege", quantity: 4, unitPrice: 85_000, discountAmount: 0, sortOrder: 2 },
      { id: uid(), label: "Minibus 15 places — transport des invités", serviceId: "sv-navette", quantity: 2, unitPrice: 95_000, discountAmount: 0, sortOrder: 3 },
      { id: uid(), label: "Décoration florale véhicules", serviceId: "sv-deco", quantity: 1, unitPrice: 180_000, discountAmount: 0, sortOrder: 4 },
    ],
    versions: [],
    sentAt: ago(60 * 4),
    createdAt: ago(60 * 5),
    updatedAt: ago(60 * 4),
  };
  q1.versions = [{ version: 1, snapshot: buildSnapshot(q1, 1, q1.validUntil!), sentAt: ago(60 * 4), sentBy: "u-events" }];
  const q2Ref = await nextReference("QUOTE");
  const q2: Quote = {
    id: "q-2",
    reference: q2Ref,
    requestId: "r-7",
    status: "draft",
    currency: "XAF",
    taxRate: 18,
    discountAmount: 0,
    feesAmount: 25_000,
    publicToken: uid(),
    currentVersion: 0,
    items: [
      { id: uid(), label: "Transferts aéroport (aller/retour)", serviceId: "sv-transfert", quantity: 8, unitPrice: 30_000, discountAmount: 0, sortOrder: 1 },
      { id: uid(), label: "Navette quotidienne minibus — 3 jours", serviceId: "sv-navette", quantity: 3, unitPrice: 95_000, discountAmount: 0, sortOrder: 2 },
    ],
    versions: [],
    createdAt: ago(60 * 40),
    updatedAt: ago(60 * 40),
  };
  await mockDb.quotes.bulkAdd([q1, q2]);

  // Notifications
  const r1 = await mockDb.requests.get("r-1");
  const r2 = await mockDb.requests.get("r-2");
  if (r1) await notifyNewRequest(r1, contacts[0]);
  if (r2) await notifyNewRequest(r2, contacts[7]);
}

async function seedAnalytics() {
  // Génère ~30 jours de trafic plausible pour le dashboard et les entonnoirs (§50-51).
  const rows: AnalyticsEvent[] = [];
  const now = Date.now();
  let rnd = 42;
  const random = () => {
    rnd = (rnd * 16807) % 2147483647;
    return rnd / 2147483647;
  };
  const vehicleIds = catalog.vehicles.map((v) => v.id);
  for (let day = 0; day < 30; day++) {
    const visits = 25 + Math.floor(random() * 25);
    for (let i = 0; i < visits; i++) {
      const at = new Date(now - day * 86_400_000 - random() * 86_400_000).toISOString();
      const sessionId = `s-${day}-${i}`;
      rows.push({ occurredAt: at, sessionId, eventName: "page_view", path: "/" });
      const r = random();
      if (r < 0.4) {
        rows.push({ occurredAt: at, sessionId, eventName: "vehicle_view", objectType: "vehicle", objectId: vehicleIds[Math.floor(random() * vehicleIds.length)] });
        if (random() < 0.25) rows.push({ occurredAt: at, sessionId, eventName: "whatsapp_click", props: { pole: "sale" } });
        if (random() < 0.08) rows.push({ occurredAt: at, sessionId, eventName: "form_submit", props: { type: "sale" } });
        if (random() < 0.1) rows.push({ occurredAt: at, sessionId, eventName: "call_click", props: { pole: "sale" } });
      } else if (r < 0.65) {
        rows.push({ occurredAt: at, sessionId, eventName: "rental_view", objectType: "vehicle" });
        if (random() < 0.3) rows.push({ occurredAt: at, sessionId, eventName: "search", props: { pole: "rental" } });
        if (random() < 0.2) rows.push({ occurredAt: at, sessionId, eventName: "whatsapp_click", props: { pole: "rental" } });
        if (random() < 0.1) rows.push({ occurredAt: at, sessionId, eventName: "form_submit", props: { type: "rental" } });
      } else if (r < 0.85) {
        rows.push({ occurredAt: at, sessionId, eventName: "event_type_view" });
        if (random() < 0.3) rows.push({ occurredAt: at, sessionId, eventName: "form_start", props: { type: "event" } });
        if (random() < 0.1) rows.push({ occurredAt: at, sessionId, eventName: "form_submit", props: { type: "event" } });
      }
    }
  }
  await mockDb.analytics.bulkAdd(rows);
}

export async function resetDemo(): Promise<void> {
  await mockDb.meta.delete("seed");
  seeding = null;
}

// ---------------------------------------------------------------------------
// Demandes publiques — équivalent de submit_public_request()
// ---------------------------------------------------------------------------

export async function submitPublicRequest(p: PublicRequestPayload): Promise<PublicRequestResult> {
  await ensureSeeded();
  const phone = normalizePhone(p.phone);
  const whatsapp = normalizePhone(p.whatsapp) ?? phone;
  if (!p.fullName?.trim()) throw new BusinessError("full_name_required", "Indiquez votre nom.");
  if (!phone) throw new BusinessError("invalid_phone", "Numéro de téléphone invalide.");
  if (!p.consent) throw new BusinessError("consent_required", "Votre accord est nécessaire.");
  if (p.vehicleId) {
    const v = await mockDb.vehicles.get(p.vehicleId);
    if (!v || v.status === "draft" || v.status === "withdrawn") throw new BusinessError("vehicle_not_found", "Ce véhicule n'est plus disponible.");
  }
  if (p.type === "rental") {
    if (!p.startAt || !p.endAt || new Date(p.endAt) <= new Date(p.startAt)) throw new BusinessError("invalid_rental_period", "Période de location invalide.");
    if (new Date(p.startAt).getTime() < Date.now() - 86_400_000) throw new BusinessError("rental_period_in_past", "La date de départ est déjà passée.");
  }

  return mockDb.transaction("rw", mockDb.tables, async () => {
    const at = nowIso();
    let contact = await mockDb.contacts.where("phoneE164").equals(phone).first();
    if (contact) {
      contact = {
        ...contact,
        whatsappE164: contact.whatsappE164 ?? whatsapp ?? undefined,
        email: contact.email ?? (p.email?.trim().toLowerCase() || undefined),
        city: contact.city ?? p.city,
        consentAt: at,
        updatedAt: at,
      };
      await mockDb.contacts.put(contact);
    } else {
      contact = {
        id: uid(),
        fullName: p.fullName.trim(),
        phoneE164: phone,
        whatsappE164: whatsapp ?? undefined,
        email: p.email?.trim().toLowerCase() || undefined,
        city: p.city,
        consentAt: at,
        createdAt: at,
        updatedAt: at,
      };
      await mockDb.contacts.add(contact);
    }

    const bs = await currentSettings();
    const assignee = bs.defaultAssignees[p.type];
    const staff = await mockDb.staff.toArray();
    const req: CrmRequest = {
      id: uid(),
      reference: await nextReference(requestPrefix(p.type)),
      type: p.type,
      status: "new",
      channel: p.channel ?? "web_form",
      contactId: contact.id,
      assignedTo: assignee && staff.some((u) => u.id === assignee && u.isActive) ? assignee : undefined,
      vehicleId: p.vehicleId,
      subject: p.subject?.trim() || undefined,
      message: p.message?.trim() || undefined,
      startAt: p.startAt,
      endAt: p.endAt,
      pickupCity: p.pickupCity,
      withDriver: p.withDriver,
      details: p.details ?? {},
      trackingToken: uid(),
      sourcePage: p.sourcePage?.slice(0, 500),
      consent: true,
      createdAt: at,
      updatedAt: at,
    };
    await mockDb.requests.add(req);
    await logHistory(req, null);

    if (p.type === "event") {
      const eventType = (await mockDb.eventTypes.toArray()).find((e) => e.slug === p.eventType && e.isActive);
      const activeServices = new Set((await mockDb.services.toArray()).filter((s) => s.isActive).map((s) => s.id));
      await mockDb.events.add({
        id: uid(),
        requestId: req.id,
        eventTypeId: eventType?.id,
        title: eventType ? `${eventType.name} — ${contact.fullName}` : undefined,
        eventDate: p.eventDate,
        city: p.eventCity,
        venue: p.venue,
        guestsCount: p.guestsCount,
        budgetMin: p.budgetMin,
        budgetMax: p.budgetMax,
        serviceIds: (p.serviceIds ?? []).filter((id) => activeServices.has(id)),
        createdAt: at,
      });
    } else if (p.type === "test_drive" || p.type === "appointment") {
      await mockDb.appointments.add({
        id: uid(),
        requestId: req.id,
        kind: p.type === "test_drive" ? "test_drive" : ((p.details?.appointmentKind as Appointment["kind"]) ?? "visit"),
        status: "requested",
        vehicleId: p.vehicleId,
        preferredAt: p.details?.preferredAt as string | undefined,
        preferredSlot: p.details?.preferredSlot as string | undefined,
        createdAt: at,
      });
    }

    await notifyNewRequest(req, contact);
    await audit(undefined, "requests", req.id, "insert", `Demande ${req.reference} reçue (${REQUEST_TYPE_LABELS[req.type]})`);
    await mockDb.analytics.add({ occurredAt: at, sessionId: "local", eventName: "form_submit", props: { type: p.type } });
    return { reference: req.reference, trackingToken: req.trackingToken };
  });
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

export interface RequestRow extends CrmRequest {
  contact?: Contact;
  vehicle?: Vehicle;
}

export async function listRequests(): Promise<RequestRow[]> {
  const [requests, contacts, vehicles] = await Promise.all([
    mockDb.requests.orderBy("createdAt").reverse().toArray(),
    mockDb.contacts.toArray(),
    mockDb.vehicles.toArray(),
  ]);
  const cMap = new Map(contacts.map((c) => [c.id, c]));
  const vMap = new Map(vehicles.map((v) => [v.id, v]));
  return requests
    .filter((r) => !r.archivedAt)
    .map((r) => ({ ...r, contact: cMap.get(r.contactId), vehicle: r.vehicleId ? vMap.get(r.vehicleId) : undefined }));
}

export interface RequestDetail extends RequestRow {
  history: RequestHistoryEntry[];
  notes: RequestNote[];
  appointments: Appointment[];
  event?: EventDossier;
  quotes: Quote[];
  bookings: VehicleBooking[];
  otherRequests: CrmRequest[];
}

export async function getRequestDetail(id: string): Promise<RequestDetail | undefined> {
  const req = await mockDb.requests.get(id);
  if (!req) return undefined;
  const [contact, vehicle, history, notes, appointments, event, quotes, bookings, others] = await Promise.all([
    mockDb.contacts.get(req.contactId),
    req.vehicleId ? mockDb.vehicles.get(req.vehicleId) : Promise.resolve(undefined),
    mockDb.history.where("requestId").equals(id).sortBy("changedAt"),
    mockDb.notes.where("requestId").equals(id).sortBy("createdAt"),
    mockDb.appointments.where("requestId").equals(id).toArray(),
    mockDb.events.where("requestId").equals(id).first(),
    mockDb.quotes.where("requestId").equals(id).toArray(),
    mockDb.bookings.filter((b) => b.requestId === id).toArray(),
    mockDb.requests.where("contactId").equals(req.contactId).toArray(),
  ]);
  return {
    ...req,
    contact,
    vehicle,
    history,
    notes,
    appointments,
    event,
    quotes,
    bookings,
    otherRequests: others.filter((o) => o.id !== id),
  };
}

export async function updateRequest(
  id: string,
  patch: Partial<Pick<CrmRequest, "status" | "assignedTo" | "lostReason" | "archivedAt">>,
  actorId: string,
): Promise<CrmRequest> {
  return mockDb.transaction("rw", mockDb.tables, async () => {
    const prev = await mockDb.requests.get(id);
    if (!prev) throw new BusinessError("not_found", "Demande introuvable.");
    const next: CrmRequest = { ...prev, ...patch, updatedAt: nowIso() };
    if (next.status === "lost" && !next.lostReason) throw new BusinessError("lost_reason_required", "Indiquez le motif de perte.");
    if (next.status !== "lost") next.lostReason = undefined;
    if (!next.firstContactedAt && !["new", "to_contact", "cancelled", "lost"].includes(next.status)) next.firstContactedAt = nowIso();
    next.closedAt = CLOSED_STATUSES.includes(next.status) ? next.closedAt ?? nowIso() : undefined;
    await mockDb.requests.put(next);
    if (prev.status !== next.status || prev.assignedTo !== next.assignedTo) {
      await logHistory(next, prev, actorId);
      if (prev.assignedTo !== next.assignedTo && next.assignedTo && next.assignedTo !== actorId) {
        await notify({ recipientId: next.assignedTo, kind: "assigned", title: `Demande ${next.reference} vous a été affectée`, link: `/admin/crm/${next.id}`, requestId: next.id });
      }
    }
    await audit(actorId, "requests", id, "update", `Demande ${next.reference} : ${prev.status} → ${next.status}`);
    return next;
  });
}

export async function addNote(requestId: string, kind: NoteKind, body: string, actorId?: string): Promise<void> {
  if (!body.trim()) throw new BusinessError("empty_note", "La note est vide.");
  await mockDb.notes.add({ id: uid(), requestId, kind, body: body.trim(), authorId: actorId, createdAt: nowIso() });
  if (actorId && kind !== "system") await audit(actorId, "request_notes", requestId, "insert", `Note (${kind}) ajoutée`);
}

export async function createManualRequest(
  input: { type: RequestType; channel: CrmRequest["channel"]; fullName: string; phone: string; message?: string; vehicleId?: string },
  actorId: string,
): Promise<string> {
  const result = await submitPublicRequest({ ...input, consent: true, channel: input.channel });
  const req = await mockDb.requests.where("reference").equals(result.reference).first();
  if (req && !req.assignedTo) await updateRequest(req.id, { assignedTo: actorId }, actorId);
  return req!.id;
}

export async function listContacts(): Promise<(Contact & { requestCount: number })[]> {
  const [contacts, requests] = await Promise.all([mockDb.contacts.toArray(), mockDb.requests.toArray()]);
  return contacts
    .map((c) => ({ ...c, requestCount: requests.filter((r) => r.contactId === c.id).length }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Loi 29-2019 : anonymisation d'un contact. */
export async function anonymizeContact(id: string, actorId: string): Promise<void> {
  const c = await mockDb.contacts.get(id);
  if (!c) return;
  await mockDb.contacts.put({ ...c, fullName: "Contact anonymisé", phoneE164: `+000${id.slice(0, 8)}`, whatsappE164: undefined, email: undefined, notes: undefined, updatedAt: nowIso() });
  await audit(actorId, "contacts", id, "update", "Contact anonymisé (demande de suppression)");
}

// ---------------------------------------------------------------------------
// Occupations véhicules & chauffeurs (R3, R4)
// ---------------------------------------------------------------------------

export async function expireHolds(): Promise<number> {
  const now = Date.now();
  const expired = await mockDb.bookings
    .filter((b) => b.status === "hold" && !!b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < now)
    .toArray();
  for (const b of expired) await mockDb.bookings.put({ ...b, status: "cancelled", cancelReason: "hold_expired" });
  return expired.length;
}

/** Lecture pure (compatible useLiveQuery) — les options expirées sont libérées par AdminShell. */
export async function listBookings(): Promise<VehicleBooking[]> {
  return mockDb.bookings.orderBy("start").toArray();
}

export async function createBooking(
  input: { vehicleId: string; kind: BookingKind; status: BookingStatus; start: string; end: string; requestId?: string; eventId?: string; notes?: string },
  actorId: string,
): Promise<VehicleBooking> {
  await ensureSeeded();
  await expireHolds();
  if (new Date(input.end) <= new Date(input.start)) throw new BusinessError("invalid_period", "La fin doit être après le début.");
  const v = await mockDb.vehicles.get(input.vehicleId);
  if (!v) throw new BusinessError("not_found", "Véhicule introuvable.");
  if (v.status === "sold" || v.status === "withdrawn") throw new BusinessError("vehicle_not_bookable", "Véhicule vendu ou retiré.");
  if (v.status === "reserved" && input.kind !== "maintenance") throw new BusinessError("vehicle_not_bookable", "Véhicule réservé à la vente.");
  if (input.kind === "rental" && !v.isForRent) throw new BusinessError("vehicle_not_bookable", "Véhicule non disponible à la location.");
  if (input.kind === "event" && !v.isForEvents) throw new BusinessError("vehicle_not_bookable", "Véhicule non affecté à l'événementiel.");
  if (input.kind === "test_drive" && !v.isForSale) throw new BusinessError("vehicle_not_bookable", "Essai réservé aux véhicules à vendre.");
  const bs = await currentSettings();
  const booking: VehicleBooking = {
    ...input,
    id: uid(),
    blockedEnd: input.kind === "rental" ? addHours(input.end, bs.rentalBufferHours) : input.end,
    holdExpiresAt: input.status === "hold" ? addHours(nowIso(), bs.holdDurationHours) : undefined,
    createdAt: nowIso(),
  };
  const conflict = findConflict(await mockDb.bookings.toArray(), booking, Date.now());
  if (conflict) throw new BusinessError("booking_conflict", "Ce véhicule est déjà occupé sur cette période.", conflict);
  await mockDb.bookings.add(booking);
  await audit(actorId, "vehicle_bookings", booking.id, "insert", `${input.kind} ${input.status} — ${v.brand} ${v.model}`);
  return booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus, actorId: string): Promise<void> {
  const b = await mockDb.bookings.get(id);
  if (!b) return;
  const next: VehicleBooking = { ...b, status, holdExpiresAt: status === "hold" ? b.holdExpiresAt : undefined };
  if (isBlocking(next, Date.now())) {
    const conflict = findConflict(await mockDb.bookings.toArray(), next, Date.now());
    if (conflict) throw new BusinessError("booking_conflict", "Conflit avec une autre occupation.", conflict);
  }
  await mockDb.bookings.put(next);
  await audit(actorId, "vehicle_bookings", id, "update", `Occupation → ${status}`);
}

export async function listDrivers(): Promise<Driver[]> {
  return mockDb.drivers.toArray();
}

export async function saveDriver(driver: Driver, actorId: string): Promise<void> {
  await mockDb.drivers.put(driver);
  await audit(actorId, "drivers", driver.id, "update", `Chauffeur ${driver.fullName}`);
}

export async function listDriverAssignments(): Promise<DriverAssignment[]> {
  return mockDb.driverAssignments.toArray();
}

export async function assignDriver(
  input: { driverId: string; start: string; end: string; bookingId?: string; eventId?: string },
  actorId: string,
): Promise<void> {
  const driver = await mockDb.drivers.get(input.driverId);
  if (!driver || driver.status !== "available") throw new BusinessError("driver_not_available", "Chauffeur inactif ou en congé.");
  const all = await mockDb.driverAssignments.where("driverId").equals(input.driverId).toArray();
  const conflict = all.find(
    (a) => ["hold", "confirmed", "in_progress"].includes(a.status) && new Date(a.start) < new Date(input.end) && new Date(input.start) < new Date(a.end),
  );
  if (conflict) throw new BusinessError("driver_conflict", `${driver.fullName} est déjà affecté sur cette période.`, conflict);
  await mockDb.driverAssignments.add({ ...input, id: uid(), status: "confirmed", createdAt: nowIso() });
  await audit(actorId, "driver_assignments", input.driverId, "insert", `Affectation ${driver.fullName}`);
}

// ---------------------------------------------------------------------------
// Devis (R7)
// ---------------------------------------------------------------------------

export async function listQuotes(): Promise<(Quote & { request?: CrmRequest; contact?: Contact })[]> {
  const [quotes, requests, contacts] = await Promise.all([mockDb.quotes.toArray(), mockDb.requests.toArray(), mockDb.contacts.toArray()]);
  return quotes
    .map((q) => {
      const request = requests.find((r) => r.id === q.requestId);
      return { ...q, request, contact: contacts.find((c) => c.id === request?.contactId) };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getQuote(id: string): Promise<Quote | undefined> {
  return mockDb.quotes.get(id);
}

export async function createQuote(requestId: string, actorId: string): Promise<string> {
  const req = await mockDb.requests.get(requestId);
  if (!req) throw new BusinessError("not_found", "Demande introuvable.");
  const event = await mockDb.events.where("requestId").equals(requestId).first();
  const services = await mockDb.services.toArray();
  const items: QuoteItem[] = (event?.serviceIds ?? [])
    .map((sid, i): QuoteItem | null => {
      const s = services.find((x) => x.id === sid);
      return s ? { id: uid(), label: s.name, serviceId: s.id, quantity: 1, unitPrice: s.basePrice ?? 0, discountAmount: 0, sortOrder: i + 1 } : null;
    })
    .filter((x): x is QuoteItem => x !== null);
  if (req.vehicleId && items.length === 0) {
    const v = await mockDb.vehicles.get(req.vehicleId);
    if (v) {
      const days = req.startAt && req.endAt ? Math.max(1, Math.ceil((new Date(req.endAt).getTime() - new Date(req.startAt).getTime()) / 86_400_000)) : 1;
      const price = req.type === "rental" ? v.rental?.dailyRate ?? 0 : v.salePrice ?? 0;
      items.push({ id: uid(), label: `${v.brand} ${v.model} ${v.year}${req.type === "rental" ? " — location" : ""}`, vehicleId: v.id, quantity: req.type === "rental" ? days : 1, unitPrice: price, discountAmount: 0, sortOrder: 1 });
    }
  }
  const q: Quote = {
    id: uid(),
    reference: await nextReference("QUOTE"),
    requestId,
    status: "draft",
    currency: "XAF",
    taxRate: (await currentSettings()).quoteTaxRate,
    discountAmount: 0,
    feesAmount: 0,
    publicToken: uid(),
    currentVersion: 0,
    items,
    versions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await mockDb.quotes.add(q);
  await audit(actorId, "quotes", q.id, "insert", `Devis ${q.reference} créé`);
  return q.id;
}

export async function saveQuote(q: Quote, actorId: string): Promise<void> {
  const prev = await mockDb.quotes.get(q.id);
  if (!prev) throw new BusinessError("not_found", "Devis introuvable.");
  if (!["draft", "change_requested"].includes(prev.status)) {
    throw new BusinessError("quote_locked", "Ce devis a été envoyé : il n'est plus modifiable.");
  }
  await mockDb.quotes.put({ ...q, updatedAt: nowIso() });
  await audit(actorId, "quotes", q.id, "update", `Devis ${q.reference} modifié`);
}

export async function sendQuote(id: string, actorId: string): Promise<Quote> {
  return mockDb.transaction("rw", mockDb.tables, async () => {
    const q = await mockDb.quotes.get(id);
    if (!q) throw new BusinessError("not_found", "Devis introuvable.");
    if (q.items.length === 0) throw new BusinessError("quote_empty", "Ajoutez au moins une ligne.");
    const validUntil = q.validUntil ?? new Date(Date.now() + (await currentSettings()).quoteValidityDays * 86_400_000).toISOString().slice(0, 10);
    const version = q.currentVersion + 1;
    const next: Quote = {
      ...q,
      validUntil,
      status: "sent",
      currentVersion: version,
      sentAt: nowIso(),
      changeRequestMessage: undefined,
      versions: [...q.versions, { version, snapshot: buildSnapshot({ ...q, validUntil }, version, validUntil), sentAt: nowIso(), sentBy: actorId }],
      updatedAt: nowIso(),
    };
    await mockDb.quotes.put(next);
    const req = await mockDb.requests.get(q.requestId);
    if (req && ["new", "to_contact", "contacted", "in_discussion", "waiting_client"].includes(req.status)) {
      await updateRequest(req.id, { status: "offer_sent" }, actorId);
    }
    await audit(actorId, "quotes", id, "update", `Devis ${q.reference} v${version} envoyé`);
    return next;
  });
}

export interface PublicQuoteView {
  status: Quote["status"];
  expired: boolean;
  acceptedAt?: string;
  acceptedByName?: string;
  clientName?: string;
  requestReference?: string;
  quote: QuoteSnapshot;
}

export async function getPublicQuote(token: string): Promise<PublicQuoteView | undefined> {
  const q = await mockDb.quotes.where("publicToken").equals(token).first();
  if (!q || q.currentVersion === 0) return undefined;
  const req = await mockDb.requests.get(q.requestId);
  const contact = req ? await mockDb.contacts.get(req.contactId) : undefined;
  const latest = q.versions.find((v) => v.version === q.currentVersion)!;
  return {
    status: q.status,
    expired: !!q.validUntil && q.validUntil < new Date().toISOString().slice(0, 10),
    acceptedAt: q.acceptedAt,
    acceptedByName: q.acceptedByName,
    clientName: contact?.fullName,
    requestReference: req?.reference,
    quote: latest.snapshot,
  };
}

export async function respondToQuote(token: string, action: "accept" | "request_change", name?: string, message?: string): Promise<void> {
  await mockDb.transaction("rw", mockDb.tables, async () => {
    const q = await mockDb.quotes.where("publicToken").equals(token).first();
    if (!q || q.currentVersion === 0) throw new BusinessError("quote_not_found", "Devis introuvable.");
    if (!["sent", "change_requested"].includes(q.status)) throw new BusinessError("quote_not_open", "Ce devis n'attend plus de réponse.");
    if (q.validUntil && q.validUntil < new Date().toISOString().slice(0, 10)) {
      await mockDb.quotes.put({ ...q, status: "expired" });
      throw new BusinessError("quote_expired", "Ce devis a expiré. Contactez-nous pour une nouvelle proposition.");
    }
    const req = await mockDb.requests.get(q.requestId);
    if (action === "accept") {
      if (!name?.trim()) throw new BusinessError("name_required", "Indiquez votre nom pour accepter.");
      await mockDb.quotes.put({ ...q, status: "accepted", acceptedAt: nowIso(), acceptedByName: name.trim(), updatedAt: nowIso() });
      if (req) await updateRequest(req.id, { status: "confirmed" }, "system");
      await addNote(q.requestId, "system", `Devis ${q.reference} v${q.currentVersion} accepté en ligne par ${name.trim()}`);
    } else {
      if (!message?.trim()) throw new BusinessError("message_required", "Décrivez la modification souhaitée.");
      await mockDb.quotes.put({ ...q, status: "change_requested", changeRequestMessage: message.trim().slice(0, 2000), updatedAt: nowIso() });
      if (req) await updateRequest(req.id, { status: "in_discussion" }, "system");
      await addNote(q.requestId, "system", `Modification demandée sur ${q.reference} : ${message.trim()}`);
    }
    if (req?.assignedTo) {
      await notify({
        recipientId: req.assignedTo,
        kind: `quote_${action}`,
        title: `Devis ${q.reference} : ${action === "accept" ? "accepté ✅" : "modification demandée"}`,
        link: `/admin/crm/${req.id}`,
        requestId: req.id,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Suivi sans compte
// ---------------------------------------------------------------------------

export async function getRequestTracking(token: string) {
  const req = await mockDb.requests.where("trackingToken").equals(token).first();
  if (!req || req.archivedAt) return undefined;
  const quote = (await mockDb.quotes.where("requestId").equals(req.id).toArray())
    .filter((q) => q.currentVersion > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const vehicle = req.vehicleId ? await mockDb.vehicles.get(req.vehicleId) : undefined;
  return { reference: req.reference, type: req.type, status: req.status, createdAt: req.createdAt, vehicle, quoteToken: quote?.publicToken };
}

// ---------------------------------------------------------------------------
// Véhicules & services (admin)
// ---------------------------------------------------------------------------

export async function listAdminVehicles(): Promise<Vehicle[]> {
  return (await mockDb.vehicles.toArray()).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function getAdminVehicle(id: string): Promise<Vehicle | undefined> {
  return mockDb.vehicles.get(id);
}

export async function saveVehicle(vehicle: Vehicle, actorId: string): Promise<Vehicle> {
  const prev = await mockDb.vehicles.get(vehicle.id);
  const slugOwner = await mockDb.vehicles.where("slug").equals(vehicle.slug).first();
  if (slugOwner && slugOwner.id !== vehicle.id) throw new BusinessError("slug_taken", "Cette URL est déjà utilisée par un autre véhicule.");
  const next = { ...vehicle };
  if (prev && prev.salePrice !== next.salePrice) {
    next.previousPrice = prev.salePrice;
    next.priceChangedAt = nowIso();
  }
  if (next.status !== "draft" && !next.publishedAt) next.publishedAt = nowIso();
  if (next.status === "sold" && prev?.status !== "sold") next.soldAt = nowIso();
  await mockDb.vehicles.put(next);
  await audit(actorId, "vehicles", next.id, prev ? "update" : "insert", `${next.brand} ${next.model} ${next.year}${prev && prev.salePrice !== next.salePrice ? ` — prix ${prev.salePrice ?? "—"} → ${next.salePrice ?? "—"}` : ""}`);
  return next;
}

export async function nextVehicleReference(): Promise<string> {
  const all = await mockDb.vehicles.toArray();
  const max = Math.max(1000, ...all.map((v) => Number(v.reference.replace(/\D/g, "")) || 0));
  return `BM-V-${max + 1}`;
}

export async function listServices(): Promise<Service[]> {
  return (await mockDb.services.toArray()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function toggleService(id: string, actorId: string): Promise<void> {
  const s = await mockDb.services.get(id);
  if (!s) return;
  await mockDb.services.put({ ...s, isActive: !s.isActive });
  await audit(actorId, "services", id, "update", `${s.name} ${s.isActive ? "désactivé" : "activé"}`);
}

export async function listEvents(): Promise<(EventDossier & { request?: CrmRequest; contact?: Contact })[]> {
  const [events, requests, contacts] = await Promise.all([mockDb.events.toArray(), mockDb.requests.toArray(), mockDb.contacts.toArray()]);
  return events
    .map((e) => {
      const request = requests.find((r) => r.id === e.requestId);
      return { ...e, request, contact: contacts.find((c) => c.id === request?.contactId) };
    })
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
}

// ---------------------------------------------------------------------------
// Notifications, analytics, audit
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string): Promise<StaffNotification[]> {
  return (await mockDb.notifications.where("recipientId").equals(userId).toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const unread = await mockDb.notifications.where("recipientId").equals(userId).filter((n) => !n.readAt).toArray();
  await mockDb.notifications.bulkPut(unread.map((n) => ({ ...n, readAt: nowIso() })));
}

export async function trackEvent(eventName: AnalyticsEventName, extra: Partial<AnalyticsEvent> = {}): Promise<void> {
  try {
    await mockDb.analytics.add({ occurredAt: nowIso(), sessionId: sessionId(), eventName, path: typeof location !== "undefined" ? location.pathname : undefined, ...extra });
  } catch {
    // l'analytics ne doit jamais bloquer l'utilisateur
  }
}

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("bm-session");
    if (!id) {
      id = uid();
      sessionStorage.setItem("bm-session", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export async function listAnalytics(sinceDays = 30): Promise<AnalyticsEvent[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  return mockDb.analytics.where("occurredAt").above(since).toArray();
}

export async function listAudit(limit = 200): Promise<AuditLog[]> {
  return mockDb.audit.orderBy("occurredAt").reverse().limit(limit).toArray();
}

export function listStaffSync(): StaffUser[] {
  return staffCache;
}

export function staffById(id?: string): StaffUser | undefined {
  return staffCache.find((u) => u.id === id);
}

/** Réviser un devis envoyé : repasse en brouillon, la prochaine émission créera la version n+1 (R7). */
export async function reviseQuote(id: string, actorId: string): Promise<void> {
  const q = await mockDb.quotes.get(id);
  if (!q) throw new BusinessError("not_found", "Devis introuvable.");
  if (q.status === "accepted") throw new BusinessError("quote_locked", "Un devis accepté ne peut plus être modifié.");
  await mockDb.quotes.put({ ...q, status: "draft", updatedAt: nowIso() });
  await audit(actorId, "quotes", id, "update", `Devis ${q.reference} en révision (v${q.currentVersion + 1})`);
}

// ---------------------------------------------------------------------------
// Contenus éditables (catalogue, marketing, médias, paramètres, personnel)
// ---------------------------------------------------------------------------

type ContentTable = "categories" | "eventTypes" | "services" | "packages" | "recommendations" | "realisations" | "promotions" | "banners";

const CONTENT_LABELS: Record<ContentTable, string> = {
  categories: "Catégorie",
  eventTypes: "Type d'événement",
  services: "Prestation",
  packages: "Package",
  recommendations: "Recommandation",
  realisations: "Réalisation",
  promotions: "Promotion",
  banners: "Bannière",
};

/** Création / modification d'un contenu (équivalent : upsert Supabase + RLS). */
export async function saveContent<T extends { id: string }>(table: ContentTable, row: T, actorId: string, label?: string): Promise<T> {
  const t = mockDb.table(table);
  const prev = await t.get(row.id);
  await t.put(row);
  await audit(actorId, table, row.id, prev ? "update" : "insert", `${CONTENT_LABELS[table]} ${label ?? ""} ${prev ? "modifié(e)" : "créé(e)"}`.replace(/\s+/g, " ").trim());
  return row;
}

export async function deleteContent(table: ContentTable, id: string, actorId: string, label?: string): Promise<void> {
  await mockDb.table(table).delete(id);
  await audit(actorId, table, id, "delete", `${CONTENT_LABELS[table]} ${label ?? ""} supprimé(e)`.replace(/\s+/g, " ").trim());
}

export async function getSettings(): Promise<BusinessSettings> {
  return (await mockDb.settings.get("business"))?.value ?? catalog.settings;
}

export async function saveSettings(value: BusinessSettings, actorId: string): Promise<void> {
  await mockDb.settings.put({ key: "business", value });
  await audit(actorId, "business_settings", "business", "update", "Paramètres de l'entreprise modifiés");
}

// Personnel & rôles (§42 : permissions configurables)
export async function saveStaff(user: StaffUser, actorId: string): Promise<void> {
  const email = user.email.trim().toLowerCase();
  const clash = await mockDb.staff.where("email").equals(email).first();
  if (clash && clash.id !== user.id) throw new BusinessError("email_taken", "Cet e-mail est déjà utilisé par un autre employé.");
  if (!user.fullName.trim()) throw new BusinessError("name_required", "Le nom est obligatoire.");
  const prev = await mockDb.staff.get(user.id);
  if (prev?.roleId === "admin" && (user.roleId !== "admin" || !user.isActive)) {
    const admins = (await mockDb.staff.toArray()).filter((u) => u.roleId === "admin" && u.isActive && u.id !== user.id);
    if (admins.length === 0) throw new BusinessError("last_admin", "Impossible : il doit rester au moins un super administrateur actif.");
  }
  await mockDb.staff.put({ ...user, email, createdAt: prev?.createdAt ?? user.createdAt ?? nowIso(), invitedBy: prev?.invitedBy ?? user.invitedBy ?? actorId });
  await audit(actorId, "staff_profiles", user.id, prev ? "update" : "insert", `${prev ? "Employé modifié" : "Employé invité"} : ${user.fullName} (${ROLE_LABELS[user.roleId]}${user.isActive ? "" : ", désactivé"})`);
}

export async function saveRole(role: RoleDef, actorId: string): Promise<void> {
  if (role.id === "admin") throw new BusinessError("locked", "Les droits du super administrateur ne sont pas modifiables.");
  await mockDb.roles.put(role);
  await audit(actorId, "role_permissions", role.id, "update", `Permissions du rôle ${role.label} : ${role.permissions.length} droit(s)`);
}

// Médiathèque (§49)
export async function addMedia(input: Omit<MediaAsset, "id" | "createdAt">, actorId: string): Promise<MediaAsset> {
  const asset: MediaAsset = { ...input, id: uid(), createdAt: nowIso(), createdBy: actorId };
  await mockDb.media.add(asset);
  await audit(actorId, "media_assets", asset.id, "insert", `Média ajouté : ${asset.name}`);
  return asset;
}

export async function updateMedia(asset: MediaAsset, actorId: string): Promise<void> {
  await mockDb.media.put(asset);
  await audit(actorId, "media_assets", asset.id, "update", `Média modifié : ${asset.name}`);
}

export async function deleteMedia(id: string, actorId: string): Promise<void> {
  const a = await mockDb.media.get(id);
  await mockDb.media.delete(id);
  await audit(actorId, "media_assets", id, "delete", `Média supprimé : ${a?.name ?? id}`);
}

// Dossier événement (§32) — modifiable après réception
export async function updateEventDossier(id: string, patch: Partial<EventDossier>, actorId: string): Promise<void> {
  const e = await mockDb.events.get(id);
  if (!e) throw new BusinessError("not_found", "Dossier introuvable.");
  await mockDb.events.put({ ...e, ...patch });
  await audit(actorId, "events", id, "update", `Dossier événement modifié${patch.eventDate ? ` (date ${patch.eventDate})` : ""}`);
}

// Rendez-vous & essais (§18, A11)
export async function listAppointments(): Promise<(Appointment & { request?: CrmRequest; contact?: Contact; vehicle?: Vehicle })[]> {
  const [appointments, requests, contacts, vehicles] = await Promise.all([
    mockDb.appointments.toArray(),
    mockDb.requests.toArray(),
    mockDb.contacts.toArray(),
    mockDb.vehicles.toArray(),
  ]);
  return appointments
    .map((a) => {
      const request = requests.find((r) => r.id === a.requestId);
      return { ...a, request, contact: contacts.find((c) => c.id === request?.contactId), vehicle: vehicles.find((v) => v.id === a.vehicleId) };
    })
    .sort((a, b) => (a.startsAt ?? a.createdAt).localeCompare(b.startsAt ?? b.createdAt));
}

/** Confirme un RDV ; un essai bloque le véhicule sur le créneau (R3). */
export async function confirmAppointment(id: string, startsAt: string, durationMinutes: number, staffId: string | undefined, actorId: string): Promise<void> {
  const a = await mockDb.appointments.get(id);
  if (!a) throw new BusinessError("not_found", "Rendez-vous introuvable.");
  const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString();
  if (a.kind === "test_drive" && a.vehicleId) {
    const existing = await mockDb.bookings.filter((b) => b.requestId === a.requestId && b.kind === "test_drive" && b.status !== "cancelled").first();
    if (existing) await mockDb.bookings.put({ ...existing, status: "cancelled", cancelReason: "rescheduled" });
    await createBooking({ vehicleId: a.vehicleId, kind: "test_drive", status: "confirmed", start: startsAt, end: endsAt, requestId: a.requestId }, actorId);
  }
  await mockDb.appointments.put({ ...a, status: "confirmed", startsAt, endsAt, staffId });
  await addNote(a.requestId, "system", `Rendez-vous confirmé le ${new Date(startsAt).toLocaleString("fr-FR")}`, actorId);
  await audit(actorId, "appointments", id, "update", "Rendez-vous confirmé");
}

export async function setAppointmentStatus(id: string, status: Appointment["status"], actorId: string): Promise<void> {
  const a = await mockDb.appointments.get(id);
  if (!a) return;
  await mockDb.appointments.put({ ...a, status });
  if (status === "cancelled" || status === "no_show") {
    const b = await mockDb.bookings.filter((x) => x.requestId === a.requestId && x.kind === "test_drive" && ["hold", "confirmed"].includes(x.status)).first();
    if (b) await mockDb.bookings.put({ ...b, status: "cancelled", cancelReason: status });
  }
  if (status === "done") {
    const b = await mockDb.bookings.filter((x) => x.requestId === a.requestId && x.kind === "test_drive" && x.status === "confirmed").first();
    if (b) await mockDb.bookings.put({ ...b, status: "completed" });
  }
  await audit(actorId, "appointments", id, "update", `Rendez-vous → ${status}`);
}

/** Archivage d'une demande (pas de suppression physique, R13). */
export async function archiveRequest(id: string, actorId: string): Promise<void> {
  await updateRequest(id, { archivedAt: nowIso() }, actorId);
}

export async function updateContact(contact: Contact, actorId: string): Promise<void> {
  const phone = normalizePhone(contact.phoneE164);
  if (!phone) throw new BusinessError("invalid_phone", "Numéro de téléphone invalide.");
  const clash = await mockDb.contacts.where("phoneE164").equals(phone).first();
  if (clash && clash.id !== contact.id) throw new BusinessError("phone_taken", `Ce numéro appartient déjà à ${clash.fullName}.`);
  await mockDb.contacts.put({ ...contact, phoneE164: phone, whatsappE164: normalizePhone(contact.whatsappE164) ?? undefined, updatedAt: nowIso() });
  await audit(actorId, "contacts", contact.id, "update", `Contact modifié : ${contact.fullName}`);
}

/** Dernière connexion (Supabase Auth : auth.users.last_sign_in_at). */
export async function recordLogin(userId: string): Promise<void> {
  const u = await mockDb.staff.get(userId);
  if (u) await mockDb.staff.put({ ...u, lastLoginAt: nowIso() });
}

/** Démo : simule l'envoi d'un lien de réinitialisation (Supabase Auth : resetPasswordForEmail). */
export async function sendPasswordReset(userId: string, actorId: string): Promise<string> {
  const u = await mockDb.staff.get(userId);
  if (!u) throw new BusinessError("not_found", "Utilisateur introuvable.");
  await audit(actorId, "staff_profiles", userId, "update", `Lien de réinitialisation du mot de passe envoyé à ${u.email}`);
  return u.email;
}
