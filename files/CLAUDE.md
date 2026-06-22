# CLAUDE.md

## Projet
NOM      : Voicebot
DOMAINE  : IA conversationnelle / Téléphonie VoIP
OBJECTIF : Concevoir et développer un voicebot vocal sur canal téléphonique (SIP/VoIP) adapté au contexte sénégalais

## Structure
# Phase théorie — structure cible (à mettre à jour à chaque phase)
- Spécifications  : docs/specs/
- Architecture    : docs/architecture/
- Recherche       : docs/research/
- Source          : src/          (à créer en phase développement)
- Tests           : tests/        (à créer en phase développement)

## Règles absolues du projet
- Phase théorie : aucun code sans validation explicite de l'architecture complète
- Toute décision technique doit être documentée avec ses alternatives et trade-offs
- Chaque composant doit être évalué pour fonctionner avec une connectivité instable (contexte Sénégal)

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
