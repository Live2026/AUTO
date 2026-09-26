// Types du domaine — miroir du schéma Supabase (supabase/migrations).
// Quand on branchera Supabase, ces types seront remplacés/alimentés par `supabase gen types`.

export type Pole = "sale" | "rental" | "event";

export type RequestType =
  | "sale"
  | "rental"
  | "event"
  | "test_drive"
  | "appointment"
  | "trade_in"
  | "callback"
  | "other";

export type RequestStatus =
  | "new"
  | "to_contact"
  | "contacted"
  | "in_discussion"
  | "offer_sent"
  | "waiting_client"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "lost";

export type RequestChannel = "web_form" | "whatsapp" | "phone" | "walk_in" | "qr_code" | "social" | "other";

export type VehicleStatus = "draft" | "available" | "reserved" | "sold" | "withdrawn";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "other";
export type Gearbox = "manual" | "automatic";
export type Drivetrain = "fwd" | "rwd" | "awd" | "4wd";
export type VehicleCondition = "new" | "used_excellent" | "used_good" | "used_fair";
export type BodyType = "suv" | "sedan" | "pickup" | "van" | "hatchback" | "coupe";

export type BookingKind = "rental" | "event" | "test_drive" | "maintenance";
export type BookingStatus = "hold" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type DriverStatus = "available" | "inactive" | "on_leave";
export type QuoteStatus = "draft" | "sent" | "accepted" | "change_requested" | "rejected" | "expired";
export type NoteKind = "note" | "call" | "whatsapp" | "email" | "meeting" | "system";
export type AppointmentKind = "visit" | "test_drive" | "inspection" | "meeting";
export type AppointmentStatus = "requested" | "confirmed" | "done" | "cancelled" | "no_show";
export type PublishStatus = "draft" | "published" | "archived";

export interface MediaImage {
  url: string;
  alt: string;
}

export interface VehicleCategory {
  id: string;
  slug: string;
  name: string;
  forSale: boolean;
  forRent: boolean;
  sortOrder: number;
}

export interface RentalRates {
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  driverDailyRate?: number;
  deposit?: number;
  withDriver: boolean;
  selfDrive: boolean;
  minDays: number;
  cities: string[];
  conditions?: string;
}

export interface Vehicle {
  id: string;
  reference: string;
  slug: string;
  status: VehicleStatus;
  categoryId: string;
  isForSale: boolean;
  isForRent: boolean;
  isForEvents: boolean;
  brand: string;
  model: string;
  version?: string;
  year: number;
  mileageKm: number;
  fuel: FuelType;
  gearbox: Gearbox;
  drivetrain: Drivetrain;
  color: string;
  /** Couleur d'affichage (hex) pour le visuel de démonstration */
  colorHex: string;
  bodyType: BodyType;
  seats: number;
  doors: number;
  airConditioning: boolean;
  condition: VehicleCondition;
  features: string[];
  description: string;
  city: string;
  salePrice?: number;
  priceVisible: boolean;
  previousPrice?: number;
  priceChangedAt?: string;
  isFeatured: boolean;
  images: MediaImage[];
  videoUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  soldAt?: string;
  rental?: RentalRates;
}

export interface EventType {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  unit: string;
  basePrice?: number;
  priceVisible: boolean;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  description: string;
  eventTypeId?: string;
  price?: number;
  priceVisible: boolean;
  items: { serviceId: string; quantity: number }[];
  status: PublishStatus;
}

export interface EventTypeRecommendation {
  eventTypeId: string;
  serviceId?: string;
  packageId?: string;
  sortOrder: number;
}

export interface Realisation {
  id: string;
  slug: string;
  title: string;
  eventTypeId: string;
  city: string;
  eventDate: string;
  description: string;
  serviceIds: string[];
  guests?: number;
  palette: [string, string];
  images?: MediaImage[];
  videoUrl?: string;
  status: PublishStatus;
}

export type PromotionScope = "sale" | "rental" | "event";
export type PromotionKind = "percent" | "amount" | "fixed_price" | "label";

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  scope: PromotionScope;
  kind: PromotionKind;
  value?: number;
  vehicleId?: string;
  serviceId?: string;
  packageId?: string;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

export interface BusinessSettings {
  company: { name: string; tagline: string; address: string; city: string; hours: string; email: string };
  contactPhones: Record<"default" | Pole, string | null>;
  whatsappNumbers: Record<"default" | Pole, string | null>;
  socialLinks: { facebook?: string; instagram?: string; tiktok?: string };
  whatsappTemplates: Record<"sale" | "rental" | "event" | "request", string>;
  rentalBufferHours: number;
  holdDurationHours: number;
  quoteValidityDays: number;
  quoteTaxRate: number;
  slaNewRequestMinutes: number;
  defaultAssignees: Partial<Record<RequestType, string>>;
  lostReasons: string[];
  cities: string[];
}

// ---------- Personnel ----------

export type RoleId =
  | "admin"
  | "manager_auto"
  | "manager_rental"
  | "manager_events"
  | "sales"
  | "accountant"
  | "driver";

export type Permission =
  | "*"
  | "vehicles.write"
  | "vehicles.internal"
  | "rentals.write"
  | "drivers.write"
  | "events.write"
  | "quotes.read"
  | "quotes.write"
  | "crm.read_all"
  | "crm.write_all"
  | "crm.write_own"
  | "appointments.write"
  | "marketing.write"
  | "media.write"
  | "analytics.read"
  | "finance.read"
  | "settings.write"
  | "users.manage"
  | "audit.read"
  | "notifications.new_requests";

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: RoleId;
  isActive: boolean;
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber?: string;
  status: DriverStatus;
  notes?: string;
}

