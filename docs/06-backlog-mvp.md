# 06 — Backlog de développement (MVP)

Organisation : **3 lots livrables** (voir `02-analyse…` §C), découpés en épopées (E) et récits utilisateurs (US).
Chaque US est prête à devenir un ticket. « DoD » = définition de terminé commune en bas de page.

Estimation indicative pour **1 dev full-stack senior + 1 dev front** : ~11–12 semaines pour le MVP complet.

---

## Sprint 0 — Fondations (1 semaine)

| ID | Tâche | Critères d'acceptation |
|---|---|---|
| S0-1 | Initialiser Next.js + TS + Tailwind + shadcn/ui + ESLint/Prettier | `pnpm dev` OK, CI lint/typecheck verte |
| S0-2 | Projet Supabase (staging + prod, région Paris), migrations appliquées | `supabase db reset` rejoue les 2 migrations sans erreur |
| S0-3 | Clients Supabase (`browser`, `server`, `admin`) + types générés | La clé service_role n'apparaît dans aucun bundle client |
| S0-4 | Serwist + 2 manifests (public / admin) + page hors-ligne | Lighthouse PWA : installable ; hors-ligne affiche `/hors-ligne` |
| S0-5 | Dexie : bases `bryan-public` et `bryan-admin` + module `outbox` | Test unitaire : action mise en file hors-ligne puis rejouée |
| S0-6 | Design system : couleurs (1 accent par pôle), typo, composants de base (Button, Card, Badge prix/promo, BottomNav mobile, FAB WhatsApp) | Storybook ou page `/design` |
| S0-7 | Utilitaires : `formatXAF`, `formatDateFR`, `normalizePhone` (même règle que SQL), `buildWhatsAppLink` | Tests unitaires |

## Lot 1 — « Vendre » (4 semaines)

### E1 — Squelette public & accueil
- **US1.1** En tant que visiteur mobile, je vois une barre de navigation basse (Accueil, Véhicules, Location, Événement, Contact) et un bouton WhatsApp flottant sur toutes les pages. *(§67–68)*
- **US1.2** L'accueil affiche le hero (3 CTA : Acheter / Louer / Organiser), puis véhicules à la une, promotions, location, événementiel, réalisations, dans cet ordre. *(§12, §2)*
- **US1.3** Pages À propos, Contact (carte, horaires, numéros), Confidentialité, Mentions légales.

### E2 — Catalogue automobile
- **US2.1** Liste des véhicules avec filtres (catégorie, marque, prix min/max, année, carburant, boîte) et tri ; filtres dans l'URL (partageables, SEO). *(§14)*
- **US2.2** Onglets/filtres rapides : Nouveautés (publiés < 30 j), Promotions, Baisses de prix (R11). *(§13)*
- **US2.3** Fiche véhicule : galerie (swipe, zoom), caractéristiques, prix / ancien prix / % remise ou « Prix sur demande », référence, badge disponibilité, vidéo au clic. *(§15)*
- **US2.4** Actions fiche : Je suis intéressé, WhatsApp pré-rempli, Appeler, Prendre RDV, Demander un essai, Partager (Web Share API, repli copie lien), Favori (IndexedDB). *(§16)*
- **US2.5** SEO fiche : title/description/OG image, JSON-LD `Car` + `Offer`, sitemap.xml dynamique, robots.txt. *(§54)*
- **US2.6** Véhicule vendu : bandeau « Vendu » + 3 véhicules similaires pendant 30 j (R11).

### E3 — Demandes publiques
- **US3.1** Formulaire « Je suis intéressé » (nom, téléphone, WhatsApp = même numéro par défaut, e-mail facultatif, message, consentement) → écran de succès avec référence + bouton WhatsApp « au sujet de ma demande SALE-… ». *(§17)*
- **US3.2** Formulaire RDV / essai (type, créneau souhaité). *(§18)*
- **US3.3** Server Action commune : Zod + Turnstile + limite 5 envois/10 min/IP → `submit_public_request`.
- **US3.4** Hors-ligne : si l'envoi échoue, la demande part dans l'`outbox` et est renvoyée automatiquement ; le visiteur voit « Envoi dès le retour du réseau ».
- **US3.5** « Mes demandes » sur l'appareil (IndexedDB `myRequests`).

