# Routing des modèles — règle universelle

## Modèle par défaut
/model sonnet  ← démarrer TOUJOURS ici

---

## Haiku → tâches mécaniques (< 2 min)

Utiliser quand :
- Reformater ou convertir un fichier
- Renommer des variables ou des éléments
- Rechercher une information dans un fichier
- Générer du boilerplate simple et répétitif
- Corriger une faute de frappe ou de syntaxe

Séquence :
  /model haiku   → exécuter la tâche → /model sonnet immédiatement après

---

## Sonnet → travail courant (80 % du temps)

Utiliser pour :
- Rédiger un document, rapport, email, README, article
- Écrire ou modifier du code sur 1 à 3 fichiers
- Écrire des tests unitaires ou d'intégration
- Analyser une erreur connue ou un log
- Expliquer un concept ou résumer un texte
- Toute tâche standard ne nécessitant pas de raisonnement profond

Commande : /model sonnet  (défaut — ne pas switcher sans raison)

---

## Opus → raisonnement profond (exception)

Utiliser uniquement pour :
- Décision d'architecture impliquant plus de 3 fichiers ou composants
- Debugging d'un problème cross-système sans cause évidente
- Analyse de trade-offs avec plusieurs options complexes
- Lecture et synthèse d'un article de recherche ou d'un document dense
- Conception d'un nouveau système ou d'une nouvelle approche from scratch

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
