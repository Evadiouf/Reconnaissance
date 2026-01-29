#!/bin/bash
# Script de build pour Render

echo "🚀 Début du build du backend SenPointage..."

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# Build de l'application
echo "🔨 Build de l'application..."
npm run build

# Vérification du build
echo "✅ Build terminé avec succès!"

# Démarrage en production
echo "🌐 Démarrage en mode production..."
npm run start:prod
