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

// ===== FIREBASE INITIALISIERUNG =====
// Muss vor allen Modulen laufen, die firebase.auth() / window.db nutzen.
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    firebase.auth().languageCode = 'de';
    window.db = firebase.firestore();
    window.firebase = firebase;
} else {
    console.error("❌ Firebase SDK nicht gefunden!");
}

// Firestore-Aufruf mit Wiederholung bei Verbindungsproblemen. Fehlende Berechtigungen o. Ä. werden
// nicht wiederholt, sondern sofort gemeldet.
async function safeFirebaseOp(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const transient = ['unavailable', 'deadline-exceeded', 'resource-exhausted'].includes(error?.code);
            if (!transient || attempt === maxRetries - 1) throw error;
            console.warn(`⚠️ Firebase-Verbindungsproblem (Versuch ${attempt + 1}/${maxRetries}):`, error.code);
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
    }
}
window.safeFirebaseOp = safeFirebaseOp;

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

window.firebaseConfig = firebaseConfig;
window.validateSession = validateSession;
window.logSecurityEvent = logSecurityEvent;
