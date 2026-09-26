# 01 — Décision : quel type de plateforme pour BRYAN MULTISERVICES ?

## Verdict

> **Ni un simple site vitrine, ni une "app" PWA pure : une plateforme web unique, en deux faces.**
>
> 1. **Face publique = site commercial rendu côté serveur (SEO), enrichi en PWA** (rapide, cache hors-ligne, installable en option, favoris locaux).
> 2. **Face administration = véritable PWA métier** (installée sur les téléphones du personnel, notifications push, mode dégradé hors-ligne).
>
> Un seul code (Next.js), une seule base (Supabase), IndexedDB côté navigateur.

Ton penchant pour la PWA est **bon**, mais il faut le placer au bon endroit : la PWA est une *couche technique*, pas un *type de site*. La vraie question est « qui va l'installer et pourquoi ? ».

---

## Pourquoi pas un « site vitrine » simple ?

Le cahier des charges demande bien plus qu'une vitrine :

| Besoin du CDC | Vitrine (WordPress/landing) | Notre plateforme |
|---|---|---|
| Catalogue véhicules filtrable, promos, baisses de prix | Limité | ✅ |
| Demandes avec référence (SALE-2026-00124) | ❌ | ✅ |
| CRM central, pipeline, historique | ❌ | ✅ |
| Anti double-réservation (location, chauffeurs, événements) | ❌ | ✅ (contrainte base de données) |
| Devis événementiel avec lien sécurisé à accepter | ❌ | ✅ |
| Rôles, permissions, audit | ❌ | ✅ |

Une vitrine ne répond qu'aux §12 à §15. Tout le reste (§17 à §75) est une **application de gestion**.

## Pourquoi pas une PWA « application » pure (SPA côté client) ?

1. **Le SEO est un objectif explicite (§54)**. Une SPA rendue uniquement côté client (React + Vite classique) est mal indexée et les aperçus WhatsApp/Facebook (image, titre, prix) ne s'affichent pas quand on partage un lien véhicule. Or **le partage WhatsApp est le cœur du modèle commercial** (§6, §47, §48).
2. **Personne n'installe l'app d'un concessionnaire pour regarder une voiture.** Le visiteur arrive via un lien WhatsApp, Facebook, un QR code ou Google. Il doit voir la fiche en < 2 s, **sans installation**. L'installation doit rester un bonus, jamais une étape.
3. **Contexte Congo** : environ 38 % de la population utilise Internet (≈ 2,46 M d'internautes début 2025, DataReportal), essentiellement sur mobile, avec des connexions parfois lentes et une data chère. Il faut des pages légères, pré-rendues, mises en cache — ce que fait très bien un rendu serveur + service worker.

## Pourquoi la PWA est idéale pour l'administration

Le personnel (commerciaux, responsables location/événementiel, chauffeurs) :
- travaille **sur téléphone**, souvent en déplacement (essais, livraisons, événements) ;
- doit être **alerté immédiatement** d'une nouvelle demande (§69) → notifications push ;
- doit pouvoir consulter ses demandes/planning **même avec un réseau instable** → cache IndexedDB ;
- n'a pas besoin de passer par l'App Store / Play Store (pas de frais, pas de validation, mises à jour instantanées).

Limites iOS à connaître : sur iPhone, les notifications push web ne fonctionnent **que si la PWA est ajoutée à l'écran d'accueil** (iOS 16.4+), et l'installation est manuelle (Partager → Sur l'écran d'accueil). Pour le personnel, c'est acceptable : on l'installe une fois avec eux lors de la formation. En complément, on double les alertes par **e-mail** (et WhatsApp en phase 2).

---

## Architecture retenue en une image

```text
                    https://bryanmultiservices.com  (Next.js, un seul projet)
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                         │
  FACE PUBLIQUE (visiteurs)                            FACE ADMIN  /admin (personnel)
  - Pages pré-rendues (SSG/ISR) → SEO + aperçus         - PWA installable (manifest dédié)
    WhatsApp/Facebook                                   - Connexion Supabase Auth
  - Service worker : cache images/pages                 - Push notifications (nouvelles demandes)
  - IndexedDB : favoris, comparateur, brouillons de     - IndexedDB : cache demandes/planning,
    formulaires, file d'envoi hors-ligne                  file d'actions hors-ligne (notes, statuts)
  - Installable (bonus, jamais imposé)                  - Temps réel (Supabase Realtime)
  - Aucun compte client                                 - Rôles & permissions (RLS Postgres)
        │                                                         │
        └────────────────────────────┬────────────────────────────┘
                                     │
                               SUPABASE
          Postgres (RLS) · Auth · Storage (médias) · Realtime · Edge Functions
```

## Ce que ça change concrètement pour l'équipe de dev

| Décision | Conséquence |
|---|---|
| Next.js (App Router) et non Vite SPA | Pages véhicules/locations/événements rendues serveur, métadonnées Open Graph par fiche |
| ISR + revalidation à la demande | Quand un admin publie/modifie un véhicule, la page publique est régénérée en quelques secondes |
| Service worker (Serwist) | Cache des pages consultées et des images → rechargement quasi instantané, consultation hors-ligne des fiches déjà vues |
| IndexedDB (Dexie.js) | Favoris/comparateur sans compte (§16), brouillons de formulaires, file d'envoi si réseau coupé, cache admin |
| Supabase | Backend complet sans serveur à maintenir, Postgres pour les contraintes anti-conflit |
| Pas d'app native | Phase 3 seulement si un vrai besoin apparaît (§64) |

**Recommandation finale : on vend au client une « Plateforme web progressive » (site commercial + application de gestion), pas une vitrine.** C'est cohérent avec le titre du CDC et justifie la valeur du marché.

---

Sources :
- [DataReportal — Digital 2025: Republic of the Congo](https://datareportal.com/reports/digital-2025-republic-of-the-congo)
- [MagicBell — PWA iOS Limitations and Safari Support (2026)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Brainhub — PWA on iOS, current status & limitations](https://brainhub.eu/library/pwa-on-ios)
