# 🔧 Solution : Problème d'Envoi d'Email pour Invitations d'Entreprises

## 🚨 Problème Constaté

**Symptôme** : Lors de l'invitation d'une entreprise, l'email n'est pas reçu et une erreur 401 apparaît dans la console.

**Cause Racine** : Les clés API Mailjet ne sont **pas configurées** ou sont **invalides** sur le serveur Render.

---

## ✅ Solution Rapide (5 minutes)

### **Étape 1 : Obtenir vos Clés Mailjet**

1. Allez sur https://app.mailjet.com/
2. Connectez-vous (ou créez un compte gratuit)
3. Allez dans **Account Settings** → **API Keys Management**
4. Copiez :
   - **API Key** (clé publique)
   - **Secret Key** (clé secrète)

### **Étape 2 : Configurer sur Render**

1. Allez sur https://dashboard.render.com/
2. Sélectionnez votre service **senpointage-backend**
3. Cliquez sur **Environment** (menu gauche)
4. Ajoutez ces 3 variables :

```bash
MAILJET_API_KEY=votre_api_key_ici
MAILJET_API_SECRET=votre_secret_key_ici
MAILJET_FROM_EMAIL=contact@votredomaine.com
```

5. Cliquez sur **Save Changes**
6. Le service va redémarrer automatiquement (1-2 min)

### **Étape 3 : Vérifier l'Adresse Email**

⚠️ **IMPORTANT** : L'adresse `MAILJET_FROM_EMAIL` doit être **vérifiée** dans Mailjet.

**Option A - Email unique** (Rapide) :
1. Dans Mailjet → **Sender Addresses**
2. Ajoutez votre email (ex: `contact@naratechvision.com`)
3. Cliquez sur le lien de vérification reçu par email
4. Utilisez cette adresse dans `MAILJET_FROM_EMAIL`

**Option B - Domaine complet** (Recommandé) :
1. Dans Mailjet → **Sender Domains**
2. Ajoutez votre domaine (ex: `naratechvision.com`)
3. Configurez les DNS (SPF, DKIM) selon les instructions
4. Une fois vérifié, utilisez n'importe quelle adresse du domaine

### **Étape 4 : Tester**

1. Attendez 2 minutes (redémarrage du service)
2. Invitez une entreprise depuis l'interface
3. Vérifiez que l'email est reçu
4. Consultez les logs Render si besoin

---

## 📊 Vérification du Statut

### **Comment Savoir si Mailjet est Configuré ?**

**Logs Render** :
```bash
# ✅ Mailjet configuré
[EmailService] Company invitation email sent successfully to email@example.com

# ❌ Mailjet non configuré
[EmailService] Mailjet not configured, skipping email send

# ❌ Clés invalides
[EmailService] Error sending company invitation email: Unauthorized
```

**Interface Frontend** :
- ✅ **Email envoyé** : Message vert "Invitation envoyée par email"
- ❌ **Email non envoyé** : Message rouge avec raison (ex: "Mailjet non configuré")

---

## 🔍 Diagnostic des Erreurs

### **Erreur 401 - Unauthorized**
**Symptôme** : Console affiche "status of 401"
**Cause** : Clés API invalides ou manquantes
**Solution** :
1. Vérifiez que `MAILJET_API_KEY` et `MAILJET_API_SECRET` sont bien configurés sur Render
2. Copiez-collez les clés directement depuis Mailjet (sans espaces)
3. Si les clés sont anciennes, régénérez-les dans Mailjet

### **Erreur 403 - Sender not verified**
**Symptôme** : "Sender address not verified"
**Cause** : L'adresse email d'envoi n'est pas vérifiée
**Solution** :
1. Vérifiez l'adresse dans Mailjet (Sender Addresses)
2. Ou vérifiez le domaine complet (Sender Domains)

### **Email non reçu mais pas d'erreur**
**Causes possibles** :
1. Email dans les **spams** → Vérifiez le dossier spam
2. Adresse email invalide → Vérifiez l'orthographe
3. Serveur mail bloque Mailjet → Utilisez une autre adresse pour tester

---

## 🎯 Configuration Complète Recommandée

### **Variables Mailjet sur Render**

```bash
# === MAILJET (Envoi d'emails) ===
MAILJET_API_KEY=votre_api_key_mailjet
MAILJET_API_SECRET=votre_secret_key_mailjet
MAILJET_FROM_EMAIL=contact@naratechvision.com
MAILJET_FROM_NAME=Sen Pointage

# === URLs Frontend (pour les liens dans les emails) ===
FRONTEND_URL=https://senpointage.naratechvision.com
FRONTEND_RESET_PASSWORD_URL=https://senpointage.naratechvision.com/reinitialiser-mot-de-passe

# === Email de contact (optionnel) ===
ENTERPRISE_CONTACT_EMAIL=contact@naratechvision.com
```

---

## 📧 Types d'Emails Envoyés

Une fois Mailjet configuré, ces emails seront automatiquement envoyés :

1. **Invitation d'entreprise** 📨
   - Contient un lien d'inscription avec token
   - Permet de choisir un abonnement
   - Valide pendant 7 jours

2. **Réinitialisation mot de passe** 🔐
   - Lien de reset avec token
   - Valide pendant 30 minutes

3. **Invitation RH** 👥
   - Invitation pour créer un compte RH
   - Accès à la gestion des employés

4. **Demandes Support** 🆘
   - Notification des demandes de support
   - Envoyé à l'équipe support

5. **Demandes Enterprise** 💼
   - Notification des demandes sur mesure
   - Envoyé à l'équipe commerciale

---

## 🧪 Test en Local (Développement)

Pour tester avant de déployer :

1. **Créez `.env` dans `/backend`** :
```bash
MAILJET_API_KEY=votre_api_key
MAILJET_API_SECRET=votre_secret_key
MAILJET_FROM_EMAIL=contact@votredomaine.com
FRONTEND_URL=http://localhost:5173
```

2. **Démarrez le backend** :
```bash
cd backend
npm run start:dev
```

3. **Testez l'invitation** depuis l'interface locale

---

## 📈 Limites du Plan Gratuit Mailjet

- **200 emails/jour**
- **6 000 emails/mois**
- Pas de limite sur les contacts
- Support email uniquement

**Si vous dépassez** :
- Passez au plan payant (à partir de 15€/mois)
- Ou attendez 24h pour que le quota se réinitialise

---

## ✅ Checklist Avant Déploiement

- [ ] Compte Mailjet créé
- [ ] Clés API copiées
- [ ] Variables configurées sur Render
- [ ] Adresse email vérifiée dans Mailjet
- [ ] Service redémarré
- [ ] Test d'invitation effectué
- [ ] Email reçu (vérifier spams)

---

## 🔐 Sécurité

**À FAIRE** ✅ :
- Utiliser les variables d'environnement Render
- Ne jamais commiter les clés dans Git
- Régénérer les clés si compromises

**À NE PAS FAIRE** ❌ :
- Mettre les clés dans le code
- Partager les clés publiquement
- Utiliser les mêmes clés en dev et prod

---

## 📞 Support

**Documentation** :
- Guide complet : `GUIDE_CONFIGURATION_MAILJET.md`
- Mailjet Docs : https://dev.mailjet.com/
- Support Mailjet : https://www.mailjet.com/support/

**En cas de problème** :
1. Vérifiez les logs Render
2. Testez avec une autre adresse email
3. Vérifiez le statut Mailjet : https://status.mailjet.com/
4. Contactez le support Mailjet si nécessaire

---

**Dernière mise à jour** : 3 février 2026
