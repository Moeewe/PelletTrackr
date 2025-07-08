#!/bin/bash
# Build-Skript für Netlify Deployment (kopiert alle nötigen Dateien in dist/)

set -e

# Zielordner vorbereiten
rm -rf dist
mkdir -p dist/assets

# Web-App Dateien kopieren
cp web/web-app.html dist/
cp web/web-app.js dist/
cp web/styles.css dist/
cp web/index.html dist/

# Scripte und Konfiguration
cp scripts/firebase-data-manager.js dist/
cp config/config.js dist/

# Assets kopieren
cp -r assets/* dist/assets/

# Sonstige benötigte Dateien
cp netlify.toml dist/
cp scripts/admin-functions.js dist/
cp scripts/app-init.js dist/
cp scripts/core-functions.js dist/
cp scripts/debug-functions.js dist/
cp scripts/user-functions.js dist/

# Optional: Test-Tools
cp tests/csv-import-tool.html dist/

# Info
echo "✅ Build abgeschlossen. Alle Dateien liegen in dist/ bereit für Netlify."
