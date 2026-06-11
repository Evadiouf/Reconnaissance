# CLAUDE.md

## Projet
NOM      : Senpointage
SOCIÉTÉ  : NaraTech Vision
DOMAINE  : SaaS de gestion des présences avec reconnaissance faciale (marché sénégalais)
OBJECTIF : Permettre aux entreprises de gérer le pointage de leurs employés via kiosque facial, caméras IP et interface web

## Structure
- Backend API  : backend/src/         (NestJS · TypeScript · MongoDB · Redis · MinIO)
- Frontend     : frontend/src/        (React · JSX · React Router)
- Modules clés : attendance · face-recognition · cameras-streaming · companies · schedules · users · auth · subscriptions
- Schémas DB   : backend/src/**/schemas/
- DTOs         : backend/src/**/dto/
- Utils kiosque: frontend/src/utils/kioskSchedule.js

## Règles absolues
- Ne jamais déployer ni merger sans validation explicite
- Tout changement sur les modules `attendance` ou `face-recognition` exige une relecture — impact direct sur les pointages réels
- Les secrets (JWT, MongoDB URI, MinIO, Mailjet) restent dans `.env`, jamais dans le code
- Tester le mode kiosque et le mode normal séparément — les deux flux sont indépendants

## Règles de collaboration (résumé)
1. Partenaire critique — identifier risques et incohérences avant d'agir.
2. Validation humaine obligatoire avant tout code touchant `attendance`, `face-recognition` ou la base de production.
3. Contexte Sénégal — solutions réalistes : connexion instable, coûts maîtrisés, maintenance locale possible.
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
