-- =============================================================================
-- BRYAN MULTISERVICES — Schéma initial (MVP)
-- Référence fonctionnelle : docs/04-regles-metier.md (R1…R13)
-- Conventions : montants en XAF (bigint, unité = 1 FCFA), dates en timestamptz,
--               fuseau métier Africa/Brazzaville.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Types énumérés
-- -----------------------------------------------------------------------------
create type public.request_type as enum
  ('sale', 'rental', 'event', 'test_drive', 'appointment', 'trade_in', 'callback', 'other');
create type public.request_status as enum
  ('new', 'to_contact', 'contacted', 'in_discussion', 'offer_sent', 'waiting_client',
   'confirmed', 'completed', 'cancelled', 'lost');
create type public.request_channel as enum
  ('web_form', 'whatsapp', 'phone', 'walk_in', 'qr_code', 'social', 'other');
create type public.vehicle_status as enum ('draft', 'available', 'reserved', 'sold', 'withdrawn');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.fuel_type as enum ('petrol', 'diesel', 'hybrid', 'electric', 'other');
create type public.gearbox_type as enum ('manual', 'automatic');
create type public.drivetrain_type as enum ('fwd', 'rwd', 'awd', '4wd');
create type public.vehicle_condition as enum ('new', 'used_excellent', 'used_good', 'used_fair');
create type public.booking_kind as enum ('rental', 'event', 'test_drive', 'maintenance');
create type public.booking_status as enum ('hold', 'confirmed', 'in_progress', 'completed', 'cancelled');
create type public.driver_status as enum ('available', 'inactive', 'on_leave');
create type public.appointment_kind as enum ('visit', 'test_drive', 'inspection', 'meeting');
create type public.appointment_status as enum ('requested', 'confirmed', 'done', 'cancelled', 'no_show');
create type public.quote_status as enum
  ('draft', 'sent', 'accepted', 'change_requested', 'rejected', 'expired');
create type public.promotion_scope as enum ('sale', 'rental', 'event');
create type public.promotion_kind as enum ('percent', 'amount', 'fixed_price', 'label');
create type public.note_kind as enum ('note', 'call', 'whatsapp', 'email', 'meeting', 'system');

-- -----------------------------------------------------------------------------
-- 2. Utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Normalise un numéro congolais en E.164 (+242XXXXXXXXX). Retourne null si invalide.
-- Accepte aussi les numéros internationaux déjà au format +XXXXXXXX (8 à 15 chiffres).
create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  d text := regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g');
begin
  if d = '' then return null; end if;
  if left(d, 1) = '+' then
    d := substr(d, 2);
  elsif left(d, 2) = '00' then
    d := substr(d, 3);
  elsif length(d) = 9 then
    d := '242' || d;                       -- numéro local : 06 123 45 67
  end if;
  if d !~ '^[0-9]{8,15}$' then return null; end if;
  return '+' || d;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Personnel, rôles, permissions (R12)
-- -----------------------------------------------------------------------------
create table public.roles (
  id         text primary key,
  label      text not null,
  is_system  boolean not null default false
);

create table public.permissions (
  code        text primary key,
  description text not null
);

create table public.role_permissions (
  role_id         text not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  primary key (role_id, permission_code)
);

create table public.staff_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  phone      text,
  role_id    text not null references public.roles (id),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger staff_profiles_updated_at before update on public.staff_profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.has_permission(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.role_permissions rp on rp.role_id = sp.role_id
    where sp.id = auth.uid()
      and sp.is_active
      and (rp.permission_code = p_code or rp.permission_code = '*')
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. Paramètres, références (R1), médias
-- -----------------------------------------------------------------------------
create table public.business_settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,   -- lisible par les visiteurs (numéros, réseaux…)
  updated_at timestamptz not null default now(),
  updated_by uuid references public.staff_profiles (id)
);
create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

create table public.reference_counters (
  prefix     text not null,
  year       int  not null,
  last_value int  not null default 0,
  primary key (prefix, year)
);

create or replace function public.next_reference(p_prefix text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_year int := extract(year from (now() at time zone 'Africa/Brazzaville'))::int;
  v_n    int;
begin
  insert into public.reference_counters as rc (prefix, year, last_value)
  values (p_prefix, v_year, 1)
  on conflict (prefix, year) do update set last_value = rc.last_value + 1
  returning rc.last_value into v_n;
  return p_prefix || '-' || v_year || '-' || lpad(v_n::text, 5, '0');
end $$;

create table public.media_assets (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null default 'media',
  path       text not null,
  mime_type  text,
  width      int,
  height     int,
  size_bytes bigint,
  alt        text,
  tags       text[] not null default '{}',
  created_by uuid references public.staff_profiles (id),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- -----------------------------------------------------------------------------
-- 5. Véhicules (vente + location + événementiel sur un seul enregistrement, R3)
-- -----------------------------------------------------------------------------
create table public.vehicle_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  for_sale   boolean not null default true,
  for_rent   boolean not null default true,
  sort_order int not null default 0,
  is_active  boolean not null default true
);

create sequence public.vehicle_ref_seq start 1000;

create table public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique default ('BM-V-' || nextval('public.vehicle_ref_seq')),
  slug             text not null unique,
  status           public.vehicle_status not null default 'draft',
  category_id      uuid references public.vehicle_categories (id),
  -- usages (cumulables)
  is_for_sale      boolean not null default false,
  is_for_rent      boolean not null default false,
  is_for_events    boolean not null default false,
  -- caractéristiques
  brand            text not null,
  model            text not null,
  version          text,
  year             int check (year between 1950 and 2100),
  mileage_km       int check (mileage_km >= 0),
  fuel             public.fuel_type,
  gearbox          public.gearbox_type,
  drivetrain       public.drivetrain_type,
  color            text,
  seats            smallint check (seats > 0),
  doors            smallint,
  air_conditioning boolean not null default true,
  condition        public.vehicle_condition,
  features         text[] not null default '{}',
  description      text,
  city             text,
  -- vente
  sale_price       bigint check (sale_price >= 0),
  price_visible    boolean not null default true,     -- false = « Prix sur demande »
  previous_price   bigint,                             -- rempli par trigger (baisse de prix, R11)
  price_changed_at timestamptz,
  -- mise en avant / SEO
  is_featured      boolean not null default false,
  cover_media_id   uuid references public.media_assets (id) on delete set null,
  video_url        text,
  seo_title        text,
  seo_description  text,
  published_at     timestamptz,
  sold_at          timestamptz,
  created_by       uuid references public.staff_profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (is_for_sale or is_for_rent or is_for_events)
);
create index vehicles_public_idx on public.vehicles (status, is_for_sale, is_for_rent);
create index vehicles_category_idx on public.vehicles (category_id);

