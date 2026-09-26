# 08 — Audit du développement (données mockées) et reste à faire

Audit réalisé contre le cahier des charges (§ = section du CDC) et le backlog `docs/06`.
Légende : ✅ fait · 🟡 partiel · ❌ manquant · ⏭ volontairement en Phase 2/3.

**Verdict : le socle est solide, mais ce n'est ni complet ni prêt à brancher sur Supabase et déployer en l'état.**
Il reste (A) des écrans d'administration en lecture seule ou absents, (B) quelques trous côté public,
(C) des écarts entre le schéma SQL et le front, (D) toute la couche backend (branchement, sécurité, notifications, CI).

---

## 1. Espace administrateur

### Ce qui est fait
| Fonction (§41) | État | Détail |
|---|---|---|
| Connexion, rôles, menu par permission | 🟡 | Profils de démo ; pas encore Supabase Auth |
| Tableau de bord par pôle + CRM (§40) | ✅ | Pas de filtre de période ; CA vente = prix affiché du véhicule vendu, pas le prix réellement négocié |
| Véhicules : création/édition 4 étapes, usages cumulés, prix historisés, données internes, QR | ✅ | |
| CRM : liste, Kanban, fiche, pipeline, affectation, notes, historique, motif de perte, création manuelle | ✅ | Pas d'archivage depuis l'interface |
| Contacts : recherche, export CSV, anonymisation | 🟡 | Pas de modification ni de fusion de contacts |
| Flotte & réservations : option 24 h, confirmation, départ/retour, anti-conflit | ✅ | |
| Calendrier central véhicules/chauffeurs | 🟡 | Les rendez-vous et essais n'apparaissent qu'en liste, pas sur la frise |
| Chauffeurs : fiches, statuts, affectation anti-conflit | ✅ | |
| Devis : éditeur, totaux, émission versionnée, révision, lien client, WhatsApp | ✅ | PDF = impression navigateur |
| Analytics & entonnoirs (§50–51) | ✅ | |
| Notifications internes en temps réel | 🟡 | Pas de push téléphone ni d'e-mail (backend) |
| Journal d'audit | 🟡 | Notes, rendez-vous et affectations de chauffeurs non journalisés |

### Ce qui manque (à faire avant la mise en production)
| # | Manque | Réf. CDC |
|---|---|---|
| A1 | **Médiathèque** : aucune page (upload, tags, recherche, texte alternatif) | §49, MVP « Galerie » |
| A2 | **Catégories de véhicules** : pas d'écran de gestion (liste figée) | §41 |
| A3 | **Promotions** : lecture seule, impossible d'en créer/modifier/planifier | §45, MVP |
| A4 | **Bannières** : aucun écran, et l'accueil ne les affiche pas | §46 |
| A5 | **Prestations événementielles** : on peut seulement activer/désactiver ; pas de création/édition (nom, prix, unité) | §30 |
| A6 | **Packages** et **recommandations (cross-selling)** : lecture seule | §30, §36 |
| A7 | **Dossier événement** : impossible de modifier date, lieu, invités, prestations après réception | §32 |
| A8 | **Réalisations** : pas de création/édition ni d'upload photos/vidéos | §35 |
| A9 | **Paramètres** : lecture seule (numéros, modèles WhatsApp, durées, affectations auto) | §7, §41 |
| A10 | **Utilisateurs & permissions** : impossible d'inviter, désactiver, changer de rôle, éditer la matrice | §42 « permissions configurables » |
| A11 | **Rendez-vous** : pas de liste/agenda dédié ; un essai confirmé ne bloque pas automatiquement le véhicule | §18, §43 |
| A12 | **Mode hors-ligne admin** : la file d'actions (notes, statuts) décrite en docs/03 n'existe pas encore | docs/03 §4 |
| A13 | Champ « Titre SEO » saisi mais pas utilisé par la page publique | §54 |

## 2. Espace client (site public)

