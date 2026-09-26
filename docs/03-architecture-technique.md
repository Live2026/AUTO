# 03 — Architecture technique

## 1. Stack retenue

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Rendu serveur/statique pour le SEO et les aperçus WhatsApp, + app admin dans le même projet |
| UI | Tailwind CSS + shadcn/ui (Radix) | Rapide, accessible, léger, thémable (3 pôles = 3 accents de couleur) |
| Formulaires | React Hook Form + Zod | Schémas de validation **partagés** client/serveur |
| Données admin | TanStack Query | Cache, rafraîchissement, mutations optimistes |
| Backend | **Supabase** : Postgres, Auth, Storage, Realtime, Edge Functions | Pas de serveur à maintenir ; RLS pour les permissions ; contraintes SQL anti-conflit |
| Stockage local | **IndexedDB via Dexie.js** | API simple, requêtes indexées, `useLiveQuery` pour React |
| Service worker | **Serwist** (`@serwist/next`) | Successeur maintenu de next-pwa ; precache + stratégies runtime |
| Anti-spam | Cloudflare Turnstile | Captcha invisible, gratuit |
| E-mails | Resend (ou SMTP du client) | Notifications internes + envoi de lien de devis |
| Push | Web Push (VAPID) depuis une Edge Function | Alerte « nouvelle demande » sur les téléphones du personnel |
| QR codes | `qrcode` (génération côté serveur) | §48 |
| Hébergement | Vercel (ou Cloudflare Pages) + Supabase région **eu-west-3 (Paris)** | Région la plus proche/fiable pour l'Afrique centrale francophone |
| Analytics | Table `analytics_events` (Supabase) + Umami/Plausible optionnel | Entonnoirs métier (§50–51) calculés en SQL |

> Si le « … » du brief désignait un autre framework (ex. React + Vite), **attention** : une SPA pure compromet le SEO et les aperçus de partage. Next.js est la recommandation ferme pour la face publique.

## 2. Stratégie de rendu

| Pages | Rendu | Revalidation |
|---|---|---|
| Accueil, listes véhicules/location/événementiel, fiches, réalisations | **SSG/ISR** (statique) | `revalidateTag('vehicles')` appelé après chaque modification admin (webhook Supabase → route `/api/revalidate`) |
| Recherche location par dates | Serveur dynamique (RPC `rental_search`) | Aucune (temps réel) |
| Formulaires | Server Actions | — |
| Devis / suivi (`/devis/[token]`, `/suivi/[token]`) | Dynamique, `noindex` | — |
| `/admin/**` | Client (SPA dans Next), auth obligatoire | Realtime Supabase |

Chaque fiche publique génère : `<title>`, description, image Open Graph (1ʳᵉ photo), URL canonique, JSON-LD (`Vehicle`/`Car` + `Offer`, `Event`, `LocalBusiness`, `BreadcrumbList`).

## 3. Sécurité des écritures publiques (pas de compte client)

Le navigateur **n'écrit jamais directement** dans les tables.

```text
Formulaire (navigateur)
   │  POST (Server Action Next.js)
   ▼
Serveur Next.js : 1) validation Zod  2) vérif. Turnstile  3) limite par IP
   │  appel RPC avec la clé service_role (jamais exposée au navigateur)
   ▼
Postgres : submit_public_request(payload)  → upsert contact, crée la demande,
           génère la référence, historise, notifie  → { reference, tracking_token }
```

