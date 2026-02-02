# Checklist : connexion super admin en ligne qui bloque

Quand tu vois **« Email ou mot de passe incorrect »** en te connectant sur **senpointage.naratechvision.com**, le frontend appelle bien le backend (sinon tu verrais « Impossible de se connecter au serveur »). Le **backend renvoie 401** = il rejette email/mot de passe.

---

## 1. Vérifier que la base utilisée par Render est la bonne

Sur **Render** → service **senpointage-backend** → **Environment** :

- Ouvre la variable **MONGO_URI**.
- C’est **exactement** cette URI (ce cluster / cette base) que le backend utilise en ligne.

Si tu as plusieurs clusters Atlas (ex. un pour le dev, un pour la prod), il faut que :
- le **seed** ait été lancé avec **cette même MONGO_URI** (celle de Render),
- et que tu te connectes sur le site en ligne (qui utilise ce backend).

Si Render pointe vers une autre base que celle que tu as seedée, le compte n’existe pas côté « prod » → 401.

---

## 2. Recréer le super admin dans la base de prod (recommandé)

Depuis ta machine, dans le dossier **backend**, lance le seed en pointant vers **la même MONGO_URI que Render** :

1. Sur Render → **senpointage-backend** → **Environment** → copie la valeur de **MONGO_URI** (sans la modifier).
2. En local, dans un terminal :

```bash
cd backend
MONGO_URI="COLLE_ICI_L_URI_COPIÉE_DE_RENDER" MONGO_DB_NAME=sen_pointage SUPERADMIN_EMAIL="adminaratechvision@gmail.com" SUPERADMIN_PASSWORD="adminaratech04" npm run seed:superadmin
```

3. Remplace **COLLE_ICI_L_URI_COPIÉE_DE_RENDER** par la vraie valeur (entre guillemets). Pas d’espace avant la dernière guillemet.
4. Vérifie que tu vois à la fin : **Super admin ensured: adminaratechvision@gmail.com**.

Ensuite, sur le site en ligne, connecte-toi avec :
- **Email :** adminaratechvision@gmail.com  
- **Mot de passe :** adminaratech04  

(Si tu changes le mot de passe dans la commande, utilise ce nouveau mot de passe pour te connecter.)

---

## 3. Vérifier le mot de passe

Le mot de passe utilisé pour la connexion doit être **exactement** celui passé dans `SUPERADMIN_PASSWORD` quand tu as lancé le seed (par ex. **adminaratech04**) :
- pas d’espace avant/après,
- même majuscules/minuscules,
- clavier bien en français si tu avais saisi le seed avec.

---

## 4. Vérifier dans MongoDB Atlas (optionnel)

1. Va sur **cloud.mongodb.com** → ton projet → le **cluster** utilisé dans la **MONGO_URI** de Render.
2. **Database** → base **sen_pointage** (ou le nom dans **MONGO_DB_NAME**) → collection **users**.
3. Cherche un document avec **email: "adminaratechvision@gmail.com"**.
   - S’il n’existe pas : le seed n’a pas été fait sur cette base → refaire l’étape 2.
   - S’il existe : le problème vient du mot de passe (étape 3) ou d’un autre compte (vérifier l’email exact).

---

## Résumé

| Problème | Action |
|----------|--------|
| Base Render ≠ base seedée | Utiliser la **MONGO_URI de Render** dans la commande seed (étape 2). |
| Compte absent en prod | Relancer **seed:superadmin** avec la MONGO_URI de Render (étape 2). |
| Mot de passe incorrect | Utiliser **exactement** le mot de passe du seed (étape 3). |

Après avoir relancé le seed avec la bonne **MONGO_URI** et le bon mot de passe, la connexion super admin en ligne devrait fonctionner.
