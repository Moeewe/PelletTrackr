#!/bin/bash
# Netlify Deployment Script für FGF 3D-Druck App

echo "🚀 Bereite Deployment vor..."

# Erstelle einen temporären Deployment-Ordner
mkdir -p deployment-temp

# Kopiere wichtige Dateien aus den neuen Ordnern
cp web/web-app.html deployment-temp/
cp scripts/firebase-data-manager.js deployment-temp/
cp web/web-app.js deployment-temp/
cp web/styles.css deployment-temp/
cp config/config.js deployment-temp/
cp netlify.toml deployment-temp/
cp tests/csv-import-tool.html deployment-temp/

echo "📁 Dateien in deployment-temp/ bereit für Netlify Upload"
echo "💡 Ziehe den 'deployment-temp' Ordner zu Netlify.com"
echo "🌐 Oder öffne: https://app.netlify.com/sites/dynamic-tarsier-45434f/deploys"

open deployment-temp
