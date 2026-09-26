# BRYAN MULTISERVICES — Plateforme web progressive

Automobile • Location • Événementiel — site commercial (SEO) + application de gestion (PWA), sans compte client.

**Stack :** Next.js (App Router, TypeScript) · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · IndexedDB (Dexie) · Serwist (service worker).

## Dossier de conception

| # | Document | Contenu |
|---|---|---|
| 00 | [Cahier des charges original](docs/00-cahier-des-charges-original.md) | Version 1.0 fournie |
| 01 | [Décision : type de plateforme](docs/01-decision-type-plateforme.md) | Pourquoi « site SEO + PWA » et pas vitrine ni SPA |
| 02 | [Analyse & points à clarifier](docs/02-analyse-et-points-a-clarifier.md) | Contradictions, règles manquantes, découpage MVP, légal |
| 03 | [Architecture technique](docs/03-architecture-technique.md) | Stack, rendu, sécurité, IndexedDB, service worker, arborescence |
| 04 | [Règles métier](docs/04-regles-metier.md) | R1–R13 : références, disponibilités, pipeline, devis, rôles… |
| 05 | [Modèle de données](docs/05-modele-de-donnees.md) | Tables, RPC, payloads |
| 06 | [Backlog MVP](docs/06-backlog-mvp.md) | Sprints, épopées, récits, critères d'acceptation |
| 07 | [Questions client](docs/07-questions-client.md) | À faire valider par BRYAN MULTISERVICES |

## Base de données

```bash
supabase start && supabase db reset     # applique supabase/migrations/*
```
