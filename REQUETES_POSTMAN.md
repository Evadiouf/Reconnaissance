# 🧪 Requêtes Postman - Senpointage API

## ⚙️ Configuration de base

**URL de base :** `http://localhost:3000/api/v1`

**Port du serveur :** `3000`

---

## 🔐 1. AUTHENTIFICATION

### 1.1 Login (Se connecter)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/auth/login`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "email": "admin@example.com",
  "password": "votre_mot_de_passe"
}
```

**Réponse attendue :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123...",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "roles": ["admin"]
  }
}
```

**⚠️ IMPORTANT :** Copiez le `access_token` pour l'utiliser dans toutes les requêtes suivantes !

---

### 1.2 Changer mot de passe

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/auth/change-password`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

---

### 1.3 Mot de passe oublié

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/auth/forgot-password`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "email": "user@example.com"
}
```

---

### 1.4 Réinitialiser mot de passe

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/auth/reset-password`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "token": "token_recu_par_email",
  "newPassword": "nouveau_mot_de_passe"
}
```

---

## 👥 2. UTILISATEURS (CRUD)

### 2.1 CREATE - Créer un utilisateur (avec invitation)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/users`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "password": "MotDePasse123!",
  "phone": "+221771234567",
  "invitationToken": "token_invitation_ici",
  "companyId": "ID_ENTREPRISE_ICI"
}
```

---

### 2.2 CREATE - Créer un employé (RH/Admin - sans invitation)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/users/employees`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "firstName": "Marie",
  "lastName": "Martin",
  "email": "marie.martin@example.com",
  "password": "MotDePasse123!",
  "phone": "+221771234567",
  "department": "Informatique",
  "position": "Développeur",
  "location": "Dakar",
  "companyId": "ID_ENTREPRISE_ICI"
}
```

**Rôle requis :** RH, Admin ou SuperAdmin

---

### 2.3 UPDATE - Modifier un utilisateur

**Méthode :** `PATCH`  
**URL :** `http://localhost:3000/api/v1/users/ID_UTILISATEUR_ICI`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "firstName": "Jean Modifié",
  "phone": "+221779876543",
  "department": "Marketing",
  "position": "Chef de projet"
}
```

**Rôle requis :** RH, Admin ou SuperAdmin

---

### 2.4 DELETE - Supprimer un utilisateur

**Méthode :** `DELETE`  
**URL :** `http://localhost:3000/api/v1/users/ID_UTILISATEUR_ICI`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Rôle requis :** RH, Admin ou SuperAdmin

---

## 🏢 3. ENTREPRISES (CRUD)

### 3.1 CREATE - Créer une entreprise

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/companies`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "name": "Ma Société SARL",
  "typeId": "ID_TYPE_ENTREPRISE_ICI",
  "address": "123 Rue de Dakar, Sénégal",
  "phone": "+221338765432",
  "email": "contact@masociete.sn",
  "website": "https://masociete.sn",
  "contactName": "Directeur Général",
  "contactEmail": "dg@masociete.sn",
  "plan": "Premium"
}
```

**Note :** Pour obtenir un `typeId`, utilisez d'abord la requête 7.1

---

### 3.2 READ - Mes entreprises

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/companies`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Les entreprises dont vous êtes propriétaire

---

### 3.3 READ - TOUTES les entreprises (Admin)

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/companies/all`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Rôle requis :** Admin ou SuperAdmin

**Retourne :** Liste de TOUTES les entreprises du système

---

### 3.4 READ - Mon ID d'entreprise

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/companies/my-company-id`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Réponse :**
```json
{
  "companyId": "65abc123..."
}
```

---

### 3.5 READ - Employés de mon entreprise

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/companies/employees`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Liste de tous les employés de votre entreprise

---

### 3.6 READ - Toutes les entreprises avec employés (Admin)

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/companies/all-with-employees`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Rôle requis :** Admin ou SuperAdmin

**Retourne :** Toutes les entreprises avec la liste de leurs employés

---

### 3.7 CREATE - Inviter un RH

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/companies/invite-rh`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "email": "rh@example.com",
  "role": "rh",
  "department": "Ressources Humaines",
  "sessionTimeout": 3600
}
```

**Rôle requis :** Admin ou SuperAdmin

---

## ⏰ 4. POINTAGES / ATTENDANCE (CRUD)

### 4.1 CREATE - Pointer l'entrée (Clock In)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/attendance/clock-in`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "companyId": "ID_ENTREPRISE_ICI",
  "location": "Bureau principal",
  "notes": "Arrivée normale"
}
```

---

### 4.2 CREATE - Pointer la sortie (Clock Out)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/attendance/clock-out`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "companyId": "ID_ENTREPRISE_ICI",
  "location": "Bureau principal",
  "notes": "Fin de journée"
}
```

---

### 4.3 READ - Mes pointages

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/attendance/my?from=2024-01-01&to=2024-12-31`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Paramètres (Query) :**
- `from` : Date de début (format: YYYY-MM-DD)
- `to` : Date de fin (format: YYYY-MM-DD)

