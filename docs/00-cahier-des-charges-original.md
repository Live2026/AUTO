# CAHIER DES CHARGES
## Plateforme Web Progressive (PWA) — BRYAN MULTISERVICES

**Version : 1.0**  
**Projet : Plateforme digitale commerciale et de gestion**  
**Entreprise : BRYAN MULTISERVICES**  
**Activités : Automobile • Location • Événementiel**

---

# 1. PRÉSENTATION DU PROJET

## 1.1 Nom du projet

**BRYAN MULTISERVICES**

La plateforme digitale de BRYAN MULTISERVICES doit devenir le point central de présentation, de commercialisation et de gestion des trois principales activités de l'entreprise :

1. **Vente de véhicules — activité principale**
2. **Location de véhicules — activité secondaire**
3. **Événementiel et prestations événementielles — troisième grand pôle**

La plateforme ne doit donc pas être conçue comme un simple site de location de voitures.

Elle doit être conçue comme une **plateforme commerciale multiservices**, permettant au visiteur de découvrir les offres, choisir une prestation, envoyer une demande et entrer rapidement en contact avec BRYAN MULTISERVICES.

---

# 2. POSITIONNEMENT

## 2.1 Positionnement principal

**BRYAN MULTISERVICES**

### Automobile
**Vente de véhicules**

### Location
**Location de véhicules avec ou sans chauffeur**

### Événementiel
**Organisation et prestations pour événements**

L'ordre de présentation doit respecter l'importance commerciale de l'entreprise :

> **Vente automobile → Location → Événementiel**

La plateforme ne doit jamais donner l'impression que BRYAN MULTISERVICES est uniquement une agence de location.

---

# 3. OBJECTIFS DU PROJET

## 3.1 Objectif commercial

Transformer la plateforme en véritable outil de génération de prospects et de ventes.

Le visiteur doit pouvoir :

- découvrir les véhicules disponibles ;
- consulter leurs caractéristiques ;
- connaître les prix lorsqu'ils sont communiqués ;
- demander des informations ;
- demander un rendez-vous ;
- demander un essai ;
- contacter directement l'entreprise ;
- demander une location ;
- organiser une prestation événementielle ;
- demander un devis ;
- partager une offre ;
- contacter BRYAN MULTISERVICES via WhatsApp ou téléphone.

---

# 4. PRINCIPE FONDAMENTAL : PAS DE COMPTE CLIENT

## 4.1 Aucun compte obligatoire

Le client final ne doit **pas avoir besoin de créer un compte**.

Il n'y aura donc pas de :

- inscription client obligatoire ;
- mot de passe client ;
- espace client classique ;
- profil client obligatoire ;
- procédure d'inscription avant une demande.

Le principe est :

> **Le client ne vient pas créer un compte. Il vient trouver une solution.**

---

# 5. PARCOURS CLIENT

Le parcours général doit être extrêmement simple :

```text
VISITEUR
   ↓
DÉCOUVERTE
   ↓
CHOIX
   ↓
DEMANDE
   ↓
WHATSAPP / APPEL / FORMULAIRE
   ↓
CONSEILLER BRYAN MULTISERVICES
   ↓
DEVIS / RENDEZ-VOUS / CONFIRMATION
   ↓
TRANSACTION
```

L'objectif est que le client puisse entrer en contact avec l'entreprise en quelques secondes.

---

# 6. CANAUX DE CONTACT

La plateforme doit intégrer plusieurs moyens de contact.

## 6.1 WhatsApp

WhatsApp doit être l'un des principaux canaux commerciaux.

Chaque offre importante peut disposer d'un bouton :

**« Contacter sur WhatsApp »**

Le message WhatsApp doit être prérempli.

Exemple :

> Bonjour BRYAN MULTISERVICES, je suis intéressé par le véhicule Toyota RAV4 2022, référence BM-V-1024. Je souhaiterais avoir plus d'informations.

Pour une location :

> Bonjour BRYAN MULTISERVICES, je souhaite louer le véhicule Toyota Prado pour la période du 15 au 18 décembre.

Pour un événement :

> Bonjour BRYAN MULTISERVICES, je souhaite organiser un mariage et je voudrais obtenir un devis.

---

# 7. TÉLÉPHONE

