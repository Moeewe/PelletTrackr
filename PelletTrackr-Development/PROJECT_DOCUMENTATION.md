# 3D-Druck FGF Abrechnung - Vollständige Projektdokumentation

## 📋 Projektübersicht

**FGF 3D-Druck Abrechnung** ist eine webbasierte Anwendung zur Verwaltung und Abrechnung von 3D-Druckaufträgen an der Fachhochschule Münster. Das System ermöglicht es Studenten, ihre Druckaufträge zu erfassen und Admins, diese zu verwalten und abzurechnen.

### 🎯 Hauptfunktionen
- **Benutzerverwaltung**: Student/Admin-Rollen mit FH-Kennung-basierter Authentifizierung
- **Druckauftragsverwaltung**: Erfassung von Material, Masterbatch, Mengen und automatischer Kostenkalkulation
- **Zahlungsmanagement**: Bezahlstatus-Tracking mit Nachweis-Upload-Funktion
- **Material-/Masterbatch-Verwaltung**: Admin-Verwaltung von Materialien mit Preiskalkulation
- **Responsive Design**: Optimiert für Desktop, Tablet und Mobile

---

## 🏗️ Technische Architektur

### **Frontend Stack**
- **HTML5 + CSS3 + Vanilla JavaScript** (ES6+)
- **Firebase SDK** (Version 9 modular) für Backend-Services
- **Responsive Design** mit CSS Grid/Flexbox
- **Progressive Web App** Features

### **Backend Services**
- **Firebase Firestore** (NoSQL Database)
- **Firebase Authentication** (Email/Password)
- **Firebase Storage** (Zahlungsnachweis-Uploads)
- **Firebase Hosting** (Deployment)

### **Build & Deployment**
- **Netlify** als primäre Hosting-Plattform
- **Firebase Hosting** als Backup
- Automatische Builds via Git-Integration

---

## 📁 Projektstruktur

### **Root-Verzeichnis**
```
├── index.html                 # Haupt-Anwendung (SPA)
├── config.js                  # Firebase-Konfiguration
├── styles.css                 # Haupt-Stylesheet
├── web-app-modular.js         # Haupt-JavaScript-Entry-Point
├── ux-helpers.js              # UI/UX-Hilfsfunktionen
├── firebase.json              # Firebase-Konfiguration
├── netlify.toml               # Netlify-Deployment-Config
├── build.sh                   # Build-Script
├── deploy.sh                  # Deployment-Script
└── PROJECT_DOCUMENTATION.md   # Diese Dokumentation
```

### **JavaScript-Module (`/js/`)**
```
js/
├── core/                      # Kern-Funktionalitäten
│   ├── app-init.js           # App-Initialisierung
│   ├── auth.js               # Authentifizierung
│   ├── firebase-config.js    # Firebase-Setup
│   ├── globals.js            # Globale Variablen/Funktionen
│   ├── navigation.js         # Navigation/Routing
│   └── utils.js              # Utility-Funktionen
├── features/                  # Feature-spezifische Module
│   ├── entries/              # Druckaufträge
│   │   ├── entry-management.js   # CRUD-Operationen
│   │   ├── entry-rendering.js    # Tabellen-Rendering
│   │   └── entry-stats.js        # Statistiken
│   ├── materials/            # Material-/Masterbatch-Verwaltung
│   │   └── material-loading.js   # Material-CRUD
│   ├── payments/             # Zahlungsmanagement
│   └── users/                # Benutzerverwaltung
│       └── user-management.js    # User-CRUD
└── ui/                        # UI-Komponenten
    ├── button-factory.js      # Zentrale Button-Erstellung
    ├── cost-calculator.js     # Kostenkalkulation
    ├── modals.js             # Modal-System
    ├── payment-proof.js      # Zahlungsnachweis-Upload
    └── sorting.js            # Tabellen-Sortierung
```