---

### 4.4 READ - Pointages de l'entreprise

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/attendance/company?companyId=ID_ENTREPRISE&from=2024-01-01&to=2024-12-31`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Paramètres (Query) :**
- `companyId` : ID de l'entreprise
- `from` : Date de début
- `to` : Date de fin

**Rôle requis :** RH, Admin ou SuperAdmin

---

### 4.5 READ - Dashboard pointages

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/attendance/dashboard?companyId=ID_ENTREPRISE`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Statistiques en temps réel (présents, absents, en retard, etc.)

---

### 4.6 READ - Historique dashboard

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/attendance/dashboard/history?companyId=ID_ENTREPRISE&from=2024-01-01&to=2024-12-31`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Historique des statistiques quotidiennes

---

### 4.7 READ - Rapport de pointage

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/attendance/report?companyId=ID_ENTREPRISE&userId=ID_USER&from=2024-01-01&to=2024-12-31`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Paramètres (Query) :**
- `companyId` : ID de l'entreprise (requis)
- `userId` : ID de l'utilisateur (optionnel - pour un employé spécifique)
- `from` : Date de début
- `to` : Date de fin

---

### 4.8 DELETE - Supprimer historique entreprise

**Méthode :** `DELETE`  
**URL :** `http://localhost:3000/api/v1/attendance/company/history?companyId=ID_ENTREPRISE&from=2024-01-01&to=2024-12-31`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Rôle requis :** RH, Admin ou SuperAdmin avec permission "Attendance:report"

---

## 📅 5. HORAIRES DE TRAVAIL / SCHEDULES (CRUD)

### 5.1 CREATE - Créer un horaire

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/schedules`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "name": "Horaire Standard",
  "companyId": "ID_ENTREPRISE_ICI",
  "workDays": [1, 2, 3, 4, 5],
  "startTime": "08:00",
  "endTime": "17:00",
  "breakDuration": 60
}
```

**Note :** 
- `workDays` : 1=Lundi, 2=Mardi, ..., 7=Dimanche
- `breakDuration` : en minutes

---

### 5.2 READ - Liste des horaires

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/schedules?companyId=ID_ENTREPRISE`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Tous les horaires de l'entreprise

---

## 🏷️ 6. INVITATIONS

### 6.1 READ - Vérifier une invitation

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/invitations/verify?token=TOKEN_INVITATION`  
**Headers :**
```
Content-Type: application/json
```

**Paramètres (Query) :**
- `token` : Le token d'invitation

---

## 🏷️ 7. TYPES D'ENTREPRISES

### 7.1 READ - Liste des types

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/company-types`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Liste de tous les types d'entreprises (SARL, SA, etc.)

---

### 7.2 CREATE - Créer un type (Admin)

**Méthode :** `POST`  
**URL :** `http://localhost:3000/api/v1/company-types`  
**Headers :**
```
Content-Type: application/json
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Body (raw JSON) :**
```json
{
  "name": "SARL",
  "description": "Société à Responsabilité Limitée"
}
```

**Rôle requis :** Admin ou SuperAdmin

---

## 💳 8. ABONNEMENTS

### 8.1 READ - Liste des plans

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/subscriptions`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Tous les plans d'abonnement disponibles

---

### 8.2 READ - Mon abonnement entreprise

**Méthode :** `GET`  
**URL :** `http://localhost:3000/api/v1/company-subscriptions/my-subscription`  
**Headers :**
```
Authorization: Bearer VOTRE_TOKEN_ICI
```

**Retourne :** Détails de l'abonnement de votre entreprise

---

## 🔧 9. SYSTÈME

### 9.1 Health Check (Vérifier que le serveur fonctionne)

**Méthode :** `GET`  
**URL :** `http://localhost:3000/health`  
**Headers :** Aucun

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2024-02-04T17:30:00.000Z",
  "uptime": 12345.67,
  "environment": "development",
  "memory": {
    "used": 150,
    "total": 512,
    "unit": "MB"
  }
}
```

---

### 9.2 API Root

**Méthode :** `GET`  
**URL :** `http://localhost:3000`  
**Headers :** Aucun

---

## 📊 10. STATISTIQUES UTILES

### 10.1 Nombre total d'entreprises

**Requête :** `GET /companies/all` (voir section 3.3)

