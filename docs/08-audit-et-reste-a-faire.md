# 08 — Audit du développement et reste à faire

Mis à jour après l'**étape 1** (complétion de l'admin et de l'espace client sur données mockées).
Légende : ✅ fait · 🟡 partiel · ⏭ reporté à une étape suivante (motif indiqué).

## Étape 1 — état : terminée ✅

### Espace administrateur
| # | Élément | État |
|---|---|---|
| — | Barre latérale **repliable** (mémorisée par appareil), gros bouton **Se déconnecter** en bas, **menu profil** dans la barre du haut, page **Mon profil** | ✅ |
| — | **Nom et rôle** de l'administrateur en tête du tableau de bord, **boîte de réception** des dernières demandes | ✅ |
| — | **Réception des commandes en direct** : alerte visuelle + son + compteur d'onglet + notification système ; le **super administrateur reçoit toutes les demandes** (correctif : avant, il ne recevait que les demandes non affectées) | ✅ |
| — | Recherche globale (Ctrl K), badges de compteurs dans le menu (demandes nouvelles, RDV à planifier, devis à modifier) | ✅ |
| A1 | Médiathèque (téléversement compressé, étiquettes, texte alternatif, suppression) | ✅ |
| A2 | Catégories de véhicules (création, modification, suppression si inutilisée) | ✅ |
| A3–A4 | Promotions et bannières : création, planification, activation, image | ✅ |
| A5–A6 | Prestations, packages, recommandations (ordre), types d'événements : tout en édition | ✅ |
| A7 | Dossier événement modifiable | ✅ |
| A8 | Réalisations : création, photos, vidéo, publication | ✅ |
| A9 | Paramètres modifiables (entreprise, numéros par pôle, modèles WhatsApp, règles, affectations auto, listes) | ✅ |
| A10 | Utilisateurs (inviter, modifier, désactiver ; protection du dernier super admin) + **matrice de permissions éditable** | ✅ |
| A11 | Agenda Rendez-vous & essais ; un essai planifié **bloque le véhicule**, conflit refusé | ✅ |
| A12 | File d'actions hors-ligne admin | ⏭ Étape 3 — dépend de l'API Supabase réelle (en démo, tout est déjà local donc utilisable hors-ligne) |
| A13 | Titre / description SEO personnalisés utilisés par la page publique | ✅ |
| — | Contacts modifiables, archivage des demandes clôturées, audit des notes / RDV / paramètres / rôles | ✅ |

### Espace client
| # | Élément | État |
|---|---|---|
| B1 | Photos réelles affichées (cartes, galerie avec navigation, réalisations) — illustration seulement s'il n'y a pas de photo | ✅ |
| B2 | Partage des types d'événements et réalisations | ✅ |
| B3 | Reprise : envoi de 6 photos compressées sur le téléphone | ✅ |
| B4 | Promotions location appliquées à l'estimation (règle « week-end ») | ✅ |
| B5 | « Complétez votre location » (cross-selling) | ✅ |
| B6 | Filtres avec/sans chauffeur, courte/longue durée (liens partageables) | ✅ |
| B7 | Bannières sur l'accueil et les pages de pôle | ✅ |
| B8 | Carte OpenStreetMap + lien itinéraire | ✅ |
| B9 | Mesures Lighthouse (mobile, 4G lente simulée) : **SEO 100 · Bonnes pratiques 100 · Accessibilité 100** (96 sur l'accueil avant correction du dernier badge) · **Performance 78–96** · LCP **2,7 à 3,2 s** | 🟡 LCP au-dessus de l'objectif 2,5 s — à retravailler avec les vraies photos (formats AVIF, préchargement de la police) |
| B10 | Contenus réels du client | ⏭ Réponses à `docs/07` |

**Limite du mode démo (normale)** : les données (demandes, photos, promotions…) vivent dans le navigateur. L'admin et le site se synchronisent **dans le même navigateur** (y compris entre onglets). Les paramètres de l'entreprise (numéros, textes) modifiés dans l'admin ne changent pas le site public tant que Supabase n'est pas branché.

**Vérifications** : lint ✅ · types ✅ · build (68 pages) ✅ · **14 parcours Playwright** ✅ (dont : réception en direct d'une demande par le super admin, barre repliable, menu profil, déconnexion, essai qui bloque le véhicule, bannière publiée visible sur l'accueil, invitation puis connexion d'un employé avec ses droits).

## Itération 2 (données mockées) — utilisateurs, design, vérification complète ✅

- **Section « Utilisateurs »** dans le menu (Administration) : liste de l'équipe, filtres, **ajout guidé en 3 étapes** (identité → choix du rôle avec description des droits → invitation par WhatsApp / e-mail), fiche utilisateur (droits effectifs, activité, dernière connexion), modification, désactivation / réactivation, réinitialisation du mot de passe, onglet **Rôles & permissions**. Protections : e-mail unique, dernier super administrateur non désactivable, on ne change pas son propre rôle.
- **Design** : graphiques du tableau de bord (demandes par pôle sur 14 jours avec survol et vue tableau — palette validée daltonisme/contraste ; pipeline), cartes de chiffres avec accent de pôle, indicateur de page active dans le menu, accueil public avec visuel et section « Comment ça marche », réseaux sociaux dans le pied de page.
- **Vérification automatique complète** (`e2e/verification.spec.ts`) : **47 pages publiques** et **21 pages d'admin × 6 rôles** — aucune erreur HTTP ni JavaScript, un titre par page, aucun débordement horizontal, chaque lien du menu autorisé pour le rôle.
- **Défauts trouvés et corrigés par cette vérification** : erreur d'hydratation sur les pages Location (dates par défaut calculées au fuseau du serveur, et figées au jour de la compilation sur les fiches) ; titre principal manquant sur la page devis client ; ordre des titres sur /vehicules.
- **Résultat** : lint ✅ · build 69 pages ✅ · **17 tests Playwright** ✅ · Lighthouse mobile : SEO 100, bonnes pratiques 100, accessibilité 98–100, performance 77–98, LCP 2,2–3,4 s (objectif 2,5 s atteint sur 4 pages sur 8).

## Étapes restantes avant mise en production

### Étape 2 — Mise à niveau du schéma SQL (½ à 1 jour)
| # | Travail |
|---|---|
| C1 | `vehicles` : `color_hex`, `body_type` |
| C2 | `event_types` : `tagline`, `icon` ; `services` : `icon` |
| C3 | `realisations` : `guests` (photos via `realisation_media`) |
| C4 | Paramètres du seed : adresse, horaires, e-mail, villes |
| C5 | RPC : anonymisation contact, révision de devis, confirmation de RDV (avec occupation « essai ») |
| C6 | `requests_notify_new` : **toujours notifier les super administrateurs** (règle alignée sur la démo) |
| C7 | `banners` : `link_label` ; `media_assets` : `name` ; `appointments` → lien vers l'occupation « essai » |

### Étape 3 — Branchement Supabase (1,5 à 2 semaines)
D1 catalogue public · D2 remplacement du backend de démo (≈ 60 fonctions) + Realtime · D3 Server Actions + Turnstile + limitation · D4 Supabase Auth + invitations · D5 Storage · D6 revalidation ISR · D7 Edge Function `notify` (Web Push + e-mail) · D8 pg_cron · A12 file hors-ligne admin.

### Étape 4 — Qualité & déploiement (≈ 3 jours)
D9 CI GitHub Actions + environnements staging/prod · D10 tests RLS (pgTAP) · B9 optimisation LCP avec les vraies photos · recette avec le client.
