# 02 — Analyse du cahier des charges : est-il prêt pour le développement ?

## Réponse courte

**Le CDC est très bon sur la vision commerciale et le périmètre, mais il n'est pas encore "développable" tel quel.**
Il décrit *quoi montrer*, beaucoup moins *comment le système décide*. On a relevé **4 contradictions**, **9 règles métier manquantes** et **plusieurs données à obtenir du client**.

Les décisions techniques ont été prises dans ce dossier (voir `04-regles-metier.md` et `05-modele-de-donnees.md`). Les points qui relèvent **du client** sont listés dans `07-questions-client.md` : il faut les faire valider avant le sprint concerné, pas forcément avant de démarrer.

| Critère | Note | Commentaire |
|---|---|---|
| Vision / positionnement | ✅ Excellent | Ordre Vente → Location → Événementiel clair, principe « pas de compte » fort |
| Parcours utilisateur public | ✅ Bon | Pages et CTA bien listés |
| Règles métier | ⚠️ Incomplet | Disponibilités, statuts, conflits, devis : à préciser |
| Modèle de données | ⚠️ Liste brute | Doublons (leads/requests), manque de relations |
| Périmètre MVP | ⚠️ Trop large | Le MVP inclut CRM + devis + calendrier : lourd, à découper |
| Contenu / données client | ❌ Absent | Stock réel, services réellement proposés, tarifs, numéros, logo… |
| Architecture technique | ❌ Non décidée (§59) | **Décidée dans ce dossier** |

---

## A. Contradictions à corriger dans le CDC

| # | Où | Problème | Décision proposée |
|---|---|---|---|
| A1 | §9 vs §32 | Formats de référence incohérents : `EVENT-2026-00084` (5 chiffres) vs `EVENT-2026-0087` (4) | **Format unique `PREFIXE-AAAA-NNNNN` (5 chiffres)**, compteur remis à zéro chaque année |
| A2 | §25 vs §43/§72 | Statut de location posé **sur le véhicule** (DISPONIBLE, RÉSERVÉ…) alors que la disponibilité dépend **des dates** | La disponibilité est **calculée par période**. Seuls `VENDU`, `RETIRÉ` sont des statuts du véhicule. Voir règle R3 |
| A3 | §37/§57 | `leads`, `requests`, `contacts` : trois notions qui se recouvrent | **`contacts`** (la personne) + **`requests`** (chaque demande = un prospect du CRM). Pas de table `leads` séparée |
| A4 | §42 vs §63 | Rôle « Chauffeur » dans les utilisateurs MVP, mais gestion des chauffeurs en Phase 2 | MVP : chauffeurs = **fiches** gérées par l'admin (pour la détection de conflit). Accès chauffeur à son planning → Phase 2 |

## B. Règles métier manquantes (tranchées dans `04-regles-metier.md`)

1. **Quand une demande bloque-t-elle un véhicule ?** Une simple demande ne doit pas bloquer (sinon un concurrent peut bloquer le parc). → notion d'**option** (« hold ») posée par le personnel, avec expiration.
2. **Un véhicule dans plusieurs flottes (§44)** : un même véhicule peut-il être à vendre ET en location ? → oui, via des indicateurs (`à vendre`, `en location`, `pour événements`) ; une réservation bloque l'ensemble ; une vente le retire de tout.
3. **Sécurité du suivi sans compte (§10)** : `/suivi/REQ-2026-00482` est **devinable** (on peut incrémenter le numéro et voir les données d'autres clients). → le lien utilise un **jeton aléatoire** ; la référence reste affichée mais ne suffit pas.
4. **Devis (§33)** : TVA ? devise ? validité ? versions ? → devise **XAF (FCFA)**, taux de taxe paramétrable, date de validité, **versions figées** une fois envoyées.
5. **Prix « sur demande »** : §3 dit « prix lorsqu'ils sont communiqués » → champ `prix affiché : oui/non`.
6. **Doublons de contacts** : le même client écrit 3 fois → dédoublonnage par **numéro de téléphone normalisé (+242…)**.
7. **Anti-spam sur formulaires sans compte** : non mentionné → captcha invisible (Cloudflare Turnstile) + limitation par IP.
8. **Traçabilité WhatsApp** : en MVP, un lien `wa.me` ne permet **pas** de récupérer la conversation. On enregistre le **clic** (analytics) et on peut créer une demande « WhatsApp » manuellement. Les tables `conversations/messages` (§57) n'ont de sens qu'avec l'API WhatsApp Business (Phase 2).
9. **Cross-selling (§36)** : aucune règle. → règles simples configurables : chaque type d'événement propose une liste de services/packages recommandés.

## C. Périmètre MVP : recommandation de découpage

Le §62 met dans le MVP : CRM, devis, calendrier, promotions, galerie… C'est faisable, mais il faut **livrer en 3 lots** pour montrer vite de la valeur au client :

| Lot | Contenu | Valeur client |
|---|---|---|
| **MVP-1 « Vendre »** (≈ 4–5 sem.) | Design system, site public Automobile complet, WhatsApp/Appel, demande d'intérêt + RDV/essai, admin véhicules, CRM demandes (liste, statuts, historique, affectation), notifications, PWA | Le site génère déjà des prospects |
| **MVP-2 « Louer »** (≈ 3 sem.) | Catalogue location, recherche par dates, demande de location, options/réservations avec anti-conflit, calendrier flotte, tarifs | Réservations fiables |
| **MVP-3 « Organiser »** (≈ 3–4 sem.) | Pages événementiel, assistant « Créer mon événement », dossiers événement, devis + lien sécurisé (accepter / demander modification), réalisations, dashboard complet | Devis en ligne |

Déplacés en **Phase 2** (en plus de la liste du CDC) : reprise/échange de véhicule (§19) si le client ne le juge pas prioritaire, suivi de demande public (§10), accès chauffeur.

## D. Éléments à obtenir du client (bloquants pour le contenu, pas pour le code)

Voir `07-questions-client.md` — notamment : logo/charte, numéros WhatsApp/appel (un seul ou un par pôle ?), villes couvertes, stock réel avec photos, services événementiels réellement proposés, grille tarifaire location, conditions de location (caution, permis, âge…), taxes applicables sur les devis, noms/rôles des employés.

## E. Conformité légale (absente du CDC)

La République du Congo dispose d'une loi sur les données personnelles : **Loi n° 29-2019 du 10 octobre 2019**. Le CRM stocke noms, téléphones, e-mails → prévoir :
- case de consentement / mention d'information sur chaque formulaire ;
- page « Politique de confidentialité » et « Mentions légales » ;
- durée de conservation des prospects (proposition : 3 ans sans activité, puis anonymisation) ;
- export/suppression des données d'un contact sur demande (fonction admin) ;
- procédure en cas de fuite (notification à l'autorité dans les 72 h).

À faire valider par le conseil juridique du client.

Source : [Loi n° 29-2019 — Ministère de l'Économie (Congo)](https://www.economie.gouv.cg/fr/content/loi-n%C2%B029-2019-du-10-octobre-2019-portant-protection-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel)
