# Template : Génération / Modification de code
# Modèle recommandé : /model sonnet

---

## En-tête de prompt à copier-coller

```
ACTION    : {ajouter | corriger | refactorer | optimiser | créer}
CIBLE     : {chemin/fichier.ext:nom_fonction_ou_classe}
LANGAGE   : {TypeScript | JavaScript | autre}

ENTRÉE    : {type et exemple de valeur en entrée}
SORTIE    : {type et exemple de valeur attendue en sortie}
CAS LIMITES : {valeurs nulles, exceptions, cas aux bords à gérer}

NE PAS TOUCHER : {autres fonctions ou fichiers à ne pas modifier}
TESTS     : {oui → chemin/vers/tests/ | non}

CODE CONCERNÉ :
```typescript
{coller uniquement le snippet de la fonction ou classe concernée}
{pas tout le fichier}
```
```

---

## Règles d'usage

- 1 prompt = 1 action = 1 cible (un seul fichier ou une seule fonction)
- Si la tâche touche plus de 3 fichiers :
    → utiliser d'abord le template [RAISONNEMENT] avec Opus pour planifier
    → puis revenir sur Sonnet et appliquer [CODE] fichier par fichier
- Coller uniquement le snippet pertinent, jamais tout le fichier
- Mentionner explicitement ce qui ne doit pas être modifié

> Règle de collaboration : ne jamais déployer ou merger du code
> sans relecture et autorisation explicite.
> Si Claude détecte un risque dans la tâche demandée, il le signale avant d'écrire.

---

## Exemples d'ACTION selon domaine Senpointage

| Domaine           | Exemple de tâche                                                              |
|-------------------|-------------------------------------------------------------------------------|
| Attendance        | corriger attendance.service.ts:clockIn — doublon possible si clic rapide      |
| Face recognition  | ajouter face-recognition.service.ts:matchFace — retourner le score de confiance|
| Kiosque           | refactorer kioskSchedule.js:isNowInSlot — gérer le chevauchement minuit       |
| Companies         | ajouter companies.service.ts:updateKioskAttendance — valider max 8 slots      |
| Auth              | corriger auth.service.ts:validateUser — cas mot de passe null                 |
| Frontend          | ajouter KioskGlobalEngine.jsx:handleFaceMatch — afficher message hors plage   |
| Schedules         | créer schedules.service.ts:findByDepartment — filtre par département          |

---

## Notes

- Si le résultat est incorrect au premier essai, préciser davantage les CAS LIMITES
- Pour les modules NestJS : toujours préciser si le DTO / guard / schema est aussi à modifier
- Pour les composants React : préciser si le state, les props ou les appels API sont impactés
