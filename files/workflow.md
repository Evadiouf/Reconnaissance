# Workflow — Séquence type d'une session Claude Code

---

## Phase 1 · Démarrage

```
/model sonnet    ← modèle par défaut, toujours commencer ici
/usage           ← vérifier les tokens disponibles
```

---

## Phase 2 · Travail courant (Sonnet)

```
→ Utiliser le template [DOC]       pour tout document à rédiger
→ Utiliser le template [CODE]      pour tout code à écrire ou modifier
→ Passer sur Haiku                 pour les tâches purement mécaniques
→ Un prompt = une tâche précise    jamais de demandes vagues
```

Conseil : formuler le prompt AVANT d'appuyer sur Entrée.
Un prompt bien structuré évite les aller-retours coûteux.

> Règle de collaboration : Claude peut signaler un risque ou proposer
> une alternative avant d'exécuter. Lire sa réponse avant de continuer.

---

## Phase 3 · Décision complexe (Opus)

```
/compact         ← OBLIGATOIRE avant de passer à Opus
/model opus

→ Utiliser le template [RAISONNEMENT]
→ Récupérer la décision ou le plan d'action

→ Valider explicitement la recommandation avant d'implémenter
   ("ok, on part sur cette option" ou "non, on prend l'alternative B")

/model sonnet    ← revenir IMMÉDIATEMENT après la réponse
/compact         ← nettoyer le contexte Opus avant de continuer

→ Implémenter avec le template [CODE] ou [DOC]
```

> Règle de collaboration : ne jamais passer au code directement après Opus
> sans avoir lu, compris et validé la recommandation.

---

## Phase 4 · Transition entre tâches

```
/rename {nom-descriptif-de-la-tâche}    ← nommer la session pour la retrouver
/clear                                  ← repartir sur un contexte propre
/model sonnet                           ← reset du modèle au défaut
```

Ne jamais enchaîner deux tâches différentes dans la même session sans /clear.
Le contexte accumulé coûte des tokens sur chaque message suivant.

---

## Phase 5 · Fin de session

```
/usage           ← bilan tokens consommés
/compact         ← si la session était longue, avant de quitter
```

---

## Résumé des coûts relatifs

| Modèle | Coût relatif | Usage recommandé                      |
|--------|-------------|---------------------------------------|
| Haiku  | 1x          | Tâches mécaniques rapides (< 2 min)   |
| Sonnet | 5x          | Production courante (80 % du temps)   |
| Opus   | 25x         | Décisions uniquement, sessions courtes|

---

## Checklist anti-gaspillage tokens

- [ ] CLAUDE.md fait moins de 100 lignes
- [ ] Les fichiers de contexte détaillés sont dans .claude/context/
- [ ] Les règles path-scoped sont dans .claude/rules/ (pas dans CLAUDE.md)
- [ ] /clear utilisé à chaque changement de tâche
- [ ] /compact utilisé avant tout switch vers Opus
- [ ] /model sonnet rétabli après chaque usage de Haiku ou Opus
- [ ] Chaque prompt cible une seule action sur une seule cible

## Checklist collaboration

- [ ] La recommandation d'Opus a été lue et validée avant d'implémenter
- [ ] Aucun code déployé sans autorisation explicite
- [ ] Les risques signalés par Claude ont été pris en compte
- [ ] La solution proposée est réaliste dans le contexte local du projet
- [ ] Les secrets et clés API sont dans des variables d'environnement, pas dans le code