// ---------- CRM ----------

export interface Contact {
  id: string;
  fullName: string;
  phoneE164: string;
  whatsappE164?: string;
  email?: string;
  city?: string;
  notes?: string;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmRequest {
  id: string;
  reference: string;
  type: RequestType;
  status: RequestStatus;
  channel: RequestChannel;
  contactId: string;
  assignedTo?: string;
  vehicleId?: string;
  subject?: string;
  message?: string;
  startAt?: string;
  endAt?: string;
  pickupCity?: string;
  withDriver?: boolean;
  details: Record<string, unknown>;
  trackingToken: string;
  lostReason?: string;
  sourcePage?: string;
  consent: boolean;
  firstContactedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestHistoryEntry {
  id: string;
  requestId: string;
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  fromAssignee?: string;
  toAssignee?: string;
  changedBy?: string;
  changedAt: string;
}

export interface RequestNote {
  id: string;
  requestId: string;
  kind: NoteKind;
  body: string;
  authorId?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  requestId: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  vehicleId?: string;
  preferredAt?: string;
  preferredSlot?: string;
  startsAt?: string;
  endsAt?: string;
  staffId?: string;
  notes?: string;
  createdAt: string;
}

export interface EventDossier {
  id: string;
  requestId: string;
  eventTypeId?: string;
  title?: string;
  eventDate?: string;
  city?: string;
  venue?: string;
  guestsCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  serviceIds: string[];
  notes?: string;
  createdAt: string;
}

export interface VehicleBooking {
  id: string;
  vehicleId: string;
  kind: BookingKind;
  status: BookingStatus;
  start: string;
  end: string;
  /** fin + tampon (location) — utilisé pour l'anti-chevauchement */
  blockedEnd: string;
  holdExpiresAt?: string;
  requestId?: string;
  eventId?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
}

export interface DriverAssignment {
  id: string;
  driverId: string;
  bookingId?: string;
  eventId?: string;
  start: string;
  end: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  label: string;
  serviceId?: string;
  vehicleId?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  sortOrder: number;
}

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  fees: number;
  totalHt: number;
  taxRate: number;
  taxAmount: number;
  totalTtc: number;
}

export interface QuoteSnapshot extends QuoteTotals {
  reference: string;
  currency: string;
  version: number;
  validUntil: string;
  clientNote?: string;
  items: { label: string; quantity: number; unitPrice: number; discount: number; total: number }[];
}

export interface Quote {
  id: string;
  reference: string;
  requestId: string;
  status: QuoteStatus;
  currency: "XAF";
  taxRate: number;
  discountAmount: number;
  feesAmount: number;
  validUntil?: string;
  publicToken: string;
  currentVersion: number;
  clientNote?: string;
  changeRequestMessage?: string;
  acceptedAt?: string;
  acceptedByName?: string;
  sentAt?: string;
  items: QuoteItem[];
  versions: { version: number; snapshot: QuoteSnapshot; sentAt: string; sentBy?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffNotification {
  id: string;
  recipientId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  requestId?: string;
  readAt?: string;
  createdAt: string;
}

export type AnalyticsEventName =
  | "page_view"
  | "vehicle_view"
  | "rental_view"
  | "event_type_view"
  | "realisation_view"
  | "search"
  | "whatsapp_click"
  | "call_click"
  | "share_click"
  | "favorite_add"
  | "form_start"
  | "form_submit"
  | "quote_view"
  | "quote_accept"
  | "pwa_install"
  | "qr_scan";

export interface AnalyticsEvent {
  id?: number;
  occurredAt: string;
  sessionId: string;
  eventName: AnalyticsEventName;
  path?: string;
  objectType?: string;
  objectId?: string;
  props?: Record<string, unknown>;
}

export interface AuditLog {
  id?: number;
  occurredAt: string;
  actorId?: string;
  tableName: string;
  recordId: string;
  action: "insert" | "update" | "delete";
  summary: string;
}

// ---------- Demandes publiques ----------

export interface PublicRequestPayload {
  type: RequestType;
  fullName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  consent: boolean;
  vehicleId?: string;
  subject?: string;
  message?: string;
  startAt?: string;
  endAt?: string;
  pickupCity?: string;
  withDriver?: boolean;
  eventType?: string;
  eventDate?: string;
  eventCity?: string;
  venue?: string;
  guestsCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  serviceIds?: string[];
  details?: Record<string, unknown>;
  sourcePage?: string;
  channel?: RequestChannel;
}

export interface PublicRequestResult {
  reference: string;
  trackingToken: string;
}

// ---------- Contenus éditables (admin) ----------

export type BannerPlacement = "home_hero" | "home_strip" | "vehicles" | "rental" | "events";

export interface Banner {
  id: string;
  placement: BannerPlacement;
  title: string;
  subtitle?: string;
  mediaId?: string;
  linkUrl?: string;
  linkLabel?: string;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  /** data URL en démo ; chemin Supabase Storage en production */
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  alt: string;
  tags: string[];
  createdBy?: string;
  createdAt: string;
}

export interface RoleDef {
  id: RoleId;
  label: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface Recommendation extends EventTypeRecommendation {
  id: string;
}
