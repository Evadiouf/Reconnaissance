# Où sont enregistrés les employés créés

Chaque employé créé (depuis la page **Employés** ou **Ajouter un employé**) est enregistré à **deux endroits** pour que le pointage par reconnaissance faciale fonctionne.

---

## 1. Base de données (MongoDB)

- **Connexion** : variable d’environnement `MONGO_URI` (fichier `.env` du backend).
- **Nom de la base** : variable `MONGO_DB_NAME` (ex. `sen_pointage` dans `backend/env.example`).
- **Collection des employés** : **`users`**  
  Chaque employé = un document dans la collection `users` (prénom, nom, email, mot de passe hashé, téléphone, département, etc.).
- **Rattachement à l’entreprise** : dans la collection **`companies`**, le champ **`employees`** est un tableau d’ObjectId qui référence les `_id` des utilisateurs (employés) de l’entreprise.  
  À la création d’un employé, le backend appelle `addEmployeeToCompany(companyId, userId)` pour ajouter cet `_id` dans `companies.employees`.

**Résumé** :  
- Base : `MONGO_DB_NAME` (ex. `sen_pointage`)  
- Employé (compte) : collection **`users`**  
- Lien entreprise ↔ employé : collection **`companies`**, champ **`employees`**

---

## 2. Serveur de reconnaissance faciale (Naratech)

- **Rôle** : stocker les **photos des visages** pour la reconnaissance au pointage.
- **Enregistrement** : lorsque l’employé est créé **avec une photo**, le frontend appelle l’API backend `POST /api/v1/face-recognition/register`, qui transmet l’image à l’API Naratech (`training_image/add`).  
  Les photos ne sont **pas** stockées dans MongoDB, uniquement sur le serveur Naratech.
- **Identifiant** : on envoie l’**`_id` MongoDB** de l’employé (ObjectId) comme `employee_id` à Naratech, pour que la reconnaissance renvoie ce même ID et que le pointage soit bien associé au bon utilisateur en base.

**Résumé** :  
- Données visages : **serveur Naratech** (API configurée via `FACE_RECOGNITION_API_URL` / `FACE_RECOGNITION_API_KEY`)  
- Pas de stockage des photos en base MongoDB

---

## Vérification rapide

- **En base** : dans MongoDB (base `MONGO_DB_NAME`), collection **`users`** → un document par employé ; collection **`companies`** → champ **`employees`** contient les `_id` des employés de l’entreprise.
- **Côté serveur (reconnaissance)** : si une photo a été fournie à la création, elle est enregistrée via l’API Naratech ; sans photo, le pointage par reconnaissance ne pourra pas reconnaître cet employé tant qu’une photo n’est pas ajoutée (ex. via la fiche employé sur la page Employés).
