// ==================== INITIALISIERUNG ====================

// Beim Laden der Seite ausführen
window.onload = function() {
  console.log("🚀 FGF 3D-Druck App wird initialisiert...");
  
  // Dropdowns mit Daten füllen
  loadMaterials();
  loadMasterbatches();
  
  // Event Listener für Live-Kostenberechnung mit Throttling
  document.getElementById("materialMenge").addEventListener("input", throttledCalculateCost);
  document.getElementById("masterbatchMenge").addEventListener("input", throttledCalculateCost);
  document.getElementById("material").addEventListener("change", calculateCostPreview);
  document.getElementById("masterbatch").addEventListener("change", calculateCostPreview);
  
  // Zusätzliche Event-Listener für sofortige Reaktion bei Dropdown-Änderungen
  document.getElementById("material").addEventListener("change", function() {
    // Sofortige Berechnung bei Dropdown-Änderung (ohne Throttling)
    setTimeout(calculateCostPreview, 50);
  });
  
  document.getElementById("masterbatch").addEventListener("change", function() {
    // Sofortige Berechnung bei Dropdown-Änderung (ohne Throttling)
    setTimeout(calculateCostPreview, 50);
  });
  
  // Verbesserte Eingabevalidierung für deutsche Zahlenformate
  document.getElementById("materialMenge").addEventListener("blur", function() {
    var value = this.value;
    if (value) {
      var parsed = parseGermanNumber(value);
      if (parsed > 0) {
        this.value = parsed.toFixed(2).replace('.', ',');
      }
    }
  });
  
  document.getElementById("masterbatchMenge").addEventListener("blur", function() {
    var value = this.value;
    if (value) {
      var parsed = parseGermanNumber(value);
      if (parsed > 0) {
        this.value = parsed.toFixed(2).replace('.', ',');
      }
    }
  });
  
  console.log("✅ App erfolgreich initialisiert!");
};
