# BRYAN MULTISERVICES — Plateforme web progressive

Automobile • Location • Événementiel — site commercial (SEO) + application de gestion (PWA), sans compte client.

**Stack :** Next.js 16 (App Router, TypeScript, Tailwind 4) · IndexedDB (Dexie) · Supabase (schéma prêt dans `supabase/migrations`).

> **État actuel : développement complet sur données mockées.** Le site public et l'administration fonctionnent de bout en bout ;
> les données dynamiques (demandes, réservations, devis…) vivent dans l'IndexedDB du navigateur via un backend de démonstration
> qui applique les mêmes règles que la base Supabase.

## Démarrer

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + build
npm run test:e2e       # 20 tests Playwright, dont la vérification de toutes les pages (public + admin × 6 rôles) — après npm run build
```

**Administration :** `/admin` — choisir un profil démo, mot de passe `demo`.
Chaque profil (super administrateur, responsables auto/location/événementiel, commercial, comptable) voit un menu et des droits différents (R12). Le super administrateur ajoute les utilisateurs dans **Administration → Utilisateurs**.
**Devis de démonstration :** `/devis/demo-devis-mariage`. **Réinitialiser la démo :** Admin → Paramètres.

## Ce qui est livré

| Face publique | Administration (PWA `/admin`) |
|---|---|
| Accueil (3 pôles, promotions, réalisations) | Tableau de bord par pôle + CRM (§40) |
| Catalogue véhicules : filtres dans l'URL, nouveautés, promotions, baisses de prix | CRM : liste / pipeline Kanban, fiche demande, historique, notes, affectation, motif de perte |
| Fiche véhicule : galerie, SEO + JSON-LD, intéressé / RDV / essai / WhatsApp / appel / partage / favori | Contacts (dédoublonnage par téléphone, export CSV, anonymisation loi 29-2019) |
| Location : recherche par dates avec disponibilité réelle, estimation (jour/semaine/mois + chauffeur) | Véhicules : formulaire 4 étapes, compression photos, prix historisés, données internes, QR code |
| Événementiel : pages par type, prestations, packages, assistant « Créer mon événement » (8 étapes, brouillon local) | Flotte & réservations : options 24 h, confirmation, départ/retour, anti double-réservation |
| Réalisations, reprise/échange, contact, suivi sans compte (`/suivi/[jeton]`) | Calendrier central véhicules / chauffeurs (tampons, options, conflits) |
| Devis en ligne : consulter, accepter, demander une modification, PDF | Chauffeurs, événementiel (dossiers, activation des prestations, cross-selling), devis versionnés |
| Favoris, « vus récemment », « mes demandes », file d'envoi hors-ligne (IndexedDB) | Marketing (promotions, QR de campagne), analytics & entonnoirs, paramètres, matrice des rôles, audit |
| PWA : manifest, service worker, page hors-ligne, invitation d'installation | Notifications internes en temps réel, manifest admin séparé |

## Architecture du code

```text
app/(public)/…        pages publiques (SSG/ISR, SEO)
app/admin/…           PWA admin (client, protégée)
components/           ui/ · public/ · admin/
lib/types.ts          types du domaine (miroir du schéma SQL)
lib/rules/            règles métier pures : références, disponibilité, tarifs, devis
lib/data/catalog.ts   lecture du catalogue public  ← à brancher sur Supabase
lib/db/mock-backend.ts backend de démonstration (IndexedDB) ← à remplacer par les RPC Supabase
lib/db/public-db.ts   IndexedDB visiteur (favoris, brouillons, file d'envoi)
supabase/migrations/  schéma Postgres testé (RLS, anti-chevauchement, RPC)
e2e/                  tests Playwright
```

### Passer des données mockées à Supabase
1. Créer le projet, `supabase db push`, renseigner `.env` (voir `.env.example`), `NEXT_PUBLIC_DATA_SOURCE=supabase`.
2. `lib/data/catalog.ts` : remplacer le corps de chaque fonction par la requête Supabase (mêmes signatures).
3. `lib/db/mock-backend.ts` : chaque fonction correspond à une RPC / requête (`submit_public_request`, `rental_availability`, `send_quote`, `respond_to_quote`…) — les écrans ne changent pas.
4. `lib/data/requests.ts` : envoyer via une Server Action (Zod + Turnstile) au lieu du backend local.
5. `lib/admin/session.ts` : remplacer par Supabase Auth.

## Dossier de conception

| # | Document |
|---|---|
| 00 | [Cahier des charges original](docs/00-cahier-des-charges-original.md) |
| 01 | [Décision : type de plateforme](docs/01-decision-type-plateforme.md) |
| 02 | [Analyse & points à clarifier](docs/02-analyse-et-points-a-clarifier.md) |
| 03 | [Architecture technique](docs/03-architecture-technique.md) |
| 04 | [Règles métier R1–R13](docs/04-regles-metier.md) |
| 05 | [Modèle de données](docs/05-modele-de-donnees.md) |
| 06 | [Backlog MVP](docs/06-backlog-mvp.md) |
| 07 | [Questions client](docs/07-questions-client.md) |
| 08 | [Audit & reste à faire](docs/08-audit-et-reste-a-faire.md) |

## Aperçu

Captures de l'application (build de production, données de démonstration) : [`docs/apercu/`](docs/apercu/).
