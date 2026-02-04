# 🔧 Guide de Configuration Mailjet - Résolution Erreur 401

## 🚨 Problème Identifié

L'erreur **401 Unauthorized** lors de l'envoi d'emails indique que les **clés API Mailjet ne sont pas configurées** ou sont **invalides** sur le serveur Render.

## ✅ Solution : Configuration des Variables d'Environnement Render

### **Étape 1 : Obtenir vos Clés API Mailjet**

1. **Connectez-vous à Mailjet** : https://app.mailjet.com/
2. **Allez dans Account Settings** → **API Keys Management**
3. **Copiez vos clés** :
   - **API Key** (Public Key)
   - **Secret Key** (Private Key)

### **Étape 2 : Configurer les Variables sur Render**

1. **Connectez-vous à Render** : https://dashboard.render.com/
2. **Sélectionnez votre service backend** : `senpointage-backend`
3. **Allez dans** : **Environment** (dans le menu de gauche)
4. **Ajoutez/Modifiez ces variables** :

```bash
# OBLIGATOIRE - Clés API Mailjet
MAILJET_API_KEY=votre_api_key_publique_ici
MAILJET_API_SECRET=votre_secret_key_privée_ici

# OBLIGATOIRE - Email d'envoi (doit être vérifié dans Mailjet)
MAILJET_FROM_EMAIL=contact@votredomaine.com

# OPTIONNEL - Nom de l'expéditeur
MAILJET_FROM_NAME=Sen Pointage
```

5. **Cliquez sur "Save Changes"**
6. **Le service va redémarrer automatiquement**

### **Étape 3 : Vérifier l'Adresse Email d'Envoi**

⚠️ **IMPORTANT** : L'adresse `MAILJET_FROM_EMAIL` doit être **vérifiée** dans Mailjet.

#### **Option A : Utiliser une adresse email vérifiée**

1. Dans Mailjet, allez dans **Account Settings** → **Sender Addresses**
2. Ajoutez votre adresse email (ex: `contact@votredomaine.com`)
3. Vérifiez-la en cliquant sur le lien dans l'email de confirmation
4. Utilisez cette adresse dans `MAILJET_FROM_EMAIL`

#### **Option B : Vérifier votre domaine (Recommandé pour la production)**

1. Dans Mailjet, allez dans **Account Settings** → **Sender Domains**
2. Ajoutez votre domaine (ex: `votredomaine.com`)
3. Configurez les enregistrements DNS (SPF, DKIM)
4. Une fois vérifié, vous pouvez utiliser n'importe quelle adresse de ce domaine

### **Étape 4 : Tester la Configuration**

Après avoir configuré les variables :

1. **Attendez que le service redémarre** (1-2 minutes)
2. **Testez l'envoi d'email** :
   - Invitez une entreprise
   - Vérifiez les logs Render pour confirmer l'envoi
3. **Vérifiez la réception** de l'email

---

## 📋 Variables d'Environnement Complètes pour Mailjet

Voici toutes les variables liées à Mailjet à configurer sur Render :

```bash
# === MAILJET CONFIGURATION ===

# Clés API (OBLIGATOIRE)
MAILJET_API_KEY=votre_api_key_mailjet
MAILJET_API_SECRET=votre_secret_key_mailjet

# Email d'envoi (OBLIGATOIRE - doit être vérifié dans Mailjet)
MAILJET_FROM_EMAIL=contact@naratechvision.com

# Nom de l'expéditeur (OPTIONNEL)
MAILJET_FROM_NAME=Sen Pointage

# URL Frontend pour les liens dans les emails (OBLIGATOIRE)
FRONTEND_URL=https://senpointage.naratechvision.com
FRONTEND_RESET_PASSWORD_URL=https://senpointage.naratechvision.com/reinitialiser-mot-de-passe

# Email de contact pour les demandes Enterprise (OPTIONNEL)
ENTERPRISE_CONTACT_EMAIL=contact@naratechvision.com
```

---

