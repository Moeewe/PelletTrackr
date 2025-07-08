#!/bin/bash
# Build-Skript für Netlify Deployment (kopiert alle nötigen Dateien in dist/)

set -e

# Zielordner vorbereiten
rm -rf dist
mkdir -p dist/assets


# Web-App Dateien kopieren (angepasst für aktuelle Struktur)
cp web-app.html dist/
cp web-app.js dist/
cp styles.css dist/
cp index.html dist/

# Scripte und Konfiguration
cp firebase-data-manager.js dist/
cp config.js dist/

# Assets kopieren
cp -r assets/* dist/assets/

# Sonstige benötigte Dateien
cp netlify.toml dist/
cp admin-functions.js dist/
cp app-init.js dist/
cp core-functions.js dist/
cp debug-functions.js dist/
cp user-functions.js dist/

# Optional: Test-Tools
cp tests/csv-import-tool.html dist/

# Info
echo "✅ Build abgeschlossen. Alle Dateien liegen in dist/ bereit für Netlify."
