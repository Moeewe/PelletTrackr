#!/bin/bash
# Netlify Deployment Script für PelletTrackr (Aktualisiert 10. Juli 2025)

echo "🚀 Bereite Deployment vor..."

# Führe zuerst Build aus
echo "📦 Erstelle Build..."
./build.sh

echo "📁 Build erfolgreich! Dateien sind in dist/ bereit für Netlify."
echo "💡 Deploy-Optionen:"
echo "1️⃣ Automatisch: Git Push (empfohlen)"
echo "2️⃣ Manuell: Ziehe den 'dist/' Ordner zu Netlify.com"
echo "🌐 Oder öffne: https://app.netlify.com/sites/dynamic-tarsier-45434f/deploys"

# Öffne dist-Ordner für manuelle Uploads (optional)
if command -v open &> /dev/null; then
    open dist
fi