La plateforme doit intégrer un bouton :

**« Appeler »**

Sur mobile, le bouton doit utiliser directement la fonction téléphonique du téléphone.

Exemple :

```text
tel:+242XXXXXXXXX
```

Le numéro doit être configurable depuis l'administration.

---

# 8. FORMULAIRES RAPIDES

Les formulaires doivent rester courts.

Ils peuvent demander :

- nom ;
- prénom ;
- numéro de téléphone ;
- numéro WhatsApp ;
- adresse e-mail facultative ;
- message ;
- informations relatives à la demande.

Le client ne doit jamais être obligé de remplir un formulaire long lorsqu'un simple contact WhatsApp suffit.

---

# 9. NUMÉRO DE DEMANDE

Chaque demande peut recevoir automatiquement une référence unique.

Exemples :

```text
SALE-2026-00124
RENT-2026-00321
EVENT-2026-00084
QUOTE-2026-00031
REQ-2026-00482
```

Cette référence permet au personnel de retrouver rapidement la demande.

---

# 10. SUIVI SANS COMPTE

Une fonctionnalité optionnelle pourra permettre au client de suivre une demande sans créer de compte.

Exemple :

```text
https://domaine.com/suivi/REQ-2026-00482
```

ou avec un code privé.

Le client peut ainsi consulter :

- référence ;
- statut ;
- date de demande ;
- objet ;
- informations principales ;
- éventuel devis ;
- prochaine étape.

Un système OTP par SMS ou WhatsApp pourra être ajouté ultérieurement pour sécuriser l'accès.

---

# 11. STRUCTURE GÉNÉRALE DU SITE

## Navigation principale

```text
ACCUEIL

VÉHICULES
 ├── Tous les véhicules
 ├── Nouveautés
 ├── Promotions
 ├── Baisses de prix
 └── Catégories

LOCATION
 ├── Nos véhicules
 ├── Avec chauffeur
 ├── Sans chauffeur
 ├── Courte durée
 └── Longue durée

ÉVÉNEMENTIEL
 ├── Mariage
 ├── Anniversaire
 ├── Cérémonie
 ├── Entreprise
 ├── Concert
 ├── Transport
 ├── Nos prestations
 └── Demander un devis

RÉALISATIONS

À PROPOS

CONTACT
```

Les boutons permanents peuvent être :

**WhatsApp** | **Appeler**

---

# 12. PAGE D'ACCUEIL

La page d'accueil doit immédiatement présenter l'identité de BRYAN MULTISERVICES.

## Hero

### BRYAN MULTISERVICES

**Automobile • Location • Événementiel**

Message commercial :

> Trouvez votre véhicule, louez selon vos besoins ou construisez votre événement avec nos solutions sur mesure.

Trois actions principales :

### Acheter un véhicule

### Louer un véhicule

### Organiser un événement

---

# 13. SECTION AUTOMOBILE

Cette section doit être la première grande section commerciale.

Elle présente :

- véhicules disponibles ;
- nouveautés ;
- promotions ;
- véhicules premium ;
- véhicules d'occasion ;
- véhicules récents ;
- baisses de prix.

CTA :

**Voir tous les véhicules**

---

# 14. CATALOGUE DES VÉHICULES

## Catégories

Selon le stock réel :

- SUV ;
- berlines ;
- 4x4 ;
- pickups ;
- véhicules utilitaires ;
- véhicules premium ;
- véhicules familiaux ;
- autres catégories.

---

# 15. FICHE VÉHICULE

Chaque véhicule doit avoir une page dédiée.

Informations :

- galerie photos ;
- vidéo éventuelle ;
- marque ;
- modèle ;
- année ;
- kilométrage ;
- carburant ;
- boîte de vitesse ;
- transmission ;
- couleur ;
- nombre de places ;
- équipements ;
- état ;
- prix ;
- ancien prix ;
- réduction éventuelle ;
- référence ;
- disponibilité.

---

# 16. ACTIONS SUR UN VÉHICULE

La fiche doit proposer :

**Je suis intéressé**

**Contacter sur WhatsApp**

**Appeler**

**Prendre rendez-vous**

**Demander un essai**

**Partager**

Éventuellement :

**Ajouter aux favoris**