### **Stylesheets (`/styles/`)**
```
styles/
├── base.css                   # Reset & Base-Styles
├── layout.css                 # Layout & Grid-System
├── buttons.css                # Button-System (WICHTIG!)
├── forms.css                  # Formulare & Inputs
├── tables.css                 # Tabellen-Styling
├── modals.css                 # Modal-System
├── card-design.css           # Karten-Layout
├── modal-enhancements.css    # Modal-Verbesserungen
├── responsive.css            # Responsive Breakpoints
├── toast.css                 # Toast-Notifications
├── footer.css                # Footer-Styling
└── utilities.css             # Utility-Klassen
```

---

## 🎨 Design-System & UI-Konsistenz

### **Harmonische Farbpalette**
```css
/* Primärfarben - NIEMALS ÄNDERN! */
--primary-black: #000000;      /* Primäre Aktionen */
--primary-white: #FFFFFF;      /* Sekundäre Aktionen */
--warning-yellow: #FFEB00;     /* Warnungen & Nachweis */

/* Harmonische Akzentfarben - Mit Gelb harmonisiert */
--success-green: #4CAF50;      /* Erfolg/Bezahlt */
--success-green-hover: #45a049;
--danger-red: #FF5722;         /* Gefahr/Löschen */
--danger-red-hover: #e64a19;
--undo-gray: #757575;          /* Rückgängig-Aktionen */
--undo-gray-hover: #616161;

/* Neutral */
--light-gray: #f8f8f8;         /* Backgrounds */
--border-gray: #f0f0f0;        /* Borders */
```

### **Button-System (KRITISCH!)**
Das Button-System ist **zentral über ButtonFactory** verwaltet:

**Button-Typen & Verwendung:**
- `btn-primary`: Schwarz - Hauptaktionen (Bearbeiten, Speichern, Hinzufügen)
- `btn-secondary`: Weiß mit schwarzem Rand - Sekundäre Aktionen (Schließen, Abbrechen)
- `btn-tertiary`: Weiß mit schwarzem Rand - Tertiäre Aktionen (Details)
- `btn-success`: Harmonisches Grün - Erfolg (Nachweis anzeigen, Bezahlt)
- `btn-warning`: Gelb - Warnungen (Mahnung)
- `btn-danger`: Harmonisches Rot - Gefährliche Aktionen (Löschen)
- `btn-undo`: Harmonisches Grau - Rückgängig-Aktionen
- `btn-nachweis`: Gelb - Spezial für Nachweis-Buttons

**WICHTIG:** Alle Buttons MÜSSEN über `ButtonFactory` erstellt werden!

### **Responsive Design-Prinzipien**
- **Mobile First**: Basis-Styles für Mobile, dann Desktop-Erweiterungen
- **Touch-Optimiert**: Mindest-Touch-Targets von 44px
- **Flexible Layouts**: CSS Grid/Flexbox für adaptive Layouts
- **Breakpoints**: 768px (Tablet), 1024px (Desktop)

---

## 🔧 Entwicklungsrichtlinien

### **JavaScript-Entwicklung**

#### **Modulare Struktur**
```javascript
// ✅ RICHTIG: Modulare Funktionen
function renderUserEntries(entries) {
  // Feature-spezifische Logik
}

// ✅ RICHTIG: Globale Exports am Ende
window.renderUserEntries = renderUserEntries;
```

#### **Button-Erstellung (PFLICHT!)**
```javascript
// ✅ RICHTIG: ButtonFactory verwenden
const editButton = ButtonFactory.editEntry(entryId);
const deleteButton = ButtonFactory.deleteEntry(entryId);

// ❌ FALSCH: Hardkodierte HTML-Buttons
const badButton = '<button class="btn btn-primary">Edit</button>';
```

#### **Modal-Verwaltung**
```javascript
// ✅ RICHTIG: Konsistente Modal-Funktionen
showModalWithContent(modalHtml);

// ❌ FALSCH: Verschiedene Modal-Aufrufe
window.showModal(modalHtml);
```

### **CSS-Entwicklung**

