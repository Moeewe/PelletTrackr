# 🚨 NOTFALL: Firestore-Regeln sofort deployen!

## ⚠️ **KRITISCHER FEHLER:**
**"Missing or insufficient permissions"** - Die App funktioniert nicht mehr!

## 🔧 **SOFORTIGE LÖSUNG:**

### **Schritt 1: Firebase Console öffnen**
1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt **"FGF-3D-Druck"**
3. Klicken Sie auf **"Firestore Database"**

### **Schritt 2: Regeln korrigieren**
1. Klicken Sie auf den Tab **"Regeln"**
2. **Ersetzen Sie** den gesamten Inhalt mit den **korrigierten Regeln**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== GLOBALE SICHERHEITSREGELN =====
    
    // 1. Request Validation - WENIGER RESTRIKTIV
    function isValidRequest() {
      return request.auth != null && 
             request.auth.uid != null;
      // email_verified entfernt für Entwicklung
    }
    
    // 2. Admin Check
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // 3. User owns data
    function userOwnsData(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // ===== USER MANAGEMENT =====
    match /users/{userId} {
      // Benutzer können nur ihre eigenen Daten lesen/schreiben
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Admins können alle Benutzerdaten lesen
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Neue Benutzer können sich registrieren
      allow create: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // ===== ENTRIES (DRUCKE) =====
    match /entries/{entryId} {
      // Benutzer können ihre eigenen Einträge lesen/schreiben
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Einträge lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Neue Einträge erstellen
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== MATERIALS =====
    match /materials/{materialId} {
      // Alle authentifizierten Benutzer können Materialien lesen
      allow read: if request.auth != null;
      
      // Nur Admins können Materialien erstellen/bearbeiten
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== EQUIPMENT =====
    match /equipment/{equipmentId} {
      // Alle authentifizierten Benutzer können Equipment lesen
      allow read: if request.auth != null;
      
      // Nur Admins können Equipment verwalten
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== PAYMENTS =====
    match /payments/{paymentId} {
      // Benutzer können ihre eigenen Zahlungen lesen
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Zahlungen lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Neue Zahlungen erstellen
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== PROBLEM REPORTS =====
    match /problemReports/{reportId} {
      // Benutzer können ihre eigenen Berichte erstellen/lesen
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Berichte lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Neue Berichte erstellen
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== ORDERS =====
    match /orders/{orderId} {
      // Benutzer können ihre eigenen Bestellungen lesen
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Bestellungen lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Neue Bestellungen erstellen
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // ===== SYSTEM SETTINGS =====
    match /settings/{settingId} {
      // Nur Admins können Einstellungen lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== AUDIT LOGS =====
    match /auditLogs/{logId} {
      // Nur Admins können Audit-Logs lesen
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // System kann Audit-Logs erstellen
      allow create: if request.auth != null;
    }
  }
}
```

### **Schritt 3: Regeln deployen**
1. Klicken Sie auf **"Veröffentlichen"**
2. Warten Sie auf die Bestätigung
3. Testen Sie die App sofort

## ✅ **Nach dem Deploy sollte funktionieren:**
- ✅ **Benutzer-Login** (ohne E-Mail-Verifizierung)
- ✅ **Admin-Login** (Passwort: `fgf2025admin`)
- ✅ **Daten anzeigen/bearbeiten**
- ✅ **Keine "permission-denied" Fehler**

## 🔍 **Testen:**
1. **App neu laden** (F5)
2. **Als Benutzer anmelden** (FH-Kennung)
3. **Als Admin anmelden** (Passwort: `fgf2025admin`)
4. **Daten anzeigen/bearbeiten** testen

## 🚨 **DRINGLICHKEIT:**
**Die App ist derzeit unbrauchbar!** Bitte deployen Sie die Regeln **SOFORT**! 