Les favoris peuvent être enregistrés localement sur le téléphone sans nécessiter de compte.

---

# 17. DEMANDE D'ACHAT

Le bouton :

**Je suis intéressé**

ouvre un formulaire simple.

Informations :

- nom ;
- téléphone ;
- WhatsApp ;
- e-mail facultatif ;
- véhicule ;
- message facultatif.

Après envoi :

```text
Demande enregistrée
Référence : SALE-2026-00124
```

Le commercial reçoit immédiatement la demande dans l'administration.

---

# 18. ESSAI / RENDEZ-VOUS

Le client peut demander :

- une visite ;
- un essai ;
- une inspection ;
- un rendez-vous avec un commercial.

Le personnel peut ensuite confirmer manuellement le rendez-vous.

---

# 19. REPRISE / ÉCHANGE DE VÉHICULE

Une fonctionnalité pourra permettre au visiteur de proposer son propre véhicule.

Formulaire :

- marque ;
- modèle ;
- année ;
- kilométrage ;
- état ;
- photos ;
- téléphone ;
- WhatsApp ;
- message.

Objet :

**Je souhaite vendre ou échanger mon véhicule.**

---

# 20. LOCATION DE VÉHICULES

La location constitue le deuxième grand pôle.

Elle doit être clairement séparée de la vente automobile.

---

# 21. CATALOGUE LOCATION

Catégories possibles :

- économique ;
- berline ;
- SUV ;
- 4x4 ;
- premium ;
- minibus ;
- véhicule avec chauffeur ;
- véhicule sans chauffeur ;
- courte durée ;
- longue durée.

---

# 22. RECHERCHE DE LOCATION

Le client peut rechercher selon :

- date de début ;
- date de fin ;
- ville ;
- catégorie ;
- type de véhicule ;
- avec chauffeur ;
- sans chauffeur.

---

# 23. FICHE LOCATION

Chaque véhicule disponible à la location présente :

- photos ;
- modèle ;
- catégorie ;
- nombre de places ;
- boîte ;
- carburant ;
- climatisation ;
- tarif journalier ;
- tarif hebdomadaire ;
- tarif mensuel si applicable ;
- conditions ;
- disponibilité.

CTA :

**Demander cette location**

**WhatsApp**

**Appeler**

---

# 24. DEMANDE DE LOCATION

Informations :

- nom ;
- téléphone ;
- WhatsApp ;
- véhicule ;
- date de départ ;
- date de retour ;
- lieu ;
- avec/sans chauffeur ;
- commentaire.

La demande est enregistrée dans le CRM.

---

# 25. STATUTS DE LOCATION

Un véhicule peut avoir les statuts :

```text
DISPONIBLE
DEMANDE EN COURS
RÉSERVÉ
INDISPONIBLE
EN MAINTENANCE
```

Le système doit empêcher les doubles réservations.

---

# 26. CHAUFFEURS

L'administration pourra gérer les chauffeurs.

Informations :

- nom ;
- téléphone ;
- statut ;
- disponibilité ;
- véhicule affecté ;
- planning.

Statuts :

```text
DISPONIBLE
AFFECTÉ
INDISPONIBLE
EN CONGÉ
```

---

# 27. SERVICES DE TRANSPORT

La location peut également proposer :

- transfert aéroport ;
- transfert hôtel ;
- transport d'invités ;
- transport professionnel ;
- transport pour cérémonies ;
- transport ville à ville ;
- chauffeur privé.

---

# 28. ÉVÉNEMENTIEL

L'événementiel constitue un troisième grand pôle commercial.

Il doit avoir sa propre identité visuelle et ses propres pages.

---

# 29. TYPES D'ÉVÉNEMENTS

Selon les prestations réellement proposées par BRYAN MULTISERVICES :

- mariage ;
- anniversaire ;
- cérémonie ;
- baptême ;
- événement d'entreprise ;
- séminaire ;
- concert ;
- réception ;
- fête privée ;
- événement officiel ;
- shooting ;
- tournage ;
- autres événements.

---

# 30. PRESTATIONS ÉVÉNEMENTIELLES

Selon l'offre réelle de l'entreprise :

