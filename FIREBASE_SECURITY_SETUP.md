# 🔐 Firebase Security Rules Setup

## ⚠️ WICHTIG: Firestore-Regeln müssen sofort deployt werden!

**Problem:** Ihre Firestore-Datenbank läuft in 1 Tag ab und blockiert dann alle Anfragen.

## 🚀 Lösung: Manuelles Deploy der Sicherheitsregeln

### Schritt 1: Firebase Console öffnen
1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt "FGF-3D-Druck"
3. Klicken Sie auf "Firestore Database" im linken Menü

### Schritt 2: Sicherheitsregeln bearbeiten
1. Klicken Sie auf den Tab "Regeln"
2. Ersetzen Sie den gesamten Inhalt mit den neuen Regeln aus `firestore.rules`
3. Klicken Sie auf "Veröffentlichen"

### Schritt 3: Regeln testen
Die neuen Regeln ermöglichen:
- ✅ **Authentifizierte Benutzer** können ihre eigenen Daten lesen/schreiben
- ✅ **Admins** können alle Daten verwalten
- ✅ **Materialien/Equipment** sind für alle Benutzer lesbar
- ✅ **Zahlungen/Berichte** sind nur für eigene Daten zugänglich

## 📋 Neue Sicherheitsregeln (aus firestore.rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== USER MANAGEMENT =====
    match /users/{userId} {
      // Benutzer können nur ihre eigenen Daten lesen/schreiben
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Admins können alle Benutzerdaten lesen
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== ENTRIES (DRUCKE) =====
    match /entries/{entryId} {
      // Benutzer können ihre eigenen Einträge lesen/schreiben
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Einträge lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
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
    }
    
    // ===== PROBLEM REPORTS =====
    match /problemReports/{reportId} {
      // Benutzer können ihre eigenen Berichte erstellen/lesen
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Berichte lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== ORDERS =====
    match /orders/{orderId} {
      // Benutzer können ihre eigenen Bestellungen lesen
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Admins können alle Bestellungen lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ===== SYSTEM SETTINGS =====
    match /settings/{settingId} {
      // Nur Admins können Einstellungen lesen/schreiben
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## ✅ Nach dem Deploy:
- Ihre App funktioniert weiterhin normal
- Benutzer können sich anmelden und ihre Daten verwalten
- Admins haben vollen Zugriff auf alle Daten
- Die Datenbank ist vor unbefugtem Zugriff geschützt

## 🚨 Dringlichkeit:
**Bitte deployen Sie diese Regeln SOFORT**, da Ihre Datenbank in 1 Tag alle Anfragen blockiert! 