# 3D-Druck Abrechnung FGF - Web-App

Eine Google Apps Script Web-Anwendung zur Abrechnung von 3D-Druckaufträgen an der Fachhochschule.

## ✅ Features

### Implementierte Funktionen:
- **Drucke hinzufügen**: Benutzer können Material- und Masterbatch-Verbrauch erfassen
- **Dropdown-Auswahl**: Materialien und Masterbatches werden dynamisch aus der Tabelle geladen
- **Live-Kostenvorschau**: Kosten werden in Echtzeit während der Eingabe berechnet
- **Persönliche Übersicht**: Benutzer sehen nur ihre eigenen Drucke gefiltert nach Name und FH-Kennung
- **Statistiken**: Verbrauchsstatistiken und Kostenübersicht pro Benutzer
- **Verbindungstest**: Überprüfung der Datenbankverbindung
- **Fehlerbehandlung**: Robuste Validierung und Fehlerbehandlung
- **Responsive Design**: Moderne, benutzerfreundliche Oberfläche

### Technische Features:
- **Retry-Mechanismus**: Automatische Wiederholung bei Verbindungsfehlern
- **Konfiguration**: Zentrale Konfiguration über PropertiesService
- **Logging**: Erweiterte Fehlerprotokollierung für Debugging
- **Validierung**: Umfassende Eingabevalidierung (Frontend und Backend)
- **Atomare Operationen**: Sichere Datenbank-Transaktionen

## 🚀 Deployment

