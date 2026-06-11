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
- Contexte local       : {contraintes infrastructure, coût, connectivité Sénégal}

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
- [ ] Le contexte local (Sénégal, infrastructure, coûts) est précisé si pertinent

## Checklist après la réponse

- [ ] Lire la réponse entièrement avant d'agir
- [ ] Valider explicitement la recommandation ("ok, on part sur cette option")
- [ ] /model sonnet activé immédiatement
- [ ] /compact exécuté pour nettoyer le contexte Opus
- [ ] Passer au template [CODE] ou [DOC] pour implémenter

---

## Exemples de PROBLÈME pour Senpointage

| Domaine        | Exemple de PROBLÈME                                                              |
|----------------|----------------------------------------------------------------------------------|
| Kiosque        | Comment gérer le pointage offline si l'API est indisponible pendant 10 min ?    |
| Architecture   | Faut-il séparer le module face-recognition en microservice indépendant ?         |
| Performance    | Les requêtes MongoDB sur attendance dépassent 2s sur 10 000 entrées              |
| Sécurité       | Les embeddings faciaux sont stockés en clair dans MinIO — quelle stratégie ?     |
| Fonctionnalité | Concevoir le système de seuil de retard configurable par entreprise              |
| Multi-sites    | Architecture pour supporter plusieurs adresses / sites par entreprise             |