- véhicules ;
- voitures de mariage ;
- chauffeurs ;
- transport d'invités ;
- navettes ;
- décoration ;
- mobilier ;
- tables ;
- chaises ;
- tentes ;
- sonorisation ;
- éclairage ;
- photographie ;
- vidéo ;
- animation ;
- hôtesses ;
- sécurité ;
- coordination ;
- autres prestations.

Les services non proposés par l'entreprise doivent pouvoir être désactivés depuis l'administration.

---

# 31. FONCTIONNALITÉ « CRÉER MON ÉVÉNEMENT »

Une fonctionnalité majeure sera :

# Créer mon événement

Le client suit un assistant.

### Étape 1
Type d'événement.

### Étape 2
Date.

### Étape 3
Ville / lieu.

### Étape 4
Nombre d'invités.

### Étape 5
Services recherchés.

### Étape 6
Budget indicatif facultatif.

### Étape 7
Coordonnées.

### Étape 8
Résumé.

Exemple :

```text
MARIAGE
150 invités
Pointe-Noire
15 décembre

✓ Véhicules
✓ Chauffeurs
✓ Transport des invités
✓ Décoration
```

Puis :

**Demander mon devis**

---

# 32. DOSSIER ÉVÉNEMENT

Chaque événement reçoit un numéro :

```text
EVENT-2026-0087
```

Le dossier contient :

- client ;
- téléphone ;
- événement ;
- date ;
- lieu ;
- invités ;
- prestations ;
- budget ;
- notes ;
- devis ;
- responsable ;
- statut.

---

# 33. DEVIS ÉVÉNEMENTIEL

Le personnel peut construire un devis.

Exemple :

| Prestation | Quantité | Prix |
|---|---:|---:|
| Véhicule mariage | 1 | ... |
| Chauffeur | 1 | ... |
| Transport invités | 3 | ... |
| Décoration | 1 | ... |
| Sonorisation | 1 | ... |

Le système calcule :

- sous-total ;
- réductions ;
- frais éventuels ;
- total.

---

# 34. DEVIS SANS COMPTE CLIENT

Le client reçoit un lien sécurisé vers son devis.

Il peut :

**Consulter**

**Accepter**

**Demander une modification**

**Contacter un conseiller**

Aucun compte n'est nécessaire.

---

# 35. RÉALISATIONS

Une section :

# Nos réalisations

présente les événements réellement réalisés.

Chaque réalisation peut contenir :

- photos ;
- vidéos ;
- type d'événement ;
- lieu ;
- description ;
- prestations utilisées.

CTA :

**Organiser un événement similaire**

---

# 36. CROSS-SELLING

La plateforme doit exploiter intelligemment les liens entre les activités.

Exemple :

Un client prépare un mariage.

Le système peut lui proposer :

```text
Voiture des mariés
+
Chauffeur
+
Véhicules pour la famille
+
Transport des invités
+
Décoration
```

L'objectif est de permettre au client de construire une solution complète.

---

# 37. CRM CENTRAL

Les trois activités doivent alimenter un seul CRM.

Types de prospects :

```text
VENTE
LOCATION
ÉVÉNEMENT
ESSAI
RENDEZ-VOUS
DEVIS
RAPPEL
AUTRE
```

---

# 38. PIPELINE COMMERCIAL

Le pipeline peut être :

```text
NOUVELLE DEMANDE
       ↓
À CONTACTER
       ↓
CONTACTÉ
       ↓
EN DISCUSSION
       ↓
DEVIS / OFFRE
       ↓
EN ATTENTE CLIENT
       ↓
CONFIRMÉ
       ↓
RÉALISÉ
```

Autres statuts :

```text
ANNULÉ
PERDU
```

---

# 39. FICHE DEMANDE

Chaque demande possède :

- numéro ;
- type ;
- client/contact ;
- téléphone ;
- WhatsApp ;
- date ;
- objet ;
- produit/service concerné ;
- statut ;
- commercial responsable ;
- notes ;
- historique.

---

# 40. TABLEAU DE BORD ADMINISTRATEUR

Le dashboard doit donner une vision globale de l'entreprise.

Indicateurs :

### Automobile

- véhicules en stock ;
- demandes d'achat ;
- rendez-vous ;
- ventes ;
- chiffre d'affaires.

### Location

- véhicules disponibles ;
- locations en cours ;
- réservations ;
- chiffre d'affaires.