### Ce qui est fait
Accueil 3 pôles, catalogue et fiche véhicule (SEO, JSON-LD), intéressé/RDV/essai/WhatsApp/appel/partage/favori,
location avec disponibilité et estimation, pages événementielles, assistant 8 étapes, réalisations, reprise, contact,
suivi sans compte, devis en ligne, favoris / vus récemment / mes demandes, PWA (installation, hors-ligne, file d'envoi).

### Ce qui manque
| # | Manque | Réf. CDC |
|---|---|---|
| B1 | **Photos réelles** : les photos ajoutées dans l'admin ne sont jamais affichées (illustrations SVG partout) | §15, §35 |
| B2 | **Partage** des événements et réalisations (seulement les véhicules) | §47 |
| B3 | **Reprise** : pas d'envoi de photos du véhicule | §19 |
| B4 | **Promotions location** (ex. –10 % week-end) non appliquées à l'estimation | §45 |
| B5 | **Cross-selling location** (ex. « avec chauffeur » → transfert aéroport) absent | §36, R9 |
| B6 | **Filtres courte/longue durée** du menu Location non implémentés | §11 |
| B7 | **Bannières** d'accueil non gérées (voir A4) | §46 |
| B8 | **Carte** sur la page Contact : emplacement réservé seulement | — |
| B9 | **Performance & accessibilité** non mesurées (Lighthouse, contrastes, clavier) | §53, §55, DoD |
| B10 | **Contenus réels** : stock, tarifs, prestations, textes légaux (RCCM/NIU) → réponses client (docs/07) | — |

## 3. Peut-on brancher Supabase et déployer maintenant ? **Non.** Voici pourquoi.

### C — Écarts entre le schéma SQL et le front
| # | Écart | Correctif |
|---|---|---|
| C1 | `vehicles` : pas de `color_hex`, `body_type` (utilisés par les visuels et les filtres) | Migration d'ajout |
| C2 | `event_types` : pas de `tagline`, `icon` ; `services` : pas de `icon` | Migration d'ajout |
| C3 | `realisations` : pas de `guests` ni de visuel (en prod : photos via `realisation_media`) | Migration + upload |
| C4 | Paramètres attendus par le front absents du seed : adresse, horaires, e-mail, villes | Migration de données |
| C5 | Anonymisation d'un contact, révision de devis, confirmation de RDV : pas de RPC dédiée | Nouvelles fonctions SQL |

### D — Couche backend à écrire
| # | Travail | Pourquoi c'est bloquant |
|---|---|---|
| D1 | Réécrire `lib/data/catalog.ts` en requêtes Supabase | Sinon le site public reste sur les données de démo |
| D2 | Remplacer `lib/db/mock-backend.ts` (≈ 40 fonctions) par requêtes/RPC + Realtime | Sinon les demandes restent dans le navigateur du visiteur : **l'entreprise ne les reçoit pas** |
| D3 | Server Actions publiques : Zod + Cloudflare Turnstile + limitation par IP → `submit_public_request` | Anti-spam, sécurité |
| D4 | Supabase Auth + création/invitation des employés (Edge Function) | Actuellement : faux login |
| D5 | Supabase Storage (upload photos, transformations) | Photos |
| D6 | Route `/api/revalidate` + Database Webhook (ISR) | Publication instantanée sur le site |
| D7 | Edge Function `notify` : Web Push (VAPID) + e-mail | Alertes « nouvelle demande » (§69) |
| D8 | Activer pg_cron (options/devis expirés) | Sinon options bloquées à vie |
| D9 | CI GitHub Actions (lint, types, build, e2e, tests SQL) + environnements staging/prod | Qualité, déploiement sûr |
| D10 | Tests RLS (pgTAP) sur le vrai projet | Sécurité des données clients |

## 4. Plan proposé (ordre de réalisation)

1. **Compléter l'admin sur mock** (A1–A13) et le public (B1–B8) — ~1 semaine.
2. **Migration SQL complémentaire** (C1–C5) — ½ journée.
3. **Branchement Supabase** (D1–D8) — ~1,5 à 2 semaines.
4. **CI, staging, recette, Lighthouse** (D9–D10, B9) — ~3 jours.
5. **Contenus réels du client** (B10) puis mise en production.