### 1. Google Apps Script Projekt erstellen
1. Besuchen Sie [script.google.com](https://script.google.com)
2. Erstellen Sie ein neues Projekt
3. Benennen Sie es "3D-Druck Abrechnung FGF"

### 2. Dateien hochladen
1. Kopieren Sie den Inhalt von `Code.gs` in die Datei `Code.gs`
2. Erstellen Sie eine neue HTML-Datei namens `index.html` und kopieren Sie den Inhalt hinein
3. (Optional) Erstellen Sie eine Datei `test-functions.gs` für Tests

### 3. Google Sheets vorbereiten
1. Erstellen Sie eine neue Google Sheets-Datei
2. Benennen Sie das erste Tabellenblatt "Uebersicht"
3. Richten Sie folgende Spalten ein:
   - A: Datum/Zeit
   - B: Name
   - C: FH-Kennung
   - D: Job-Notiz
   - E: Material
   - F: Materialpreis (€/kg)
   - G: Materialverbrauch (kg)
   - H: Masterbatch
   - I: Masterbatch-Preis (€/kg)
   - J: Masterbatch-Verbrauch (kg)
   - K: Gesamtkosten
   - L: Bezahlt (Ja/Nein)
   - M: Notizen

### 4. Konfiguration
1. Kopieren Sie die Spreadsheet-ID aus der URL Ihrer Google Sheets-Datei
2. Ersetzen Sie die Spreadsheet-ID in der Funktion `initializeConfig()` in `Code.gs`
3. Passen Sie weitere Konfigurationsparameter nach Bedarf an

### 5. Web-App bereitstellen
1. Klicken Sie auf "Bereitstellen" → "Neue Bereitstellung"
2. Wählen Sie "Web-App" als Typ
3. Stellen Sie ein:
   - Ausführen als: "Ich"
   - Wer hat Zugriff: "Jeder" (oder nach Bedarf einschränken)
4. Klicken Sie auf "Bereitstellen"
5. Kopieren Sie die Web-App-URL

## 💡 Verwendung

### Für Endbenutzer:
1. Öffnen Sie die Web-App-URL
2. Geben Sie Ihren Namen und FH-Kennung ein
3. Wählen Sie Material und Masterbatch aus den Dropdowns
4. Geben Sie die Verbrauchsmengen ein
5. Sehen Sie die Live-Kostenvorschau
6. Klicken Sie "Druck hinzufügen"
7. Nutzen Sie "Meine Übersicht" für Ihre bisherigen Drucke
8. Nutzen Sie "Meine Statistiken" für eine Verbrauchsübersicht

### Für Administratoren:
1. Pflegen Sie die Materialliste und Preise direkt in der Google Sheets-Datei
2. Überwachen Sie alle Drucke in der Tabelle
3. Nutzen Sie die Test-Funktionen zur Fehlerdiagnose

## 📋 Original Setup-Checkliste

### 1. Google Sheets vorbereiten
- [ ] Neues Google Sheet erstellen
- [ ] Sheet umbenennen zu "FGF 3D-Druck Abrechnung Großformat"
- [ ] 3 Tabs erstellen:

#### Tab 1: "Druckübersicht" 
Header in Zeile 1:
- A1: Datum
- B1: Name  
- C1: FH Kennung
- D1: Job - Notiz
- E1: Material
- F1: €/kg
- G1: Verbrauch Material in kg
- H1: Masterbatch
- I1: €/kg
- J1: Verbrauch Masterbatch in kg
- K1: Summe
- L1: Bezahlt
- M1: Info (automatisch)

#### Tab 2: "Material"
Header in Zeile 1:
- A1: Material
- B1: Hersteller
- C1: Einkaufspreis / kg netto
- D1: Einkaufspreis / kg brutto
- E1: Verkaufspreis / Kg inkl. 30% Gemeinkosten (Versand, Strom...)

Beispiel-Daten ab Zeile 2:
- A2: PLA, B2: QI Tech, C2: 6,95, D2: 8,2705, E2: 10,8
- A3: PETG, B3: QI Tech, C3: 6,95, D3: 8,2705, E3: 10,8
- A4: Recycling PLA, B4: REflow, C4: 2, D4: 2,38, E4: 3,1

#### Tab 3: "Masterbatch"
Header in Zeile 1:
- A1: Material
- B1: Hersteller  
- C1: Einkaufspreis / kg netto
- D1: Einkaufspreis / kg brutto
- E1: Verkaufspreis / Kg inkl. 30% Gemeinkosten (Versand, Handling...)

Beispiel-Daten ab Zeile 2:
- A2: Masterbatch, B2: Reflow, C2: 55, D2: 65,45, E2: 85,1
- A3: Liquid Masterbatch, B3: Ginger, C3: 80, D3: 95,2, E3: 123,8
- A4: Kein Masterbatch, B4: -, C4: 0, D4: 0, E4: 0

### 2. Google Apps Script einrichten
- [ ] Im Google Sheet: Erweiterungen → Apps Script
- [ ] Code.gs: Bisherigen Code löschen und neuen Code.gs Inhalt einfügen
- [ ] index.html: Neue Datei erstellen und HTML-Inhalt einfügen
- [ ] Projekt speichern

### 3. Web-App bereitstellen
- [ ] Apps Script → Bereitstellen → Neue Bereitstellung
- [ ] Typ: Web-App auswählen
- [ ] Beschreibung: "FGF 3D-Druck Abrechnung v1.0"
- [ ] Ausführen als: Ich (deine E-Mail)
- [ ] Zugriff: Jeder kann zugreifen
- [ ] Bereitstellen klicken
- [ ] Web-App-URL kopieren und sicher aufbewahren

## ⚠️ Wichtige Änderungen (v2.0)

### Neue Tabellenblatt-Struktur
**WICHTIG**: Die Anwendung erwartet jetzt folgende Tabellenblätter:

1. **"Uebersicht"** - Haupttabelle für alle Einträge (wie bisher)
2. **"Material"** - Separate Tabelle für Materialien
   - Spalte A: Material-Name
   - Spalte B: Preis pro kg
3. **"Masterbatch"** - Separate Tabelle für Masterbatches  
   - Spalte A: Masterbatch-Name
   - Spalte B: Preis pro kg

### Migration von v1.0 zu v2.0
Wenn Sie bereits eine v1.0 Installation haben:
1. Erstellen Sie zwei neue Tabellenblätter: "Material" und "Masterbatch"
2. Übertragen Sie die einzigartigen Material- und Masterbatch-Einträge aus der "Uebersicht" in die jeweiligen neuen Blätter
3. Die Dropdowns werden jetzt aus diesen separaten Blättern befüllt
4. Die "Uebersicht" bleibt weiterhin die Haupttabelle für alle Einträge

## 🔧 Fehlerbehebung

### Problem: "Drucke werden nicht gespeichert"
1. Apps Script öffnen → Ausführungen prüfen
2. Console-Log checken
3. Debug-Funktion ausführen:
   ```javascript
   // In Apps Script Console ausführen:
   console.log(testVerbindung());
   ```

### Problem: "Preise werden nicht richtig berechnet"
1. Material-/Masterbatch-Tabs prüfen
2. Debug-Funktionen ausführen:
   ```javascript
   console.log(getMaterialPreise());
   console.log(getMasterbatchPreise());
   ```

### Problem: "Tabelle zeigt keine Daten"
1. Sheet-Namen prüfen (exakte Schreibweise!)
2. FH-Kennung auf Groß-/Kleinschreibung prüfen
3. Browser-Console öffnen (F12) und nach Fehlern schauen

## 🎯 Admin-Funktionen

### Zahlungsstatus ändern
1. Google Sheet direkt öffnen
2. Tab "Druckübersicht" 
3. Spalte L (Bezahlt): "Ja" oder "Nein" eintragen

### Alle Drucke einsehen
- Direkt im Google Sheet unter "Druckübersicht"
- Filtern nach Datum, Name, FH-Kennung möglich

### Preise anpassen
- Tab "Material" oder "Masterbatch" öffnen
- Spalte E (Verkaufspreis) anpassen
- Änderungen gelten sofort für neue Drucke

## 📊 Datenstruktur

### Spalten in "Druckübersicht":
- A: Datum (automatisch)
- B: Name (Eingabe)
- C: FH Kennung (Eingabe)
- D: Job/Notiz (leer, für späteren Gebrauch)
- E: Material (Auswahl)
- F: Material €/kg (automatisch aus "Material"-Tab)
- G: Materialverbrauch kg (Eingabe)
- H: Masterbatch (Auswahl)
- I: Masterbatch €/kg (automatisch aus "Masterbatch"-Tab)
- J: Masterbatch-Verbrauch kg (Eingabe)
- K: Summe € (automatisch berechnet)
- L: Bezahlt (Standard: "Nein", Admin ändert auf "Ja")
- M: Info (für Automatik-Infos)

## 🔒 Sicherheit

- Studierende sehen nur ihre eigenen Drucke
- Nur Admin hat Zugriff auf das Google Sheet
- Web-App ist öffentlich, aber Daten sind geschützt
- FH-Kennung als eindeutiger Identifier

## 📱 Verwendung

### Für Studierende:
1. Web-App-Link aufrufen
2. Name und FH-Kennung eingeben → Einloggen
3. Material und Verbrauch eingeben → Druck bestätigen
4. Bisherige Drucke werden angezeigt

### Für Admin:
1. Google Sheet öffnen
2. Alle Drucke in "Druckübersicht" einsehen
3. Zahlungsstatus in Spalte L ändern
4. Bei Bedarf Preise in "Material"/"Masterbatch" anpassen
