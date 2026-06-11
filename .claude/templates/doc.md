# Template : Rédaction de document
# Modèle recommandé : /model sonnet

---

## En-tête de prompt à copier-coller

```
SUJET     : {de quoi parle ce document — 1 phrase}
TYPE      : {README | rapport | email | guide | docstring | présentation | autre}
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

## Exemples de SUJET selon domaine Senpointage

| Audience     | Exemple de SUJET                                                       |
|--------------|------------------------------------------------------------------------|
| Développeur  | Guide d'installation locale (backend + frontend + MongoDB + MinIO)     |
| RH / Client  | Guide d'utilisation du kiosque de pointage facial                      |
| Technique    | Documentation de l'API REST Senpointage (endpoints attendance)         |
| Business     | Présentation des plans d'abonnement pour une PME sénégalaise           |
| Déploiement  | Procédure de déploiement sur Render / VPS Ubuntu                       |
| Sécurité     | Politique de traitement des données biométriques (RGPD-like)           |

---

## Notes

- Une tâche de rédaction = un seul document à la fois
- Si le document nécessite une décision préalable → utiliser d'abord [RAISONNEMENT]
- Après la rédaction, revenir sur Sonnet pour les retouches