#### **BEM-ähnliche Namenskonvention**
```css
/* ✅ RICHTIG: Konsistente Klassennamen */
.data-table
.data-table__header
.data-table__cell
.btn
.btn--primary
.modal
.modal__content
```

#### **Responsive Patterns**
```css
/* ✅ RICHTIG: Mobile First */
.element {
  /* Mobile Styles */
  width: 100%;
}

@media (min-width: 768px) {
  .element {
    /* Tablet/Desktop Styles */
    width: 50%;
  }
}
```

### **Neue Features entwickeln**

#### **1. Feature-Planung**
- Bestehende Module analysieren
- ButtonFactory-Integration planen
- Responsive Design berücksichtigen
- Modal-System nutzen

#### **2. Implementation-Schritte**
1. **JavaScript-Modul erstellen** (`/js/features/[feature-name]/`)
2. **CSS-Styling hinzufügen** (`/styles/[feature-name].css`)
3. **ButtonFactory erweitern** (falls neue Button-Typen)
4. **Modal-Integration** (falls UI-Interaktion)
5. **Responsive Testing** (Mobile/Tablet/Desktop)

#### **3. Integration**
```javascript
// In web-app-modular.js hinzufügen
import './js/features/[feature-name]/[module].js';
```

---

## 🔄 Datenbankstruktur (Firestore)

### **Collections**

#### **`users`**
```javascript
{
  id: "fh-kennung",              // Document ID = FH-Kennung
  name: "Max Mustermann",        // Vollständiger Name
  email: "mmustermann@fh-muenster.de", // Optional
  kennung: "mmustermann",        // FH-Kennung (lowercase)
  isAdmin: false,                // Admin-Status
  createdAt: Timestamp,          // Registrierungsdatum
  lastLogin: Timestamp           // Letzter Login
}
```

#### **`entries`** (Druckaufträge)
```javascript
{
  id: "auto-generated",          // Firestore Auto-ID
  kennung: "mmustermann",        // FH-Kennung des Users
  name: "Max Mustermann",        // Name (denormalisiert)
  timestamp: Timestamp,          // Erstellungsdatum
  jobName: "Gehäuseteil",        // Projektname
  jobNotes: "Besondere Anforderungen", // Optional
  
  // Material
  material: "PLA Weiß",          // Material-Name
  materialMenge: 0.25,           // kg
  materialPrice: 15.50,          // €/kg
  materialCost: 3.88,            // Berechnet
  
  // Masterbatch
  masterbatch: "Schwarz MB",     // Masterbatch-Name  
  masterbatchMenge: 0.02,        // kg
  masterbatchPrice: 45.00,       // €/kg
  masterbatchCost: 0.90,         // Berechnet
  
  // Kosten
  totalCost: 4.78,               // Gesamtkosten
  
  // Status
  paid: false,                   // Bezahlstatus
  isPaid: false,                 // Legacy-Feld
  paymentProofUrl: "gs://...",   // Storage-URL für Nachweis
  paymentDate: Timestamp         // Bezahldatum
}
```

#### **`materials`**
```javascript
{
  id: "auto-generated",
  name: "PLA Weiß",              // Material-Name
  manufacturer: "Hersteller XY", // Hersteller
  netPrice: 12.50,               // Einkaufspreis netto €/kg
  taxRate: 19,                   // Mehrwertsteuer %
  markup: 30,                    // Gemeinkosten-Aufschlag %
  // Berechnet:
  // grossPrice = netPrice * (1 + taxRate/100)
  // sellingPrice = grossPrice * (1 + markup/100)
}
```

#### **`masterbatches`**
```javascript
{
  id: "auto-generated",
  name: "Schwarz MB",            // Masterbatch-Name
  manufacturer: "Hersteller XY", // Hersteller
  netPrice: 35.00,               // Einkaufspreis netto €/kg
  taxRate: 19,                   // Mehrwertsteuer %
  markup: 30,                    // Gemeinkosten-Aufschlag %
  // Berechnung analog zu materials
}
```

