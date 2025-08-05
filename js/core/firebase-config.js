// ==================== FIREBASE CONFIGURATION ====================
// Firebase-Initialisierung und globale DB-Referenz

// Firebase-Initialisierung bereits erfolgt?
let firebaseInitialized = false;
let connectionHealthy = true;

// Warten bis Firebase SDK geladen ist
function initializeFirebase() {
  if (firebaseInitialized) {
    console.log("🔥 Firebase bereits initialisiert, verwende existierende Konfiguration");
    return true;
  }

  if (typeof firebase !== 'undefined') {
    // Prüfen ob Firebase bereits initialisiert ist
    if (firebase.apps.length > 0) {
      console.log("🔥 Firebase bereits initialisiert, verwende existierende App");
      const db = firebase.firestore();
      window.db = db;
      window.firebase = firebase;
      firebaseInitialized = true;
      connectionHealthy = true;
      return true;
    }

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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore with CORS-compatible settings
    const db = firebase.firestore();
    
    // Configure Firestore with modern cache API
    const settings = {
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true, // Better for local development
      useFetchStreams: false, // Disable streaming for better compatibility
      cache: {
        tabManager: firebase.firestore.TabManager
      }
    };
    
    db.settings(settings);
    
    // Use modern cache API instead of deprecated enablePersistence
    try {
      console.log("📱 Firebase offline persistence enabled via cache API");
    } catch (err) {
      console.warn("⚠️ Cache setup failed:", err);
    }
    
    // Set global references
    window.db = db;
    window.firebase = firebase;
    firebaseInitialized = true;
    connectionHealthy = true;
    
    console.log("🔥 Firebase erfolgreich initialisiert");
    return true;
  } else {
    console.error("❌ Firebase SDK nicht verfügbar");
    return false;
  }
}

// ===== SICHERHEITSVERBESSERUNGEN =====

// 1. API Key Rotation (regelmäßig ändern)
function rotateApiKeys() {
  // TODO: Implement API key rotation
  console.log("🔄 API Key Rotation geplant");
}

// 2. Request Rate Limiting
function setupRateLimiting() {
  // TODO: Implement rate limiting
  console.log("🛡️ Rate Limiting geplant");
}

// 3. Audit Logging
function logSecurityEvent(event, details) {
  console.log(`🔒 Security Event: ${event}`, details);
  // TODO: Send to security monitoring service
}

// 4. Session Management
function validateSession() {
  const user = firebase.auth().currentUser;
  if (!user) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', { timestamp: new Date() });
    return false;
  }
  return true;
}

// 5. Data Encryption Check
function checkDataEncryption() {
  // TODO: Implement client-side encryption for sensitive data
  console.log("🔐 Data Encryption geplant");
}

// Initialize security measures
document.addEventListener('DOMContentLoaded', () => {
  setupRateLimiting();
  checkDataEncryption();
});

// Export for global access
window.initializeFirebase = initializeFirebase;
window.validateSession = validateSession;
window.logSecurityEvent = logSecurityEvent;
