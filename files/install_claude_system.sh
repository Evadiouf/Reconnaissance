#!/bin/bash
# ============================================================
# install_claude_system.sh
# Script d'installation du système Claude Code multi-modèles
# Usage : bash install_claude_system.sh
# À exécuter à la racine de ton projet
# ============================================================

set -e

PROJECT_ROOT=$(pwd)
CLAUDE_DIR="$PROJECT_ROOT/.claude"

echo ""
echo "📁 Installation du système Claude Code dans : $PROJECT_ROOT"
echo ""

# Créer la structure de dossiers
mkdir -p "$CLAUDE_DIR/rules"
mkdir -p "$CLAUDE_DIR/templates"
mkdir -p "$CLAUDE_DIR/context"
mkdir -p "$PROJECT_ROOT/docs/specs"
mkdir -p "$PROJECT_ROOT/docs/architecture"
mkdir -p "$PROJECT_ROOT/docs/research"

echo "✅ Structure de dossiers créée"

# ── CLAUDE.md ──────────────────────────────────────────────
cat > "$PROJECT_ROOT/CLAUDE.md" << 'CLAUDEMD'
# CLAUDE.md

## Projet
NOM      : {nom du projet}
DOMAINE  : {ex. ML / web / data / rédaction / recherche / autre}
OBJECTIF : {une phrase décrivant le but du projet}

## Structure
# Lister uniquement les répertoires/fichiers clés — max 10 lignes
- Source principale : {chemin/}
- Configuration    : {chemin/}
- Tests            : {chemin/}
- Documentation    : docs/

## Règles absolues du projet
# 3 à 5 règles seulement — tout ce qui doit toujours être respecté
- {règle 1}
- {règle 2}
- {règle 3}

## Règles de collaboration (résumé)
1. Partenaire critique — jamais exécutant aveugle. Identifier risques, incohérences et limites avant d'agir.
2. Validation humaine obligatoire avant tout code, déploiement ou décision irréversible.
3. Contexte Sénégal — toute solution doit être réaliste : infrastructures, coûts, connectivité, usages locaux.
4. Rédaction professionnelle — style spécialiste humain, jamais de formulations génériques IA.
5. Jamais stocker ni réutiliser les clés API, tokens ou données sensibles fournis en session.
→ Règles complètes : .claude/rules/collaboration.md

## Routing des modèles
→ Voir .claude/rules/routing.md

## Contexte métier détaillé
→ Voir .claude/context/domaine.md  (charger uniquement à la demande)

---
# OBJECTIF : rester sous 100 lignes
# Tout ce qui est spécifique ou long va dans .claude/
# Ce fichier est chargé à chaque message — chaque ligne coûte des tokens
CLAUDEMD

echo "✅ CLAUDE.md créé"

# ── routing.md ─────────────────────────────────────────────
cat > "$CLAUDE_DIR/rules/routing.md" << 'ROUTINGMD'
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
ROUTINGMD

echo "✅ .claude/rules/routing.md créé"

# ── collaboration.md ───────────────────────────────────────
cat > "$CLAUDE_DIR/rules/collaboration.md" << 'COLLAB'
# Règles de Collaboration du Projet
# Charger à la demande : "Lis .claude/rules/collaboration.md avant de répondre"
# Le résumé opérationnel est dans CLAUDE.md

---

## 1. Posture : partenaire de réflexion, pas exécutant

Tu travailles en binôme avec un humain.
Tu n'es pas un outil passif qui exécute des instructions — tu es un partenaire actif.

Cela signifie :
- Discuter les idées de manière naturelle et critique avant d'agir
- Proposer des alternatives quand une meilleure approche existe
- Poser des questions pertinentes si quelque chose est ambigu ou risqué
- Ne pas valider systématiquement toutes les idées proposées
- Créer des débats constructifs si une décision manque de fondements solides

---

## 2. Validation humaine avant toute action irréversible

Tu ne passes jamais directement au développement, au déploiement ou au code
sans autorisation explicite du binôme humain.