### Événementiel

- nouvelles demandes ;
- devis en attente ;
- événements confirmés ;
- événements à venir ;
- chiffre d'affaires.

### CRM

- nouveaux prospects ;
- demandes à traiter ;
- prospects en attente ;
- conversions.

---

# 41. ADMINISTRATION

Structure :

```text
BRYAN MULTISERVICES
│
├── Dashboard
│
├── VENTE AUTOMOBILE
│   ├── Véhicules
│   ├── Stock
│   ├── Catégories
│   ├── Promotions
│   ├── Baisses de prix
│   ├── Demandes
│   └── Rendez-vous
│
├── LOCATION
│   ├── Flotte
│   ├── Tarifs
│   ├── Disponibilités
│   ├── Réservations
│   └── Calendrier
│
├── ÉVÉNEMENTIEL
│   ├── Services
│   ├── Packages
│   ├── Événements
│   ├── Demandes
│   ├── Devis
│   └── Réalisations
│
├── CRM
│   ├── Prospects
│   ├── Contacts
│   ├── Demandes
│   └── Conversations
│
├── CALENDRIER
│
├── MARKETING
│   ├── Promotions
│   ├── Bannières
│   └── Campagnes
│
├── MÉDIATHÈQUE
│
├── ANALYTICS
│
└── PARAMÈTRES
```

---

# 42. UTILISATEURS INTERNES

Seuls les utilisateurs internes ont besoin d'un compte.

Rôles possibles :

### Administrateur
Accès global.

### Responsable automobile
Gestion des véhicules et ventes.

### Responsable location
Gestion de la flotte et réservations.

### Responsable événementiel
Gestion des événements et devis.

### Commercial
Gestion des prospects et demandes.

### Comptable
Accès aux informations financières nécessaires.

### Chauffeur
Accès à son planning et à ses affectations.

Les permissions doivent être configurables.

---

# 43. CALENDRIER CENTRAL

Le système doit disposer d'un calendrier central.

Il regroupe :

- locations ;
- rendez-vous ;
- essais ;
- événements ;
- chauffeurs ;
- véhicules ;
- prestations.

Le système doit détecter les conflits.

Exemple :

Un même véhicule ne doit pas pouvoir être affecté à deux locations simultanées.

Un même chauffeur ne doit pas être affecté à deux événements incompatibles.

---

# 44. GESTION DES VÉHICULES

Un véhicule peut appartenir à plusieurs contextes opérationnels selon le modèle économique de l'entreprise :

```text
STOCK VENTE
FLOTTE LOCATION
FLOTTE ÉVÉNEMENTIELLE
```

Le système doit éviter toute double affectation.

---

# 45. PROMOTIONS

Les promotions peuvent concerner :

### Automobile
- remise ;
- ancien prix / nouveau prix ;
- promotion ;
- baisse de prix.

### Location
- tarif spécial ;
- réduction longue durée ;
- offre week-end.

### Événementiel
- package ;
- offre saisonnière ;
- réduction ;
- prestation combinée.

---

# 46. MARKETING

L'administration peut gérer :

- bannières ;
- promotions ;
- campagnes ;
- annonces ;
- pages commerciales ;
- réalisations ;
- contenus sociaux ;
- QR codes.

---

# 47. PARTAGE SOCIAL

Chaque véhicule, événement ou réalisation doit pouvoir être partagé.

Canaux possibles :

- WhatsApp ;
- Facebook ;
- Instagram ;
- copie du lien ;
- autres réseaux selon les besoins.

---

# 48. QR CODES

Chaque véhicule peut disposer d'un QR code.

Exemple :

```text
QR
 ↓
Fiche Toyota Prado
 ↓
Photos + prix + caractéristiques
 ↓
WhatsApp
```

Les QR codes peuvent également être utilisés pour :

- événements ;
- promotions ;
- catalogues ;
- campagnes marketing.

---

# 49. MÉDIATHÈQUE

L'administration doit disposer d'une bibliothèque centralisée :

- photos ;
- vidéos ;
- documents ;
- images de véhicules ;
- images d'événements ;
- logos ;
- bannières.

Les images doivent être optimisées pour le web.

---

# 50. ANALYTICS

Le système doit mesurer :

