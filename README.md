# PelletTrackr v1.0.0

**FGF 3D-Druck Verwaltung und Abrechnungssystem**

## Überblick

PelletTrackr ist ein vollständiges Verwaltungs- und Abrechnungssystem für 3D-Druck-Services. Die Anwendung ermöglicht es Benutzern, Druckaufträge zu verwalten, Materialien zu bestellen und Ausrüstung zu leihen, während Administratoren alle Prozesse überwachen und verwalten können.

## Features

### Benutzer-Features
- **Druckauftrag-Management**: Erstellen und verwalten von Druckaufträgen
- **Material-Bestellungen**: Anfragen für neue Materialien einreichen
- **Ausrüstung-Verleih**: Ausrüstung ausleihen und zurückgeben
- **Problem-Reports**: Technische Probleme melden
- **Live-Drucker-Status**: Verfügbare Drucker in Echtzeit anzeigen
- **Zahlungsnachweise**: Automatische Generierung von Rechnungen

### Admin-Features
- **Benutzer-Management**: Benutzer verwalten und Admin-Rechte vergeben
- **Material-Management**: Materialien hinzufügen, bearbeiten und Bestellungen genehmigen
- **Ausrüstung-Management**: Ausrüstung verwalten und Verleih-Prozesse überwachen
- **Problem-Management**: Problem-Reports bearbeiten und lösen
- **Zahlungs-Management**: Zahlungen verfolgen und verwalten
- **Statistiken**: Detaillierte Berichte und Analysen

## Technische Details

### Technologie-Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Netlify
- **Styling**: Custom CSS mit responsivem Design

### Browser-Unterstützung
- Chrome (empfohlen)
- Firefox
- Safari
- Edge

## Installation

### Voraussetzungen
- Python 3.x (für lokale Entwicklung)
- Git
- Firebase-Projekt (für Produktion)

### Lokale Entwicklung
```bash
# Repository klonen
git clone https://github.com/your-repo/pellet-trackr.git
cd pellet-trackr

# Lokalen Server starten
python3 -m http.server 8001

# Anwendung öffnen
open http://localhost:8001
```

### Produktions-Deployment
```bash
# Build-Prozess
npm run build

# Deployment
npm run deploy
```

## Konfiguration

### Firebase Setup
1. Firebase-Projekt erstellen
2. Firestore Database aktivieren
3. Authentication aktivieren
4. `firebase-config.js` mit Ihren Credentials aktualisieren

### Admin-Passwort
Das Standard-Admin-Passwort ist: `fgf2025admin`

**Wichtig**: Ändern Sie das Passwort in der Produktionsumgebung!

## Verwendung

### Erste Schritte
1. Öffnen Sie die Anwendung in Ihrem Browser
2. Melden Sie sich mit Ihrem Namen und FH-Kennung an
3. Für Admin-Funktionen: Klicken Sie auf "Als Admin anmelden"

### Benutzer-Workflow
1. **Druckauftrag erstellen**: Material, Menge und Masterbatch auswählen
2. **Material anfordern**: Neue Materialien über das Bestellsystem anfragen
3. **Ausrüstung leihen**: Verfügbare Ausrüstung ausleihen
4. **Probleme melden**: Technische Probleme über das Report-System melden

### Admin-Workflow
1. **Benutzer verwalten**: Neue Benutzer hinzufügen und Rechte vergeben
2. **Materialien verwalten**: Bestellungen genehmigen und Materialien hinzufügen
3. **Ausrüstung überwachen**: Verleih-Prozesse und Rückgaben verwalten
4. **Probleme lösen**: Problem-Reports bearbeiten und Lösungen implementieren

## Sicherheit

### Datenschutz
- Alle Daten werden in Firebase Firestore gespeichert
- Verschlüsselte Übertragung über HTTPS
- Benutzer-spezifische Datenzugriffe
- DSGVO-konforme Datenspeicherung

### Admin-Sicherheit
- Passwort-geschützter Admin-Bereich
- Session-Management
- Audit-Logs für kritische Aktionen

## Support

### Bekannte Probleme
- Keine bekannten kritischen Probleme in v1.0.0

### Bug Reports
Bitte melden Sie Bugs über das Problem-Report-System in der Anwendung oder erstellen Sie ein Issue im GitHub-Repository.

## Changelog

### v1.0.0 (2025-07-23)
- **Erste stabile Version**
- Vollständiges Benutzer- und Admin-Management
- Material-Bestellsystem
- Ausrüstung-Verleih-System
- Problem-Report-System
- Zahlungsnachweis-Generierung
- Responsive Design
- Firebase-Integration
- Admin-Passwort: fgf2025admin

## Lizenz

Proprietäre Lizenz - Alle Rechte vorbehalten.

Dieses Software ist das geistige Eigentum von FGF - 3D-Druck Labor. 
Jegliche Nutzung, Vervielfältigung oder Verbreitung ohne ausdrückliche 
schriftliche Genehmigung ist untersagt.

Für Lizenzanfragen kontaktieren Sie bitte FGF - 3D-Druck Labor.

## Kontakt

FGF - 3D-Druck Labor
Email: [Ihre Email]
Website: [Ihre Website]

---

**PelletTrackr v1.0.0** - Print Smart. Pay Smart. 