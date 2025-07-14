// ==================== FIREBASE CONFIGURATION ====================
// Firebase-Initialisierung und globale DB-Referenz

// Firebase-Initialisierung bereits erfolgt?
let firebaseInitialized = false;
let connectionHealthy = false;
let initializationAttempts = 0;
const maxInitAttempts = 5;

// Firebase-Ready Event System
function dispatchFirebaseReady() {
  console.log("📡 Dispatching firebase-ready event...");
  const event = new CustomEvent('firebase-ready', {
    detail: { db: window.db, firebase: window.firebase }
  });
  document.dispatchEvent(event);
  window.dispatchEvent(event);
}

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
      
      // Notify all modules that Firebase is ready
      dispatchFirebaseReady();
      return true;
    }

    // Firebase Config
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
    const db = firebase.firestore();

    // Enable offline persistence
    try {
      db.enablePersistence({ synchronizeTabs: true });
      console.log("📱 Firebase offline persistence enabled");
    } catch (err) {
      if (err.code == 'failed-precondition') {
        console.warn("⚠️ Multiple tabs open, persistence only enabled in one tab");
      } else if (err.code == 'unimplemented') {
        console.warn("⚠️ Browser doesn't support persistence");
      }
    }

    // Global DB-Referenz für alle Module verfügbar machen
    window.db = db;
    window.firebase = firebase;
    firebaseInitialized = true;
    connectionHealthy = true;

    console.log("🔥 Firebase erfolgreich initialisiert");
    
    // Notify all modules that Firebase is ready
    dispatchFirebaseReady();
    return true;
  } else {
    console.error("❌ Firebase SDK nicht gefunden!");
    return false;
  }
}

// Debugging-Funktion für Firebase-Status
function debugFirebaseStatus() {
  console.log("🔍 Firebase Debug Status:");
  console.log("- Firebase SDK verfügbar:", typeof firebase !== 'undefined');
  console.log("- Firebase Apps:", firebase?.apps?.length || 0);
  console.log("- window.db verfügbar:", !!window.db);
  console.log("- Firestore verfügbar:", typeof firebase?.firestore !== 'undefined');
  console.log("- Connection healthy:", connectionHealthy);
  console.log("- Initialization attempts:", initializationAttempts);
  
  if (window.db) {
    console.log("- DB App Name:", window.db.app.name);
    console.log("- DB Settings:", window.db._settings);
  }
}

// Erweiterte Initialisierung mit Retry-Logik
function initializeFirebaseWithRetry(retries = 3) {
  initializationAttempts++;
  console.log(`🔥 Firebase Initialisierung (Versuch ${initializationAttempts}/${maxInitAttempts})...`);
  
  if (initializationAttempts > maxInitAttempts) {
    console.error("❌ Maximale Anzahl von Firebase-Initialisierungsversuchen erreicht");
    dispatchFirebaseError(new Error("Firebase initialization failed after maximum attempts"));
    return false;
  }
  
  if (typeof firebase === 'undefined') {
    console.error("❌ Firebase SDK nicht geladen!");
    if (retries > 0) {
      console.log("⏳ Warte 1 Sekunde und versuche erneut...");
      setTimeout(() => initializeFirebaseWithRetry(retries - 1), 1000);
    } else {
      dispatchFirebaseError(new Error("Firebase SDK not available"));
    }
    return false;
  }
  
  try {
    const success = initializeFirebase();
    if (success) {
      debugFirebaseStatus();
      // Test connection after successful init
      testConnectionAfterInit();
    }
    return success;
  } catch (error) {
    console.error("❌ Firebase Init Fehler:", error);
    connectionHealthy = false;
    if (retries > 0) {
      setTimeout(() => initializeFirebaseWithRetry(retries - 1), 1000);
    } else {
      dispatchFirebaseError(error);
    }
    return false;
  }
}

// Firebase Error Event System
function dispatchFirebaseError(error) {
  console.error("📡 Dispatching firebase-error event:", error);
  const event = new CustomEvent('firebase-error', {
    detail: { error: error, attempts: initializationAttempts }
  });
  document.dispatchEvent(event);
  window.dispatchEvent(event);
}

// Connection health monitoring
function monitorConnection() {
  if (!window.db) return;
  
  // Test connection every 30 seconds
  setInterval(async () => {
    try {
      await window.db.collection('materials').limit(1).get();
      if (!connectionHealthy) {
        connectionHealthy = true;
        console.log("✅ Firebase connection restored");
        dispatchFirebaseReady();
      }
    } catch (error) {
      if (connectionHealthy) {
        connectionHealthy = false;
        console.warn("⚠️ Firebase connection lost:", error.message);
        dispatchFirebaseError(error);
      }
    }
  }, 30000);
}

// Test connection after initialization
async function testConnectionAfterInit() {
  try {
    console.log("🧪 Teste Firebase-Verbindung nach Init...");
    const testDoc = await window.db.collection('materials').limit(1).get();
    console.log("✅ Firebase Connection OK - Materials found:", testDoc.size);
    connectionHealthy = true;
    
    // Start connection monitoring
    setTimeout(() => monitorConnection(), 5000);
    
  } catch (error) {
    console.error("❌ Firebase Connection Test failed:", error);
    connectionHealthy = false;
    dispatchFirebaseError(error);
  }
}

// Enhanced retry function for failed operations
async function retryFirebaseOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`⚠️ Firebase operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

// Global utility function for safe Firebase operations
window.safeFirebaseOp = retryFirebaseOperation;

// Firebase sofort initialisieren, wenn das Script geladen wird
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeFirebaseWithRetry());
} else {
  initializeFirebaseWithRetry();
}

// Global debugging function
window.debugFirebaseStatus = debugFirebaseStatus;
