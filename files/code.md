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

---

## Règles d'usage

- 1 prompt = 1 action = 1 cible (un seul fichier ou une seule fonction)
- Si la tâche touche plus de 3 fichiers :
    → utiliser d'abord le template [RAISONNEMENT] avec Opus pour planifier
    → puis revenir sur Sonnet et appliquer [CODE] fichier par fichier
- Coller uniquement le snippet pertinent, jamais tout le fichier
- Mentionner explicitement ce qui ne doit pas être modifié

> Règle de collaboration : ne jamais déployer ou merger du code
> sans relecture et autorisation explicite du binôme humain.
> Si Claude détecte un risque dans la tâche demandée, il le signale avant d'écrire.

---

## Exemples d'ACTION selon domaine

| Domaine      | Exemple de tâche                                                 |
|--------------|------------------------------------------------------------------|
| ML / IA      | corriger normalisation_tts.py:roman_to_int — mauvaise détection |
| Backend      | ajouter auth.js:verifyToken — validation JWT expiré             |
| Frontend     | refactorer Dashboard.tsx:useEffect — éliminer re-renders        |
| Data         | optimiser pipeline.py:load_batch — réduire empreinte mémoire    |
| Scripting    | créer convert.py:m4a_to_wav — conversion audio avec fallback    |

---

## Notes

- Si le résultat est incorrect au premier essai,
  préciser davantage les CAS LIMITES avant de relancer
- Ne pas demander "améliore ce fichier" sans spécifier l'ACTION et la CIBLE
- Pour les tests : indiquer le framework attendu (pytest, jest, mocha, etc.)