-- Données internes, jamais exposées au public
create table public.vehicle_internal (
  vehicle_id     uuid primary key references public.vehicles (id) on delete cascade,
  vin            text,
  plate_number   text,
  purchase_price bigint,
  notes          text,
  updated_at     timestamptz not null default now()
);

create table public.vehicle_images (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  media_id   uuid not null references public.media_assets (id) on delete cascade,
  sort_order int not null default 0,
  unique (vehicle_id, media_id)
);

create table public.vehicle_price_history (
  id         bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  old_price  bigint,
  new_price  bigint,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.vehicles_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.sale_price is distinct from old.sale_price then
    new.previous_price   := old.sale_price;
    new.price_changed_at := now();
    insert into public.vehicle_price_history (vehicle_id, old_price, new_price, changed_by)
    values (new.id, old.sale_price, new.sale_price, auth.uid());
  end if;
  if new.status <> 'draft' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then
    new.sold_at := now();
  end if;
  return new;
end $$;
create trigger vehicles_before_write before insert or update on public.vehicles
  for each row execute function public.vehicles_before_write();
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Visibilité publique (R11) : disponibles/réservés + vendus depuis moins de 30 jours
create or replace function public.vehicle_is_public(v public.vehicles)
returns boolean language sql stable set search_path = '' as $$
  select v.status in ('available', 'reserved')
      or (v.status = 'sold' and v.sold_at > now() - interval '30 days');
$$;

-- -----------------------------------------------------------------------------
-- 6. Location : tarifs, chauffeurs, occupations (anti-conflit, R3/R4/R5)
-- -----------------------------------------------------------------------------
create table public.rental_rates (
  vehicle_id          uuid primary key references public.vehicles (id) on delete cascade,
  daily_rate          bigint not null check (daily_rate >= 0),
  weekly_rate         bigint check (weekly_rate >= 0),
  monthly_rate        bigint check (monthly_rate >= 0),
  driver_daily_rate   bigint check (driver_daily_rate >= 0),
  deposit             bigint check (deposit >= 0),
  with_driver         boolean not null default true,
  self_drive          boolean not null default false,
  min_days            int not null default 1,
  cities              text[] not null default '{}',
  conditions          text,
  updated_at          timestamptz not null default now()
);

create table public.drivers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  phone          text not null,
  license_number text,
  status         public.driver_status not null default 'available',
  staff_user_id  uuid references public.staff_profiles (id),   -- accès planning (Phase 2)
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger drivers_updated_at before update on public.drivers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. CRM : contacts, demandes, historique, notes, rendez-vous (R2, R6)
-- -----------------------------------------------------------------------------
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone_e164    text not null unique,
  whatsapp_e164 text,
  email         text,
  city          text,
  notes         text,
  consent_at    timestamptz,
  anonymized_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

create table public.requests (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  type               public.request_type not null,
  status             public.request_status not null default 'new',
  channel            public.request_channel not null default 'web_form',
  contact_id         uuid not null references public.contacts (id),
  assigned_to        uuid references public.staff_profiles (id),
  vehicle_id         uuid references public.vehicles (id),
  subject            text,
  message            text,
  -- location / transport
  start_at           timestamptz,
  end_at             timestamptz,
  pickup_city        text,
  with_driver        boolean,
  -- détails spécifiques (reprise, préférences de RDV, transfert…)
  details            jsonb not null default '{}',
  tracking_token     uuid not null unique default gen_random_uuid(),
  lost_reason        text,
  source_page        text,
  utm                jsonb,
  consent            boolean not null default false,
  first_contacted_at timestamptz,
  closed_at          timestamptz,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (status <> 'lost' or lost_reason is not null),
  check (start_at is null or end_at is null or end_at > start_at)
);
create index requests_status_idx on public.requests (status, type);
create index requests_assigned_idx on public.requests (assigned_to);
create index requests_contact_idx on public.requests (contact_id);

create or replace function public.request_prefix(t public.request_type)
returns text language sql immutable set search_path = '' as $$
  select case t
    when 'sale'   then 'SALE'
    when 'rental' then 'RENT'
    when 'event'  then 'EVENT'
    else 'REQ'
  end;
$$;

create or replace function public.requests_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.reference is null then
    new.reference := public.next_reference(public.request_prefix(new.type));
  end if;
  if new.first_contacted_at is null
     and new.status not in ('new', 'to_contact', 'cancelled', 'lost') then
    new.first_contacted_at := now();
  end if;
  if new.status in ('completed', 'cancelled', 'lost') then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end $$;
create trigger requests_before_write before insert or update on public.requests
  for each row execute function public.requests_before_write();
create trigger requests_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

create table public.request_status_history (
  id            bigint generated always as identity primary key,
  request_id    uuid not null references public.requests (id) on delete cascade,
  from_status   public.request_status,
  to_status     public.request_status,
  from_assignee uuid,
  to_assignee   uuid,
  changed_by    uuid,
  changed_at    timestamptz not null default now()
);
create index request_status_history_req_idx on public.request_status_history (request_id, changed_at);

create or replace function public.requests_log_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_status_history (request_id, to_status, to_assignee, changed_by)
    values (new.id, new.status, new.assigned_to, auth.uid());
  elsif new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
    insert into public.request_status_history
      (request_id, from_status, to_status, from_assignee, to_assignee, changed_by)
    values (new.id, old.status, new.status, old.assigned_to, new.assigned_to, auth.uid());
  end if;
  return null;
end $$;
create trigger requests_log_history after insert or update on public.requests
  for each row execute function public.requests_log_history();

create table public.request_notes (
  id         bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  kind       public.note_kind not null default 'note',
  body       text not null,
  author_id  uuid references public.staff_profiles (id),   -- null = système
  created_at timestamptz not null default now()
);
create index request_notes_req_idx on public.request_notes (request_id, created_at);

create table public.appointments (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.requests (id) on delete cascade,
  kind           public.appointment_kind not null,
  status         public.appointment_status not null default 'requested',
  vehicle_id     uuid references public.vehicles (id),
  preferred_at   timestamptz,          -- souhait du client
  preferred_slot text,                 -- ex. « samedi matin »
  starts_at      timestamptz,          -- confirmé par le personnel
  ends_at        timestamptz,
  staff_id       uuid references public.staff_profiles (id),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Événementiel : types, services, packages, dossiers (R8, R9)
-- -----------------------------------------------------------------------------
create table public.event_types (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  cover_media_id  uuid references public.media_assets (id) on delete set null,
  seo_title       text,
  seo_description text,
  sort_order      int not null default 0,
  is_active       boolean not null default true
);

create table public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order int not null default 0
);

create table public.services (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references public.service_categories (id),
  slug           text not null unique,
  name           text not null,
  description    text,
  unit           text not null default 'forfait',   -- forfait, jour, heure, unité, personne
  base_price     bigint check (base_price >= 0),
  price_visible  boolean not null default false,
  cover_media_id uuid references public.media_assets (id) on delete set null,
  sort_order     int not null default 0,
  is_active      boolean not null default true       -- §30 : désactivable
);

create table public.packages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  description    text,
  event_type_id  uuid references public.event_types (id),
  price          bigint check (price >= 0),
  price_visible  boolean not null default true,
  cover_media_id uuid references public.media_assets (id) on delete set null,
  status         public.publish_status not null default 'draft'
);

