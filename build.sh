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
cp web-app.js dist/
cp styles.css dist/
cp impressum.html dist/
cp datenschutz.html dist/
cp favicon.svg dist/

# UX-Helpers und andere JavaScript-Module kopieren
echo "🔧 Kopiere JavaScript-Module..."
if [ -f ux-helpers.js ]; then
  cp ux-helpers.js dist/
  echo "   ✅ ux-helpers.js kopiert"
fi

# Prüfe auf weitere JS-Module (falls sie existieren)
for js_file in core-functions.js user-functions.js admin-functions.js; do
  if [ -f "$js_file" ]; then
    cp "$js_file" dist/
    echo "   ✅ $js_file kopiert"
  fi
done

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
