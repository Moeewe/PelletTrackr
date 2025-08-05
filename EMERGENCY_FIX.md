# 🚨 NOTFALL: Firestore-Regeln sofort deployen!

## ⚠️ **KRITISCHER FEHLER:**
**"Missing or insufficient permissions"** - Die App funktioniert nicht mehr!

## 🔧 **SOFORTIGE LÖSUNG:**

### **SCHRITT 1: Firebase Console öffnen**
1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt **"FGF-3D-Druck"**
3. Klicken Sie auf **"Firestore Database"**

### **SCHRITT 2: Regeln ersetzen**
1. Klicken Sie auf den Tab **"Regeln"**
2. **Ersetzen Sie** den gesamten Inhalt mit diesen **NOTFALL-REGELN**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== NOTFALL-REGELN (WENIGER RESTRIKTIV) =====
    
    // 1. Authentifizierung prüfen
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }
    
    // 2. Admin-Status prüfen
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // 3. Benutzer ist Eigentümer der Daten
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ===== USER MANAGEMENT =====
    match /users/{userId} {
      // Benutzer können nur ihre eigenen Daten lesen/schreiben
      allow read, write: if isOwner(userId);
      
      // Admins können alle Benutzerdaten lesen
      allow read: if isAdmin();
      
      // Neue Benutzer können sich registrieren (nur eigene Daten)
      allow create: if isOwner(userId);
    }
    
    // ===== ENTRIES (DRUCKE) =====
    match /entries/{entryId} {
      // Benutzer können ihre eigenen Einträge lesen/schreiben
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Einträge lesen/schreiben
      allow read, write: if isAdmin();
      
      // Neue Einträge erstellen
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== MATERIALS =====
    match /materials/{materialId} {
      // Alle authentifizierten Benutzer können Materialien lesen
      allow read: if isAuthenticated();
      
      // Nur Admins können Materialien erstellen/bearbeiten
      allow write: if isAdmin();
    }
    
    // ===== EQUIPMENT =====
    match /equipment/{equipmentId} {
      // Alle authentifizierten Benutzer können Equipment lesen
      allow read: if isAuthenticated();
      
      // Nur Admins können Equipment verwalten
      allow write: if isAdmin();
    }
    
    // ===== PAYMENTS =====
    match /payments/{paymentId} {
      // Benutzer können ihre eigenen Zahlungen lesen
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Zahlungen lesen/schreiben
      allow read, write: if isAdmin();
      
      // Neue Zahlungen erstellen
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== PROBLEM REPORTS =====
    match /problemReports/{reportId} {
      // Benutzer können ihre eigenen Berichte erstellen/lesen
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Berichte lesen/schreiben
      allow read, write: if isAdmin();
      
      // Neue Berichte erstellen
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== ORDERS =====
    match /orders/{orderId} {
      // Benutzer können ihre eigenen Bestellungen lesen
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Bestellungen lesen/schreiben
      allow read, write: if isAdmin();
      
      // Neue Bestellungen erstellen
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== SYSTEM SETTINGS =====
    match /settings/{settingId} {
      // Nur Admins können Einstellungen lesen/schreiben
      allow read, write: if isAdmin();
    }
    
    // ===== AUDIT LOGS =====
    match /auditLogs/{logId} {
      // Nur Admins können Audit-Logs lesen
      allow read: if isAdmin();
      
      // System kann Audit-Logs erstellen (für authentifizierte Benutzer)
      allow create: if isAuthenticated();
    }
  }
}
```

### **SCHRITT 3: Regeln deployen**
1. Klicken Sie auf **"Veröffentlichen"**
2. Warten Sie auf die Bestätigung
3. **App neu laden** (F5)

## ✅ **Nach dem Deploy sollte funktionieren:**
- ✅ **App lädt ohne Fehler**
- ✅ **Login-Interface funktioniert**
- ✅ **Benutzer-Login** (FH-Kennung + Name)
- ✅ **Admin-Login** (Passwort: `fgf2025admin`)
- ✅ **Keine "permission-denied" Fehler**

## 🔍 **Testen:**
1. **App neu laden** (F5)
2. **Als Benutzer anmelden** (FH-Kennung: `mw202350`, Name: `Moritz Wesseler`)
3. **Als Admin anmelden** (Passwort: `fgf2025admin`)
4. **Daten anzeigen/bearbeiten** testen

## 🚨 **DRINGLICHKEIT:**
**Die App ist derzeit unbrauchbar!** Bitte deployen Sie die Regeln **SOFORT**!

---

## 📋 **NÄCHSTE SCHRITTE (nach dem Deploy):**

### **1. Firebase Auth aktivieren:**
- Firebase Console → Authentication → Sign-in method
- Email/Password aktivieren
- E-Mail-Templates konfigurieren

### **2. Sichere Authentifizierung testen:**
- E-Mail-Verifizierung testen
- Admin-Zugriff testen
- Session-Management testen

### **3. UI anpassen (optional):**
- Login-Interface für Firebase Auth anpassen
- E-Mail-Verifizierung UI hinzufügen
- Passwort-Reset UI hinzufügen 