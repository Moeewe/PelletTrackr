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
    
    // Initialize Firestore with cache settings (new API)
    const db = firebase.firestore();
    
    // Use the legacy enablePersistence for compatibility (the new cache API requires different setup)
    try {
      db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
          console.log("📱 Firebase offline persistence enabled");
        })
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("⚠️ Multiple tabs open, persistence only enabled in one tab");
          } else if (err.code === 'unimplemented') {
            console.warn("⚠️ Browser doesn't support persistence");
          } else {
            console.warn("⚠️ Persistence error:", err);
          }
        });
    } catch (err) {
      console.warn("⚠️ Persistence setup failed:", err);
    }

    // Global DB-Referenz für alle Module verfügbar machen
    window.db = db;
    window.firebase = firebase;
    firebaseInitialized = true;
    connectionHealthy = true;

    console.log("🔥 Firebase erfolgreich initialisiert");
    
    // Start connection monitoring
    setInterval(monitorFirebaseConnection, 30000); // Check every 30 seconds
    
    return true;
  } else {
    console.error("❌ Firebase SDK nicht gefunden!");
    return false;
  }
}

// Connection monitoring
function monitorFirebaseConnection() {
  if (window.db) {
    // Monitor Firestore connection state
    window.db.enableNetwork().catch(() => {
      console.warn("🔌 Firebase connection issue detected");
      connectionHealthy = false;
    });
    
    // Try a simple operation to test connection
    window.db.collection('_connection_test').limit(1).get()
      .then(() => {
        if (!connectionHealthy) {
          console.log("🔌 Firebase connection restored");
          connectionHealthy = true;
        }
      })
      .catch((error) => {
        if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
          console.warn("🔌 Firebase connection issue:", error.code);
          connectionHealthy = false;
        }
      });
  }
}

// Enhanced retry function for failed operations
async function retryFirebaseOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`⚠️ Firebase operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      // Monitor connection issues
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        connectionHealthy = false;
      }
      
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

// Retry user load function for user management
async function retryUserLoad() {
  console.log("🔄 Versuche Benutzer erneut zu laden...");
  if (typeof loadUsersForManagement === 'function') {
    try {
      await loadUsersForManagement();
      toast.success('Benutzer erfolgreich geladen');
    } catch (error) {
      console.error('Fehler beim erneuten Laden der Benutzer:', error);
      toast.error('Fehler beim Laden der Benutzer: ' + error.message);
    }
  } else {
    console.error('loadUsersForManagement function not available');
    toast.error('Ladefunktion nicht verfügbar');
  }
}

// Make functions globally available
window.retryUserLoad = retryUserLoad;
window.monitorFirebaseConnection = monitorFirebaseConnection;
window.getFirebaseConnectionStatus = () => connectionHealthy;

// Firebase sofort initialisieren, wenn das Script geladen wird
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}
