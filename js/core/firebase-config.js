// ==================== FIREBASE KONFIGURATION ====================
// Zentrale Firebase-Initialisierung für PelletTrackr

// Firebase Config - SICHERHEIT: Nur öffentliche Keys hier
const firebaseConfig = {
    apiKey: "AIzaSyBaaMwmjxyytxHLinmigccF30-1Wl0tzD0",
    authDomain: "fgf-3d-druck.firebaseapp.com",
    databaseURL: "https://fgf-3d-druck-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fgf-3d-druck",
    storageBucket: "fgf-3d-druck.firebasestorage.app",
    messagingSenderId: "37190466890",
    appId: "1:37190466890:web:cfb25f3c2f6bb62006d5b3"
};

// Firebase initialisieren
function initializeFirebase() {
    try {
        console.log('🔧 Firebase wird initialisiert...');
        
        // Prüfe ob Firebase SDK verfügbar ist
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK nicht verfügbar');
            return false;
        }
        
        // Prüfe ob Firebase bereits initialisiert ist
        if (firebase.apps.length > 0) {
            console.log('⚠️ Firebase bereits initialisiert, verwende bestehende Instanz');
            const db = firebase.firestore();
            window.db = db;
            return true;
        }
        
        // Firebase App initialisieren
        firebase.initializeApp(firebaseConfig);
        
        // Firestore initialisieren
        const db = firebase.firestore();
        
        // Cache-Einstellungen (weniger restriktiv für Entwicklung)
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            merge: true
        });
        
        // Globale Firestore-Instanz verfügbar machen
        window.db = db;
        
        console.log('✅ Firebase erfolgreich initialisiert');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase-Initialisierung fehlgeschlagen:', error);
        return false;
    }
}

// ===== SICHERHEITSVERBESSERUNGEN =====
// Diese Funktionen werden später implementiert

function rotateApiKeys() {
    // API-Key-Rotation (monatlich)
    console.log('🔄 API-Key-Rotation geplant');
}

function setupRateLimiting() {
    // Rate Limiting (100 requests/min pro User)
    console.log('🛡️ Rate Limiting geplant');
}

function logSecurityEvent(event, details) {
    // Sicherheitsereignisse loggen
    console.log('🔒 Security Event:', event, details);
}

function validateSession() {
    // Session-Validierung
    console.log('🔍 Session-Validierung geplant');
}

function checkDataEncryption() {
    // Datenverschlüsselung prüfen
    console.log('🔐 Datenverschlüsselung geplant');
}

// ===== GLOBALE EXPORTS =====

window.initializeFirebase = initializeFirebase;
window.validateSession = validateSession;
window.logSecurityEvent = logSecurityEvent;