**Comment compter :**
1. Faites la requête
2. Dans Postman, regardez la réponse
3. Le nombre d'éléments dans le tableau = nombre d'entreprises

---

### 10.2 Nombre d'employés dans votre entreprise

**Requête :** `GET /companies/employees` (voir section 3.5)

**Comment compter :**
1. Faites la requête
2. Comptez le nombre d'éléments dans le tableau retourné

---

### 10.3 Nombre total d'employés (tous)

**Requête :** `GET /companies/all-with-employees` (voir section 3.6)

**Comment compter :**
1. Faites la requête
2. Pour chaque entreprise, comptez les employés + le owner
3. Additionnez tous les employés de toutes les entreprises

---

### 10.4 Nombre total d'utilisateurs

**Même chose que 10.3** - Le nombre total d'utilisateurs = nombre total d'employés (car chaque employé est un utilisateur)

---

## 🎯 WORKFLOW DE TEST COMPLET

### Étape 1 : Vérifier le serveur
```
GET http://localhost:3000/health
```

### Étape 2 : Se connecter
```
POST http://localhost:3000/api/v1/auth/login
Body: { "email": "admin@example.com", "password": "password" }
```
➡️ **Copiez le token reçu !**

### Étape 3 : Obtenir les types d'entreprises
```
GET http://localhost:3000/api/v1/company-types
Header: Authorization: Bearer VOTRE_TOKEN
```
➡️ **Copiez un typeId**

### Étape 4 : Créer une entreprise
```
POST http://localhost:3000/api/v1/companies
Header: Authorization: Bearer VOTRE_TOKEN
Body: { "name": "Test SARL", "typeId": "ID_COPIE", ... }
```
➡️ **Copiez le companyId reçu**

### Étape 5 : Créer des employés
```
POST http://localhost:3000/api/v1/users/employees
Header: Authorization: Bearer VOTRE_TOKEN
Body: { "firstName": "Jean", "email": "jean@test.com", "companyId": "ID_COPIE", ... }
```

### Étape 6 : Voir les employés
```
GET http://localhost:3000/api/v1/companies/employees
Header: Authorization: Bearer VOTRE_TOKEN
```

### Étape 7 : Pointer l'entrée
```
POST http://localhost:3000/api/v1/attendance/clock-in
Header: Authorization: Bearer VOTRE_TOKEN
Body: { "companyId": "ID_COPIE", "location": "Bureau" }
```

### Étape 8 : Voir les statistiques
```
GET http://localhost:3000/api/v1/attendance/dashboard?companyId=ID_COPIE
Header: Authorization: Bearer VOTRE_TOKEN
```

---

## 💡 ASTUCES POSTMAN

### Comment ajouter le token à toutes les requêtes

1. Dans Postman, créez une **Collection**
2. Clic droit sur la collection → **Edit**
3. Onglet **Authorization**
4. Type : **Bearer Token**
5. Token : Collez votre token
6. Toutes les requêtes de la collection utiliseront ce token !

### Comment créer des variables

1. Dans Postman, créez un **Environment**
2. Ajoutez des variables :
   - `base_url` = `http://localhost:3000/api/v1`
   - `token` = votre token
   - `company_id` = votre company ID
3. Utilisez-les dans les requêtes : `{{base_url}}/companies`

### Comment sauvegarder les réponses

1. Après une requête, cliquez sur **Save Response**
2. Nommez la réponse
3. Vous pourrez la consulter plus tard

---

## 🐛 ERREURS COURANTES

### Erreur 401 Unauthorized
➡️ Votre token est expiré ou invalide → Refaites un login

### Erreur 403 Forbidden
➡️ Vous n'avez pas les permissions → Vérifiez votre rôle

### Erreur 404 Not Found
➡️ L'URL est incorrecte ou la ressource n'existe pas

### Erreur 500 Internal Server Error
➡️ Erreur serveur → Vérifiez les logs du backend

### Connection refused
➡️ Le serveur n'est pas démarré → Lancez `npm run start:dev` dans le dossier backend

---

## ✅ CHECKLIST DE TEST

- [ ] Health check fonctionne
- [ ] Login fonctionne et retourne un token
- [ ] Créer une entreprise
- [ ] Lister mes entreprises
- [ ] Créer un employé
- [ ] Lister les employés
- [ ] Modifier un employé
- [ ] Pointer entrée
- [ ] Pointer sortie
- [ ] Voir mes pointages
- [ ] Voir le dashboard
- [ ] Créer un horaire
- [ ] Lister les horaires
- [ ] Supprimer un employé
- [ ] Changer mot de passe

---

**Bon testing ! 🚀**