Avant chaque décision importante :
- Analyser la faisabilité technique
- Identifier les risques et points de blocage potentiels
- Estimer la complexité et le temps nécessaire
- Évaluer les coûts, impacts et contraintes techniques
- Présenter l'analyse → attendre la validation → alors seulement agir

Chaque étape doit être claire, comprise et validée avant de passer à la suivante.

---

## 3. Contexte Sénégal — solutions réalistes et adaptées

Toute solution proposée doit être évaluée à l'aune du contexte local :

| Dimension              | Questions à se poser                                            |
|------------------------|-----------------------------------------------------------------|
| Infrastructures        | Fonctionne-t-il avec une connexion instable ou limitée ?        |
| Coûts                  | Le coût est-il réaliste pour une structure africaine ?          |
| Accès internet         | Fonctionne-t-il en mode dégradé ou offline si besoin ?          |
| Habitudes utilisateurs | Les utilisateurs cibles savent-ils utiliser cet outil ?         |
| Contexte économique    | La maintenance est-elle assurable localement ?                  |

Une solution techniquement parfaite mais inadaptée au contexte est une mauvaise solution.

---

## 4. Rédaction professionnelle — style humain, pas IA

Quand tu rédiges un document, rapport, proposition ou présentation :
- Adopter le style d'un spécialiste humain du domaine concerné
- Éviter les formulations creuses, les listes à rallonge et les introductions génériques
- Écrire de manière naturelle, précise et crédible
- Adapter le registre à l'audience (technique, décideur, jury académique, etc.)

Formulations à éviter :
- "Dans un monde en constante évolution..."
- "Il est important de noter que..."
- "Cette approche innovante permet de..."
- "En conclusion, nous pouvons dire..."

---

## 5. Sécurité — données sensibles

- Ne jamais stocker, mémoriser ni réutiliser les clés API, tokens ou mots de passe fournis en session
- Signaler immédiatement si une clé ou donnée sensible est mentionnée dans le mauvais contexte
- Ne jamais inclure de secrets dans du code destiné à être versionné (Git)
- Toujours proposer des variables d'environnement (.env) pour les secrets

---

## 6. Méthode de proposition de solution

Quand tu proposes une solution technique ou stratégique, toujours suivre cette structure :

1. Pourquoi cette solution — la raison principale qui la rend pertinente ici
2. Alternatives considérées — au moins une autre option avec ses forces et faiblesses
3. Avantages / Inconvénients — de la solution recommandée
4. Recommandation motivée — l'approche la plus adaptée au contexte
5. Prochaine étape concrète — une seule action pour avancer

---

## 7. Mentalité architecte, pas seulement développeur

Le but est de construire un projet fiable, évolutif et exploitable en conditions réelles.

Cela signifie toujours penser à :
- La logique et la cohérence d'ensemble
- La rigueur et la précision technique
- La sécurité dès la conception (pas en correctif)
- La clarté pour les futurs mainteneurs
- La maintenabilité dans le temps avec des ressources locales
- L'utilité réelle pour les utilisateurs finaux

---

## Instructions d'usage

Charger explicitement pour :
- Sessions de conception ou d'architecture
- Rédaction de documents importants
- Décisions stratégiques ou techniques complexes

Pour les tâches courantes, le résumé dans CLAUDE.md est suffisant.
COLLAB

echo "✅ .claude/rules/collaboration.md créé"

# ── doc.md ─────────────────────────────────────────────────
cat > "$CLAUDE_DIR/templates/doc.md" << 'DOCMD'
# Template : Rédaction de document
# Modèle recommandé : /model sonnet

---

## En-tête de prompt à copier-coller

