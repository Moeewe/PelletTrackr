// ==================== APP INITIALIZATION MODULE ====================
// Zentrale App-Initialisierung und Firebase-Verbindung

// App initialisieren
function initializeApp() {
  console.log("🚀 PelletTrackr wird initialisiert...");
  
  // Firebase-Verbindung testen
  testFirebaseConnection();
  
  // Login-Screen anzeigen
  showScreen('loginScreen');
  
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
    console.error("❌ Firebase-Verbindung fehlgeschlagen:", error);
    alert("⚠️ Datenbankverbindung fehlgeschlagen!\n\nBitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
    return false;
  }
}
