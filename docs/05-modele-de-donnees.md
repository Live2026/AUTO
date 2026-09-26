# 05 — Modèle de données (Supabase / Postgres)

Le schéma exécutable est dans `supabase/migrations/` :
- `20260926000000_init_schema.sql` — tables, contraintes, triggers, fonctions RPC, RLS, stockage, cron ;
- `20260926000100_reference_data.sql` — rôles, permissions, paramètres par défaut.

Il a été **testé sur PostgreSQL 16** (références, dédoublonnage des contacts, anti-chevauchement véhicules/chauffeurs, expiration des options, calcul et acceptation de devis, RLS anonyme/commercial).

## 1. Vue d'ensemble

```text
                         ┌──────────────┐
                         │  contacts    │  (1 personne = 1 téléphone E.164)
                         └──────┬───────┘
                                │ 1..n
┌───────────┐  0..1     ┌───────▼────────┐ 1..n  ┌──────────────────────────┐
│ vehicles  │◄──────────┤   requests     ├──────►│ request_status_history   │
│ (vente +  │           │ (CRM central : │       │ request_notes            │
│ location +│           │ SALE/RENT/     │       └──────────────────────────┘
│ événement)│           │ EVENT/REQ)     │
└─┬───┬───┬─┘           └─┬──────┬───────┘
  │   │   │               │      │ 0..1
  │   │   │ 1..n          │ 0..n ▼
  │   │   │        ┌──────▼──┐ ┌────────┐ 1..n ┌────────────────┐
  │   │   └───────►│appoint- │ │ events │─────►│ event_services │──► services
  │   │            │ ments   │ └────────┘      └────────────────┘
  │   │ 1..n                        │
  │   ▼                             │            ┌──────────┐ 1..n ┌─────────────┐
  │ vehicle_bookings ◄──────────────┘  requests ►│ quotes   ├─────►│ quote_items │
  │ (rental|event|test_drive|maintenance,        └────┬─────┘      └─────────────┘
  │  hold|confirmed|…, EXCLUDE anti-chevauchement)    │ 1..n
  │         ▲                                         ▼
  │         │ 0..n                              quote_versions (instantanés figés)
  │   driver_assignments ──► drivers (EXCLUDE anti-chevauchement)
  ▼
rental_rates · vehicle_images · vehicle_internal · vehicle_price_history
```

## 2. Tables par domaine

| Domaine | Tables | Remarques |
|---|---|---|
| Personnel & droits | `staff_profiles`, `roles`, `permissions`, `role_permissions` | Liés à `auth.users` Supabase ; `has_permission(code)` utilisé par la RLS |
| Catalogue auto | `vehicles`, `vehicle_categories`, `vehicle_images`, `vehicle_internal`, `vehicle_price_history` | Un véhicule = un enregistrement, usages cumulables ; `vehicle_internal` jamais public |
| Location | `rental_rates`, `vehicle_bookings`, `drivers`, `driver_assignments` | Contraintes `EXCLUDE USING gist` = double réservation impossible |
| Événementiel | `event_types`, `service_categories`, `services`, `packages`, `package_items`, `event_type_recommendations`, `events`, `event_services`, `realisations`, `realisation_media`, `realisation_services` | `events` = dossier événement rattaché à une demande `EVENT` |
| CRM | `contacts`, `requests`, `request_status_history`, `request_notes`, `appointments` | Remplace `leads` du CDC (fusionné dans `requests`) |
| Devis | `quotes`, `quote_items`, `quote_versions` | Lignes modifiables seulement en `draft`/`change_requested` |
| Marketing & médias | `promotions`, `banners`, `media_assets` | Buckets Storage `media` (public) et `private` |
| Système | `business_settings`, `reference_counters`, `notifications`, `push_subscriptions`, `analytics_events`, `audit_logs` | |

**Différences volontaires avec la liste du §57 du CDC :**
- `leads` → fusionné dans `requests` ; `vehicle_features` → colonne `features text[]` (suffisant, filtrable) ;
- `vehicle_availability` → remplacé par `vehicle_bookings` (occupations datées) ;
- `gallery_items` → `realisations` + `realisation_media` ;
- `users` → `staff_profiles` (+ `auth.users` Supabase) ;
- `conversations` / `messages` → **Phase 2** (nécessitent l'API WhatsApp Business) ; en MVP : `request_notes` (type `whatsapp`, `call`…) ;
- `event_status_history` → le statut d'un événement suit celui de sa demande, historisé dans `request_status_history`.

## 3. Fonctions RPC

| Fonction | Appelée par | Rôle |
|---|---|---|
| `submit_public_request(jsonb)` | Serveur Next (service_role) | Toutes les demandes publiques ; retourne `{reference, tracking_token}` |
| `rental_availability(vehicle, début, fin)` | anon | `available` / `on_request` / `unavailable` |
| `rental_search(début, fin, catégorie?, chauffeur?, ville?)` | anon | Recherche location |
| `rental_estimate(vehicle, début, fin, chauffeur?)` | anon | Tarif indicatif (R5) |
| `track_event(jsonb)` | anon | Analytics (liste blanche d'événements) |
| `send_quote(quote_id)` | personnel (`quotes.write`) | Fige une version, statut `sent` |
| `get_public_quote(token)` | Serveur Next | Page `/devis/[token]` |
| `respond_to_quote(token, action, nom, message)` | Serveur Next | Accepter / demander modification |
| `get_request_tracking(token)` | Serveur Next | Page `/suivi/[token]` (Phase 2) |
| `compute_quote(quote_id)` | personnel | Totaux (aperçu avant envoi) |
| `run_expirations()` | pg_cron (5 min) | Options et devis expirés |

### Exemple de payload `submit_public_request`

```json
{
  "type": "event",
  "full_name": "Marie Mabiala",
  "phone": "06 123 45 67",
  "whatsapp": "",
  "email": "marie@example.cg",
  "consent": true,
  "event_type": "mariage",
  "event_date": "2026-12-15",
  "event_city": "Pointe-Noire",
  "guests_count": 150,
  "budget_min": 2000000,
  "service_ids": ["<uuid véhicules>", "<uuid décoration>"],
  "message": "Cortège de 5 voitures",
  "source_page": "/evenementiel/creer",
  "utm": { "source": "facebook" }
}
```

Erreurs métier renvoyées (à traduire côté front) : `full_name_required`, `invalid_phone`, `consent_required`, `vehicle_not_found`, `invalid_rental_period`, `rental_period_in_past`.

## 4. Commandes utiles

```bash
supabase start                       # Postgres + Auth + Storage en local (Docker)
supabase db reset                    # rejoue toutes les migrations + seed
supabase gen types typescript --local > types/database.ts
supabase db push                     # applique les migrations sur le projet distant
```

Après `db push` en production : créer le premier administrateur (inviter l'utilisateur via Supabase Auth, puis `insert into staff_profiles (id, full_name, role_id) values ('<uuid>', 'Nom', 'admin')`), et configurer le **Database Webhook** `notifications` → Edge Function `notify` (push + e-mail).