- La clé `anon` ne peut que **lire** le contenu publié (RLS) et appeler `rental_availability()`.
- Les données internes (prix d'achat, notes) sont dans des tables séparées **jamais** lisibles par `anon`.
- Devis/suivi : accès par **jeton aléatoire** (UUID v4), lecture via RPC dédiée qui ne renvoie que les champs nécessaires.

## 4. Rôle d'IndexedDB (Dexie)

### Face publique — base `bryan-public`

| Store | Contenu | Usage |
|---|---|---|
| `favorites` | `{ id, kind: 'vehicle'|'rental'|'service', slug, title, image, price, addedAt }` | Favoris sans compte (§16) |
| `compare` | ids de véhicules (max 3) | Comparateur (Phase 2) |
| `recentlyViewed` | 20 dernières fiches | « Vus récemment » sur l'accueil |
| `formDrafts` | brouillon par formulaire (assistant événement surtout) | Ne jamais perdre une saisie sur réseau instable |
| `outbox` | demandes à envoyer + nb de tentatives | Si le réseau coupe à l'envoi : renvoi automatique au retour en ligne (`online` event ; Background Sync sur Android) |
| `myRequests` | `{ reference, trackingToken, type, createdAt }` | « Mes demandes » sur cet appareil, sans compte |

### Face admin — base `bryan-admin`

| Store | Contenu | Règle |
|---|---|---|
| `requests`, `contacts` | Demandes assignées + récentes | Lecture hors-ligne ; rafraîchi par Realtime |
| `calendar` | 30 prochains jours | Lecture hors-ligne |
| `outbox` | Actions **non conflictuelles** : ajout de note, changement de statut CRM, appel/WhatsApp journalisé | Rejouées au retour réseau, dans l'ordre |
| `meta` | date de dernière synchro, version de schéma | — |

**Règle d'or : ce qui peut créer un conflit (réservation, option, affectation chauffeur, validation de devis, prix) n'est jamais fait hors-ligne.** Le bouton est désactivé avec le message « Connexion requise ». La base de données reste l'unique arbitre.

Vider les stores admin à la déconnexion (données personnelles sur appareil partagé).

## 5. Service worker (Serwist)

| Ressource | Stratégie |
|---|---|
| JS/CSS/polices (build) | Precache |
| Pages HTML publiques | Network-first (timeout 3 s) → cache → page `/hors-ligne` |
| Images (Supabase Storage / `next/image`) | Cache-first, 200 entrées, 30 jours |
| API/RPC Supabase | Network-only (données fraîches ; le cache métier est dans IndexedDB) |
| `/admin/**` | Precache du shell ; données via IndexedDB |

Deux manifests : `/manifest.webmanifest` (public, `start_url: /`) et `/admin/manifest.webmanifest` (`scope: /admin/`, nom « Bryan Admin », icône distincte). Le personnel installe l'app admin, les visiteurs peuvent installer le site.

## 6. Performance (connexions mobiles lentes)

- Budget : **< 150 Ko de JS** sur les pages publiques, LCP < 2,5 s en 4G lente.
- Images : conversion WebP/AVIF, tailles multiples, lazy loading, placeholder flou. Upload admin : **compression côté navigateur avant envoi** (économise la data du personnel).
- Vidéos : **pas dans Supabase Storage** (bande passante coûteuse) → YouTube non répertorié ou Cloudflare Stream, chargées au clic.
- Pas de carousel lourd, pas de chat tiers, pas de scripts pub.

## 7. Structure du projet

```text
/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                       # Accueil
│   │   ├── vehicules/ [slug]/ …           # Catalogue vente
│   │   ├── location/ [slug]/ …            # Catalogue location + recherche
│   │   ├── evenementiel/ [type]/ creer/   # Pôle événementiel + assistant
│   │   ├── realisations/ [slug]/
│   │   ├── devis/[token]/                 # Devis sans compte (noindex)
│   │   ├── suivi/[token]/                 # Suivi (Phase 2, noindex)
│   │   ├── a-propos/  contact/  confidentialite/  mentions-legales/
│   │   └── hors-ligne/
│   ├── admin/
│   │   ├── login/
│   │   ├── (app)/dashboard/ vehicules/ location/ evenementiel/ crm/ devis/
│   │   │        calendrier/ marketing/ medias/ analytics/ parametres/ utilisateurs/
│   │   └── manifest.webmanifest/route.ts
│   ├── api/revalidate/route.ts
│   ├── sw.ts                              # Service worker Serwist
│   └── manifest.ts
├── components/  ui/ (shadcn)  public/  admin/
├── features/                              # Un dossier par domaine
│   ├── vehicles/  rentals/  events/  quotes/  crm/  calendar/  media/  analytics/
│   │   └── (schemas.ts, queries.ts, actions.ts, components/)
├── lib/
│   ├── supabase/ (client.ts, server.ts, admin.ts)   # admin.ts = service_role, serveur uniquement
│   ├── db/ (dexie.ts, outbox.ts)                    # IndexedDB
│   ├── whatsapp.ts                                  # Génération des liens wa.me pré-remplis
│   ├── seo.ts  format.ts (XAF, dates FR)  phone.ts (normalisation +242)
├── supabase/
│   ├── migrations/                                  # Schéma versionné
│   ├── functions/ notify-new-request/  send-quote/  # Edge Functions
│   └── seed.sql
└── types/database.ts                                # Généré : supabase gen types
```

## 8. Environnements & qualité

- 3 environnements : `local` (Supabase CLI + Docker), `staging` (projet Supabase + preview Vercel), `production`.
- Migrations uniquement via fichiers SQL versionnés (`supabase/migrations`), jamais de modification manuelle en prod.
- CI (GitHub Actions) : lint, typecheck, tests unitaires (Vitest), tests SQL (pgTAP pour RLS et anti-conflits), e2e (Playwright) sur les parcours clés : demande véhicule, demande location, assistant événement, acceptation de devis.
- Sauvegardes : Point-in-Time Recovery Supabase (plan Pro) + export hebdomadaire.
- Monitoring : Sentry (erreurs), logs Supabase, Lighthouse CI sur les pages publiques.

## 9. Intégrations futures prévues dès maintenant

| Intégration | Point d'extension prévu |
|---|---|
| WhatsApp Business Cloud API | Edge Function `notify-*` + tables `conversations/messages` (Phase 2) |
| SMS / OTP suivi | Edge Function + table `otp_codes` |
| Mobile Money (MTN MoMo, Airtel Money) | Table `payments` liée à `quotes`/`rental_bookings`, webhook Edge Function |
| Facturation / comptabilité | Export CSV puis API |
| Signature électronique | Champ `accepted_signature` sur `quote_versions` |
