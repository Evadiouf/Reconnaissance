#!/bin/bash

# Script de vérification de sécurité avant push GitHub
# Auteur: SenPointage Team
# Usage: bash .github-security-check.sh

echo "🔒 Vérification de sécurité avant push GitHub..."
echo ""

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Vérifier que .env est dans .gitignore
echo "📋 Vérification des .gitignore..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${RED}❌ ERREUR: .env n'est pas dans .gitignore racine${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ .env est ignoré (racine)${NC}"
fi

if ! grep -q "^\.env$" backend/.gitignore 2>/dev/null; then
    echo -e "${RED}❌ ERREUR: .env n'est pas dans backend/.gitignore${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ .env est ignoré (backend)${NC}"
fi

if ! grep -q "^\.env" frontend/.gitignore 2>/dev/null; then
    echo -e "${RED}❌ ERREUR: .env n'est pas dans frontend/.gitignore${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ .env est ignoré (frontend)${NC}"
fi

echo ""

# 2. Vérifier les fichiers sensibles qui pourraient être trackés
echo "🔍 Recherche de fichiers sensibles trackés par Git..."

SENSITIVE_FILES=(
    "backend/.env"
    "backend/.env.local"
    "backend/.env.production"
    "frontend/.env"
    "frontend/.env.local"
    "frontend/.env.production"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$file" 2>/dev/null >/dev/null; then
        echo -e "${RED}❌ ERREUR: $file est tracké par Git !${NC}"
        echo -e "${YELLOW}   → Exécutez: git rm --cached $file${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# 3. Rechercher des secrets potentiels dans les fichiers staged
echo ""
echo "🔎 Recherche de secrets dans les fichiers staged..."

# Patterns à détecter
PATTERNS=(
    "mongodb\+srv://[^:]+:[^@]+@"
    "JWT_SECRET=[a-zA-Z0-9]{32,}"
    "REDIS_PASSWORD=[^ \n]+"
    "MAILJET_API_KEY=[a-z0-9]+"
    "MAILJET_API_SECRET=[a-z0-9]+"
    "API_KEY=[a-zA-Z0-9-_]+"
    "password=[^ \n]+"
    "sk-[a-z0-9-]+"
)

for pattern in "${PATTERNS[@]}"; do
    matches=$(git diff --cached --name-only -G"$pattern" 2>/dev/null)
    if [ ! -z "$matches" ]; then
        echo -e "${RED}❌ Secrets potentiels détectés dans:${NC}"
        echo -e "${YELLOW}$matches${NC}"
        echo -e "${YELLOW}   Pattern: $pattern${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# 4. Vérifier que env.example ne contient pas de vrais secrets
echo ""
echo "📝 Vérification de env.example..."

if [ -f "backend/env.example" ]; then
    # Vérifier les placeholders sécurisés (doivent contenir "your_", "votre_", ou "exemple")
    INITIAL_ERRORS=$ERRORS
    
    # MongoDB - doit contenir "your_" dans le username/password
    if grep -E "MONGO_URI=mongodb\+srv://[a-z0-9]+:[a-zA-Z0-9]{6,}@[a-z0-9]+" backend/env.example | grep -v -E "(your_|votre_|example)" > /dev/null 2>&1; then
        echo -e "${RED}❌ ERREUR: backend/env.example contient une vraie URI MongoDB !${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # JWT Secret - ne doit pas être un hash hexadécimal de 64+ caractères
    if grep -E "JWT_SECRET=[a-f0-9]{64,}" backend/env.example > /dev/null 2>&1; then
        echo -e "${RED}❌ ERREUR: backend/env.example contient un vrai JWT_SECRET !${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Redis Password - ne doit pas contenir de long string aléatoire
    if grep -E "REDIS_PASSWORD=[a-zA-Z0-9]{40,}" backend/env.example > /dev/null 2>&1; then
        echo -e "${RED}❌ ERREUR: backend/env.example contient un vrai mot de passe Redis !${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Vérifier que les placeholders recommandés sont présents
    if grep -q "your_username:your_password" backend/env.example && \
       grep -q "your_jwt_secret_key_here" backend/env.example && \
       grep -q "your_redis_password_here" backend/env.example; then
        if [ $ERRORS -eq $INITIAL_ERRORS ]; then
            echo -e "${GREEN}✓ env.example est sécurisé${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  env.example pourrait contenir des valeurs réelles${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# 5. Vérifier l'existence des fichiers .env locaux
echo ""
echo "📂 Vérification des fichiers de configuration locaux..."

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  AVERTISSEMENT: backend/.env n'existe pas${NC}"
    echo -e "${YELLOW}   → Copiez backend/env.example vers backend/.env${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 6. Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Aucun problème de sécurité détecté !${NC}"
    echo -e "${GREEN}✅ Vous pouvez pusher sur GitHub en toute sécurité.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS avertissement(s) détecté(s)${NC}"
    echo -e "${YELLOW}   Vous pouvez continuer, mais vérifiez les avertissements.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreur(s) critique(s) détectée(s) !${NC}"
    echo -e "${RED}❌ NE PAS pusher sur GitHub avant de corriger !${NC}"
    echo ""
    echo "🔧 Actions recommandées:"
    echo "   1. Corrigez les erreurs listées ci-dessus"
    echo "   2. Exécutez: git status"
    echo "   3. Si des .env sont staged: git reset HEAD backend/.env"
    echo "   4. Relancez ce script: bash .github-security-check.sh"
    exit 1
fi
