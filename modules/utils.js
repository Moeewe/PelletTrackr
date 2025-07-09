// ==================== UTILITY FUNCTIONS ====================

/**
 * Formatiert einen Betrag als deutsche Währung
 * @param {number} amount - Der zu formatierende Betrag
 * @returns {string} Formatierter Währungsbetrag
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * Prüft ob der aktuelle User Admin-Rechte hat
 * @returns {boolean} True wenn Admin, sonst false
 */
function checkAdminAccess() {
  if (!currentUser.isAdmin) {
    alert('Zugriff verweigert! Nur Administratoren haben Zugriff auf diese Funktion.');
    return false;
  }
  return true;
}

/**
 * Parst eine deutsche Zahl (mit Komma als Dezimaltrennzeichen)
 * @param {string} str - Der zu parsende String
 * @returns {number} Die geparste Zahl
 */
function parseGermanNumber(str) {
  if (typeof str === 'number') return str;
  return parseFloat(str.replace(',', '.'));
}

/**
 * Escapet Anführungszeichen in einem String für sichere HTML-Ausgabe
 * @param {string} str - Der zu escapende String
 * @returns {string} Der escapte String
 */
function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

/**
 * Testet die Firebase-Verbindung
 */
async function testFirebaseConnection() {
  try {
    console.log("🔗 Teste Firebase-Verbindung...");
    const testRef = db.collection('test');
    await testRef.get();
    console.log("✅ Firebase-Verbindung erfolgreich!");
  } catch (error) {
    console.error("❌ Firebase-Verbindung fehlgeschlagen:", error);
    alert('⚠️ Verbindung zur Datenbank fehlgeschlagen!\n\nBitte prüfe deine Internetverbindung und lade die Seite neu.');
  }
}

/**
 * Throttling-Funktion für Kostenberechnung
 */
let costCalculationTimeout;
function throttledCalculateCost() {
  clearTimeout(costCalculationTimeout);
  costCalculationTimeout = setTimeout(calculateCostPreview, 300);
}

/**
 * Berechnet eine Live-Kostenvorschau basierend auf den aktuellen Formularwerten
 */
async function calculateCostPreview() {
  const material = document.getElementById('material').value;
  const masterbatch = document.getElementById('masterbatch').value;
  const weight = parseFloat(document.getElementById('weight').value);
  
  if (!material || !weight || weight <= 0) {
    document.getElementById('costPreview').textContent = '';
    return;
  }
  
  try {
    // Material-Daten abrufen
    const materialDoc = await db.collection('materials').doc(material).get();
    if (!materialDoc.exists) {
      document.getElementById('costPreview').textContent = '';
      return;
    }
    
    const materialData = materialDoc.data();
    let totalCost = weight * materialData.pricePerKg;
    
    // Masterbatch-Kosten hinzufügen (falls ausgewählt)
    if (masterbatch && masterbatch !== '') {
      const masterbatchDoc = await db.collection('masterbatches').doc(masterbatch).get();
      if (masterbatchDoc.exists) {
        const masterbatchData = masterbatchDoc.data();
        totalCost += weight * masterbatchData.pricePerKg;
      }
    }
    
    // Kostenvorschau anzeigen
    const previewElement = document.getElementById('costPreview');
    if (previewElement) {
      previewElement.textContent = `💰 Geschätzte Kosten: ${formatCurrency(totalCost)}`;
      previewElement.style.color = '#28a745';
      previewElement.style.fontWeight = 'bold';
    }
    
  } catch (error) {
    console.error('Fehler bei der Kostenberechnung:', error);
    document.getElementById('costPreview').textContent = '';
  }
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    checkAdminAccess,
    parseGermanNumber,
    escapeQuotes,
    testFirebaseConnection,
    throttledCalculateCost,
    calculateCostPreview
  };
}
