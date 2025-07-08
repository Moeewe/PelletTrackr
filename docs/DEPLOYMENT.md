# 🌐 FGF 3D-Druck Abrechnung - Online Deployment

## 🚀 **Option 1: Netlify (Empfohlen)**

### **Vorteile:**
- ✅ **Kostenlos** für kleine Projekte
- ✅ **Einfach** - Drag & Drop Deployment
- ✅ **Automatische HTTPS**
- ✅ **Custom Domain** möglich
- ✅ **Git Integration**

### **Schnelle Einrichtung:**
1. Gehe zu [netlify.com](https://netlify.com)
2. **"Add new site"** → **"Deploy manually"**
3. **Drag & Drop** deinen ganzen Ordner in das Feld
4. **Fertig!** Du bekommst eine URL wie `https://fgf-3d-druck-abrechnung.netlify.app`

### **Mit Git (Automatische Updates):**
1. Erstelle ein GitHub Repository
2. Lade deinen Code hoch
3. Netlify → **"Import from Git"**
4. Wähle dein Repository
5. Bei jeder Änderung wird automatisch neu deployed

---

## 🔧 **Option 2: Vercel**

### **Vorteile:**
- ✅ **Kostenlos** für Hobby-Projekte
- ✅ **Sehr schnell**
- ✅ **Automatische HTTPS**
- ✅ **Einfache Custom Domains**

### **Einrichtung:**
1. Gehe zu [vercel.com](https://vercel.com)
2. **"New Project"**
3. **Drag & Drop** oder Git Repository
4. **Deploy** - Fertig!

---

## 📦 **Option 3: GitHub Pages (Kostenlos)**

### **Vorteile:**
- ✅ **Komplett kostenlos**
- ✅ **Direkt mit GitHub**
- ✅ **Automatische Updates**

### **Einrichtung:**
1. Erstelle ein GitHub Repository
2. Lade deinen Code hoch
3. **Settings** → **Pages**
4. **Source:** Deploy from a branch
5. **Branch:** main
6. **Fertig!** URL: `https://username.github.io/repository-name`

---

## 🖥️ **Option 4: Eigener Server**

### **Vorteile:**
- ✅ **Volle Kontrolle**
- ✅ **Keine Limits**
- ✅ **Echte Datenbank möglich**

### **Hosting-Anbieter:**
- **Hetzner** (Deutschland, günstig)
- **DigitalOcean** (international, einfach)
- **AWS** (professionell, komplex)

---

## 💾 **Daten-Persistierung**

### **Für statische Hosting (Netlify/Vercel):**
- **LocalStorage** (Browser-lokal)
- **External API** (Firebase, Supabase)
- **Netlify Forms** (für Formulare)

### **Für Server-Hosting:**
- **SQLite** (einfach)
- **PostgreSQL** (professionell)
- **MySQL** (klassisch)

---

## 🔒 **Sicherheitshinweise**

### **Für öffentliche Deployment:**
1. **Admin-Passwort** in `config.js` ändern
2. **HTTPS** verwenden (automatisch bei Netlify/Vercel)
3. **Backup-Strategie** für Daten
4. **Monitoring** einrichten

### **Empfohlene Änderungen:**
```javascript
// config.js
const APP_CONFIG = {
  // Für Produktion:
  adminPassword: "IHR_SICHERES_PASSWORT_HIER", // Nicht admin123!
  debugMode: false, // Debugging deaktivieren
  // ...
};
```

---

## 🎯 **Empfehlung**

**Für dich am besten: Netlify**
1. Einfach zu verwenden
2. Kostenlos
3. Automatische HTTPS
4. Kann später erweitert werden

**Nächste Schritte:**
1. Probiere Netlify aus
2. Teste die App online
3. Bei Bedarf auf Server mit echter Datenbank wechseln
