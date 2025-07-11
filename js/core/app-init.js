// ==================== APP INITIALIZATION MODULE ====================
// Zentrale App-Initialisierung und Firebase-Verbindung

// App-Initialisierung bereits erfolgt?
if (typeof window.appInitialized === 'undefined') {
  window.appInitialized = false;
}

// Module-Initialisierung Status
let modulesInitialized = false;

// App initialisieren
function initializeApp() {
  if (window.appInitialized) {
    console.log("🚀 PelletTrackr bereits initialisiert, überspringe...");
    return;
  }

  console.log("🚀 PelletTrackr wird initialisiert...");
  window.appInitialized = true;
  
  // Firebase-Ready Event Listener
  document.addEventListener('firebase-ready', (event) => {
    console.log("📡 Firebase-Ready Event empfangen, initialisiere Module...");
    initializeModules();
  });
  
  // Firebase-Error Event Listener
  document.addEventListener('firebase-error', (event) => {
    console.error("📡 Firebase-Error Event empfangen:", event.detail.error);
    handleFirebaseError(event.detail.error, event.detail.attempts);
  });
  
  // Firebase-Verbindung testen
  testFirebaseConnection();
  
  // Login-Screen anzeigen
  showScreen('loginScreen');
  
  console.log("✅ PelletTrackr bereit!");
}

// Module initialisieren wenn Firebase bereit ist
function initializeModules() {
  if (modulesInitialized) {
    console.log("📦 Module bereits initialisiert, überspringe...");
    return;
  }
  
  console.log("📦 Initialisiere PelletTrackr Module...");
  modulesInitialized = true;
  
  // Initialize core modules first
  try {
    if (typeof loadMaterials === 'function') {
      console.log("🔄 Lade Materialien...");
      loadMaterials().catch(error => console.error("❌ Material loading failed:", error));
    }
    
    if (typeof loadMasterbatches === 'function') {
      console.log("🔄 Lade Masterbatches...");
      loadMasterbatches().catch(error => console.error("❌ Masterbatch loading failed:", error));
    }
    
    console.log("✅ Core Module initialisiert");
  } catch (error) {
    console.error("❌ Fehler beim Initialisieren der Core Module:", error);
  }
}

// Firebase-Fehler behandeln
function handleFirebaseError(error, attempts) {
  console.error(`❌ Firebase-Verbindungsfehler (Versuch ${attempts}):`, error.message);
  
  // Loading indicator ausblenden
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // User informieren
  if (window.toast && typeof window.toast.error === 'function') {
    if (attempts >= 5) {
      window.toast.error("Datenbankverbindung fehlgeschlagen!\n\nBitte überprüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.");
    } else {
      window.toast.warning(`Verbindungsproblem... Versuch ${attempts}/5`);
    }
  } else {
    if (attempts >= 5) {
      alert("Datenbankverbindung fehlgeschlagen!\n\nBitte überprüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.");
    }
  }
}

// Firebase-Verbindung testen
async function testFirebaseConnection() {
  try {
    console.log("🧪 Teste Firebase-Verbindung...");
    
    // Warten bis Firebase verfügbar ist
    let attempts = 0;
    while (!window.db && attempts < 20) { // Increased wait time
      console.log("⏳ Warte auf Firebase-Initialisierung...");
      await new Promise(resolve => setTimeout(resolve, 250)); // Shorter intervals
      attempts++;
    }
    
    if (!window.db) {
      console.error("❌ Firebase nicht verfügbar nach 5 Sekunden");
      handleFirebaseError(new Error("Firebase initialization timeout"), 1);
      return false;
    }
    
    // Enhanced connection test with retry
    const testConnection = async () => {
      const testQuery = await window.db.collection('materials').limit(1).get();
      return testQuery;
    };
    
    const testQuery = await window.safeFirebaseOp(testConnection, 3);
    
    if (testQuery.empty) {
      console.log("📦 Firebase verbunden - Datenbank ist leer");
    } else {
      console.log("✅ Firebase verbunden - Daten gefunden:", testQuery.size, "Material(s)");
    }
    
    // Wenn Firebase bereits bereit ist, Module sofort initialisieren
    if (window.db && !modulesInitialized) {
      initializeModules();
    }
    
    return true;
  } catch (error) {
    console.error("❌ Firebase-Verbindung fehlgeschlagen:", error);
    handleFirebaseError(error, 1);
    return false;
  }
}

// Retry-Funktion für App-Initialisierung
function retryAppInitialization() {
  console.log("🔄 Versuche App-Initialisierung erneut...");
  modulesInitialized = false;
  testFirebaseConnection();
}

// Global verfügbare Retry-Funktion
window.retryAppInitialization = retryAppInitialization;