### E4 — Admin : accès & véhicules
- **US4.1** Connexion employé (e-mail + mot de passe, reset), déconnexion vide IndexedDB admin. *(§42)*
- **US4.2** Gestion utilisateurs & rôles (admin) : inviter, changer de rôle, désactiver ; matrice permissions éditable. *(R12)*
- **US4.3** CRUD véhicule en 4 étapes (infos, caractéristiques, photos, prix & publication) ; upload multiple avec **compression navigateur** ; réordonner les photos. *(§41)*
- **US4.4** Données internes (VIN, plaque, prix d'achat) visibles seulement avec `vehicles.internal`.
- **US4.5** Publication → revalidation ISR de la fiche et des listes en < 10 s.
- **US4.6** QR code téléchargeable (PNG/SVG) par véhicule, avec `?utm_source=qr`. *(§48)*

### E5 — CRM
- **US5.1** Liste des demandes : filtres (type, statut, affecté, période), recherche (référence, nom, téléphone), vue Kanban par statut. *(§37–38)*
- **US5.2** Fiche demande : infos contact (boutons Appeler/WhatsApp), objet lié, pipeline, affectation, notes typées, historique chronologique. *(§39, §70)*
- **US5.3** Motif obligatoire pour « Perdu ». *(R6)*
- **US5.4** Fiche contact : toutes ses demandes ; export / anonymisation (loi 29-2019).
- **US5.5** Création manuelle d'une demande (canal WhatsApp/téléphone/agence).
- **US5.6** Hors-ligne admin : consultation des demandes en cache ; notes et changements de statut mis en file.

### E6 — Notifications
- **US6.1** Centre de notifications dans l'admin (temps réel). *(§69)*
- **US6.2** Web Push (abonnement à l'installation de la PWA admin) + e-mail via Edge Function `notify`.
- **US6.3** Alerte « demande non traitée depuis 30 min ».

## Lot 2 — « Louer » (3 semaines)

### E7 — Catalogue location (public)
- **US7.1** Page Location : recherche (dates, ville, catégorie, avec/sans chauffeur) → `rental_search`. *(§22)*
- **US7.2** Fiche location : tarifs jour/semaine/mois, caution, conditions, **estimation instantanée** selon dates (`rental_estimate`), statut de disponibilité (R3). *(§23)*
- **US7.3** Demande de location (dates, lieu, chauffeur, commentaire) + WhatsApp pré-rempli avec les dates. *(§24)*
- **US7.4** Pages « Transport » : transferts aéroport/hôtel, transport d'invités, chauffeur privé → demande `rental` avec `details.service`. *(§27)*

### E8 — Admin location
- **US8.1** Flotte : activer « en location » sur un véhicule, saisir les tarifs. *(§41)*
- **US8.2** Depuis une demande RENT : **poser une option** (24 h) → **confirmer** → en cours → terminée ; message clair si conflit (erreur d'exclusion traduite). *(R3)*
- **US8.3** Maintenance : bloquer un véhicule sur une période.
- **US8.4** Chauffeurs : fiches + affectation sur une réservation/événement, conflit détecté. *(§26, R4)*
- **US8.5** Calendrier central (vue semaine/mois, par véhicule/chauffeur, couleurs par type) : locations, événements, essais, RDV, maintenance. *(§43)*

## Lot 3 — « Organiser » (3–4 semaines)

### E9 — Événementiel public
- **US9.1** Page pôle événementiel (identité visuelle propre) + une page par type d'événement (SEO). *(§28–29)*
- **US9.2** Page « Nos prestations » (services actifs uniquement, packages publiés). *(§30)*
- **US9.3** Assistant « Créer mon événement » en 8 étapes, brouillon IndexedDB, suggestions de services selon le type (R9), résumé, envoi → EVENT-… + WhatsApp. *(§31)*
- **US9.4** Réalisations : liste filtrable par type, fiche avec galerie + « Organiser un événement similaire » (préremplit l'assistant). *(§35)*

### E10 — Admin événementiel & devis
- **US10.1** CRUD types d'événements, catégories de services, services (activer/désactiver), packages, recommandations. *(§30, R9)*
- **US10.2** Dossier événement : infos, services demandés, responsable, affectations véhicules/chauffeurs. *(§32)*
- **US10.3** Éditeur de devis : lignes depuis le catalogue ou libres, remises, frais, taxe, aperçu des totaux (`compute_quote`). *(§33)*
- **US10.4** Envoi du devis (`send_quote`) : lien `/devis/{token}` copié / envoyé par WhatsApp (lien pré-rempli) et e-mail. *(§34)*
- **US10.5** Page publique du devis : consulter (mobile + impression PDF via CSS print), accepter (nom), demander une modification, contacter. *(§34, R7)*
- **US10.6** Réalisations : CRUD + médias.

### E11 — Marketing, médias, dashboard, analytics
- **US11.1** Promotions (auto/location/événement) et bannières d'accueil planifiées. *(§45–46)*
- **US11.2** Médiathèque : upload, tags, recherche, texte alternatif. *(§49)*
- **US11.3** Tracking : page_view, vehicle_view, whatsapp_click, call_click, form_submit… (`track_event`, envoi groupé, respect du « Do Not Track »). *(§50)*
- **US11.4** Dashboard par pôle + CRM (indicateurs §40) et entonnoirs vente/location/événement (§51), filtrables par période.
- **US11.5** Paramètres : numéros par pôle, modèles WhatsApp, durées (option, validité devis, tampon), affectations par défaut, motifs de perte.
- **US11.6** Journal d'audit consultable (admin). *(§71)*

## Recette & mise en production (1 semaine, en continu)

- Tests e2e Playwright : 4 parcours publics + pose d'option concurrente + acceptation devis.
- Tests pgTAP : RLS (anon, commercial, comptable), anti-chevauchement, expiration.
- Test réel sur Android d'entrée de gamme + iPhone, en 3G simulée.
- Formation du personnel (installation PWA admin, notifications) — 1/2 journée.
- Saisie initiale : stock, flotte, services, 5 réalisations minimum.

---

## Définition de terminé (DoD)

- Mobile d'abord : testé à 360 px de large ; cibles tactiles ≥ 44 px.
- Accessibilité : contrastes AA, labels de formulaire, navigation clavier dans l'admin.
- Performance page publique : LCP < 2,5 s (4G lente simulée), JS < 150 Ko.
- Validation Zod côté serveur ; erreurs métier traduites en français.
- Permissions vérifiées **côté base** (RLS), pas seulement dans l'UI.
- Tests : unitaires pour la logique, e2e pour le parcours touché.
- Textes en français, montants en FCFA (`25 000 000 FCFA`), dates `15 déc. 2026`.