create table public.package_items (
  package_id uuid not null references public.packages (id) on delete cascade,
  service_id uuid not null references public.services (id),
  quantity   numeric(10, 2) not null default 1 check (quantity > 0),
  primary key (package_id, service_id)
);

create table public.event_type_recommendations (
  id            uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types (id) on delete cascade,
  service_id    uuid references public.services (id) on delete cascade,
  package_id    uuid references public.packages (id) on delete cascade,
  sort_order    int not null default 0,
  check ((service_id is null) <> (package_id is null))
);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null unique references public.requests (id) on delete cascade,
  event_type_id uuid references public.event_types (id),
  title         text,
  event_date    date,
  starts_at     timestamptz,
  ends_at       timestamptz,
  city          text,
  venue         text,
  guests_count  int check (guests_count >= 0),
  budget_min    bigint,
  budget_max    bigint,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_services (
  event_id   uuid not null references public.events (id) on delete cascade,
  service_id uuid not null references public.services (id),
  quantity   numeric(10, 2) not null default 1 check (quantity > 0),
  notes      text,
  primary key (event_id, service_id)
);

-- -----------------------------------------------------------------------------
-- 9. Occupations véhicules & affectations chauffeurs — contraintes anti-conflit
-- -----------------------------------------------------------------------------
create table public.vehicle_bookings (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id),
  kind            public.booking_kind not null,
  status          public.booking_status not null default 'hold',
  period          tstzrange not null,          -- période vue par le client
  blocked_period  tstzrange not null,          -- période + tampon (calculée par trigger)
  hold_expires_at timestamptz,
  request_id      uuid references public.requests (id),
  event_id        uuid references public.events (id),
  cancel_reason   text,
  notes           text,
  created_by      uuid references public.staff_profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (not isempty(period)),
  check (status <> 'hold' or hold_expires_at is not null),
  constraint vehicle_bookings_no_overlap exclude using gist (
    vehicle_id with =,
    blocked_period with &&
  ) where (status in ('hold', 'confirmed', 'in_progress'))
);
create index vehicle_bookings_vehicle_idx on public.vehicle_bookings (vehicle_id, status);

create table public.driver_assignments (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers (id),
  booking_id uuid references public.vehicle_bookings (id) on delete cascade,
  event_id   uuid references public.events (id),
  period     tstzrange not null,
  status     public.booking_status not null default 'confirmed',
  notes      text,
  created_by uuid references public.staff_profiles (id),
  created_at timestamptz not null default now(),
  check (not isempty(period)),
  constraint driver_assignments_no_overlap exclude using gist (
    driver_id with =,
    period with &&
  ) where (status in ('hold', 'confirmed', 'in_progress'))
);

