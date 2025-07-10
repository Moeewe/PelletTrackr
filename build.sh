#!/bin/bash
# Build-Skript für Netlify Deployment (aktualisiert für aufgeräumte Struktur)

set -e

echo "🚀 Starte Build für Netlify..."

# Zielordner vorbereiten
rm -rf dist
mkdir -p dist/assets

# Hauptdateien kopieren (die definitiv existieren)
echo "📄 Kopiere Hauptdateien..."
cp index.html dist/

# styles.css nur kopieren, wenn sie existiert
if [ -f styles.css ]; then
  cp styles.css dist/
  echo "   ✅ styles.css kopiert"
fi

# Impressum und Datenschutz kopieren (korrigierter Pfad)
if [ -f HTML/impressum.html ]; then
  cp HTML/impressum.html dist/
  echo "   ✅ impressum.html kopiert"
fi

if [ -f HTML/datenschutz.html ]; then
  cp HTML/datenschutz.html dist/
  echo "   ✅ datenschutz.html kopiert"
fi

# Favicon kopieren
if [ -f favicon.svg ]; then
  cp favicon.svg dist/
  echo "   ✅ favicon.svg kopiert"
fi

# UX-Helpers und andere JavaScript-Module kopieren
echo "🔧 Kopiere JavaScript-Module..."

# Neue modulare Struktur kopieren
if [ -d js ]; then
  echo "📂 Kopiere js/ Ordner (modulare Struktur)..."
  cp -r js dist/
fi

# Hauptkoordinator kopieren
if [ -f web-app-modular.js ]; then
  cp web-app-modular.js dist/
  echo "   ✅ web-app-modular.js kopiert"
fi

# UX-Helpers kopieren
if [ -f ux-helpers.js ]; then
  cp ux-helpers.js dist/
  echo "   ✅ ux-helpers.js kopiert"
fi

# Legacy web-app.js als Backup kopieren (falls benötigt)
if [ -f web-app.js ]; then
  cp web-app.js dist/web-app-legacy.js
  echo "   ✅ web-app.js als Legacy-Backup kopiert"
fi

# Modular CSS kopieren
echo "🎨 Kopiere modular CSS..."
if [ -f styles-modular.css ]; then
  cp styles-modular.css dist/
fi

if [ -d styles ]; then
  echo "📁 Kopiere styles/ Ordner..."
  cp -r styles dist/
fi

# Konfiguration kopieren (falls vorhanden)
echo "⚙️ Kopiere Konfiguration..."
if [ -f config.js ]; then
  cp config.js dist/
fi

# Firebase-Konfiguration kopieren (falls vorhanden)
if [ -f firestore.rules ]; then
  cp firestore.rules dist/
fi

if [ -f firestore.indexes.json ]; then
  cp firestore.indexes.json dist/
fi

# Assets kopieren (falls Ordner existiert)
if [ -d assets ]; then
  echo "🖼️ Kopiere Assets..."
  cp -r assets/* dist/assets/
fi

# Netlify-Konfiguration kopieren
if [ -f netlify.toml ]; then
  cp netlify.toml dist/
fi

echo "✅ Build erfolgreich abgeschlossen!"
echo "📁 Alle Dateien sind in dist/ bereit für Netlify."
echo "🌐 Hauptdatei: dist/index.html"
