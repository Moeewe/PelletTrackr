// ==================== HILFSFUNKTIONEN ====================

// Hilfsfunktion für deutsche Zahlenformate
function parseGermanNumber(value) {
  if (!value || value === '') return 0;
  
  // Entferne alle Zeichen außer Zahlen, Komma und Punkt
  var cleaned = value.toString().replace(/[^\d,.-]/g, '');
  
  // Konvertiere deutschen Dezimaltrennzeichen (Komma) zu Punkt
  var normalizedValue = cleaned.replace(',', '.');
  var parsedValue = parseFloat(normalizedValue);
  
  // Prüfe auf gültige Zahl
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Throttle-Funktion für bessere Performance
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// Status-Nachrichten anzeigen
function showStatusMessage(message, type = 'info') {
  var confirmation = document.getElementById("confirmation");
  confirmation.className = `status-message status-${type}`;
  confirmation.innerHTML = message;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    confirmation.innerHTML = '';
    confirmation.className = '';
  }, 5000);
}

// Lade-Anzeige
function showLoading(elementId, message = 'Laden...') {
  var element = document.getElementById(elementId);
  element.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      ${message}
    </div>
  `;
}

// ==================== FORM FUNKTIONEN ====================

// Formulardaten löschen (nur Material-Felder)
function clearForm() {
  document.getElementById("material").value = '';
  document.getElementById("materialMenge").value = '';
  document.getElementById("masterbatch").value = '';
  document.getElementById("masterbatchMenge").value = '';
  document.getElementById("costPreview").classList.remove('show');
}

// Materialien laden
function loadMaterials() {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        var select = document.getElementById("material");
        select.innerHTML = '<option value="">Material auswählen...</option>';
        
        result.materials.forEach(function(material) {
          var option = document.createElement("option");
          option.value = material.name;
          option.textContent = material.name + " (" + material.price.toFixed(2) + " " + material.currency + "/kg)";
          select.appendChild(option);
        });
      }
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Laden der Materialien:", error);
    })
    .getMaterials();
}

// Masterbatches laden
function loadMasterbatches() {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        var select = document.getElementById("masterbatch");
        select.innerHTML = '<option value="">Masterbatch auswählen...</option>';
        
        result.masterbatches.forEach(function(masterbatch) {
          var option = document.createElement("option");
          option.value = masterbatch.name;
          option.textContent = masterbatch.name + " (" + masterbatch.price.toFixed(2) + " " + masterbatch.currency + "/kg)";
          select.appendChild(option);
        });
      }
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Laden der Masterbatches:", error);
    })
    .getMasterbatches();
}

// ==================== KOSTENBERECHNUNG ====================

// Live-Kostenvorschau berechnen
function calculateCostPreview() {
  var material = document.getElementById("material").value;
  var materialMenge = document.getElementById("materialMenge").value;
  var masterbatch = document.getElementById("masterbatch").value;
  var masterbatchMenge = document.getElementById("masterbatchMenge").value;
  var preview = document.getElementById("costPreview");
  
  // Deutsche Zahlenformate korrekt parsen
  var matMenge = parseGermanNumber(materialMenge);
  var mbMenge = parseGermanNumber(masterbatchMenge);
  
  // Zeige Vorschau nur wenn mindestens ein Wert > 0 ist
  if ((material && matMenge > 0) || (masterbatch && mbMenge > 0)) {
    // Setze fehlende Werte auf 0 für die Berechnung
    var matName = material || "";
    var mbName = masterbatch || "";
    
    // Sofortige Anzeige während der Berechnung
    preview.querySelector('.cost-amount').textContent = "Berechne...";
    preview.classList.add('show', 'calculating');
    
    google.script.run
      .withSuccessHandler(function(result) {
        preview.classList.remove('calculating');
        if (result && result.success) {
          // Verwende die korrekte Gesamtsumme aus der Backend-Berechnung
          var formattedCost = result.totalCost.toFixed(2).replace('.', ',') + ' €';
          preview.querySelector('.cost-amount').textContent = formattedCost;
          preview.classList.add('show');
          
          // Debug-Ausgabe für Kontrolle
          console.log("Kostenberechnung:", {
            material: matName,
            materialMenge: matMenge,
            materialCost: result.materialCost,
            masterbatch: mbName,
            masterbatchMenge: mbMenge,
            masterbatchCost: result.masterbatchCost,
            totalCost: result.totalCost
          });
          
          // Kleine Animation bei Erfolg
          preview.style.transform = 'scale(1.02)';
          setTimeout(function() {
            preview.style.transform = 'scale(1)';
          }, 200);
        } else {
          preview.querySelector('.cost-amount').textContent = "Fehler bei Berechnung";
          preview.classList.add('show');
        }
      })
      .withFailureHandler(function(error) {
        console.error("Fehler bei Kostenberechnung:", error);
        preview.classList.remove('calculating');
        preview.querySelector('.cost-amount').textContent = "Fehler bei Berechnung";
        preview.classList.add('show');
      })
      .calculateCost(matName, matMenge, mbName, mbMenge);
  } else {
    preview.classList.remove('show', 'calculating');
  }
}

// Throttled Version für bessere Performance
var throttledCalculateCost = throttle(calculateCostPreview, 150);

// ==================== NEUEN EINTRAG HINZUFÜGEN ====================

function AddRow() {
  // Eingabe-Validierung
  var name = document.getElementById("name").value.trim();
  var kennung = document.getElementById("kennung").value.trim();
  var material = document.getElementById("material").value.trim();
  var materialMenge = document.getElementById("materialMenge").value.trim();
  var masterbatch = document.getElementById("masterbatch").value.trim();
  var masterbatchMenge = document.getElementById("masterbatchMenge").value.trim();

  // Prüfe ob alle Felder ausgefüllt sind
  if (!name || !kennung || !material || !materialMenge || !masterbatch || !masterbatchMenge) {
    alert("Bitte alle Felder ausfüllen!");
    return;
  }

  // Numerische Validierung mit deutscher Zahlenformate-Unterstützung
  var materialMengeNum = parseGermanNumber(materialMenge);
  var masterbatchMengeNum = parseGermanNumber(masterbatchMenge);

  if (isNaN(materialMengeNum) || materialMengeNum <= 0) {
    alert("Bitte eine gültige Materialmenge eingeben (z.B. 1,5 oder 1.5)!");
    return;
  }

  if (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0) {
    alert("Bitte eine gültige Masterbatch-Menge eingeben (z.B. 0,2 oder 0.2)!");
    return;
  }

  // Bestätigungsnachricht anzeigen
  showStatusMessage("⏳ Speichere Eintrag...", "info");

  // Apps Script-Funktion aufrufen
  google.script.run
    .withSuccessHandler(function(result) {
      if (result && result.success) {
        // Deutsche Formatierung für Kostenausgabe
        var formattedCost = result.totalCost ? result.totalCost.toFixed(2).replace('.', ',') + ' €' : "N/A";
        showStatusMessage(
          "✅ Eintrag gespeichert! Gesamtkosten: " + formattedCost, 
          "success"
        );
        
        // Speichere Name und Kennung vor dem Löschen
        var savedName = name;
        var savedKennung = kennung;
        clearForm();
        
        // Setze Name und Kennung für die Übersicht wieder ein
        document.getElementById("name").value = savedName;
        document.getElementById("kennung").value = savedKennung;
        
        // Automatisch Übersicht aktualisieren
        setTimeout(function() {
          showOverview();
        }, 1000);
      } else {
        showStatusMessage(
          "❌ Fehler beim Speichern: " + (result.error || "Unbekannter Fehler"),
          "error"
        );
      }
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Speichern:", error);
      showStatusMessage(
        "❌ Systemfehler beim Speichern: " + error.toString(),
        "error"
      );
    })
    .AddRecord(name, kennung, material, materialMengeNum, masterbatch, masterbatchMengeNum);
}
