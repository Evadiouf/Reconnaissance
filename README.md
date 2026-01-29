# SenPointage - Système de Pointage Intelligent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-v11-red)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)

Application complète de gestion de pointage intelligent avec reconnaissance faciale IA, frontend React et backend NestJS.

## 🚨 IMPORTANT - Sécurité

**Avant de cloner ou pusher ce projet sur GitHub, lisez attentivement :**

- 📖 [Guide de Configuration](CONFIGURATION.md) - Configuration complète du projet
- 🔒 [Guide de Sécurité](SECURITY.md) - Sécuriser vos credentials
- ✅ Exécutez `bash .github-security-check.sh` avant chaque push

## 📁 Structure du Projet

```
Senpointage/
├── frontend/          # Application React (Interface utilisateur)
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services API
│   │   └── assets/        # Images, icônes, etc.
│   ├── package.json
│   └── vite.config.js
│
├── backend/           # API NestJS (Serveur)
│   ├── src/
│   │   ├── users/         # Gestion des utilisateurs
│   │   ├── auth/          # Authentification
│   │   ├── companies/     # Gestion des entreprises
│   │   ├── attendance/    # Système de pointage
│   │   └── ...
│   ├── package.json
│   └── nest-cli.json
│
└── README.md          # Ce fichier
```

## 🚀 Installation et Démarrage

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
L'application sera accessible sur http://localhost:5173

### Backend (NestJS)

```bash
cd backend
npm install --legacy-peer-deps
npm run start:dev
```
L'API sera accessible sur http://localhost:3000

## 🔧 Configuration

### Frontend
- **Framework**: React 18 avec Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios

### Backend
- **Framework**: NestJS
- **Base de données**: MongoDB (Atlas)
- **Authentification**: JWT + Passport
- **Validation**: Class Validator
- **Documentation**: Swagger

## 🌐 Déploiement

### Frontend
- Vercel, Netlify, ou serveur statique
- Build: `npm run build`

### Backend
- Heroku, Railway, DigitalOcean
- Base de données: MongoDB Atlas

## 📝 Variables d'Environnement

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3000
```

### Backend (.env)
```
JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb://localhost:27017/senpointage
PORT=3000
```

## 🔗 Endpoints API Principaux

- `POST /api/v1/users` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `GET /api/v1/companies` - Liste des entreprises
- `POST /api/v1/attendance/clock-in` - Pointer l'arrivée
- `POST /api/v1/attendance/clock-out` - Pointer la sortie

## 📚 Documentation

- Frontend: Voir `frontend/README.md`
- Backend: Voir `backend/README.md`
- API: http://localhost:3000/docs (Swagger)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.
























