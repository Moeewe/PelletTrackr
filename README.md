# PelletTrackr v1.0.0

**Create Smart. Pay Smarter.** – Werkstatt- und Fertigungsplattform

## Überblick

PelletTrackr ist eine Verwaltungs- und Abrechnungsplattform für Werkstatt- und Fertigungsaufträge. Sie unterstützt unter anderem 3D-Druck, Laser, CNC und Robotik sowie Materialbestellungen, Ausleihe und administrative Abläufe.

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
- **Hosting**: Netlify (Frontend), Firebase (Firestore, Auth, Cloud Functions in europe-west1)
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
# Frontend: Push auf master -> Netlify baut automatisch (netlify.toml, build.sh -> dist/)
git push origin master

# Firebase (Projekt fgf-3d-druck)
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm install && cd .. && firebase deploy --only functions
```


### Hilfe-Dokumentation (LARGER.slicer) aktualisieren
Die Anleitungen für Ginger, Weber, UR5 und Zünd liegen im Repository `Moeewe/LARGER.slicer`. Die Hilfe in der App nutzt
einen daraus erzeugten Index (`data/larger-slicer.json`: Dokumente je Maschine, Inhaltsverzeichnisse, Suche, Fehlerhilfen).
Nach Änderungen an den Anleitungen den Index neu erzeugen und die Seite veröffentlichen:

```bash
node scripts/build-knowledge.mjs "/Pfad/zu/LARGER.slicer"
```

## Konfiguration

### Firebase Setup
1. Firebase-Projekt erstellen (Blaze-Tarif für Cloud Functions)
2. Firestore Database und Authentication (E-Mail/Passwort) aktivieren
3. Netlify-Domain unter Authentication → Authorized domains eintragen
4. `js/core/firebase-config.js` mit den Projekt-Credentials aktualisieren
5. `functions/.env` mit `MASTER_ADMIN_CLAIM_EXPIRES_AT=<ISO-Datum>` anlegen (nicht im Git)

### Admin-Rechte
Adminrechte werden ausschließlich über das Feld `isAdmin: true` im Dokument `users/<uid>` vergeben. Es gibt kein Client-Passwort mehr.

## Verwendung

### Erste Schritte
1. Öffnen Sie die Anwendung in Ihrem Browser
2. Registrieren Sie sich mit E-Mail und Passwort und bestätigen Sie die E-Mail-Adresse
3. Vorhandene FH-Kennung-Konten werden beim ersten Login mit der Kennung verknüpft

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
- Adminrechte nur serverseitig über Firestore-Regeln (`users/<uid>.isAdmin`)
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

**PelletTrackr** – Create Smart. Pay Smarter.
