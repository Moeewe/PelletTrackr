#!/bin/bash
# Build-Skript für Netlify Deployment (kopiert alle nötigen Dateien in dist/)

set -e

# Zielordner vorbereiten
rm -rf dist
mkdir -p dist/assets


# Web-App Dateien kopieren (angepasst für aktuelle Struktur)
cp index.html dist/
cp web-app.js dist/
cp styles.css dist/

# Scripte und Konfiguration
cp firebase-data-manager.js dist/
cp config.js dist/

# Assets kopieren
cp -r assets/* dist/assets/

# Sonstige benötigte Dateien
cp netlify.toml dist/
cp admin-functions.js dist/
cp core-functions.js dist/
cp debug-functions.js dist/
cp user-functions.js dist/


# Optional: Test-Tools (kopiere nur, wenn Datei existiert)
if [ -f tests/csv-import-tool.html ]; then
  cp tests/csv-import-tool.html dist/
fi

# Info
echo "✅ Build abgeschlossen. Alle Dateien liegen in dist/ bereit für Netlify."
