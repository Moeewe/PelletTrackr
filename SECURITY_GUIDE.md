# 🔐 PelletTrackr Sicherheitsleitfaden

## 🚨 **KRITISCHE SICHERHEITSMAßNAHMEN**

### **1. Firestore-Sicherheitsregeln**

#### **Aktuelle Regeln:**
- ✅ **Authentifizierung erforderlich** für alle Operationen
- ✅ **Benutzer-spezifische Zugriffe** (jeder sieht nur seine Daten)
- ✅ **Admin-Berechtigungen** für volle Kontrolle
- ✅ **Datenvalidierung** bei Erstellung neuer Dokumente
- ✅ **Rate Limiting** (basic implementation)
- ✅ **Audit Logging** für alle Datenzugriffe

#### **Sicherheitsfunktionen:**
```javascript
// Request Validation
function isValidRequest() {
  return request.auth != null && 
         request.auth.uid != null &&
         request.auth.token.email_verified == true;
}

// Admin Check
function isAdmin() {
  return request.auth != null && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### **2. Client-seitige Sicherheit**

#### **Implementierte Maßnahmen:**

##### **A. Datenverschlüsselung**
- ✅ **AES-GCM Verschlüsselung** für sensitive Daten
- ✅ **Client-seitige Schlüsselgenerierung**
- ✅ **IV (Initialization Vector)** für jede Verschlüsselung

##### **B. Session Management**
- ✅ **30-Minuten Session-Timeout**
- ✅ **Aktivitäts-Tracking** (Maus, Tastatur, Touch)
- ✅ **Automatischer Logout** bei Inaktivität

##### **C. Rate Limiting**
- ✅ **100 Requests pro Minute** pro Benutzer
- ✅ **Automatische Blockierung** bei Überschreitung
- ✅ **Per-Operation Tracking**

##### **D. Input Validation**
- ✅ **E-Mail-Validierung** mit Regex
- ✅ **Telefonnummer-Validierung**
- ✅ **FH-Kennung-Validierung**
- ✅ **XSS-Schutz** (HTML/Script-Tag-Entfernung)

##### **E. Audit Logging**
- ✅ **Alle Datenzugriffe** werden protokolliert
- ✅ **Authentifizierungsereignisse** werden getrackt
- ✅ **Datenmodifikationen** werden dokumentiert
- ✅ **Automatische Server-Synchronisation**

### **3. API-Sicherheit**

#### **Firebase-Konfiguration:**
```javascript
// SICHTBAR IM CLIENT (NORMAL FÜR FIREBASE)
const firebaseConfig = {
    apiKey: "AIzaSyBaaMwmjxyytxHLinmigccF30-1Wl0tzD0",
    authDomain: "fgf-3d-druck.firebaseapp.com",
    // ... weitere öffentliche Keys
};
```

#### **⚠️ WICHTIG:**
- **API-Keys sind öffentlich** (normal für Firebase)
- **Echte Sicherheit** kommt von den Firestore-Regeln
- **Client-Credentials** sind nur für Authentifizierung

### **4. Datenzugriff-Schutz**

#### **A. Benutzerdaten:**
- ✅ Nur **eigene Daten** lesbar/schreibbar
- ✅ **Admin-Zugriff** auf alle Benutzerdaten
- ✅ **E-Mail-Verifizierung** erforderlich

#### **B. Druckeinträge:**
- ✅ Benutzer sehen nur **ihre eigenen Einträge**
- ✅ **Admins** können alle Einträge verwalten
- ✅ **Validierung** bei Erstellung (Material, Menge, etc.)

#### **C. Materialien/Equipment:**
- ✅ **Alle Benutzer** können lesen
- ✅ **Nur Admins** können bearbeiten
- ✅ **Preisvalidierung** (muss > 0)

#### **D. Zahlungen:**
- ✅ Benutzer sehen nur **ihre eigenen Zahlungen**
- ✅ **Admins** können alle Zahlungen verwalten
- ✅ **Betrag-Validierung** erforderlich

### **5. Angriffsschutz**

#### **A. XSS (Cross-Site Scripting):**
```javascript
// Input Sanitization
sanitizeInput(input) {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}
```

#### **B. CSRF (Cross-Site Request Forgery):**
- ✅ **Firebase Auth** schützt automatisch
- ✅ **Session-basierte Authentifizierung**
- ✅ **Token-Validierung** bei jeder Anfrage

#### **C. Rate Limiting:**
```javascript
// Max 100 Requests pro Minute pro Benutzer
const maxRequests = 100;
const timeWindow = 60000; // 1 Minute
```

#### **D. Session Hijacking:**
- ✅ **HTTPS-only** (über Firebase)
- ✅ **Session-Timeout** nach 30 Minuten
- ✅ **Automatischer Logout** bei Inaktivität

### **6. Monitoring & Logging**

#### **A. Audit Logs:**
```javascript
// Automatisches Logging aller Ereignisse
logSecurityEvent('DATA_ACCESS', {
  collection: 'entries',
  documentId: 'abc123',
  operation: 'read'
});
```

#### **B. Security Events:**
- ✅ **UNAUTHORIZED_ACCESS** - Versuch ohne Auth
- ✅ **RATE_LIMIT_EXCEEDED** - Zu viele Requests
- ✅ **SESSION_TIMEOUT** - Automatischer Logout
- ✅ **DATA_MODIFICATION** - Alle Änderungen

### **7. Best Practices**

#### **A. Regelmäßige Wartung:**
- 🔄 **API-Key Rotation** (monatlich)
- 🔄 **Firestore-Regeln Review** (wöchentlich)
- 🔄 **Audit-Log-Analyse** (täglich)
- 🔄 **Security Updates** (sofort)

#### **B. Monitoring:**
- 📊 **Firebase Console** - Firestore-Regeln
- 📊 **Audit Logs** - Sicherheitsereignisse
- 📊 **Rate Limiting** - Request-Überwachung
- 📊 **Session Management** - Benutzeraktivität

#### **C. Incident Response:**
1. **Sofortige Blockierung** verdächtiger IPs
2. **Audit-Log-Analyse** für Angriffsvektoren
3. **Firestore-Regeln** bei Bedarf verschärfen
4. **Benutzer-Benachrichtigung** bei Datenlecks

### **8. Compliance**

#### **A. DSGVO-Konformität:**
- ✅ **Datenminimierung** - Nur notwendige Daten
- ✅ **Zweckbindung** - Klare Verwendungszwecke
- ✅ **Löschung** - Automatische Datenbereinigung
- ✅ **Transparenz** - Benutzer sehen ihre Daten

#### **B. FH-Münster Compliance:**
- ✅ **Studentendaten** - FH-Kennung-basiert
- ✅ **Abrechnung** - Transparente Kosten
- ✅ **Datenschutz** - FH-Standards eingehalten

### **9. Notfallmaßnahmen**

#### **Bei Sicherheitsvorfall:**
1. **Sofortige Firestore-Regel-Verschärfung**
2. **API-Key-Rotation** in Firebase Console
3. **Audit-Log-Analyse** für Angriffsvektoren
4. **Benutzer-Benachrichtigung** über betroffene Daten
5. **Incident-Report** an FH-IT

#### **Kontakte:**
- **Firebase Console:** [console.firebase.google.com](https://console.firebase.google.com)
- **FH-IT Support:** [it@fh-muenster.de](mailto:it@fh-muenster.de)
- **Entwickler:** [moritz@fh-muenster.de](mailto:moritz@fh-muenster.de)

---

## ✅ **SICHERHEITSSTATUS: GESCHÜTZT**

**Alle kritischen Sicherheitsmaßnahmen sind implementiert und aktiv.** 