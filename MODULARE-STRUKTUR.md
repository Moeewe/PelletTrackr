# 📁 FGF 3D-Druck Abrechnung - Modulare Struktur

## 🎯 **Neue Dateistruktur**

Das Projekt wurde in modulare Dateien aufgeteilt für bessere Wartbarkeit und Übersichtlichkeit:

### **📄 HTML & CSS**
- `index-modular.html` - Neue modulare Hauptdatei (sauberer und übersichtlicher)
- `index.html` - Original-Datei (als Backup)
- `styles.css` - Komplettes Fraenk.de-Design System

### **⚙️ JavaScript Module**
- `core-functions.js` - Grundfunktionen (Hilfsfunktionen, Formular, Kostenberechnung, Eintrag hinzufügen)
- `user-functions.js` - Nutzer-spezifische Funktionen (Übersicht, Statistiken)
- `admin-functions.js` - Admin-Funktionen (alle Einträge, bezahlt markieren, Admin-Statistiken)
- `debug-functions.js` - Debug & Test-Funktionen (Preise debuggen, Verbindung testen)
- `app-init.js` - App-Initialisierung und Event-Listener
- `config.js` - Konfigurationsdatei für zentrale Einstellungen

### **🗂️ Backend**
- `Code.gs` - Google Apps Script Backend (unverändert)
- `test-functions.gs` - Test-Funktionen (unverändert)

## 🚀 **Verwendung**

### **Für Entwicklung:**
Verwende `index-modular.html` - die neue modulare Version mit externen JS/CSS-Dateien.

### **Für Google Apps Script Deployment:**
Verwende `index.html` - die Original-Datei mit allem inline (Google Apps Script unterstützt keine externen Dateien).

## 📋 **Funktionen pro Modul**

### **core-functions.js**
- `parseGermanNumber()` - Deutsche Zahlenformate parsen
- `throttle()` - Performance-Optimierung
- `showStatusMessage()` - Status-Nachrichten
- `showLoading()` - Lade-Anzeigen
- `clearForm()` - Formular zurücksetzen
- `loadMaterials()` / `loadMasterbatches()` - Dropdowns füllen
- `calculateCostPreview()` - Live-Kostenvorschau
- `AddRow()` - Neuen Eintrag hinzufügen

### **user-functions.js**
- `showOverview()` - Nutzer-Einträge anzeigen
- `showStatistics()` - Nutzer-Statistiken
- `showUserOverview()` / `showUserStatistics()` - Wrapper mit Validierung

### **admin-functions.js**
- `checkAdminAccess()` - **Passwortschutz für Admin-Bereich**
- `showAdminView()` - Alle Einträge anzeigen (mit Passwortschutz)
- `markAsPaid()` - Eintrag als bezahlt markieren
- `showAdminStatistics()` - Admin-Statistiken (mit Passwortschutz)
- `showAdminStatistics()` - Admin-Statistiken

### **debug-functions.js**
- `debugPrices()` - Preisberechnung debuggen
- `testConnection()` - Verbindung testen (alte Methode)
- `testWithUserData()` - Verbindung mit echten Daten testen

### **app-init.js**
- `window.onload` - App-Initialisierung
- Event-Listener für alle Eingabefelder
- Live-Kostenberechnung Setup

### **config.js**
- `APP_CONFIG` - Zentrale Konfiguration für App-Einstellungen
- `adminPassword` - **Admin-Passwort (WICHTIG: In Produktion ändern!)**
- `appName` / `appTitle` - Branding-Einstellungen
- `theme` - Farb-Konfiguration
- `debugMode` - Entwicklungs-/Produktionsmodus

## 🔧 **Vorteile der modularen Struktur**

### **✅ Bessere Wartbarkeit**
- Jede Funktion hat ihren eigenen Bereich
- Einfacher zu debuggen und zu erweitern
- Klare Trennung von Verantwortlichkeiten

### **✅ Bessere Übersichtlichkeit**
- Statt 1700 Zeilen in einer Datei: 6 kleinere, fokussierte Dateien
- Schnelleres Finden von spezifischen Funktionen
- Einfacheres Code-Review

### **✅ Bessere Zusammenarbeit**
- Mehrere Entwickler können parallel an verschiedenen Modulen arbeiten
- Weniger Merge-Konflikte
- Modulare Tests möglich

### **✅ Einfachere Erweiterung**
- Neue Admin-Funktionen → `admin-functions.js`
- Neue Debug-Tools → `debug-functions.js`
- Neue UI-Features → `user-functions.js`

## 🎨 **Design System**

Das komplette Fraenk.de-Design ist jetzt in `styles.css` ausgelagert:
- Responsive Design (bis 480px)
- Große Headlines mit gelben Highlights
- Minimalistische Fraenk-Buttons
- Moderne Tabellen und Statistik-Karten
- Lade-Animationen und Status-Nachrichten

## 🔐 **Sicherheit & Branding**

### **Admin-Passwortschutz**
- **Aktuelles Passwort:** `admin123` (in `admin-functions.js` änderbar)
- **Geschützte Funktionen:** 
  - Admin-Ansicht (alle Einträge)
  - Admin-Statistiken
  - Einträge als bezahlt markieren
- **Implementierung:** Prompt-basierte Authentifizierung

### **Branding**
- **Logo:** Neutral "FGF" statt "fraenk"
- **Design:** Beibehaltung des Fraenk-Designsystems
- **Stil:** Minimalistisch, viel Weißraum, gelbe Highlights

## 📱 **Responsive Design**

Das Design funktioniert perfekt auf:
- **Desktop** (800px+)
- **Tablet** (600px - 800px)
- **Mobile** (480px - 600px)
- **Small Mobile** (<480px)

## 🔄 **Migration**

Um zur modularen Version zu wechseln:

1. **Für lokale Entwicklung:** `index-modular.html` öffnen
2. **Für Google Apps Script:** Weiterhin `index.html` verwenden
3. **Änderungen:** Zuerst in den modularen Dateien entwickeln, dann in `index.html` zusammenführen

## 🛠️ **Nächste Schritte**

1. **Admin-Funktionen verbessern** (Filter, Suche, Export)
2. **Weitere Statistiken** (Zeiträume, Trends)
3. **Benutzer-Management** (Rollen, Berechtigungen)
4. **Backup & Export** (CSV, PDF-Reports)

---

*Diese modulare Struktur macht das Projekt viel wartbarer und erweiterbar! 🚀*
