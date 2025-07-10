// ==================== FIREBASE CONFIGURATION ====================
// Firebase-Initialisierung und globale DB-Referenz

// Warten bis Firebase SDK geladen ist
function initializeFirebase() {
  if (typeof firebase !== 'undefined') {
    // Prüfen ob Firebase bereits initialisiert ist
    if (firebase.apps.length > 0) {
      console.log("🔥 Firebase bereits initialisiert, verwende existierende App");
      const db = firebase.firestore();
      window.db = db;
      window.firebase = firebase;
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

    // Global DB-Referenz für alle Module verfügbar machen
    window.db = db;
    window.firebase = firebase;

    console.log("🔥 Firebase erfolgreich initialisiert");
    return true;
  } else {
    console.error("❌ Firebase SDK nicht gefunden!");
    return false;
  }
}

// Firebase sofort initialisieren, wenn das Script geladen wird
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}