- visiteurs ;
- pages vues ;
- véhicules consultés ;
- recherches ;
- clics WhatsApp ;
- appels ;
- formulaires ;
- demandes ;
- rendez-vous ;
- réservations ;
- devis ;
- ventes ;
- événements.

---

# 51. ENTONNOIR COMMERCIAL

Exemple :

```text
1 000 visiteurs
       ↓
350 fiches véhicules consultées
       ↓
80 demandes
       ↓
30 rendez-vous
       ↓
12 ventes
```

Un système similaire doit exister pour :

- location ;
- événementiel.

---

# 52. PWA

La plateforme doit être une **Progressive Web App**.

Elle doit fonctionner sur :

- Android ;
- iPhone ;
- tablette ;
- ordinateur portable ;
- ordinateur de bureau.

Elle doit pouvoir être installée sur l'écran d'accueil.

---

# 53. MOBILE FIRST

La majorité des interactions commerciales doivent être parfaitement adaptées au téléphone.

L'interface doit être :

- rapide ;
- tactile ;
- responsive ;
- lisible ;
- légère ;
- optimisée pour les connexions mobiles.

---

# 54. SEO

Les pages publiques doivent être optimisées pour les moteurs de recherche.

Exemples :

```text
/vehicules
/vehicules/toyota-rav4-2022
/vehicules/toyota-prado
/location
/location/toyota-prado
/evenementiel
/evenementiel/mariage
/evenementiel/entreprise
/realisations
/contact
```

Chaque page doit pouvoir disposer de :

- titre SEO ;
- description ;
- image sociale ;
- URL propre ;
- données structurées lorsque pertinent.

---

# 55. PERFORMANCE

La plateforme doit être conçue pour fonctionner correctement avec des connexions mobiles parfois lentes.

Objectifs :

- chargement rapide ;
- images optimisées ;
- lazy loading ;
- cache ;
- compression ;
- CDN ;
- code optimisé ;
- limitation des scripts inutiles.

---

# 56. SÉCURITÉ

La plateforme doit intégrer :

- HTTPS ;
- authentification sécurisée des employés ;
- gestion des rôles ;
- permissions ;
- validation des formulaires ;
- protection contre les injections ;
- protection XSS/CSRF selon l'architecture ;
- limitation des requêtes abusives ;
- journalisation ;
- sauvegardes ;
- audit des actions importantes.

---

# 57. BASE DE DONNÉES

Les principales entités prévues sont :

```text
users
roles
permissions

vehicles
vehicle_images
vehicle_features
vehicle_categories
vehicle_price_history
vehicle_availability

rental_rates
rental_reservations

services
service_categories
packages

events
event_services
event_status_history

contacts
leads
requests
appointments

quotes
quote_items
quote_versions

drivers
driver_assignments

promotions
gallery_items
media_assets

conversations
messages
notifications

analytics_events

business_settings
audit_logs
```

---

# 58. CONTACTS SANS COMPTE

Même si les clients ne possèdent pas de compte, leurs coordonnées peuvent être conservées dans le CRM lorsque cela est nécessaire.

Exemple :

```text
Contact
 ├── Nom
 ├── Téléphone
 ├── WhatsApp
 ├── Email
 └── Historique des demandes
```

Cela permet au personnel de retrouver les échanges commerciaux sans créer de compte client.

---

# 59. ARCHITECTURE TECHNIQUE

L'architecture devra être déterminée avant le développement définitif.

Une architecture moderne possible :

```text
PWA
 │
 ▼
Frontend Web
 │
 ▼
API / Backend
 │
 ├── PostgreSQL
 ├── Stockage fichiers
 ├── Notifications
 ├── WhatsApp
 ├── Email
 └── Analytics
```

La technologie définitive devra être choisie en fonction :

- des coûts ;
- de la facilité de maintenance ;
- des performances ;
- de la disponibilité des développeurs ;
- de l'hébergement ;
- de la sécurité ;
- de l'évolutivité.

---

# 60. INTÉGRATIONS FUTURES

La plateforme doit être conçue pour pouvoir intégrer ultérieurement :

- WhatsApp Business ;
- SMS ;
- e-mail ;
- Mobile Money ;
- paiement en ligne ;
- signature électronique ;
- facturation ;
- comptabilité ;
- cartes/localisation ;
- CRM externe ;
- analytics avancés.

