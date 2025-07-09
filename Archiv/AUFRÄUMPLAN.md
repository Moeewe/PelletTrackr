# 🗑️ AUFRÄUMPLAN - Was kann gelöscht werden?

## ✅ **EMPFOHLENE LÖSCHUNGEN:**

### 📄 **VERALTETE/ÜBERFLÜSSIGE DATEIEN:**

#### 🔴 **SOFORT LÖSCHEN (Sicher):**
- `debug-test.html` - Nur für Tests erstellt
- `system-test.html` - Nur für Tests erstellt
- `debug-login.js` - War nur für Reparatur nötig
- `login-fix.js` - War nur für Reparatur nötig
- `app-init.js` - Nicht mehr verwendet (leer)
- `MOBILE_LAYOUT_FIXES.md` - Leer

#### 🟡 **VERALTET (Nach Bestätigung löschen):**
- `index-modular.html` - Unvollständige Version (behalten: `index-modular-complete.html`)
- `core-functions.js` - Alte Google Apps Script Funktionen
- `admin-functions.js` - Alte Google Apps Script Funktionen  
- `user-functions.js` - Alte Google Apps Script Funktionen
- `debug-functions.js` - Alte Google Apps Script Funktionen
- `firebase-data-manager.js` - Alte Implementierung

#### 📁 **ALTE BACKUP-DATEIEN:**
- `web-app.js.backup` - Alter Backup
- `web-app.js.backup.20250709_205503` - Zeitstempel-Backup
- `web-app.js.backup.20250709_205547` - Zeitstempel-Backup
- `web-app.js.backup2` - Alter Backup

#### 🏗️ **BUILD/DEPLOYMENT (Optional):**
- `build.sh` - Nur für Netlify (wenn nicht verwendet)
- `deploy.sh` - Nur für Netlify (wenn nicht verwendet)
- `dist/` Ordner - Build-Artefakte (wenn vorhanden)

---

## ⚠️ **BEHALTEN (Wichtig):**

### 🔵 **PRODUKTIVE DATEIEN:**
- `index.html` ✅ - **AKTUELLE HAUPTVERSION**
- `web-app.js` ✅ - **FUNKTIONIERT PERFEKT**
- `styles.css` ✅ - **MIT ALLEN FIXES**
- `config.js` ✅ - **KONFIGURATION**

### 🔵 **ENTWICKLUNGSVERSION:**
- `index-modular-complete.html` ✅ - **VOLLSTÄNDIGE MODULARE VERSION**
- `web-app-modular.js` ✅ - **MODULAR VERSION**
- `modules/` Ordner ✅ - **ALLE MODULE**

### 🔵 **LEGAL/STATIC:**
- `impressum.html` ✅
- `datenschutz.html` ✅
- `favicon.svg` ✅
- `assets/` Ordner ✅

### 🔵 **FIREBASE/CONFIG:**
- `firestore.rules` ✅
- `firestore.indexes.json` ✅
- `netlify.toml` ✅ (falls Netlify verwendet wird)

### 🔵 **DOKUMENTATION (Optional behalten):**
- `README.md` ✅
- `WELCHE_VERSION_VERWENDEN.md` ✅ **NEU ERSTELLT**
- `PROJEKT_STATUS_AKTUELL.md` ✅ **AKTUELLE ÜBERSICHT**

---

## 🧹 **AUFRÄUM-SKRIPT:**

```bash
# SICHERE LÖSCHUNGEN (ohne Bestätigung)
rm debug-test.html
rm system-test.html
rm debug-login.js
rm login-fix.js
rm app-init.js
rm MOBILE_LAYOUT_FIXES.md

# BACKUP-DATEIEN LÖSCHEN
rm web-app.js.backup*
rm web-app.js.backup2

# VERALTETE GOOGLE APPS SCRIPT DATEIEN
rm core-functions.js
rm admin-functions.js
rm user-functions.js
rm debug-functions.js
rm firebase-data-manager.js

# UNVOLLSTÄNDIGE MODULARE VERSION
rm index-modular.html

# OPTIONAL: Build-Dateien (falls nicht benötigt)
# rm build.sh deploy.sh
# rm -rf dist/
```

---

## 📊 **VORHER/NACHHER:**

### **VORHER:** ~40+ Dateien
### **NACHHER:** ~15-20 essentielle Dateien

### **PLATZERSPARNIS:** 
- Geschätzt: **~60-70%** weniger Dateien
- Weniger Verwirrung
- Klarere Struktur

---

## 🎯 **EMPFOHLENES VORGEHEN:**

### **Phase 1: Sichere Löschungen** 
```bash
# Diese können sofort gelöscht werden
rm debug-test.html system-test.html debug-login.js login-fix.js app-init.js
```

### **Phase 2: Nach Bestätigung**
```bash
# Diese nach kurzem Test löschen
rm core-functions.js admin-functions.js user-functions.js debug-functions.js
```

### **Phase 3: Cleanup**
```bash
# Alle Backups und überflüssige Dokumentation
rm web-app.js.backup* index-modular.html
```

---

## ✅ **RESULTAT NACH AUFRÄUMEN:**

### **FINALE STRUKTUR:**
```
📁 3D Druck FGF Abrechnung/
├── 📄 index.html                     # HAUPTVERSION ✅
├── 📄 web-app.js                     # FUNKTIONIERT ✅
├── 📄 index-modular-complete.html    # ENTWICKLUNG ✅
├── 📄 web-app-modular.js            # MODULAR ✅
├── 📄 styles.css                     # RESPONSIVE ✅
├── 📄 config.js                      # KONFIGURATION ✅
├── 📁 modules/                       # MODULAR CODE ✅
├── 📄 impressum.html, datenschutz.html
├── 📄 favicon.svg
├── 📁 assets/
├── 📄 firestore.*
└── 📄 README.md, WELCHE_VERSION_VERWENDEN.md
```

**Saubere, übersichtliche Struktur mit nur den nötigen Dateien! 🎉**