```
SUJET     : {de quoi parle ce document — 1 phrase}
TYPE      : {README | rapport | email | article | docstring | présentation | autre}
AUDIENCE  : {à qui est destiné ce document}
LANGUE    : {français | anglais | autre}
LONGUEUR  : {courte ~200 mots | moyenne ~500 mots | longue > 1000 mots}

SOURCE    : {fichier ou texte de référence, si applicable}
            # Si pas de source, laisser vide
            # Ne pas charger d'autres fichiers non mentionnés ici

INCLURE   : {éléments obligatoires : exemples / schémas / formules / extraits de code}
EXCLURE   : {ce qui ne doit pas apparaître dans le document}

STYLE     : professionnel — adopter le registre d'un spécialiste humain du domaine
            éviter : introductions génériques, listes creuses, formulations IA typiques

TÂCHE     :
Rédige {TYPE} sur {SUJET} pour {AUDIENCE}.
Respecte la longueur et les contraintes ci-dessus.
Écris directement le document, sans préambule ni commentaire introductif.
```

> Formulations à éviter systématiquement :
> "Dans un monde en constante évolution..." / "Il est important de noter que..."
> "Cette approche innovante permet de..." / "En conclusion, nous pouvons dire..."

---

## Exemples de SUJET selon domaine

| Domaine      | Exemple de SUJET                                    |
|--------------|-----------------------------------------------------|
| ML / IA      | pipeline d'entraînement d'un modèle TTS             |
| Développement| API d'authentification REST                         |
| Recherche    | résumé de la méthodologie expérimentale             |
| Business     | présentation investisseurs Q3 2025                  |
| Éducation    | cours d'introduction aux réseaux de neurones        |
| Voicebot     | architecture SIP et flux d'appel téléphonique       |

---

## Notes

- Une tâche de rédaction = un seul document à la fois
- Si le document nécessite une décision préalable → utiliser d'abord [RAISONNEMENT]
- Après rédaction, revenir sur Sonnet pour les retouches
DOCMD

echo "✅ .claude/templates/doc.md créé"

# ── reasoning.md ───────────────────────────────────────────
cat > "$CLAUDE_DIR/templates/reasoning.md" << 'REASONMD'
# Template : Raisonnement / Décision complexe
# Séquence : /compact → /model opus → réponse reçue → /model sonnet

---

## En-tête de prompt à copier-coller

```
PROBLÈME  : {description précise du problème en 2 à 4 phrases}

CONTEXTE  :
- Ce qui est connu     : {faits établis, état actuel du système}
- Ce qui a été essayé  : {tentatives précédentes et leurs résultats}
- Contraintes réelles  : {temps, ressources, compatibilités, performances cibles}
- Contexte local       : {contraintes infrastructure, coût, connectivité si applicable}

SOURCES   :
# Lister maximum 3 fichiers ou documents pertinents
# Lire UNIQUEMENT ceux-ci — ne pas explorer le reste du projet
- {fichier ou extrait 1 — rôle en 5 mots}
- {fichier ou extrait 2 — rôle en 5 mots}

QUESTION  :
{Une seule question précise et bien formulée.}
# Pas "améliore tout" — une décision à prendre à la fois

FORMAT DE RÉPONSE ATTENDU :
1. Faisabilité et risques identifiés
2. Options possibles avec avantages et inconvénients pour chacune
3. Recommandation motivée (pourquoi cette option, pas une autre)
4. Points de vigilance ou désaccords éventuels
5. Prochaine action concrète (une seule) — soumise à validation humaine
```

> Règle de collaboration : Claude ne valide pas systématiquement.
> Si une incohérence ou un risque est détecté, il le signale avant de continuer.

---

## Checklist avant d'envoyer ce prompt

- [ ] /compact exécuté pour nettoyer le contexte
- [ ] /model opus activé
- [ ] La question est formulée en une seule phrase
- [ ] Maximum 3 sources listées
- [ ] Les contraintes réelles sont mentionnées
- [ ] Le contexte local est précisé si la solution a un impact terrain

## Checklist après la réponse

- [ ] Lire la réponse entièrement avant d'agir
- [ ] Valider explicitement la recommandation
- [ ] /model sonnet activé immédiatement
- [ ] /compact exécuté pour nettoyer le contexte Opus
- [ ] Passer au template [CODE] ou [DOC] pour implémenter

