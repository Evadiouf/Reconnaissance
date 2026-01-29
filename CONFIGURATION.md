# 🔧 Configuration du Projet SenPointage

## ⚠️ IMPORTANT - Sécurité

**Ne JAMAIS commiter les fichiers suivants sur GitHub :**
- `.env`
- `.env.local`
- `.env.production`
- Tout fichier contenant des clés API, mots de passe, ou credentials

Ces fichiers sont déjà dans `.gitignore`. Vérifiez toujours avant de faire un commit !

---

## 📋 Configuration Backend

### 1. Créer le fichier `.env`

Copiez le fichier d'exemple et remplissez vos valeurs :

```bash
cd backend
cp env.example .env
```

### 2. Variables d'environnement requises

#### **MongoDB Atlas (Base de données)**

1. Créez un compte gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un cluster (tier gratuit disponible)
3. Configurez l'accès réseau (0.0.0.0/0 pour dev, IP spécifique pour prod)
4. Créez un utilisateur database
5. Récupérez votre connection string

```env
MONGO_URI=mongodb+srv://votre_username:votre_password@votre_cluster.mongodb.net
MONGO_DB_NAME=sen_pointage
```

#### **JWT Secret (Authentification)**

Générez une clé secrète forte :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
JWT_SECRET=votre_cle_secrete_generee_ici
JWT_EXPIRES_IN=7d
```

#### **Redis (Cache & Sessions)**

**Option 1 - Local (Développement):**
```bash
# Installer Redis localement
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
# Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/

redis-server
```

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Option 2 - Redis Cloud (Production):**
1. Créez un compte sur [Redis Cloud](https://redis.com/try-free/)
2. Créez une instance gratuite
3. Récupérez les credentials

```env
REDIS_HOST=votre-instance.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=votre_password_redis
REDIS_DB=0
```

#### **Mailjet (Service d'emails)**

1. Créez un compte sur [Mailjet](https://www.mailjet.com)
2. Allez dans Account Settings > API Keys Management
3. Copiez votre API Key et Secret Key

```env
MAILJET_API_KEY=votre_api_key
MAILJET_API_SECRET=votre_secret_key
MAILJET_FROM_EMAIL=noreply@votredomaine.com
MAILJET_FROM_NAME=SenPointage
```

#### **MinIO (Stockage de fichiers)**

**Option 1 - Local (Développement):**
```bash
# Installer MinIO
# https://min.io/docs/minio/linux/index.html
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_DEFAULT_BUCKET=senpointage-files
```

**Option 2 - Cloud:**
Utilisez AWS S3 ou un service compatible.

#### **Naratech API (Reconnaissance faciale)**

Contactez votre fournisseur d'API pour obtenir :

```env
FACE_RECOGNITION_API_URL=http://votre-api-url:port
FACE_RECOGNITION_API_KEY=votre_cle_api
```

#### **Frontend URL**

```env
# Développement
FRONTEND_URL=http://localhost:5173
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/reset-password

# Production
FRONTEND_URL=https://votredomaine.com
FRONTEND_RESET_PASSWORD_URL=https://votredomaine.com/reset-password
```

#### **Super Admin (Premier utilisateur)**

Configurez le compte super admin initial :

```env
SUPERADMIN_EMAIL=votre_email@example.com
SUPERADMIN_PASSWORD=VotreMotDePasseForT123!
SUPERADMIN_FIRST_NAME=Prénom
SUPERADMIN_LAST_NAME=Nom
SUPERADMIN_ROLES=superadmin
SUPERADMIN_PERMISSIONS=*
```

### 3. Installation et démarrage

```bash
cd backend
npm install --legacy-peer-deps
npm run start:dev
```

### 4. Initialiser la base de données (seeds)

```bash
# Créer les permissions
npm run seed:permissions

# Créer les rôles
npm run seed:roles

# Créer le super admin
npm run seed:superadmin

# Créer les types d'entreprises
npm run seed:company-types

# Créer les paramètres du site
npm run seed:settings
```

---

## 🎨 Configuration Frontend

### 1. Créer le fichier `.env`

```bash
cd frontend
```

Créez un fichier `.env.local` pour le développement :

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=SenPointage
VITE_APP_VERSION=1.0.0
```

### 2. Installation et démarrage

```bash
npm install
npm run dev
```

Le frontend sera accessible sur : http://localhost:5173

---

## 🚀 Déploiement

### Backend (Render, Heroku, DigitalOcean)

1. Créez un compte sur votre plateforme de déploiement
2. Connectez votre repository GitHub
3. Configurez les variables d'environnement dans l'interface web (JAMAIS dans le code)
4. Déployez !

**Variables d'environnement à configurer sur Render/Heroku :**
- Toutes les variables du fichier `.env`
- `NODE_ENV=production`
- `PORT=3000` (ou le port fourni par la plateforme)

### Frontend (Vercel, Netlify)

1. Créez un compte sur Vercel ou Netlify
2. Connectez votre repository
3. Configurez les variables :
   - `VITE_API_BASE_URL=https://votre-backend.onrender.com`

---

## 🔒 Sécurité - Checklist avant GitHub

- [ ] `.env` est dans `.gitignore`
- [ ] `env.example` ne contient AUCUN secret réel
- [ ] Tous les fichiers de credentials sont ignorés
- [ ] Les clés API ont été remplacées par des placeholders
- [ ] Le mot de passe MongoDB n'est PAS dans le code

### Vérifier les secrets avant commit

```bash
# Installer git-secrets (optionnel)
git secrets --install
git secrets --register-aws

# Vérifier les fichiers staged
git diff --cached

# Annuler un commit accidentel
git reset HEAD~1
```

---

## 🆘 Support

En cas de problème de configuration :

1. Vérifiez que toutes les variables d'environnement sont définies
2. Consultez les logs : `npm run start:dev` (backend) ou `npm run dev` (frontend)
3. Vérifiez les connexions : MongoDB, Redis, MinIO
4. Testez l'API : http://localhost:3000/docs (Swagger)

---

## 📚 Ressources

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Redis Cloud](https://redis.com/try-free/)
- [Mailjet](https://www.mailjet.com)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