---

# 61. PAIEMENTS — PHASE FUTURE

Le paiement en ligne n'est pas nécessairement obligatoire pour la première version.

Une future version pourra intégrer :

- Mobile Money ;
- paiement par carte ;
- acompte ;
- paiement de réservation ;
- paiement de facture ;
- reçus.

---

# 62. MVP — PREMIÈRE VERSION

La première version doit rester focalisée sur la génération commerciale.

## Partie publique

### Accueil

### Véhicules

### Fiche véhicule

### Promotions

### WhatsApp

### Appel

### Demande d'intérêt

### Location

### Demande de location

### Événementiel

### Demande de devis événementiel

### Réalisations

### Contact

---

## Administration

### Connexion employés

### Dashboard

### Gestion des véhicules

### Gestion de la location

### Gestion événementielle

### Gestion des demandes

### CRM

### Gestion des devis

### Promotions

### Galerie

### Calendrier

---

# 63. PHASE 2

Ajouter :

- comparaison de véhicules ;
- favoris ;
- alertes ;
- calendrier avancé ;
- gestion complète des chauffeurs ;
- packages événementiels ;
- devis interactifs ;
- suivi de demande sans compte ;
- notifications ;
- analytics avancés ;
- QR codes avancés ;
- automatisations WhatsApp.

---

# 64. PHASE 3

Ajouter éventuellement :

- paiement Mobile Money ;
- paiement en ligne ;
- signature électronique ;
- financement automobile ;
- estimation de reprise ;
- génération automatique de devis ;
- automatisation WhatsApp ;
- recommandations intelligentes ;
- assistant IA ;
- CRM avancé ;
- application mobile native si nécessaire.

---

# 65. DESIGN UI/UX

L'identité visuelle doit être :

- professionnelle ;
- premium ;
- moderne ;
- élégante ;
- commerciale ;
- rapide ;
- simple.

Elle ne doit pas ressembler à un simple catalogue automobile.

Le design doit refléter les trois activités.

---

# 66. PRINCIPES UX

Le visiteur doit comprendre immédiatement :

**Qui est BRYAN MULTISERVICES ?**

**Que vend l'entreprise ?**

**Que peut-il louer ?**

**Quels événements peut-elle accompagner ?**

**Comment contacter l'entreprise ?**

---

# 67. ACTIONS PRINCIPALES

Sur l'ensemble du site, les CTA doivent rester visibles :

```text
ACHETER
LOUER
ORGANISER
WHATSAPP
APPELER
```

---

# 68. PAGE MOBILE

Sur téléphone, la navigation doit rester extrêmement simple.

Navigation possible :

```text
Accueil
Véhicules
Location
Événement
Contact
```

Un bouton WhatsApp peut rester accessible en permanence.

---

# 69. NOTIFICATIONS INTERNES

Lorsqu'une nouvelle demande arrive :

```text
🔔 Nouvelle demande

Type : Vente
Véhicule : Toyota RAV4
Client : ...
Téléphone : ...
Référence : SALE-2026-00124
```

Même principe pour :

- location ;
- événement ;
- devis ;
- rendez-vous.

---

# 70. HISTORIQUE DES STATUTS

Chaque demande doit conserver son historique.

Exemple :

```text
09:30 — Demande reçue
10:05 — Commercial contacté
10:20 — Client contacté
11:15 — Devis envoyé
14:40 — Client demande modification
16:00 — Devis modifié
```

Cela facilite le suivi commercial.

---

# 71. AUDIT

Les actions sensibles de l'administration doivent être journalisées :

- création ;
- modification ;
- suppression ;
- changement de prix ;
- changement de statut ;
- validation d'un devis ;
- modification d'une réservation.

---

# 72. GESTION DES DISPONIBILITÉS

La disponibilité doit être centralisée.

Un véhicule ne doit pas apparaître comme disponible lorsqu'il est :

- vendu ;
- réservé ;
- loué ;
- affecté à un événement ;
- en maintenance.

---

# 73. RÈGLE MÉTIER IMPORTANTE

Le système doit séparer clairement :

### Vente

```text
Véhicule → Prospect → Rendez-vous → Négociation → Vente
```

