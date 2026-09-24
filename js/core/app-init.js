// ==================== APP INITIALIZATION MODULE ====================
// Zentrale App-Initialisierung und Firebase-Verbindung

// App-Initialisierung bereits erfolgt?
if (typeof window.appInitialized === 'undefined') {
  window.appInitialized = false;
}

// App initialisieren
function initializeApp() {
  if (window.appInitialized) {
    console.log("🚀 PelletTrackr bereits initialisiert, überspringe...");
    return;
  }

  console.log("🚀 PelletTrackr wird initialisiert...");
  window.appInitialized = true;

  // Protected data is available only after Firebase has restored the session.
  // A denied anonymous read is not an internet connection failure.
  if (window.firebase?.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        testFirebaseConnection();
        if (typeof setupEquipmentListener === 'function') setupEquipmentListener();
      } else if (typeof cleanupEquipmentListeners === 'function') {
        cleanupEquipmentListeners();
      }
    });
  }

  // Check for existing session (auto-login)
  if (typeof checkExistingSession === 'function') {
    const hasSession = checkExistingSession();
    if (!hasSession) {
      // No session found, show login screen
      showScreen('loginScreen');
      // Setup login key handlers
      if (typeof setupLoginKeyHandlers === 'function') {
        setupLoginKeyHandlers();
      }
    }
  } else {
    // Fallback if auth.js not loaded yet
    setTimeout(() => {
      if (typeof checkExistingSession === 'function') {
        const hasSession = checkExistingSession();
        if (!hasSession) {
          showScreen('loginScreen');
          // Setup login key handlers
          if (typeof setupLoginKeyHandlers === 'function') {
            setupLoginKeyHandlers();
          }
        }
      } else {
        showScreen('loginScreen');
        // Setup login key handlers
        if (typeof setupLoginKeyHandlers === 'function') {
          setupLoginKeyHandlers();
        }
      }
    }, 100);
  }

  console.log("✅ PelletTrackr bereit!");
}

// Firebase-Verbindung testen
async function testFirebaseConnection() {
  try {
    console.log("🧪 Teste Firebase-Verbindung...");

    // Warten bis Firebase verfügbar ist
    let attempts = 0;
    while (!window.db && attempts < 10) {
      console.log("⏳ Warte auf Firebase-Initialisierung...");
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.db) {
      console.error("❌ Firebase nicht verfügbar nach 1 Sekunde");
      return;
    }

    // Einfache Abfrage um Verbindung zu testen
    const testQuery = await window.db.collection('materials').limit(1).get();

    if (testQuery.empty) {
      console.log("📦 Firebase verbunden - Datenbank ist leer");
    } else {
      console.log("✅ Firebase verbunden - Daten gefunden:", testQuery.size, "Material(s)");
    }

    return true;
  } catch (error) {
    console.error("Datenbankverbindung fehlgeschlagen:", error);
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.style.display = 'none';

    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error("Datenbankverbindung fehlgeschlagen!\n\nBitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
    } else {
      alert("Datenbankverbindung fehlgeschlagen!\n\nBitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
    }
    return false;
  }
}
