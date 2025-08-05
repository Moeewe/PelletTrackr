# 🔐 Firebase Auth Setup - Schritt-für-Schritt Anleitung

## 🎯 **ZIEL: Firebase Authentication für sichere Authentifizierung aktivieren**

---

## **SCHRITT 1: Firebase Console öffnen**

1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt **"FGF-3D-Druck"**
3. Klicken Sie auf **"Authentication"** im linken Menü

---

## **SCHRITT 2: Sign-in Method aktivieren**

### **A. Email/Password aktivieren:**
1. Klicken Sie auf den Tab **"Sign-in method"**
2. Klicken Sie auf **"Email/Password"**
3. Aktivieren Sie **"Enable"**
4. Aktivieren Sie **"Email link (passwordless sign-in)"** (optional)
5. Klicken Sie auf **"Save"**

### **B. E-Mail-Verifizierung aktivieren:**
1. Bleiben Sie im **"Sign-in method"** Tab
2. Scrollen Sie nach unten zu **"Advanced"**
3. Aktivieren Sie **"Prevent abuse"** → **"Prevent sign-up with email addresses from specific domains"**
4. Fügen Sie **"fh-muenster.de"** zur Whitelist hinzu
5. Klicken Sie auf **"Save"**

---

## **SCHRITT 3: E-Mail-Templates konfigurieren**

### **A. E-Mail-Verifizierung Template:**
1. Klicken Sie auf **"Templates"** Tab
2. Wählen Sie **"Verification email"**
3. Konfigurieren Sie:
   - **Subject:** "PelletTrackr - E-Mail-Adresse bestätigen"
   - **Sender name:** "PelletTrackr FGF"
   - **Reply-to:** "noreply@fgf-muenster.de"
4. Klicken Sie auf **"Save"**

### **B. Passwort-Reset Template:**
1. Wählen Sie **"Password reset"**
2. Konfigurieren Sie:
   - **Subject:** "PelletTrackr - Passwort zurücksetzen"
   - **Sender name:** "PelletTrackr FGF"
   - **Reply-to:** "noreply@fgf-muenster.de"
3. Klicken Sie auf **"Save"**

---

## **SCHRITT 4: Benutzerverwaltung**

### **A. Erste Admin-Benutzer erstellen:**
1. Klicken Sie auf **"Users"** Tab
2. Klicken Sie auf **"Add user"**
3. Erstellen Sie Admin-Benutzer:
   - **Email:** `mw202350@fh-muenster.de`
   - **Password:** (wird automatisch generiert)
   - **Display name:** "Moritz Wesseler"
4. Klicken Sie auf **"Add user"**

### **B. Admin-Status setzen:**
1. Klicken Sie auf den erstellten Benutzer
2. Klicken Sie auf **"Custom claims"**
3. Fügen Sie hinzu: `{"isAdmin": true}`
4. Klicken Sie auf **"Set custom claim"**

---

## **SCHRITT 5: Sicherheitseinstellungen**

### **A. Authorized domains:**
1. Klicken Sie auf **"Settings"** Tab
2. Scrollen Sie zu **"Authorized domains"**
3. Fügen Sie hinzu:
   - `localhost`
   - `your-app-domain.com` (Ihre Live-Domain)
4. Klicken Sie auf **"Save"**

### **B. Session-Timeout:**
1. Scrollen Sie zu **"User session"**
2. Setzen Sie **"Session timeout"** auf **30 minutes**
3. Klicken Sie auf **"Save"**

---

## **SCHRITT 6: Testing**

### **A. Test-Login:**
1. Öffnen Sie Ihre App
2. Versuchen Sie Login mit:
   - **FH-Kennung:** `mw202350`
   - **Name:** `Moritz Wesseler`
3. Prüfen Sie, ob E-Mail-Verifizierung gesendet wird

### **B. Admin-Login:**
1. Versuchen Sie Admin-Login mit:
   - **FH-Kennung:** `mw202350`
   - **Name:** `Moritz Wesseler`
   - **Admin-Passwort:** `fgf2025admin`
3. Prüfen Sie, ob Admin-Zugriff funktioniert

---

## ✅ **ERFOLGSKRITERIEN:**

- ✅ **Firebase Auth** ist aktiviert
- ✅ **E-Mail/Password** Sign-in ist aktiviert
- ✅ **E-Mail-Verifizierung** funktioniert
- ✅ **Admin-Benutzer** ist erstellt
- ✅ **Test-Login** funktioniert
- ✅ **Admin-Login** funktioniert

---

## 🚨 **BEI PROBLEMEN:**

### **A. E-Mail-Verifizierung funktioniert nicht:**
1. Prüfen Sie **Spam-Ordner**
2. Prüfen Sie **E-Mail-Template** Konfiguration
3. Prüfen Sie **Domain-Whitelist**

### **B. Login funktioniert nicht:**
1. Prüfen Sie **Firebase Auth SDK** ist geladen
2. Prüfen Sie **Firestore-Regeln** sind deployed
3. Prüfen Sie **Browser-Konsole** für Fehler

### **C. Admin-Zugriff funktioniert nicht:**
1. Prüfen Sie **Custom Claims** sind gesetzt
2. Prüfen Sie **Firestore-Regeln** für Admin-Check
3. Prüfen Sie **Admin-Passwort** ist korrekt

---

## 📞 **SUPPORT:**

Bei Problemen kontaktieren Sie:
- **Firebase Console:** [console.firebase.google.com](https://console.firebase.google.com)
- **Entwickler:** [moritz@fh-muenster.de](mailto:moritz@fh-muenster.de) 