## 🔍 Diagnostic des Erreurs Courantes

### **Erreur 401 - Unauthorized**
**Cause** : Clés API invalides ou manquantes
**Solution** :
- Vérifiez que `MAILJET_API_KEY` et `MAILJET_API_SECRET` sont correctement configurés
- Copiez-collez les clés directement depuis Mailjet (pas d'espaces)
- Régénérez les clés si nécessaire

### **Erreur 403 - Sender address not verified**
**Cause** : L'adresse email d'envoi n'est pas vérifiée
**Solution** :
- Vérifiez l'adresse dans Mailjet (Sender Addresses)
- Ou vérifiez le domaine complet (Sender Domains)

### **Erreur 429 - Rate limit exceeded**
**Cause** : Limite d'envoi atteinte (plan gratuit : 200 emails/jour)
**Solution** :
- Attendez 24h ou passez à un plan payant
- Vérifiez votre quota dans Mailjet

---

## 🧪 Test de Configuration en Local

Pour tester localement avant de déployer :

1. **Créez un fichier `.env` dans `/backend`** :
```bash
MAILJET_API_KEY=votre_api_key
MAILJET_API_SECRET=votre_secret_key
MAILJET_FROM_EMAIL=contact@votredomaine.com
MAILJET_FROM_NAME=Sen Pointage
FRONTEND_URL=http://localhost:5173
```

2. **Démarrez le backend** :
```bash
cd backend
npm run start:dev
```

3. **Testez l'envoi d'email** via l'interface ou Postman

---

## 📊 Vérification des Logs

### **Sur Render**

1. Allez dans votre service backend
2. Cliquez sur **Logs** (menu de gauche)
3. Recherchez :
   - ✅ `Company invitation email sent successfully` = Email envoyé
   - ❌ `Error sending company invitation email` = Erreur

### **Messages de Log à Surveiller**

```bash
# ✅ Succès
[EmailService] Company invitation email sent successfully to email@example.com

# ❌ Erreur - Clés invalides
[EmailService] Error sending company invitation email: Unauthorized
[EmailService] Mailjet error details: Invalid API key

# ❌ Erreur - Email non vérifié
[EmailService] Error sending company invitation email: Sender address not verified
```

---

## 🎯 Checklist de Configuration

Avant de déployer, vérifiez :

- [ ] Compte Mailjet créé et activé
- [ ] Clés API copiées depuis Mailjet
- [ ] Variables `MAILJET_API_KEY` et `MAILJET_API_SECRET` configurées sur Render
- [ ] Adresse email `MAILJET_FROM_EMAIL` vérifiée dans Mailjet
- [ ] Variable `FRONTEND_URL` configurée avec l'URL de production
- [ ] Service backend redémarré après modification des variables
- [ ] Test d'envoi d'email effectué
- [ ] Email reçu dans la boîte de réception

---

## 🔐 Sécurité

⚠️ **NE JAMAIS** :
- Commiter les clés API dans Git
- Partager les clés API publiquement
- Utiliser les mêmes clés en dev et prod

✅ **TOUJOURS** :
- Utiliser les variables d'environnement
- Régénérer les clés si elles sont compromises
- Utiliser des clés différentes pour dev/staging/prod

---

## 📞 Support Mailjet

Si vous rencontrez des problèmes :

1. **Documentation Mailjet** : https://dev.mailjet.com/
2. **Support Mailjet** : https://www.mailjet.com/support/
3. **Status Mailjet** : https://status.mailjet.com/

---

## 🚀 Après Configuration

Une fois Mailjet configuré, les emails suivants seront envoyés automatiquement :

1. **Invitation d'entreprise** : Email avec lien d'inscription et token
2. **Réinitialisation mot de passe** : Email avec lien de reset
3. **Invitation RH** : Email d'invitation pour les comptes RH
4. **Demandes Support** : Notification des demandes de support
5. **Demandes Enterprise** : Notification des demandes sur mesure

---

**Dernière mise à jour** : 3 février 2026
