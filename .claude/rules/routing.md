# Routing des modèles — Senpointage

## Modèle par défaut
/model sonnet  ← démarrer TOUJOURS ici

---

## Haiku → tâches mécaniques (< 2 min)

Utiliser quand :
- Reformater ou convertir un fichier
- Renommer des variables ou des champs
- Rechercher une information dans un fichier
- Générer du boilerplate DTO / schema Mongoose
- Corriger une faute de frappe ou de syntaxe

Séquence :
  /model haiku   → exécuter la tâche → /model sonnet immédiatement après

---

## Sonnet → travail courant (80 % du temps)

Utiliser pour :
- Écrire ou modifier du code sur 1 à 3 fichiers
- Corriger un bug identifié dans un module (attendance, auth, companies…)
- Ajouter un endpoint NestJS (controller + service + DTO)
- Modifier un composant React ou un service frontend
- Écrire des tests unitaires ou d'intégration
- Analyser une erreur connue ou un log
- Rédiger un document, README, email, rapport

Commande : /model sonnet  (défaut — ne pas switcher sans raison)

---

## Opus → raisonnement profond (exception)

Utiliser uniquement pour :
- Décision d'architecture impliquant plus de 3 modules NestJS
- Refonte d'un flux critique (ex. rarchitecture du kiosque facial, refonte des subscriptions)
- Debugging d'un problème cross-module sans cause évidente
- Analyse de trade-offs avec plusieurs options complexes
- Conception d'une nouvelle fonctionnalité majeure (ex. mode offline kiosque, nouveau plan tarifaire)

Séquence obligatoire :
  /compact       → nettoyer le contexte avant
  /model opus    → poser la question avec le template [RAISONNEMENT]
  /model sonnet  → revenir IMMÉDIATEMENT après la réponse

---

## Règles de transition entre tâches

- Changement de sujet ou de tâche    → /clear
- Session dépassant 40 messages      → /compact
- Avant tout switch vers Opus        → /compact
- Après chaque usage d'Opus          → revenir sur Sonnet

---

## Coût relatif des modèles

Haiku  = 1x   → tâches mécaniques rapides
Sonnet = 5x   → production courante
Opus   = 25x  → décisions uniquement, sessions courtes
