# 🔐 FGF 3D-Druck Abrechnung - Sicherheitshinweise

## ⚠️ **Wichtige Sicherheitsmaßnahmen**

### **1. Admin-Passwort ändern**
**WICHTIG:** Vor der Produktivnutzung das Standard-Passwort ändern!

**Aktuelles Passwort:** `admin123`

**Passwort ändern in:**
- `config.js` → `APP_CONFIG.adminPassword`
- Oder direkt in `admin-functions.js` (als Fallback)

### **2. Geschützte Admin-Funktionen**
Der Admin-Bereich ist durch ein Passwort geschützt:
- 📊 Admin-Ansicht (alle Einträge)
- 📈 Admin-Statistiken
- ✅ Einträge als bezahlt markieren

### **3. Zugriff auf Admin-Funktionen**
1. Button "🔧 Admin: Alle Einträge" oder "📊 Admin: Statistiken" klicken
2. Passwort eingeben
3. Bei korrektem Passwort: Zugang gewährt
4. Bei falschem Passwort: Zugang verweigert

## 🎨 **Branding**

### **Aktuelles Design**
- **Logo:** "FGF" (neutral, nicht "fraenk")
- **Stil:** Fraenk-Designsystem beibehalten
- **Farben:** Gelbe Highlights (#FFFF00), schwarzer Text, weißer Hintergrund

### **Branding anpassen**
Änderungen in `config.js`:
```javascript
const APP_CONFIG = {
  appName: "FGF",           // Logo-Text
  appTitle: "3D-Druck Abrechnung", // Untertitel
  // ...
};
```

## 🚀 **Deployment**

### **Für Google Apps Script**
1. Alle Inhalte aus den modularen Dateien in `index.html` kopieren
2. **config.js** Inhalte in `index.html` einfügen
3. Passwort in Produktivumgebung ändern
4. Apps Script deployen

### **Für lokale Entwicklung**
1. `index-modular.html` verwenden
2. Alle `.js` und `.css` Dateien im gleichen Ordner
3. Passwort in `config.js` ändern

## 🔧 **Wartung**

### **Regelmäßige Sicherheitschecks**
- [ ] Passwort regelmäßig ändern
- [ ] Admin-Zugriffe überwachen
- [ ] Backup der Daten erstellen
- [ ] Updates der Google Apps Script API

### **Fehlerbehandlung**
- Passwort-Eingabe wird bei falscher Eingabe abgebrochen
- Admin-Funktionen sind nur nach erfolgreicher Authentifizierung verfügbar
- Normale Nutzer-Funktionen bleiben ungeschützt

## 📞 **Support**

Bei Problemen oder Fragen:
1. Dokumentation prüfen (`MODULARE-STRUKTUR.md`)
2. Debug-Funktionen verwenden (🔧 Verbindung testen)
3. Google Apps Script Logs prüfen
4. Passwort zurücksetzen falls vergessen

---

**⚠️ WICHTIG:** Dieses Dokument enthält sicherheitsrelevante Informationen. Nicht öffentlich zugänglich machen!