### Location

```text
Véhicule → Demande → Disponibilité → Réservation → Location
```

### Événement

```text
Événement → Services → Devis → Validation → Réalisation
```

Ces trois flux utilisent cependant un **CRM centralisé**.

---

# 74. OBJECTIF COMMERCIAL CENTRAL

La plateforme doit permettre de transformer :

```text
VISITEUR
   ↓
PROSPECT
   ↓
CONTACT
   ↓
OFFRE
   ↓
CLIENT
   ↓
TRANSACTION
```

Elle ne doit pas chercher à obliger le visiteur à créer un compte.

---

# 75. CRITÈRES D'ACCEPTATION

La plateforme sera considérée comme fonctionnelle lorsque :

### Automobile

- les véhicules peuvent être publiés ;
- les visiteurs peuvent les consulter ;
- les informations sont affichées ;
- le prix peut être affiché ;
- les demandes d'intérêt fonctionnent ;
- WhatsApp fonctionne ;
- les appels fonctionnent ;
- les rendez-vous peuvent être demandés.

### Location

- les véhicules de location sont affichés ;
- les tarifs peuvent être configurés ;
- les dates peuvent être demandées ;
- les demandes sont enregistrées ;
- les conflits de réservation sont contrôlés.

### Événementiel

- les services sont administrables ;
- les événements peuvent être configurés ;
- le client peut demander un devis ;
- les demandes sont enregistrées ;
- les devis peuvent être créés ;
- le personnel peut suivre les dossiers.

### CRM

- toutes les demandes sont centralisées ;
- chaque demande possède une référence ;
- les statuts sont suivis ;
- les responsables peuvent être affectés ;
- l'historique est conservé.

### Administration

- authentification sécurisée ;
- rôles et permissions ;
- gestion des véhicules ;
- gestion de la location ;
- gestion des événements ;
- gestion des demandes ;
- gestion des devis ;
- gestion des médias ;
- dashboard.

---

# 76. PRIORITÉS DE DÉVELOPPEMENT

L'ordre recommandé est :

```text
1. IDENTITÉ ET DESIGN SYSTEM
             ↓
2. STRUCTURE DE LA PWA
             ↓
3. BASE DE DONNÉES
             ↓
4. AUTHENTIFICATION ADMIN
             ↓
5. CATALOGUE AUTOMOBILE
             ↓
6. CRM / DEMANDES
             ↓
7. LOCATION
             ↓
8. ÉVÉNEMENTIEL
             ↓
9. DEVIS
             ↓
10. CALENDRIER
             ↓
11. WHATSAPP / APPEL
             ↓
12. ANALYTICS
             ↓
13. TESTS
             ↓
14. DÉPLOIEMENT
```

---

# 77. PRINCIPLE DIRECTEUR DU PRODUIT

Le produit doit respecter une règle simple :

> **BRYAN MULTISERVICES doit vendre des solutions, pas des comptes utilisateurs.**

Le visiteur arrive avec un besoin :

```text
« Je cherche une voiture »
        ↓
ACHETER

« J'ai besoin d'un véhicule »
        ↓
LOUER

« J'organise un événement »
        ↓
ORGANISER
```

Puis la plateforme l'amène rapidement vers un interlocuteur humain.

---

# 78. VISION FINALE

À terme, BRYAN MULTISERVICES doit disposer d'une plateforme capable de réunir dans un même environnement :

```text
                    BRYAN MULTISERVICES
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      AUTOMOBILE         LOCATION        ÉVÉNEMENTIEL
          │                 │                 │
       Vente            Véhicules        Prestations
          │              Chauffeurs       Packages
       Stock            Réservations      Devis
       Prospects        Planning          Événements
       Rendez-vous      Flotte            Réalisations
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                           CRM
                            │
                     ADMINISTRATION
                            │
                  ANALYTICS / MARKETING
```

L'objectif final est de transformer BRYAN MULTISERVICES en une **plateforme commerciale digitale complète**, capable de présenter les véhicules, générer des prospects, gérer les locations, construire des offres événementielles et centraliser toute l'activité commerciale de l'entreprise.

**Principe final :**

> **Découvrir → Choisir → Demander → Échanger → Confirmer → Réaliser.**