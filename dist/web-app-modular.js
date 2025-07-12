// ==================== WEB-APP MODULAR COORDINATOR ====================
// Zentraler Koordinator für alle Module - stellt sicher, dass alle Funktionen global verfügbar sind

// ==================== GLOBAL FUNCTION EXPOSURE ====================
// Alle wichtigen Funktionen sind bereits in den einzelnen Modulen definiert
// Dieser Koordinator stellt sicher, dass alles richtig initialisiert wird

// Expose additional modal close functions
window.closeEditMaterialModal = window.closeEditMaterialModal || function() {
  console.warn("closeEditMaterialModal nicht verfügbar");
};

window.closeEditMasterbatchModal = window.closeEditMasterbatchModal || function() {
  console.warn("closeEditMasterbatchModal nicht verfügbar");
};

// ==================== APP INITIALIZATION ====================

// App automatisch initialisieren wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Modular PelletTrackr wird initialisiert...");
  
  // Warten bis alle Module geladen sind
  if (typeof initializeApp === 'function') {
    initializeApp();
  } else {
    console.error("❌ initializeApp Funktion nicht gefunden!");
  }
});

console.log("📋 Web-App Modular Coordinator geladen");
