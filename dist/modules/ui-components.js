// ==================== UI COMPONENTS & MODAL MANAGEMENT ====================

/**
 * Screen-Management: Zeigt einen bestimmten Screen an
 * @param {string} screenId - Die ID des anzuzeigenden Screens
 */
function showScreen(screenId) {
  // Alle Screens ausblenden
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Gewünschten Screen anzeigen
  document.getElementById(screenId).classList.add('active');
}

/**
 * Zeigt ein Modal mit dem gegebenen HTML-Inhalt
 * @param {string} htmlContent - Der HTML-Inhalt für das Modal
 */
function showModal(htmlContent) {
  document.getElementById('modalContent').innerHTML = htmlContent;
  document.getElementById('modal').style.display = 'block';
}

/**
 * Alternative Funktion zum Anzeigen von Modal-Inhalten
 * @param {string} htmlContent - Der HTML-Inhalt für das Modal
 */
function showModalWithContent(htmlContent) {
  showModal(htmlContent);
}

/**
 * Schließt das aktuell geöffnete Modal
 */
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

/**
 * Event-Listener für die Anwendung einrichten
 */
function setupEventListeners() {
  // Material-Auswahl Event Listener
  const materialSelect = document.getElementById('material');
  if (materialSelect) {
    materialSelect.addEventListener('change', throttledCalculateCost);
  }
  
  // Masterbatch-Auswahl Event Listener  
  const masterbatchSelect = document.getElementById('masterbatch');
  if (masterbatchSelect) {
    masterbatchSelect.addEventListener('change', throttledCalculateCost);
  }
  
  // Gewicht-Eingabe Event Listener
  const weightInput = document.getElementById('weight');
  if (weightInput) {
    weightInput.addEventListener('input', throttledCalculateCost);
  }
  
  // Modal schließen wenn außerhalb geklickt wird
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
      closeModal();
    }
  });
  
  // ESC-Taste zum Schließen von Modals
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeModal();
      closeMaterialManager();
      closeMasterbatchManager();
      closeUserManager();
      closePaymentProofModal();
    }
  });
  
  console.log("✅ Event-Listener eingerichtet!");
}

/**
 * Initialisiert die App-Grundfunktionen
 */
function initializeApp() {
  console.log("🚀 PelletTrackr wird initialisiert...");
  
  // Firebase-Verbindung testen
  testFirebaseConnection();
  
  // Login-Screen anzeigen
  showScreen('loginScreen');
  
  console.log("✅ PelletTrackr bereit!");
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showScreen,
    showModal,
    showModalWithContent,
    closeModal,
    setupEventListeners,
    initializeApp
  };
}