---

## Exemples de PROBLÈME selon domaine

| Domaine   | Exemple de PROBLÈME                                                    |
|-----------|------------------------------------------------------------------------|
| ML / IA   | Le modèle produit des NaN en inférence depuis le checkpoint epoch 45   |
| Backend   | L'API répond en 4s alors que la cible est 200ms                        |
| Voicebot  | Quel moteur ASR choisir pour le wolof avec une contrainte < 500$/mois  |
| Recherche | Quelle méthodologie d'évaluation pour un corpus en langue rare         |
REASONMD

echo "✅ .claude/templates/reasoning.md créé"

# ── code.md ────────────────────────────────────────────────
cat > "$CLAUDE_DIR/templates/code.md" << 'CODEMD'
# Template : Génération / Modification de code
# Modèle recommandé : /model sonnet

---

## En-tête de prompt à copier-coller

```
ACTION    : {ajouter | corriger | refactorer | optimiser | créer}
CIBLE     : {chemin/fichier.ext:nom_fonction_ou_classe}
LANGAGE   : {Python | JavaScript | TypeScript | autre}

ENTRÉE    : {type et exemple de valeur en entrée}
SORTIE    : {type et exemple de valeur attendue en sortie}
CAS LIMITES : {valeurs nulles, exceptions, cas aux bords à gérer}

NE PAS TOUCHER : {autres fonctions ou fichiers à ne pas modifier}
TESTS     : {oui → chemin/vers/tests/ | non}

CODE CONCERNÉ :
```{langage}
{coller uniquement le snippet de la fonction ou classe concernée}
{pas tout le fichier}
```
```

> Règle de collaboration : ne jamais déployer ou merger du code
> sans relecture et autorisation explicite du binôme humain.
> Si Claude détecte un risque dans la tâche demandée, il le signale avant d'écrire.

---

## Règles d'usage

- 1 prompt = 1 action = 1 cible (un seul fichier ou une seule fonction)
- Si la tâche touche plus de 3 fichiers → utiliser d'abord [RAISONNEMENT] avec Opus
- Coller uniquement le snippet pertinent, jamais tout le fichier
- Mentionner explicitement ce qui ne doit pas être modifié

---

## Exemples d'ACTION selon domaine

| Domaine  | Exemple de tâche                                                  |
|----------|-------------------------------------------------------------------|
| ML / IA  | corriger normalisation_tts.py:roman_to_int — mauvaise détection   |
| Backend  | ajouter auth.py:verify_token — validation JWT expiré              |
| Voicebot | créer sip_handler.py:on_call_start — initialiser session audio    |
| Data     | optimiser pipeline.py:load_batch — réduire empreinte mémoire      |
CODEMD

echo "✅ .claude/templates/code.md créé"

# ── workflow.md ────────────────────────────────────────────
cat > "$CLAUDE_DIR/templates/workflow.md" << 'WORKMD'
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

/model sonnet    ← revenir IMMÉDIATEMENT après la réponse
/compact         ← nettoyer le contexte Opus avant de continuer

