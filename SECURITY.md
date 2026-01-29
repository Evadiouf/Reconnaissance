# 🔒 Guide de Sécurité - SenPointage

## ⚠️ IMPORTANT - À LIRE AVANT DE PUSHER SUR GITHUB

Ce document explique comment sécuriser vos credentials et éviter les alertes GitHub.

---

## 🚨 Problème : GitHub détecte des secrets exposés

GitHub scanne automatiquement tous les commits pour détecter :
- Clés API
- Mots de passe de bases de données
- Tokens JWT
- Credentials Redis
- Clés secrètes

**Si GitHub détecte un secret, vous recevrez un email d'alerte !**

---

## ✅ Solution : Séparer les secrets du code

### Principe de base

```
❌ JAMAIS ça :
   - Mettre des vrais secrets dans le code
   - Commiter des fichiers .env
   - Pousser env.example avec de vraies valeurs

✅ TOUJOURS ça :
   - Utiliser des fichiers .env locaux (ignorés par Git)
   - Mettre des placeholders dans env.example
   - Configurer les secrets dans l'interface de déploiement
```

---

## 📁 Structure recommandée

```
Senpointage/
├── backend/
│   ├── .env                 ❌ IGNORÉ PAR GIT (vrais secrets)
│   ├── env.example          ✅ DANS GIT (exemples)
│   └── .gitignore           ✅ Contient ".env"
├── frontend/
│   ├── .env.local           ❌ IGNORÉ PAR GIT
│   ├── .env.example         ✅ DANS GIT
│   └── .gitignore           ✅ Contient ".env*"
└── .gitignore               ✅ Ignore tous les .env
```

---

## 🛠️ Procédure avant chaque push GitHub

### 1. Exécuter le script de vérification

```bash
bash .github-security-check.sh
```

Ce script vérifie :
- ✓ Les .env sont bien ignorés
- ✓ Aucun fichier sensible n'est tracké
- ✓ Aucun secret dans les fichiers staged
- ✓ env.example ne contient pas de vrais secrets

### 2. Si des erreurs sont détectées

```bash
# Retirer un fichier du staging
git reset HEAD backend/.env

# Retirer un fichier du tracking Git (mais le garder localement)
git rm --cached backend/.env

# Vérifier les fichiers staged
git status

# Voir le contenu des fichiers staged
git diff --cached
```

### 3. Nettoyer l'historique Git (si déjà committé)

**⚠️ ATTENTION : Cela réécrit l'historique Git !**

```bash
# Supprimer un fichier de TOUT l'historique
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Forcer le push (après sauvegarde !)
git push origin --force --all
```

**Alternative plus sûre avec BFG :**

```bash
# Installer BFG Repo-Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Supprimer les secrets
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --replace-text passwords.txt  # Fichier avec patterns à remplacer

# Nettoyer
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push
git push origin --force --all
```

---

## 🔑 Que faire avec les secrets exposés ?

### Si un secret a été pushoé sur GitHub :

1. **RÉVOQUEZ IMMÉDIATEMENT le secret exposé**
   - MongoDB : Changez le mot de passe utilisateur
   - JWT : Générez un nouveau secret
   - Redis : Changez le mot de passe
   - Mailjet : Regénérez les clés API

2. **Nettoyez l'historique Git** (voir ci-dessus)

3. **Générez de nouveaux secrets**

```bash
# Nouveau JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Nouveau mot de passe fort
openssl rand -base64 32
```

4. **Mettez à jour vos environnements**
   - Fichier `.env` local
   - Variables d'environnement Render/Heroku
   - Configuration production

---

## 🎯 Checklist avant push GitHub

- [ ] J'ai exécuté `.github-security-check.sh`
- [ ] Aucune erreur n'est remontée
- [ ] Mon `.env` local n'est PAS dans `git status`
- [ ] `env.example` ne contient QUE des placeholders
- [ ] J'ai vérifié `git diff --cached`
- [ ] Tous mes fichiers sensibles sont dans `.gitignore`

---

## 🚀 Configuration des secrets en production

### Render / Heroku

**Ne JAMAIS mettre les secrets dans le code ou Dockerfile !**

1. Allez dans les paramètres de votre service
2. Section "Environment Variables"
3. Ajoutez chaque variable individuellement :
   - `MONGO_URI` = `mongodb+srv://...`
   - `JWT_SECRET` = `votre_secret`
   - etc.

### Vercel / Netlify (Frontend)

1. Project Settings → Environment Variables
2. Ajoutez :
   - `VITE_API_BASE_URL` = `https://votre-backend.onrender.com`

### GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
env:
  MONGO_URI: ${{ secrets.MONGO_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

Configurez les secrets dans :
Settings → Secrets and variables → Actions → New repository secret

---

## 📚 Ressources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Filter-Branch](https://git-scm.com/docs/git-filter-branch)
- [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

## 🆘 Support

En cas de problème :

1. **NE PUSHEZ PAS** avant d'avoir résolu le problème
2. Contactez l'équipe de développement
3. Consultez ce guide : `CONFIGURATION.md`
4. Exécutez le script de vérification : `bash .github-security-check.sh`

---

## ✅ Bonnes pratiques

### À FAIRE ✅

- Utiliser des variables d'environnement (`.env`)
- Mettre `.env` dans `.gitignore`
- Utiliser `env.example` avec des placeholders
- Exécuter le script de sécurité avant chaque push
- Révoquer immédiatement tout secret exposé
- Utiliser des secrets managers (AWS Secrets Manager, HashiCorp Vault)

### À NE PAS FAIRE ❌

- Commiter des fichiers `.env`
- Mettre des secrets dans le code source
- Partager des credentials par email/Slack
- Utiliser les mêmes secrets dev/prod
- Ignorer les alertes GitHub
- Pousser en force sans vérifier

---

**🔒 La sécurité est l'affaire de tous ! Prenez le temps de vérifier avant chaque commit.**
