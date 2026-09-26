# 04 — Règles métier (référence pour les développeurs)

Chaque règle porte un identifiant (R1, R2…) à citer dans les tickets et les tests.

---

## R1 — Références uniques

- Format : **`PREFIXE-AAAA-NNNNN`** (5 chiffres, remis à zéro au 1ᵉʳ janvier). Ex. `SALE-2026-00124`.
- Générées **en base** (fonction `next_reference()`), jamais côté client → pas de doublon même en cas d'envois simultanés.

| Préfixe | Utilisé pour |
|---|---|
| `SALE` | Demande d'achat / intérêt véhicule |
| `RENT` | Demande de location / transport avec chauffeur |
| `EVENT` | Demande / dossier événementiel |
| `QUOTE` | Devis (tous pôles) |
| `REQ` | Essai, rendez-vous, reprise, rappel, contact général |

## R2 — Contacts sans compte

- Un **contact** = une personne, identifiée par son **téléphone normalisé E.164** (`+242XXXXXXXXX`). Saisie acceptée : `06 123 45 67`, `242061234567`, `+242 06…` → normalisée.
- Nouvelle demande avec un téléphone connu → rattachée au contact existant (nom/e-mail mis à jour s'ils étaient vides).
- Le numéro WhatsApp est facultatif ; case « même numéro que le téléphone » cochée par défaut.
- Consentement (loi 29-2019) enregistré avec date sur chaque demande.

## R3 — Disponibilité des véhicules (cœur anti-conflit)

Un véhicule a **un seul enregistrement** et des indicateurs d'usage : `à vendre`, `en location`, `pour événements` (cumulables, §44).

**Statut commercial (vente)** — posé sur le véhicule : `brouillon → disponible → réservé (acompte) → vendu`, ou `retiré`.

**Occupation** — calculée par **période**, via la table `vehicle_bookings` :

| Type d'occupation | Exemple |
|---|---|
| `rental` | Location du 15 au 18 déc. |
| `event` | Voiture des mariés le 20 déc. 10h–22h |
| `test_drive` | Essai le 12 déc. 15h–16h |
| `maintenance` | Garage du 2 au 5 déc. |

Statut d'une occupation : `option` (hold) → `confirmée` → `en cours` → `terminée`, ou `annulée`.

Règles :
1. **Une option, confirmée ou en cours bloque la période.** Deux occupations bloquantes qui se chevauchent sur le même véhicule sont **refusées par la base** (contrainte d'exclusion Postgres). Impossible de contourner, même avec deux employés qui cliquent en même temps.
2. **Une demande client ne bloque rien.** C'est le personnel qui pose une *option* (après contact) ou confirme.
3. Une option expire (par défaut **24 h**, paramétrable) → libérée automatiquement.
4. Un véhicule `vendu` ou `retiré` n'est plus proposé nulle part ; on ne peut plus lui créer d'occupation.
5. Un véhicule `réservé` (vente) n'est plus proposé en location/événement.
6. Délai tampon entre deux locations (nettoyage, retour) : paramètre `rental_buffer_hours` (défaut 2 h) ajouté à la fin de chaque location.

**Affichage public** du statut de location (§25) calculé pour la période recherchée :
`DISPONIBLE` (rien) · `SUR DEMANDE` (option en cours — on n'affiche pas « demande en cours » pour ne pas décourager) · `INDISPONIBLE` (confirmée/en cours/maintenance). Sans dates saisies : « Disponible » si aucune occupation dans les 7 prochains jours.

## R4 — Chauffeurs

- Fiche chauffeur : nom, téléphone, statut (`disponible`, `inactif`, `en congé`), permis.
- Affectation = `driver_assignments` avec période → **même contrainte anti-chevauchement** qu'un véhicule.
- `AFFECTÉ` n'est pas un statut stocké : il est déduit des affectations en cours.
- Un chauffeur `en congé`/`inactif` ne peut pas être affecté.

## R5 — Location : tarif indicatif

- Tarifs par véhicule : **jour** (obligatoire), **semaine**, **mois** (facultatifs), supplément **chauffeur/jour**, caution.
- Durée = nombre de jours entamés (24 h).
- Calcul : mois entiers × tarif mois + semaines restantes × tarif semaine + jours restants × tarif jour (chaque palier absent retombe sur le palier inférieur). Promotions location (§45) appliquées ensuite.
- Le montant affiché au client est **« estimation indicative »** ; le prix final est confirmé par le conseiller.

## R6 — Pipeline CRM (toutes demandes)

```text
nouvelle → à contacter → contactée → en discussion → offre/devis envoyé → en attente client → confirmée → réalisée
                                           (à tout moment) → annulée | perdue (motif obligatoire)
```

- Chaque changement de statut, d'affectation, ou ajout de note est **historisé automatiquement** (qui, quand, avant/après) → §70.
- Affectation automatique à la création : au responsable du pôle (paramètre) ; sinon file « non affectées ».
- **Notification d'une nouvelle demande** : le responsable affecté + **toujours les super administrateurs** + (si non affectée) tous les employés ayant `notifications.new_requests`. Alerte en direct dans l'admin (son, bannière, compteur dans l'onglet), notification système si autorisée, puis Web Push / e-mail en production.
- Alerte si une demande reste `nouvelle` plus de **30 min** en heures ouvrées (paramétrable) → notification au responsable.
- Motifs de perte (liste paramétrable) : prix, déjà acheté ailleurs, injoignable, indisponible, autre.

## R7 — Devis

- Un devis appartient à une demande (souvent `EVENT`, mais aussi `RENT` ou `SALE`).
- Lignes : prestation (ou saisie libre), quantité, prix unitaire, remise ligne.
- Totaux : sous-total − remise globale + frais = **HT** ; + taxe (taux paramétrable, 0 % possible) = **TTC**. Devise **XAF**, arrondi à l'unité.
- Statuts : `brouillon → envoyé → accepté | modification demandée | refusé | expiré`.
- **À l'envoi, la version est figée** (copie JSON des lignes et totaux dans `quote_versions`). Toute modification crée la version n+1 ; le lien client affiche toujours la dernière version envoyée.
- Lien client : `/devis/{jeton}`. Le client peut **Accepter** (nom + case « j'accepte »), **Demander une modification** (message), **Contacter** (WhatsApp/appel). Acceptation → demande passe à `confirmée`, notification au responsable.
- Date de validité (défaut 15 jours) → passage automatique à `expiré`.

## R8 — Créer mon événement (assistant)

- 8 étapes du §31 ; progression **sauvegardée dans IndexedDB** à chaque étape.
- Étape 5 « Services » : seulement les services **actifs** (§30) ; suggestions de cross-selling selon le type d'événement (R9).
- À l'envoi : création d'une demande `EVENT` + d'un dossier événement + des services souhaités.
- Écran final : référence + bouton WhatsApp pré-rempli avec le résumé.

## R9 — Cross-selling

- Paramétrage admin : pour chaque **type d'événement**, liste de services/packages recommandés (ordre).
- Fiche location « avec chauffeur » → suggestion « transfert aéroport », etc. (liens configurables).
- Pas d'IA en MVP.

## R10 — Liens WhatsApp / Appel

- Numéros dans `business_settings` (un par pôle possible, repli sur le numéro général).
- Lien : `https://wa.me/<numéro sans +>?text=<message encodé>`.
- Modèles de messages paramétrables avec variables : `{vehicule}`, `{reference}`, `{date_debut}`, `{date_fin}`, `{type_evenement}`, `{url}`.
- Chaque clic WhatsApp/Appel est enregistré (`analytics_events`) avec la page et l'objet concerné.

## R11 — Publication & visibilité

- Seuls les contenus `publié` sont visibles publiquement ; brouillons uniquement en admin (aperçu).
- Slug unique généré depuis marque-modèle-année (`toyota-rav4-2022`) ; en cas de doublon : suffixe référence.
- Un véhicule vendu reste accessible 30 jours avec bandeau « Vendu » + suggestions similaires (bon pour le SEO), puis page 410/redirection vers la catégorie.
- Baisse de prix : tout changement de prix est historisé ; le badge « Baisse de prix » s'affiche si le prix a baissé dans les 30 derniers jours ; « ancien prix » = prix précédent.

## R12 — Rôles & permissions (§42)

Permissions **par code** (ex. `vehicles.write`, `quotes.approve`), rattachées à des rôles modifiables par l'administrateur.

| Rôle | Principales permissions |
|---|---|
| Administrateur | Toutes |
| Responsable automobile | véhicules, demandes SALE/REQ, RDV, promotions auto |
| Responsable location | flotte, tarifs, réservations, chauffeurs, demandes RENT |
| Responsable événementiel | services, packages, dossiers, devis, réalisations, demandes EVENT |
| Commercial | CRM (lecture toutes, écriture sur ses demandes), RDV |
| Comptable | lecture devis/ventes/CA, exports ; aucune modification |
| Chauffeur (Phase 2) | lecture de ses affectations uniquement |

Appliquées **en base** (RLS), pas seulement en masquant des boutons.

## R13 — Audit (§71)

Journalisés automatiquement (trigger) : création/modification/suppression sur véhicules, prix, occupations, devis, demandes, utilisateurs, paramètres. Contenu : utilisateur, date, table, id, avant, après. Lecture réservée à l'administrateur. Aucune suppression physique des demandes : **archivage**.