-- Libère les options expirées (appelée par pg_cron et avant chaque réservation)
create or replace function public.expire_holds(p_vehicle_id uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  update public.vehicle_bookings
     set status = 'cancelled', cancel_reason = 'hold_expired'
   where status = 'hold'
     and hold_expires_at < now()
     and (p_vehicle_id is null or vehicle_id = p_vehicle_id);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.vehicle_bookings_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v        public.vehicles;
  v_buffer int := 0;
begin
  if new.status in ('hold', 'confirmed', 'in_progress') then
    if pg_trigger_depth() = 1 then
      perform public.expire_holds(new.vehicle_id);
    end if;

    select * into v from public.vehicles where id = new.vehicle_id;
    if v.status in ('sold', 'withdrawn') then
      raise exception 'vehicle_not_bookable: véhicule vendu ou retiré' using errcode = 'P0001';
    end if;
    if v.status = 'reserved' and new.kind <> 'maintenance' then
      raise exception 'vehicle_not_bookable: véhicule réservé à la vente' using errcode = 'P0001';
    end if;
    if new.kind = 'rental' and not v.is_for_rent then
      raise exception 'vehicle_not_bookable: véhicule non disponible à la location' using errcode = 'P0001';
    end if;
    if new.kind = 'event' and not v.is_for_events then
      raise exception 'vehicle_not_bookable: véhicule non affecté à l''événementiel' using errcode = 'P0001';
    end if;
    if new.kind = 'test_drive' and not v.is_for_sale then
      raise exception 'vehicle_not_bookable: essai réservé aux véhicules à vendre' using errcode = 'P0001';
    end if;
  end if;

  if new.kind = 'rental' then
    select coalesce((value #>> '{}')::int, 0) into v_buffer
      from public.business_settings where key = 'rental_buffer_hours';
  end if;
  new.blocked_period := tstzrange(lower(new.period),
                                  upper(new.period) + make_interval(hours => coalesce(v_buffer, 0)));
  return new;
end $$;
create trigger vehicle_bookings_before_write before insert or update on public.vehicle_bookings
  for each row execute function public.vehicle_bookings_before_write();
create trigger vehicle_bookings_updated_at before update on public.vehicle_bookings
  for each row execute function public.set_updated_at();

create or replace function public.driver_assignments_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('hold', 'confirmed', 'in_progress')
     and exists (select 1 from public.drivers where id = new.driver_id and status <> 'available') then
    raise exception 'driver_not_available: chauffeur inactif ou en congé' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger driver_assignments_before_write before insert or update on public.driver_assignments
  for each row execute function public.driver_assignments_before_write();

-- -----------------------------------------------------------------------------
-- 10. Devis (R7)
-- -----------------------------------------------------------------------------
create table public.quotes (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique,       -- QUOTE-AAAA-NNNNN (trigger)
  request_id             uuid not null references public.requests (id),
  status                 public.quote_status not null default 'draft',
  currency               text not null default 'XAF',
  tax_rate               numeric(5, 2) not null default 0 check (tax_rate >= 0),
  discount_amount        bigint not null default 0 check (discount_amount >= 0),
  fees_amount            bigint not null default 0 check (fees_amount >= 0),
  valid_until            date,
  public_token           uuid not null unique default gen_random_uuid(),
  current_version        int not null default 0,
  client_note            text,
  change_request_message text,
  accepted_at            timestamptz,
  accepted_by_name       text,
  sent_at                timestamptz,
  created_by             uuid references public.staff_profiles (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create or replace function public.quotes_set_reference()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reference := coalesce(new.reference, public.next_reference('QUOTE'));
  return new;
end $$;
create trigger quotes_set_reference before insert on public.quotes
  for each row execute function public.quotes_set_reference();

create table public.quote_items (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references public.quotes (id) on delete cascade,
  service_id      uuid references public.services (id),
  vehicle_id      uuid references public.vehicles (id),
  label           text not null,
  quantity        numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price      bigint not null check (unit_price >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  sort_order      int not null default 0
);

create table public.quote_versions (
  id       uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  version  int not null,
  snapshot jsonb not null,        -- lignes + totaux figés à l'envoi
  sent_at  timestamptz not null default now(),
  sent_by  uuid references public.staff_profiles (id),
  unique (quote_id, version)
);

create or replace function public.compute_quote(p_quote_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with q as (
    select * from public.quotes where id = p_quote_id
  ), items as (
    select qi.*, round(qi.quantity * qi.unit_price)::bigint - qi.discount_amount as line_total
    from public.quote_items qi where qi.quote_id = p_quote_id
  ), t as (
    select coalesce(sum(line_total), 0)::bigint as subtotal from items
  ), ht as (
    select t.subtotal, t.subtotal - q.discount_amount + q.fees_amount as total_ht, q.tax_rate
    from t, q
  )
  select jsonb_build_object(
    'reference',   (select reference from q),
    'currency',    (select currency from q),
    'items',       coalesce((select jsonb_agg(jsonb_build_object(
                      'label', label, 'quantity', quantity, 'unit_price', unit_price,
                      'discount', discount_amount, 'total', line_total) order by sort_order)
                    from items), '[]'::jsonb),
    'subtotal',    ht.subtotal,
    'discount',    (select discount_amount from q),
    'fees',        (select fees_amount from q),
    'total_ht',    ht.total_ht,
    'tax_rate',    ht.tax_rate,
    'tax_amount',  round(ht.total_ht * ht.tax_rate / 100)::bigint,
    'total_ttc',   ht.total_ht + round(ht.total_ht * ht.tax_rate / 100)::bigint
  )
  from ht;
$$;

-- -----------------------------------------------------------------------------
-- 11. Marketing, réalisations
-- -----------------------------------------------------------------------------
create table public.promotions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  scope           public.promotion_scope not null,
  kind            public.promotion_kind not null,
  value           numeric(12, 2),
  vehicle_id      uuid references public.vehicles (id) on delete cascade,
  category_id     uuid references public.vehicle_categories (id) on delete cascade,
  service_id      uuid references public.services (id) on delete cascade,
  package_id      uuid references public.packages (id) on delete cascade,
  banner_media_id uuid references public.media_assets (id) on delete set null,
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  placement  text not null,        -- home_hero, home_strip, vehicles, rental, events
  title      text,
  subtitle   text,
  media_id   uuid references public.media_assets (id) on delete set null,
  link_url   text,
  sort_order int not null default 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean not null default true
);

create table public.realisations (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  event_type_id   uuid references public.event_types (id),
  city            text,
  event_date      date,
  description     text,
  video_url       text,
  cover_media_id  uuid references public.media_assets (id) on delete set null,
  status          public.publish_status not null default 'draft',
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now()
);

create table public.realisation_media (
  realisation_id uuid not null references public.realisations (id) on delete cascade,
  media_id       uuid not null references public.media_assets (id) on delete cascade,
  sort_order     int not null default 0,
  primary key (realisation_id, media_id)
);

create table public.realisation_services (
  realisation_id uuid not null references public.realisations (id) on delete cascade,
  service_id     uuid not null references public.services (id) on delete cascade,
  primary key (realisation_id, service_id)
);

-- -----------------------------------------------------------------------------
-- 12. Notifications internes, analytics, audit
-- -----------------------------------------------------------------------------
create table public.notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid not null references public.staff_profiles (id) on delete cascade,
  kind         text not null,
  title        text not null,
  body         text,
  link         text,
  request_id   uuid references public.requests (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.staff_profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Crée une notification pour l'affecté (ou, à défaut, pour tout le personnel
-- ayant la permission notifications.new_requests). L'envoi push/e-mail est fait
-- par l'Edge Function `notify` déclenchée par un Database Webhook sur cette table.
create or replace function public.requests_notify_new()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_contact public.contacts;
  v_vehicle text;
  v_title   text;
begin
  select * into v_contact from public.contacts where id = new.contact_id;
  select brand || ' ' || model || coalesce(' ' || year, '') into v_vehicle
    from public.vehicles where id = new.vehicle_id;
  v_title := 'Nouvelle demande ' || new.reference;

  insert into public.notifications (recipient_id, kind, title, body, link, request_id)
  select sp.id, 'new_request', v_title,
         concat_ws(E'\n',
           'Type : ' || new.type::text,
           'Véhicule : ' || v_vehicle,
           'Client : ' || v_contact.full_name,
           'Téléphone : ' || v_contact.phone_e164),
         '/admin/crm/' || new.id, new.id
  from public.staff_profiles sp
  where sp.is_active
    and (
      sp.id = new.assigned_to
      or (new.assigned_to is null and exists (
            select 1 from public.role_permissions rp
            where rp.role_id = sp.role_id
              and rp.permission_code in ('notifications.new_requests', '*')))
    );
  return null;
end $$;
create trigger requests_notify_new after insert on public.requests
  for each row execute function public.requests_notify_new();

create table public.analytics_events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  session_id  text,
  event_name  text not null check (event_name in (
                'page_view', 'vehicle_view', 'rental_view', 'event_type_view', 'realisation_view',
                'search', 'whatsapp_click', 'call_click', 'share_click', 'favorite_add',
                'form_start', 'form_submit', 'quote_view', 'quote_accept', 'pwa_install', 'qr_scan')),
  path        text,
  object_type text,
  object_id   uuid,
  referrer    text,
  utm         jsonb,
  device      text,
  props       jsonb
);
create index analytics_events_name_time_idx on public.analytics_events (event_name, occurred_at);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  table_name  text not null,
  record_id   text,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb
);
create index audit_logs_table_idx on public.audit_logs (table_name, record_id);

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(), tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key'),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'vehicles', 'vehicle_internal', 'rental_rates', 'vehicle_bookings', 'driver_assignments',
    'requests', 'quotes', 'quote_items', 'promotions', 'services', 'packages',
    'staff_profiles', 'role_permissions', 'business_settings'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_trigger()', t || '_audit', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 13. Fonctions publiques (RPC)
--     Écritures publiques : UNIQUEMENT via le serveur Next.js (service_role),
--     après validation Zod + Turnstile. Lectures de disponibilité : anon.
-- -----------------------------------------------------------------------------

-- Enregistre une demande publique (tous types). Retourne { reference, tracking_token }.
create or replace function public.submit_public_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_type       public.request_type := (p ->> 'type')::public.request_type;
  v_phone      text := public.normalize_phone(p ->> 'phone');
  v_wa         text := coalesce(public.normalize_phone(nullif(p ->> 'whatsapp', '')), v_phone);
  v_vehicle_id uuid := nullif(p ->> 'vehicle_id', '')::uuid;
  v_start      timestamptz := nullif(p ->> 'start_at', '')::timestamptz;
  v_end        timestamptz := nullif(p ->> 'end_at', '')::timestamptz;
  v_assignee   uuid;
  v_contact_id uuid;
  v_req        public.requests;
  v_event_id   uuid;
begin
  if coalesce(trim(p ->> 'full_name'), '') = '' then
    raise exception 'full_name_required' using errcode = '22023';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if coalesce((p ->> 'consent')::boolean, false) is not true then
    raise exception 'consent_required' using errcode = '22023';
  end if;
  if v_vehicle_id is not null and not exists (
       select 1 from public.vehicles v where v.id = v_vehicle_id and public.vehicle_is_public(v)) then
    raise exception 'vehicle_not_found' using errcode = '22023';
  end if;
  if v_type = 'rental' then
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'invalid_rental_period' using errcode = '22023';
    end if;
    if v_start < now() - interval '1 day' then
      raise exception 'rental_period_in_past' using errcode = '22023';
    end if;
  end if;

  insert into public.contacts as c (full_name, phone_e164, whatsapp_e164, email, city, consent_at)
  values (trim(p ->> 'full_name'), v_phone, v_wa,
          nullif(lower(trim(p ->> 'email')), ''), nullif(trim(p ->> 'city'), ''), now())
  on conflict (phone_e164) do update set
    whatsapp_e164 = coalesce(c.whatsapp_e164, excluded.whatsapp_e164),
    email         = coalesce(c.email, excluded.email),
    city          = coalesce(c.city, excluded.city),
    consent_at    = now()
  returning c.id into v_contact_id;

  select sp.id into v_assignee
    from public.business_settings bs
    join public.staff_profiles sp on sp.id = nullif(bs.value ->> v_type::text, '')::uuid
   where bs.key = 'default_assignees' and sp.is_active;

  insert into public.requests (
    type, channel, contact_id, assigned_to, vehicle_id, subject, message,
    start_at, end_at, pickup_city, with_driver, details, source_page, utm, consent)
  values (
    v_type,
    coalesce(nullif(p ->> 'channel', '')::public.request_channel, 'web_form'),
    v_contact_id, v_assignee, v_vehicle_id,
    nullif(trim(p ->> 'subject'), ''), nullif(trim(p ->> 'message'), ''),
    v_start, v_end, nullif(trim(p ->> 'pickup_city'), ''),
    (p ->> 'with_driver')::boolean,
    coalesce(p -> 'details', '{}'::jsonb),
    left(p ->> 'source_page', 500), p -> 'utm', true)
  returning * into v_req;

  if v_type = 'event' then
    insert into public.events (request_id, event_type_id, event_date, city, venue,
                               guests_count, budget_min, budget_max)
    values (
      v_req.id,
      (select id from public.event_types where slug = p ->> 'event_type' and is_active),
      nullif(p ->> 'event_date', '')::date,
      nullif(trim(p ->> 'event_city'), ''),
      nullif(trim(p ->> 'venue'), ''),
      nullif(p ->> 'guests_count', '')::int,
      nullif(p ->> 'budget_min', '')::bigint,
      nullif(p ->> 'budget_max', '')::bigint)
    returning id into v_event_id;

    insert into public.event_services (event_id, service_id)
    select v_event_id, s.id
      from public.services s
     where s.is_active
       and s.id in (select (jsonb_array_elements_text(coalesce(p -> 'service_ids', '[]'::jsonb)))::uuid);
  elsif v_type in ('test_drive', 'appointment') then
    insert into public.appointments (request_id, kind, vehicle_id, preferred_at, preferred_slot)
    values (
      v_req.id,
      case when v_type = 'test_drive' then 'test_drive'::public.appointment_kind
           else coalesce(nullif(p -> 'details' ->> 'appointment_kind', '')::public.appointment_kind, 'visit') end,
      v_vehicle_id,
      nullif(p -> 'details' ->> 'preferred_at', '')::timestamptz,
      nullif(p -> 'details' ->> 'preferred_slot', ''));
  end if;

  return jsonb_build_object('reference', v_req.reference, 'tracking_token', v_req.tracking_token);
end $$;

-- Disponibilité location pour une période (R3) : available | on_request | unavailable
create or replace function public.rental_availability(p_vehicle_id uuid, p_start timestamptz, p_end timestamptz)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when not exists (
      select 1 from public.vehicles v
      where v.id = p_vehicle_id and v.is_for_rent and v.status = 'available')
      then 'unavailable'
    when exists (
      select 1 from public.vehicle_bookings b
      where b.vehicle_id = p_vehicle_id
        and b.status in ('confirmed', 'in_progress')
        and b.blocked_period && tstzrange(p_start, p_end))
      then 'unavailable'
    when exists (
      select 1 from public.vehicle_bookings b
      where b.vehicle_id = p_vehicle_id
        and b.status = 'hold' and b.hold_expires_at > now()
        and b.blocked_period && tstzrange(p_start, p_end))
      then 'on_request'
    else 'available'
  end;
$$;

-- Recherche location (§22)
create or replace function public.rental_search(
  p_start timestamptz, p_end timestamptz,
  p_category_slug text default null, p_with_driver boolean default null, p_city text default null)
returns table (vehicle_id uuid, slug text, availability text, daily_rate bigint)
language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.availability, s.daily_rate
  from (
    select v.id, v.slug, public.rental_availability(v.id, p_start, p_end) as availability, r.daily_rate
    from public.vehicles v
    join public.rental_rates r on r.vehicle_id = v.id
    left join public.vehicle_categories c on c.id = v.category_id
    where v.is_for_rent and v.status = 'available'
      and (p_category_slug is null or c.slug = p_category_slug)
      and (p_with_driver is null or (p_with_driver and r.with_driver) or (not p_with_driver and r.self_drive))
      and (p_city is null or cardinality(r.cities) = 0 or p_city = any (r.cities))
  ) s
  order by (s.availability = 'available') desc, (s.availability = 'on_request') desc, s.daily_rate;
$$;

-- Estimation indicative du prix de location (R5)
create or replace function public.rental_estimate(
  p_vehicle_id uuid, p_start timestamptz, p_end timestamptz, p_with_driver boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r        public.rental_rates;
  v_days   int;
  v_left   int;
  v_amount bigint := 0;
  v_driver bigint := 0;
begin
  select * into r from public.rental_rates where vehicle_id = p_vehicle_id;
  if not found or p_end <= p_start then return null; end if;
  v_days := greatest(ceil(extract(epoch from (p_end - p_start)) / 86400.0)::int, r.min_days);
  v_left := v_days;
  if r.monthly_rate is not null then
    v_amount := v_amount + (v_left / 30) * r.monthly_rate;
    v_left := v_left % 30;
  end if;
  if r.weekly_rate is not null then
    v_amount := v_amount + (v_left / 7) * r.weekly_rate;
    v_left := v_left % 7;
  end if;
  v_amount := v_amount + v_left * r.daily_rate;
  if p_with_driver and r.driver_daily_rate is not null then
    v_driver := v_days * r.driver_daily_rate;
  end if;
  return jsonb_build_object('days', v_days, 'vehicle_amount', v_amount, 'driver_amount', v_driver,
                            'total', v_amount + v_driver, 'deposit', r.deposit,
                            'currency', 'XAF', 'indicative', true);
end $$;

-- Envoi d'un devis : fige une version, passe la demande en « offre envoyée » (R7)
create or replace function public.send_quote(p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q          public.quotes;
  v_snapshot jsonb;
begin
  if not public.has_permission('quotes.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if not exists (select 1 from public.quote_items where quote_id = p_quote_id) then
    raise exception 'quote_empty';
  end if;

  update public.quotes
     set valid_until = coalesce(valid_until,
           current_date + coalesce((select (value #>> '{}')::int from public.business_settings
                                     where key = 'quote_validity_days'), 15))
   where id = p_quote_id
  returning * into q;

  v_snapshot := public.compute_quote(p_quote_id)
                || jsonb_build_object('valid_until', q.valid_until, 'client_note', q.client_note,
                                      'version', q.current_version + 1);

  insert into public.quote_versions (quote_id, version, snapshot, sent_by)
  values (p_quote_id, q.current_version + 1, v_snapshot, auth.uid());

  update public.quotes
     set status = 'sent', current_version = q.current_version + 1, sent_at = now(),
         change_request_message = null
   where id = p_quote_id;

  update public.requests
     set status = 'offer_sent'
   where id = q.request_id
     and status in ('new', 'to_contact', 'contacted', 'in_discussion', 'waiting_client');

  return jsonb_build_object('public_token', q.public_token, 'version', q.current_version + 1);
end $$;

-- Lecture d'un devis par son lien sécurisé (page /devis/[token])
create or replace function public.get_public_quote(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'status', q.status,
           'expired', q.valid_until < current_date,
           'accepted_at', q.accepted_at,
           'client_name', c.full_name,
           'request_reference', r.reference,
           'quote', qv.snapshot)
  from public.quotes q
  join public.requests r on r.id = q.request_id
  join public.contacts c on c.id = r.contact_id
  join public.quote_versions qv on qv.quote_id = q.id and qv.version = q.current_version
  where q.public_token = p_token and q.current_version > 0;
$$;

-- Réponse du client à un devis : 'accept' | 'request_change'
create or replace function public.respond_to_quote(
  p_token uuid, p_action text, p_name text default null, p_message text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes;
begin
  select * into q from public.quotes where public_token = p_token and current_version > 0 for update;
  if not found then raise exception 'quote_not_found' using errcode = '22023'; end if;
  if q.status not in ('sent', 'change_requested') then
    raise exception 'quote_not_open' using errcode = '22023';
  end if;
  if q.valid_until < current_date then
    update public.quotes set status = 'expired' where id = q.id;
    raise exception 'quote_expired' using errcode = '22023';
  end if;

  if p_action = 'accept' then
    if coalesce(trim(p_name), '') = '' then
      raise exception 'name_required' using errcode = '22023';
    end if;
    update public.quotes
       set status = 'accepted', accepted_at = now(), accepted_by_name = trim(p_name)
     where id = q.id;
    update public.requests set status = 'confirmed' where id = q.request_id;
    insert into public.request_notes (request_id, kind, body)
    values (q.request_id, 'system', 'Devis ' || q.reference || ' v' || q.current_version
                                    || ' accepté en ligne par ' || trim(p_name));
  elsif p_action = 'request_change' then
    if coalesce(trim(p_message), '') = '' then
      raise exception 'message_required' using errcode = '22023';
    end if;
    update public.quotes
       set status = 'change_requested', change_request_message = left(trim(p_message), 2000)
     where id = q.id;
    update public.requests set status = 'in_discussion' where id = q.request_id;
    insert into public.request_notes (request_id, kind, body)
    values (q.request_id, 'system', 'Modification demandée sur ' || q.reference || ' : ' || left(trim(p_message), 2000));
  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  insert into public.notifications (recipient_id, kind, title, link, request_id)
  select r.assigned_to, 'quote_' || p_action, 'Devis ' || q.reference || ' : '
         || case p_action when 'accept' then 'accepté' else 'modification demandée' end,
         '/admin/crm/' || r.id, r.id
  from public.requests r
  where r.id = q.request_id and r.assigned_to is not null;

  return jsonb_build_object('status', case p_action when 'accept' then 'accepted' else 'change_requested' end);
end $$;

-- Suivi sans compte (Phase 2, page /suivi/[token])
create or replace function public.get_request_tracking(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'reference', r.reference,
           'type', r.type,
           'status', r.status,
           'created_at', r.created_at,
           'subject', r.subject,
           'quote_token', (select q.public_token from public.quotes q
                            where q.request_id = r.id and q.current_version > 0
                            order by q.created_at desc limit 1))
  from public.requests r
  where r.tracking_token = p_token and r.archived_at is null;
$$;

-- Analytics : insertion contrôlée depuis le navigateur (anon)
create or replace function public.track_event(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.analytics_events
    (session_id, event_name, path, object_type, object_id, referrer, utm, device, props)
  values (
    left(p ->> 'session_id', 64), p ->> 'event_name', left(p ->> 'path', 500),
    left(p ->> 'object_type', 32), nullif(p ->> 'object_id', '')::uuid,
    left(p ->> 'referrer', 500), p -> 'utm', left(p ->> 'device', 32), p -> 'props');
end $$;

-- Tâche planifiée : options et devis expirés
create or replace function public.run_expirations()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.expire_holds(null);
  update public.quotes set status = 'expired'
   where status in ('sent', 'change_requested') and valid_until < current_date;
end $$;

-- -----------------------------------------------------------------------------
-- 14. Droits d'exécution des fonctions
-- -----------------------------------------------------------------------------
do $$
declare f text;
begin
  -- Fonctions internes / serveur uniquement
  foreach f in array array[
    'public.next_reference(text)',
    'public.expire_holds(uuid)',
    'public.submit_public_request(jsonb)',
    'public.get_public_quote(uuid)',
    'public.respond_to_quote(uuid, text, text, text)',
    'public.get_request_tracking(uuid)',
    'public.run_expirations()',
    'public.compute_quote(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;

  -- Personnel connecté
  execute 'revoke all on function public.send_quote(uuid) from public, anon';
  execute 'grant execute on function public.send_quote(uuid) to authenticated, service_role';
  execute 'grant execute on function public.compute_quote(uuid) to authenticated';
end $$;

grant execute on function public.rental_availability(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.rental_search(timestamptz, timestamptz, text, boolean, text) to anon, authenticated;
grant execute on function public.rental_estimate(uuid, timestamptz, timestamptz, boolean) to anon, authenticated;
grant execute on function public.track_event(jsonb) to anon, authenticated;
grant execute on function public.has_permission(text) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 15. Row Level Security
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'roles', 'permissions', 'role_permissions', 'staff_profiles', 'business_settings',
    'reference_counters', 'media_assets', 'vehicle_categories', 'vehicles', 'vehicle_internal',
    'vehicle_images', 'vehicle_price_history', 'rental_rates', 'drivers', 'contacts', 'requests',
    'request_status_history', 'request_notes', 'appointments', 'event_types', 'service_categories',
    'services', 'packages', 'package_items', 'event_type_recommendations', 'events',
    'event_services', 'vehicle_bookings', 'driver_assignments', 'quotes', 'quote_items',
    'quote_versions', 'promotions', 'banners', 'realisations', 'realisation_media',
    'realisation_services', 'notifications', 'push_subscriptions', 'analytics_events', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 15.1 Lecture publique du contenu publié -------------------------------------
create policy "public read" on public.vehicle_categories for select using (is_active or public.is_staff());
create policy "public read" on public.vehicles for select using (public.vehicle_is_public(vehicles) or public.is_staff());
create policy "public read" on public.vehicle_images for select using (
  public.is_staff() or exists (select 1 from public.vehicles v where v.id = vehicle_id and public.vehicle_is_public(v)));
create policy "public read" on public.rental_rates for select using (
  public.is_staff() or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.is_for_rent and public.vehicle_is_public(v)));
create policy "public read" on public.media_assets for select using (bucket = 'media' or public.is_staff());
create policy "public read" on public.event_types for select using (is_active or public.is_staff());
create policy "public read" on public.service_categories for select using (true);
create policy "public read" on public.services for select using (is_active or public.is_staff());
create policy "public read" on public.packages for select using (status = 'published' or public.is_staff());
create policy "public read" on public.package_items for select using (
  public.is_staff() or exists (select 1 from public.packages p where p.id = package_id and p.status = 'published'));
create policy "public read" on public.event_type_recommendations for select using (true);
create policy "public read" on public.promotions for select using (
  (is_active and starts_at <= now() and (ends_at is null or ends_at > now())) or public.is_staff());
create policy "public read" on public.banners for select using (
  (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_staff());
create policy "public read" on public.realisations for select using (status = 'published' or public.is_staff());
create policy "public read" on public.realisation_media for select using (
  public.is_staff() or exists (select 1 from public.realisations r where r.id = realisation_id and r.status = 'published'));
create policy "public read" on public.realisation_services for select using (
  public.is_staff() or exists (select 1 from public.realisations r where r.id = realisation_id and r.status = 'published'));
create policy "public read" on public.business_settings for select using (is_public or public.is_staff());

-- 15.2 Écritures du personnel sur le catalogue --------------------------------
create policy "staff write" on public.vehicle_categories for all to authenticated
  using (public.has_permission('vehicles.write')) with check (public.has_permission('vehicles.write'));
create policy "staff write" on public.vehicles for all to authenticated
  using (public.has_permission('vehicles.write')) with check (public.has_permission('vehicles.write'));
create policy "staff write" on public.vehicle_images for all to authenticated
  using (public.has_permission('vehicles.write')) with check (public.has_permission('vehicles.write'));
create policy "staff all" on public.vehicle_internal for all to authenticated
  using (public.has_permission('vehicles.internal')) with check (public.has_permission('vehicles.internal'));
create policy "staff read" on public.vehicle_price_history for select to authenticated using (public.is_staff());
create policy "staff write" on public.rental_rates for all to authenticated
  using (public.has_permission('rentals.write')) with check (public.has_permission('rentals.write'));
create policy "staff write" on public.media_assets for all to authenticated
  using (public.has_permission('media.write')) with check (public.has_permission('media.write'));

do $$
declare t text;
begin
  foreach t in array array['event_types', 'service_categories', 'services', 'packages', 'package_items',
                           'event_type_recommendations', 'realisations', 'realisation_media',
                           'realisation_services'] loop
    execute format(
      'create policy "staff write" on public.%I for all to authenticated
         using (public.has_permission(''events.write'')) with check (public.has_permission(''events.write''))', t);
  end loop;
  foreach t in array array['promotions', 'banners'] loop
    execute format(
      'create policy "staff write" on public.%I for all to authenticated
         using (public.has_permission(''marketing.write'')) with check (public.has_permission(''marketing.write''))', t);
  end loop;
end $$;

-- 15.3 Opérations : occupations, chauffeurs -----------------------------------
create policy "staff read" on public.vehicle_bookings for select to authenticated using (public.is_staff());
create policy "staff write" on public.vehicle_bookings for all to authenticated
  using (public.has_permission('rentals.write') or public.has_permission('events.write'))
  with check (public.has_permission('rentals.write') or public.has_permission('events.write'));
create policy "staff read" on public.drivers for select to authenticated using (public.is_staff());
create policy "staff write" on public.drivers for all to authenticated
  using (public.has_permission('drivers.write')) with check (public.has_permission('drivers.write'));
create policy "staff read" on public.driver_assignments for select to authenticated
  using (public.is_staff());
create policy "staff write" on public.driver_assignments for all to authenticated
  using (public.has_permission('drivers.write')) with check (public.has_permission('drivers.write'));

-- 15.4 CRM ------------------------------------------------------------------------
create or replace function public.can_see_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_permission('crm.read_all')
      or exists (select 1 from public.requests r where r.id = p_request_id and r.assigned_to = auth.uid());
$$;
create or replace function public.can_edit_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_permission('crm.write_all')
      or (public.has_permission('crm.write_own')
          and exists (select 1 from public.requests r where r.id = p_request_id and r.assigned_to = auth.uid()));
$$;
grant execute on function public.can_see_request(uuid) to authenticated;
grant execute on function public.can_edit_request(uuid) to authenticated;

create policy "crm read" on public.contacts for select to authenticated
  using (public.has_permission('crm.read_all') or exists (
    select 1 from public.requests r where r.contact_id = contacts.id and r.assigned_to = auth.uid()));
create policy "crm write" on public.contacts for insert to authenticated
  with check (public.has_permission('crm.write_own') or public.has_permission('crm.write_all'));
create policy "crm update" on public.contacts for update to authenticated
  using (public.has_permission('crm.write_all') or exists (
    select 1 from public.requests r where r.contact_id = contacts.id and r.assigned_to = auth.uid()))
  with check (true);

create policy "crm read" on public.requests for select to authenticated
  using (public.has_permission('crm.read_all') or assigned_to = auth.uid());
create policy "crm insert" on public.requests for insert to authenticated
  with check (public.has_permission('crm.write_own') or public.has_permission('crm.write_all'));
create policy "crm update" on public.requests for update to authenticated
  using (public.has_permission('crm.write_all')
         or (public.has_permission('crm.write_own') and assigned_to = auth.uid()))
  with check (public.has_permission('crm.write_all')
         or (public.has_permission('crm.write_own') and assigned_to = auth.uid()));
-- Pas de DELETE : archivage via archived_at (R13)

create policy "crm read" on public.request_status_history for select to authenticated
  using (public.can_see_request(request_id));
create policy "crm read" on public.request_notes for select to authenticated
  using (public.can_see_request(request_id));
create policy "crm insert" on public.request_notes for insert to authenticated
  with check (public.can_see_request(request_id) and author_id = auth.uid());

create policy "crm read" on public.appointments for select to authenticated
  using (public.can_see_request(request_id) or staff_id = auth.uid());
create policy "crm write" on public.appointments for all to authenticated
  using (public.can_edit_request(request_id) or public.has_permission('appointments.write'))
  with check (public.can_edit_request(request_id) or public.has_permission('appointments.write'));

create policy "crm read" on public.events for select to authenticated
  using (public.can_see_request(request_id));
create policy "crm write" on public.events for all to authenticated
  using (public.has_permission('events.write') or public.can_edit_request(request_id))
  with check (public.has_permission('events.write') or public.can_edit_request(request_id));
create policy "crm read" on public.event_services for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.can_see_request(e.request_id)));
create policy "crm write" on public.event_services for all to authenticated
  using (public.has_permission('events.write')) with check (public.has_permission('events.write'));

-- 15.5 Devis ----------------------------------------------------------------------
create policy "quotes read" on public.quotes for select to authenticated
  using (public.has_permission('quotes.read') or public.has_permission('quotes.write')
         or public.can_see_request(request_id));
create policy "quotes write" on public.quotes for all to authenticated
  using (public.has_permission('quotes.write')) with check (public.has_permission('quotes.write'));
create policy "quotes read" on public.quote_items for select to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id));
create policy "quotes write" on public.quote_items for all to authenticated
  using (public.has_permission('quotes.write')
         and exists (select 1 from public.quotes q where q.id = quote_id and q.status in ('draft', 'change_requested')))
  with check (public.has_permission('quotes.write')
         and exists (select 1 from public.quotes q where q.id = quote_id and q.status in ('draft', 'change_requested')));
create policy "quotes read" on public.quote_versions for select to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id));

-- 15.6 Administration --------------------------------------------------------------
create policy "staff read" on public.roles for select to authenticated using (public.is_staff());
create policy "staff read" on public.permissions for select to authenticated using (public.is_staff());
create policy "staff read" on public.role_permissions for select to authenticated using (public.is_staff());
create policy "admin write" on public.roles for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
create policy "admin write" on public.role_permissions for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
create policy "staff read" on public.staff_profiles for select to authenticated using (public.is_staff());
create policy "admin write" on public.staff_profiles for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
create policy "admin write" on public.business_settings for all to authenticated
  using (public.has_permission('settings.write')) with check (public.has_permission('settings.write'));

create policy "own notifications" on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "own push" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "analytics read" on public.analytics_events for select to authenticated
  using (public.has_permission('analytics.read'));
create policy "audit read" on public.audit_logs for select to authenticated
  using (public.has_permission('audit.read'));
-- reference_counters : aucune policy → inaccessible hors fonctions security definer.

-- -----------------------------------------------------------------------------
-- 16. Temps réel (admin)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.requests, public.notifications,
      public.vehicle_bookings, public.quotes;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 17. Stockage des fichiers
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values
      ('media', 'media', true),        -- photos véhicules, événements, bannières
      ('private', 'private', false)    -- documents internes, photos de reprise
    on conflict (id) do nothing;

    create policy "media staff write" on storage.objects for all to authenticated
      using (bucket_id = 'media' and public.has_permission('media.write'))
      with check (bucket_id = 'media' and public.has_permission('media.write'));
    create policy "private staff" on storage.objects for all to authenticated
      using (bucket_id = 'private' and public.is_staff())
      with check (bucket_id = 'private' and public.is_staff());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 18. Tâche planifiée (pg_cron) — toutes les 5 minutes
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('run-expirations', '*/5 * * * *', 'select public.run_expirations()');
  end if;
end $$;