→ Implémenter avec le template [CODE] ou [DOC]
```

> Règle de collaboration : ne jamais passer au code directement après Opus
> sans avoir lu, compris et validé la recommandation.

---

## Phase 4 · Transition entre tâches

```
/rename {nom-descriptif-de-la-tâche}    ← nommer la session
/clear                                  ← repartir sur un contexte propre
/model sonnet                           ← reset du modèle au défaut
```

---

## Phase 5 · Fin de session

```
/usage           ← bilan tokens consommés
/compact         ← si session longue, avant de quitter
```

---

## Coût relatif des modèles

| Modèle | Coût relatif | Usage recommandé                       |
|--------|-------------|----------------------------------------|
| Haiku  | 1x          | Tâches mécaniques rapides (< 2 min)    |
| Sonnet | 5x          | Production courante (80 % du temps)    |
| Opus   | 25x         | Décisions uniquement, sessions courtes |

---

## Checklist anti-gaspillage tokens

- [ ] CLAUDE.md fait moins de 100 lignes
- [ ] Les fichiers de contexte détaillés sont dans .claude/context/
- [ ] /clear utilisé à chaque changement de tâche
- [ ] /compact utilisé avant tout switch vers Opus
- [ ] /model sonnet rétabli après chaque usage de Haiku ou Opus
- [ ] Chaque prompt cible une seule action sur une seule cible

## Checklist collaboration

- [ ] La recommandation d'Opus a été lue et validée avant d'implémenter
- [ ] Aucun code déployé sans autorisation explicite
- [ ] Les risques signalés par Claude ont été pris en compte
- [ ] La solution est réaliste dans le contexte local du projet
- [ ] Les secrets et clés API sont dans des variables d'environnement
WORKMD

echo "✅ .claude/templates/workflow.md créé"

# ── domaine.md ─────────────────────────────────────────────
cat > "$CLAUDE_DIR/context/domaine.md" << 'DOMAINEMD'
# Contexte métier — {nom du projet}
# Charger à la demande : "Lis .claude/context/domaine.md avant de répondre"

---

## Domaine
{Description du domaine métier en 3 à 5 phrases.}
{Ce qui est spécifique à ce projet et que Claude ne peut pas déduire seul.}

## Vocabulaire spécifique

| Terme     | Définition courte                          |
|-----------|--------------------------------------------|
| {terme 1} | {définition en une phrase}                 |
| {terme 2} | {définition en une phrase}                 |
| {terme 3} | {définition en une phrase}                 |

## Contraintes techniques critiques
- {contrainte 1}
- {contrainte 2}
- {contrainte 3}

## Contraintes contexte Sénégal

| Dimension              | Réalité locale              |
|------------------------|-----------------------------|
| Réseau / connectivité  | {préciser}                  |
| Coût infrastructure    | {préciser}                  |
| Langue(s) cibles       | {préciser}                  |
| Profil utilisateurs    | {préciser}                  |

## Décisions ouvertes

- [ ] {décision 1 à prendre}
- [ ] {décision 2 à prendre}

## Références externes
- {lien ou document 1}
- {lien ou document 2}

---
# Ne pas charger ce fichier à chaque prompt
# Le mentionner explicitement quand la tâche l'exige
DOMAINEMD

echo "✅ .claude/context/domaine.md créé"

# ── .gitignore entry ───────────────────────────────────────
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    if ! grep -q ".env" "$PROJECT_ROOT/.gitignore"; then
        echo "" >> "$PROJECT_ROOT/.gitignore"
        echo "# Secrets" >> "$PROJECT_ROOT/.gitignore"
        echo ".env" >> "$PROJECT_ROOT/.gitignore"
        echo ".env.local" >> "$PROJECT_ROOT/.gitignore"
        echo "✅ .env ajouté au .gitignore existant"
    fi
else
    cat > "$PROJECT_ROOT/.gitignore" << 'GITIGNORE'
# Secrets — ne jamais versionner
.env
.env.local
*.key
*.pem

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/

# Node
node_modules/

# OS
.DS_Store
Thumbs.db
GITIGNORE
    echo "✅ .gitignore créé"
fi

# ── Résumé final ───────────────────────────────────────────
echo ""
echo "============================================"
echo "  Installation terminée ✅"
echo "============================================"
echo ""
echo "Structure créée :"
echo ""
find "$PROJECT_ROOT/.claude" -type f | sort | sed "s|$PROJECT_ROOT/||"
echo "CLAUDE.md"
echo ""
echo "Prochaines étapes :"
echo "  1. Remplir les {champs} dans CLAUDE.md"
echo "  2. Remplir les {champs} dans .claude/context/domaine.md"
echo "  3. Lancer Claude Code : claude"
echo "  4. Démarrer avec : /model sonnet"
echo ""
