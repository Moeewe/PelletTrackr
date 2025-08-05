// ==================== APP INITIALISIERUNG ====================
// Zentrale Initialisierung der PelletTrackr App

// App-Status
let appInitialized = false;
let firebaseConnected = false;

// Haupt-Initialisierungsfunktion
async function initializePelletTrackr() {
  if (appInitialized) {
    console.log('🚀 App bereits initialisiert');
    return;
  }

  try {
    console.log('🚀 PelletTrackr wird initialisiert...');
    
    // 1. Firebase initialisieren
    if (!initializeFirebase()) {
      throw new Error('Firebase-Initialisierung fehlgeschlagen');
    }
    
    // 2. Sichere Authentifizierung initialisieren (optional)
    if (typeof initializeSecureAuth === 'function') {
      try {
        if (!initializeSecureAuth()) {
          console.warn('⚠️ Sichere Authentifizierung nicht verfügbar, verwende Legacy-Modus');
        } else {
          console.log('🔐 Sichere Authentifizierung initialisiert');
        }
      } catch (error) {
        console.warn('⚠️ Sichere Authentifizierung fehlgeschlagen:', error.message);
      }
    }
    
    // 3. Session prüfen
    const hasSession = checkExistingSession();
    
    if (!hasSession) {
      // 4. Login-Screen anzeigen
      showScreen('loginScreen');
      console.log('📱 Login-Screen angezeigt');
    } else {
      console.log('✅ Session gefunden, Dashboard wird geladen');
    }
    
    // 5. UI-Elemente initialisieren
    initializeUI();
    
    // 6. Event-Listener einrichten
    setupEventListeners();
    
    // 7. App als bereit markieren
    appInitialized = true;
    firebaseConnected = true;
    
    console.log('✅ PelletTrackr bereit!');
    
    // 8. Firebase-Verbindung testen (optional)
    setTimeout(() => {
      testFirebaseConnection();
    }, 1000);
    
  } catch (error) {
    console.error('❌ App-Initialisierung fehlgeschlagen:', error);
    showErrorMessage('App-Initialisierung fehlgeschlagen: ' + error.message);
  }
}

// Firebase-Verbindung testen
async function testFirebaseConnection() {
  try {
    console.log('🧪 Teste Firebase-Verbindung...');
    
    // Prüfe ob Firebase verfügbar ist
    if (!window.db) {
      console.warn('⚠️ Firebase nicht verfügbar');
      return;
    }
    
    // Teste Firestore-Verbindung
    const testSnapshot = await window.db.collection('materials').limit(1).get();
    console.log('✅ Firestore-Verbindung erfolgreich');
    
    // Teste Auth-Verbindung (falls verfügbar)
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const auth = firebase.auth();
      console.log('✅ Firebase Auth verfügbar');
    }
    
  } catch (error) {
    console.error('❌ Firebase-Verbindung fehlgeschlagen:', error);
    
    // Zeige Benutzer-freundliche Fehlermeldung
    if (error.code === 'permission-denied') {
      showErrorMessage('Datenbankzugriff verweigert. Bitte kontaktieren Sie den Administrator.');
    } else {
      showErrorMessage('Verbindung zur Datenbank fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.');
    }
  }
}

// UI-Elemente initialisieren
function initializeUI() {
  // Loading-Indicator (sicher prüfen)
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // Toast-Container
  if (typeof initializeToast === 'function') {
    try {
      initializeToast();
    } catch (error) {
      console.warn('⚠️ Toast-Initialisierung fehlgeschlagen:', error.message);
    }
  }
  
  // Navigation
  if (typeof initializeNavigation === 'function') {
    try {
      initializeNavigation();
    } catch (error) {
      console.warn('⚠️ Navigation-Initialisierung fehlgeschlagen:', error.message);
    }
  }
  
  console.log('🎨 UI-Elemente initialisiert');
}

// Event-Listener einrichten
function setupEventListeners() {
  // Login-Form Handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (typeof loginAsUser === 'function') {
        loginAsUser();
      }
    });
  }
  
  // Admin-Login Handler
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
      if (typeof loginAsAdmin === 'function') {
        loginAsAdmin();
      }
    });
  }
  
  // Logout Handler
  const logoutBtn = document.querySelector('.btn-link[onclick="logout()"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof logout === 'function') {
        logout();
      }
    });
  }
  
  console.log('🎧 Event-Listener eingerichtet');
}

// Fehlermeldung anzeigen
function showErrorMessage(message) {
  console.error('❌ App-Fehler:', message);
  
  // Toast-Nachricht anzeigen
  if (typeof toast !== 'undefined' && toast.error) {
    toast.error(message);
  } else {
    // Fallback: Alert
    alert('Fehler: ' + message);
  }
}

// App-Status prüfen
function isAppReady() {
  return appInitialized && firebaseConnected;
}

// Firebase-Status prüfen
function isFirebaseConnected() {
  return firebaseConnected;
}

// App neu initialisieren
function reinitializeApp() {
  console.log('🔄 App wird neu initialisiert...');
  appInitialized = false;
  firebaseConnected = false;
  initializePelletTrackr();
}

// ===== GLOBALE EXPORTS =====

window.initializePelletTrackr = initializePelletTrackr;
window.isAppReady = isAppReady;
window.isFirebaseConnected = isFirebaseConnected;
window.reinitializeApp = reinitializeApp;
window.testFirebaseConnection = testFirebaseConnection;

// ===== AUTOMATISCHE INITIALISIERUNG =====

// Initialisiere App wenn DOM geladen ist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePelletTrackr);
} else {
  // DOM bereits geladen
  initializePelletTrackr();
}