---

## 🚀 Deployment & Build

### **Netlify (Primär)**
```bash
# Automatisches Deployment via Git
git push origin main  # Löst automatisches Build aus
```

**Netlify-Konfiguration** (`netlify.toml`):
```toml
[build]
  publish = "."
  command = "echo 'Static site ready'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **Firebase (Backup)**
```bash
# Manual Deployment
npm install -g firebase-tools
firebase login
firebase deploy
```

### **Build-Prozess**
```bash
# Development
# Keine Build-Schritte erforderlich - direkte Entwicklung

# Production
./build.sh    # Optional: Optimierungen
./deploy.sh   # Deployment-Helper
```

---

## 🐛 Häufige Probleme & Lösungen

### **Modal-Probleme**
- **Problem**: Modals öffnen im Hintergrund
- **Lösung**: Immer `showModalWithContent()` verwenden, nie `window.showModal()`
- **Z-Index**: Modals haben z-index: 10500

### **Button-Inkonsistenzen**
- **Problem**: Buttons sehen unterschiedlich aus
- **Lösung**: Alle Buttons über `ButtonFactory` erstellen
- **Wichtig**: Harmonische Farben nicht ändern!

### **Responsive Probleme**
- **Problem**: Layout bricht auf Mobile
- **Lösung**: Mobile-First CSS, Touch-Targets mindestens 44px

### **Firebase-Fehler**
- **Problem**: "Permission denied"
- **Lösung**: Firestore Rules prüfen, User-Authentifizierung verifizieren

---

## 📝 Wartung & Updates

### **CSS-Updates**
1. **Niemals** die harmonischen Farben in `buttons.css` ändern
2. **Immer** Mobile-First entwickeln
3. **Testen** auf allen Breakpoints

### **JavaScript-Updates**
1. **Modulare Struktur** beibehalten
2. **ButtonFactory** für alle neuen Buttons verwenden
3. **Globale Exports** am Ende der Module

### **Neue Features**
1. **Analysieren** der bestehenden Struktur
2. **Planen** der ButtonFactory-Integration
3. **Implementieren** mit Modal-System
4. **Testen** auf allen Geräten

---

## 🎯 Für KI-Entwickler: Schnellstart-Checkliste

### **Bevor du anfängst:**
- [ ] Projektstruktur verstanden
- [ ] Farbpalette (harmonisch!) notiert
- [ ] ButtonFactory-System verstanden
- [ ] Modal-System verstanden
- [ ] Responsive Breakpoints notiert

### **Bei Button-Änderungen:**
- [ ] Nur über ButtonFactory arbeiten
- [ ] Harmonische Farben beibehalten
- [ ] Mobile Touch-Targets beachten

### **Bei Modal-Änderungen:**
- [ ] `showModalWithContent()` verwenden
- [ ] Z-Index nicht ändern
- [ ] Responsive Modal-Größen testen

### **Bei neuen Features:**
- [ ] Modulare JavaScript-Struktur
- [ ] CSS in separater Datei
- [ ] ButtonFactory erweitern falls nötig
- [ ] Modal-Integration planen
- [ ] Mobile-First CSS

### **Kritische Dateien (VORSICHTIG!):**
- `styles/buttons.css` - Zentrale Button-Styles
- `js/ui/button-factory.js` - Button-Erstellung
- `js/ui/modals.js` - Modal-System
- `styles/modals.css` - Modal-Styling

---

## 📞 Support & Kontakt

Bei Fragen zur Weiterentwicklung:
1. Diese Dokumentation vollständig lesen
2. Bestehende Code-Patterns analysieren
3. Konsistenz mit bestehendem Design sicherstellen
4. Mobile-First entwickeln
5. ButtonFactory verwenden

**Letzte Aktualisierung:** 10. Juli 2025
**Version:** 2.0 (Modernisiertes UI/UX mit harmonischen Farben)
