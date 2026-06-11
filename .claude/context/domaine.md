# Contexte métier — Senpointage
# Charger à la demande : "Lis .claude/context/domaine.md avant de répondre"

---

## Domaine
SaaS de gestion des présences (pointage) destiné aux entreprises sénégalaises.
Le système permet d'enregistrer les entrées/sorties des employés via reconnaissance faciale
(kiosque autonome ou caméras IP), avec une interface de gestion RH complète.
Cible : PME et grandes structures, multi-sites, multi-départements.

## Acteurs et rôles

| Rôle        | Périmètre                                                        |
|-------------|------------------------------------------------------------------|
| superadmin  | Gestion plateforme globale (entreprises, plans, site config)     |
| admin       | Alias superadmin côté plateforme                                 |
| owner       | Propriétaire d'une entreprise — accès complet à son espace       |
| rh          | Gestionnaire RH — gère employés, plannings, rapports             |
| employee    | Employé — consulte son propre historique de pointage             |

## Vocabulaire spécifique

| Terme              | Définition courte                                                        |
|--------------------|--------------------------------------------------------------------------|
| TimeEntry          | Un enregistrement de pointage (clock_in ou clock_out) avec timestamp     |
| DailyStats         | Agrégat journalier : présences, retards, absences par entreprise          |
| clock_in           | Entrée — arrivée de l'employé                                            |
| clock_out          | Sortie — départ de l'employé                                             |
| kioskAttendance    | Config du mode kiosque : plages horaires par défaut + overrides équipes  |
| KioskSlot          | Plage horaire { start, end, action } définissant une fenêtre de pointage |
| teamOverride       | Config kiosque spécifique à un département (priorité sur le défaut)      |
| graceMinutes       | Tolérance en minutes avant de marquer un employé en retard               |
| workingScheduleId  | Référence au planning de travail assigné à un employé                    |
| departmentKey      | Clé normalisée du département (trim + lowercase) pour les overrides      |
| embedding facial   | Vecteur numérique représentant un visage — base de la reconnaissance     |
| HLS streaming      | Flux vidéo des caméras IP au format HTTP Live Streaming                  |

## Architecture technique

**Backend** — NestJS (TypeScript)
- Base de données : MongoDB via Mongoose
- Cache / sessions : Redis (ioredis)
- Stockage fichiers : MinIO (images employés, embeddings)
- Auth : JWT + Passport (local + JWT strategies)
- Permissions : CASL (ability-based)
- Email : node-mailjet
- Validation : class-validator + class-transformer
- Streaming caméras : WebSocket + fluent-ffmpeg + HLS

**Frontend** — React (JSX)
- Routing : React Router v6
- Streaming : hls.js
- Export : jsPDF + jspdf-autotable
- Pas de framework CSS (styles custom)

**Modules NestJS clés :**

| Module               | Rôle                                                          |
|----------------------|---------------------------------------------------------------|
| attendance           | CRUD pointages, stats, dashboard temps réel                   |
| face-recognition     | Entraînement modèles faciaux, reconnaissance en temps réel    |
| cameras-streaming    | Gestion flux HLS des caméras IP                               |
| companies            | CRUD entreprises, config kiosque (kioskAttendance)            |
| schedules            | Plages horaires de travail (nom, startTime, endTime, jours)   |
| users                | Profils employés (département, position, workingScheduleId)   |
| auth                 | Login, JWT, refresh                                           |
| subscriptions        | Plans plateforme (Standard, Pro, Enterprise)                  |
| company-subscriptions| Abonnement actif d'une entreprise                             |
| invitations          | Invitation RH par email + token                               |
| company-invitations  | Invitation employé par email                                  |
| payment              | Gestion paiements abonnements                                 |
| email                | Service d'envoi email (Mailjet)                               |
| filemanager          | Upload/download fichiers via MinIO                            |
| casl                 | Définition des abilities par rôle                             |

## Flux critiques

**Pointage kiosque (mode strict)**
1. Caméra détecte un visage → face-recognition compare avec les embeddings
2. Si match → récupérer le département de l'employé
3. `getKioskSlotsForEmployee` → sélectionner les slots applicables (override ou défaut)
4. `pickKioskActionForNow` → déterminer si clock_in ou clock_out selon l'heure
5. Si hors plage → afficher "hors plage horaire", refuser le pointage
6. Si dans plage → appeler attendance API → créer le TimeEntry

**Pointage kiosque (mode de base)**
- Même reconnaissance faciale
- Consulte quand même les créneaux configurés pour détecter les plages "sortie"
- Si dans créneau sortie → clock_out directement
- Sinon → clock_in (comportement par défaut)

**Détection de retard**
- Seuil fixé à 09h00 dans `attendance.service.ts:510`
- Tout clock_in après 09h00 incrémente `lateCount` dans DailyStats

## Contraintes techniques critiques

- Les embeddings faciaux sont des données biométriques sensibles — ne jamais les exposer dans les logs
- Le kiosque doit fonctionner même si la connexion est intermittente (tolérance aux délais API)
- Les plages horaires supportent le chevauchement minuit (ex. 23:00 → 01:00) — voir `isNowInSlot`
- Max 8 slots par config (défaut ou équipe), max 12 teamOverrides par entreprise
- La normalisation du `departmentKey` (trim + lowercase) doit être cohérente front et back

## Contraintes contexte Sénégal

| Dimension          | Réalité locale                                                        |
|--------------------|-----------------------------------------------------------------------|
| Connectivité       | Instable hors Dakar — le kiosque doit gérer les timeouts gracieusement|
| Coût infrastructure| Hébergement cloud africain (AWS Cape Town, OVH) ou serveur local      |
| Profil utilisateurs| Employés non techniciens — interface kiosque 100% tactile/visuelle    |
| Langues            | Français administratif — pas de multilinguisme requis pour l'instant  |
| Maintenance        | Équipe NaraTech Vision — dépendances externes à minimiser             |

## Décisions ouvertes

- [ ] Mode offline complet du kiosque (file d'attente locale si API indisponible)
- [ ] Seuil de retard configurable par entreprise (actuellement fixé à 09h00 en dur)
- [ ] Support multi-sites (plusieurs adresses par entreprise)
- [ ] Export rapport PDF depuis le frontend (jsPDF intégré, à finaliser)

## Références internes

- Logique kiosque   : frontend/src/utils/kioskSchedule.js
- Config kiosque    : backend/src/companies/dto/update-kiosk-attendance.dto.ts
- Schéma entreprise : backend/src/companies/schemas/company.schema.ts
- Schéma pointage   : backend/src/attendance/schemas/time-entry.schema.ts
- Schéma planning   : backend/src/schedules/schemas/schedule.schema.ts

---
# Ne pas charger ce fichier à chaque prompt
# Le mentionner explicitement quand la tâche l'exige
