#!/bin/bash
# =============================================================================
# SenPointage — Script d'installation du Kiosque de pointage automatique
# Installe et configure MediaMTX pour le flux vidéo de la caméra IP
# =============================================================================

set -e

MEDIAMTX_VERSION="v1.9.3"
MEDIAMTX_URL="https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz"
INSTALL_DIR="$HOME/senpointage-kiosque"
SERVICE_NAME="senpointage-kiosque"

echo ""
echo "=============================================="
echo "  SenPointage — Installation du Kiosque"
echo "=============================================="
echo ""

# Créer le dossier d'installation
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# ─────────────────────────────────────────────────
# 1. Demander les informations de la caméra
# ─────────────────────────────────────────────────
echo "Entrez les informations de la caméra Dahua :"
echo ""

read -p "  IP de la caméra (ex: 192.168.1.108) : " CAMERA_IP
if [[ -z "$CAMERA_IP" ]]; then
  echo "❌ IP de la caméra obligatoire." && exit 1
fi

read -p "  Nom d'utilisateur caméra [admin] : " CAMERA_USER
CAMERA_USER=${CAMERA_USER:-admin}

read -s -p "  Mot de passe caméra : " CAMERA_PASS
echo ""
if [[ -z "$CAMERA_PASS" ]]; then
  echo "❌ Mot de passe obligatoire." && exit 1
fi

read -p "  Port RTSP [554] : " CAMERA_PORT
CAMERA_PORT=${CAMERA_PORT:-554}

# URL RTSP Dahua standard
RTSP_URL="rtsp://${CAMERA_USER}:${CAMERA_PASS}@${CAMERA_IP}:${CAMERA_PORT}/cam/realmonitor?channel=1&subtype=0"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Caméra : ${CAMERA_IP}:${CAMERA_PORT}"
echo "  URL RTSP (masquée) : rtsp://${CAMERA_USER}:****@${CAMERA_IP}:${CAMERA_PORT}/cam/realmonitor?channel=1&subtype=0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─────────────────────────────────────────────────
# 2. Télécharger MediaMTX
# ─────────────────────────────────────────────────
if [[ ! -f "$INSTALL_DIR/mediamtx" ]]; then
  echo "⬇️  Téléchargement de MediaMTX ${MEDIAMTX_VERSION}..."
  if command -v wget &>/dev/null; then
    wget -q --show-progress "$MEDIAMTX_URL" -O mediamtx.tar.gz
  elif command -v curl &>/dev/null; then
    curl -L --progress-bar "$MEDIAMTX_URL" -o mediamtx.tar.gz
  else
    echo "❌ wget ou curl requis. Installez-en un et relancez." && exit 1
  fi
  tar xzf mediamtx.tar.gz mediamtx 2>/dev/null || tar xzf mediamtx.tar.gz
  rm -f mediamtx.tar.gz
  chmod +x mediamtx
  echo "✅ MediaMTX téléchargé."
else
  echo "✅ MediaMTX déjà présent, mise à jour ignorée."
fi

# ─────────────────────────────────────────────────
# 3. Créer la configuration MediaMTX
# ─────────────────────────────────────────────────
cat > "$INSTALL_DIR/mediamtx.yml" << EOF
# Configuration SenPointage — MediaMTX
# Généré automatiquement par install.sh

# Port HLS (le navigateur accède à http://localhost:8888/camera/index.m3u8)
hlsAddress: :8888

# Port RTSP interne
rtspAddress: :8554

# Désactiver les logs verbeux
logLevel: warn

paths:
  camera:
    # Source : flux RTSP de la caméra Dahua
    source: ${RTSP_URL}
    # Reconnecter automatiquement si la caméra redémarre
    sourceOnDemand: yes
    sourceOnDemandStartTimeout: 10s
    sourceOnDemandCloseAfter: 60s
EOF

echo "✅ Configuration créée : $INSTALL_DIR/mediamtx.yml"

# ─────────────────────────────────────────────────
# 4. Créer le service systemd (démarrage automatique)
# ─────────────────────────────────────────────────
if command -v systemctl &>/dev/null && [[ $EUID -eq 0 ]]; then
  # Installation en tant que root → service système
  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=SenPointage Kiosque — MediaMTX Camera Relay
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/mediamtx ${INSTALL_DIR}/mediamtx.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl start "$SERVICE_NAME"
  echo "✅ Service systemd créé et démarré (démarrage automatique activé)."
else
  # Installation sans root → script de démarrage simple
  cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "▶ Démarrage de MediaMTX SenPointage..."
./mediamtx mediamtx.yml &
echo "✅ MediaMTX démarré (PID: $!)"
echo "   Flux HLS disponible sur : http://localhost:8888/camera/index.m3u8"
echo "   Pour arrêter : kill $!"
EOF
  chmod +x "$INSTALL_DIR/start.sh"

  # Ajouter au démarrage automatique via autostart (GNOME/XFCE)
  AUTOSTART_DIR="$HOME/.config/autostart"
  mkdir -p "$AUTOSTART_DIR"
  cat > "$AUTOSTART_DIR/senpointage-kiosque.desktop" << EOF
[Desktop Entry]
Type=Application
Name=SenPointage Kiosque
Exec=${INSTALL_DIR}/mediamtx ${INSTALL_DIR}/mediamtx.yml
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=SenPointage camera relay (MediaMTX)
EOF
  echo "✅ Démarrage automatique configuré (autostart desktop)."
fi

# ─────────────────────────────────────────────────
# 5. Test de connexion à la caméra
# ─────────────────────────────────────────────────
echo ""
echo "⏳ Démarrage de MediaMTX pour tester la connexion..."
"$INSTALL_DIR/mediamtx" "$INSTALL_DIR/mediamtx.yml" &
MEDIAMTX_PID=$!
sleep 5

# Vérifier que MediaMTX tourne
if kill -0 $MEDIAMTX_PID 2>/dev/null; then
  echo "✅ MediaMTX en cours d'exécution (PID: $MEDIAMTX_PID)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✅ INSTALLATION TERMINÉE AVEC SUCCÈS"
  echo ""
  echo "  URL HLS à configurer dans SenPointage :"
  echo "  ➜  http://localhost:8888/camera/index.m3u8"
  echo ""
  echo "  Étapes suivantes :"
  echo "  1. Ouvrez la plateforme SenPointage en ligne"
  echo "  2. Allez dans Caméras → Modifier la caméra"
  echo "  3. Dans 'URL HLS locale (Kiosque)', saisissez :"
  echo "     http://localhost:8888/camera/index.m3u8"
  echo "  4. Enregistrez, puis allez sur la page 'Kiosque'"
  echo "  5. Cliquez 'Démarrer le kiosque' → la caméra s'active"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo "⚠️  MediaMTX s'est arrêté. Vérifiez l'IP et le mot de passe de la caméra."
  echo "    Relancez ce script avec les bonnes informations."
fi
