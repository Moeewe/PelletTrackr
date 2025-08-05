# 🚨 SOFORTIGE AKTIVIERUNG: Firebase Auth

## ⚠️ **PROBLEM:**
Benutzer können sich ohne E-Mail-Verifizierung anmelden!

## 🔧 **SOFORTIGE LÖSUNG:**

### **SCHRITT 1: Firebase Console öffnen**
1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt **"FGF-3D-Druck"**
3. Klicken Sie auf **"Authentication"** im linken Menü

### **SCHRITT 2: Sign-in Method aktivieren**
1. Klicken Sie auf den Tab **"Sign-in method"**
2. Klicken Sie auf **"Email/Password"**
3. **Aktivieren Sie "Enable"**
4. **Aktivieren Sie "Email link (passwordless sign-in)"** (optional)
5. Klicken Sie auf **"Save"**

### **SCHRITT 3: E-Mail-Templates konfigurieren**
1. Klicken Sie auf **"Templates"** Tab
2. Wählen Sie **"Verification email"**
3. Konfigurieren Sie:
   - **Subject:** "PelletTrackr - E-Mail-Adresse bestätigen"
   - **Sender name:** "PelletTrackr FGF"
   - **Reply-to:** "noreply@fgf-muenster.de"
4. Klicken Sie auf **"Save"**

### **SCHRITT 4: Authorized domains**
1. Klicken Sie auf **"Settings"** Tab
2. Scrollen Sie zu **"Authorized domains"**
3. Fügen Sie hinzu:
   - `localhost`
   - `your-app-domain.com` (Ihre Live-Domain)
4. Klicken Sie auf **"Save"**

### **SCHRITT 5: Testen**
1. **App neu laden** (F5)
2. **Login versuchen** mit FH-Kennung + Name
3. **Verifizierungs-Prompt** sollte erscheinen
4. **E-Mail-Verifizierung** sollte erforderlich sein

## ✅ **NACH DER AKTIVIERUNG:**

**Richtiger Ablauf:**
1. ✅ **FH-Kennung + Name** eingeben
2. ✅ **E-Mail wird erstellt:** `mw202350@fh-muenster.de`
3. ✅ **Verifizierungs-Prompt** wird angezeigt
4. ✅ **E-Mail wird gesendet**
5. ✅ **Erst nach Bestätigung** → Dashboard

## 🚨 **DRINGLICHKEIT:**
**Bitte aktivieren Sie Firebase Auth SOFORT!**

---

## 📋 **ALTERNATIVE: Temporäre Lösung**

Falls Sie Firebase Auth nicht sofort aktivieren können, kann ich eine **temporäre Lösung** implementieren:

**Temporäre E-Mail-Verifizierung** ohne Firebase Auth:
- ✅ **E-Mail-Simulation** in der App
- ✅ **Verifizierungs-Prompt** wird angezeigt
- ✅ **Manuelle Verifizierung** erforderlich

**Soll ich die temporäre Lösung implementieren?** 