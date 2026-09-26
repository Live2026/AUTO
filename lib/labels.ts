import type {
  AppointmentKind,
  BookingKind,
  BookingStatus,
  Drivetrain,
  DriverStatus,
  FuelType,
  Gearbox,
  NoteKind,
  QuoteStatus,
  RequestChannel,
  RequestStatus,
  RequestType,
  RoleId,
  VehicleCondition,
  VehicleStatus,
} from "./types";

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  sale: "Vente",
  rental: "Location",
  event: "Événement",
  test_drive: "Essai",
  appointment: "Rendez-vous",
  trade_in: "Reprise",
  callback: "Rappel",
  other: "Autre",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Nouvelle",
  to_contact: "À contacter",
  contacted: "Contactée",
  in_discussion: "En discussion",
  offer_sent: "Devis / offre",
  waiting_client: "En attente client",
  confirmed: "Confirmée",
  completed: "Réalisée",
  cancelled: "Annulée",
  lost: "Perdue",
};

export const PIPELINE: RequestStatus[] = [
  "new",
  "to_contact",
  "contacted",
  "in_discussion",
  "offer_sent",
  "waiting_client",
  "confirmed",
  "completed",
];

export const CLOSED_STATUSES: RequestStatus[] = ["completed", "cancelled", "lost"];

export const REQUEST_STATUS_TONE: Record<RequestStatus, string> = {
  new: "bg-sky-100 text-sky-800 ring-sky-200",
  to_contact: "bg-amber-100 text-amber-800 ring-amber-200",
  contacted: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  in_discussion: "bg-violet-100 text-violet-800 ring-violet-200",
  offer_sent: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  waiting_client: "bg-orange-100 text-orange-800 ring-orange-200",
  confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  completed: "bg-green-100 text-green-800 ring-green-200",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  lost: "bg-rose-100 text-rose-700 ring-rose-200",
};

export const CHANNEL_LABELS: Record<RequestChannel, string> = {
  web_form: "Site web",
  whatsapp: "WhatsApp",
  phone: "Téléphone",
  walk_in: "Agence",
  qr_code: "QR code",
  social: "Réseaux sociaux",
  other: "Autre",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  draft: "Brouillon",
  available: "Disponible",
  reserved: "Réservé",
  sold: "Vendu",
  withdrawn: "Retiré",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "Essence",
  diesel: "Diesel",
  hybrid: "Hybride",
  electric: "Électrique",
  other: "Autre",
};

export const GEARBOX_LABELS: Record<Gearbox, string> = { manual: "Manuelle", automatic: "Automatique" };

export const DRIVETRAIN_LABELS: Record<Drivetrain, string> = {
  fwd: "Traction",
  rwd: "Propulsion",
  awd: "Intégrale (AWD)",
  "4wd": "4x4",
};

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  new: "Neuf",
  used_excellent: "Occasion — excellent état",
  used_good: "Occasion — bon état",
  used_fair: "Occasion — état correct",
};

export const BOOKING_KIND_LABELS: Record<BookingKind, string> = {
  rental: "Location",
  event: "Événement",
  test_drive: "Essai",
  maintenance: "Maintenance",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  hold: "Option",
  confirmed: "Confirmée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const BOOKING_KIND_COLORS: Record<BookingKind, string> = {
  rental: "bg-sky-500",
  event: "bg-rose-500",
  test_drive: "bg-amber-500",
  maintenance: "bg-zinc-500",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: "Disponible",
  inactive: "Inactif",
  on_leave: "En congé",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  change_requested: "Modification demandée",
  rejected: "Refusé",
  expired: "Expiré",
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  sent: "bg-sky-100 text-sky-800 ring-sky-200",
  accepted: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  change_requested: "bg-amber-100 text-amber-800 ring-amber-200",
  rejected: "bg-rose-100 text-rose-700 ring-rose-200",
  expired: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  note: "Note",
  call: "Appel",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Rendez-vous",
  system: "Système",
};

export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  visit: "Visite",
  test_drive: "Essai",
  inspection: "Inspection",
  meeting: "Rendez-vous commercial",
};

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: "Administrateur",
  manager_auto: "Responsable automobile",
  manager_rental: "Responsable location",
  manager_events: "Responsable événementiel",
  sales: "Commercial",
  accountant: "Comptable",
  driver: "Chauffeur",
};
