// ==================== COST CALCULATOR MODULE ====================
// Kostenberechnung für Drucke

// Kostenvorschau berechnen
async function calculateCostPreview() {
  console.log("💰 Kostenvorschau wird berechnet...");
  
  // Verwende die neue updateCostPreview Funktion aus entry-management.js
  if (typeof window.updateCostPreview === 'function') {
    console.log("🔄 Verwende updateCostPreview aus entry-management.js");
    window.updateCostPreview();
    return;
  }
  
  // Fallback zur alten Logik (falls updateCostPreview nicht verfügbar)
  console.log("⚠️ updateCostPreview nicht verfügbar, verwende Fallback-Logik");
  
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const printer = document.getElementById("printer");
  const printTime = document.getElementById("printTime");
  const ownMaterialUsed = document.getElementById("ownMaterialUsed");
  const costPreview = document.getElementById("costPreview");
  
  if (!costPreview) {
    console.log("❌ Cost preview element nicht gefunden");
    return;
  }
  
  const materialValue = material ? material.value.trim() : '';
  const materialMengeValue = materialMenge ? materialMenge.value.trim() : '';
  const masterbatchValue = masterbatch ? masterbatch.value.trim() : '';
  const masterbatchMengeValue = masterbatchMenge ? masterbatchMenge.value.trim() : '';
  const printerValue = printer ? printer.value.trim() : '';
  const printTimeValue = printTime ? printTime.value.trim() : '';
  const ownMaterialChecked = ownMaterialUsed ? ownMaterialUsed.checked : false;
  
  console.log("📊 Eingabewerte:", {
    material: materialValue,
    materialMenge: materialMengeValue,
    masterbatch: masterbatchValue,
    masterbatchMenge: masterbatchMengeValue,
    printer: printerValue,
    printTime: printTimeValue,
    ownMaterialUsed: ownMaterialChecked
  });
  
  // Prüfe ob mindestens ein Material oder Drucker-Zeit ausgewählt ist
  const hasMaterial = materialValue && materialMengeValue && 
    materialValue !== "Material auswählen... (optional)" && 
    materialValue !== "Material auswählen..." && 
    materialValue !== "Lade Materialien...";
  const hasMasterbatch = masterbatchValue && masterbatchMengeValue && 
    masterbatchValue !== "Masterbatch auswählen... (optional)" && 
    masterbatchValue !== "Masterbatch auswählen..." && 
    masterbatchValue !== "Lade Masterbatches...";
  const hasPrinterTime = printerValue && printTimeValue && 
    printerValue !== "Drucker auswählen... (optional)" && 
    printerValue !== "Drucker auswählen..." && 
    printerValue !== "Lade Drucker...";
  
  if (!hasMaterial && !hasMasterbatch && !hasPrinterTime) {
    console.log("⚠️ Weder Material/Masterbatch noch Drucker-Zeit ausgefüllt");
    costPreview.textContent = '0,00 €';
    return;
  }
  
  // Wenn eigenes Material verwendet wird, nur Drucker-Kosten
  if (ownMaterialChecked && hasPrinterTime) {
    console.log("💰 Eigenes Material - berechne nur Drucker-Kosten");
    try {
      const selectedOption = printer.options[printer.selectedIndex];
      const printerPricePerHour = selectedOption ? parseFloat(selectedOption.dataset.pricePerHour) || 0 : 0;
      const printTimeMinutes = parseInt(printTimeValue) || 0;
      const printerCost = (printTimeMinutes / 60) * printerPricePerHour;
      
      console.log("💰 Drucker-Kosten berechnet:", printerCost, "€ (", printTimeMinutes, "min,", printerPricePerHour, "€/h)");
      costPreview.textContent = printerCost.toFixed(2) + ' €';
      return;
    } catch (error) {
      console.error("❌ Fehler bei Drucker-Kostenberechnung:", error);
      costPreview.textContent = '0,00 €';
      return;
    }
  }
  
  // Normale Berechnung (Material + Masterbatch + Drucker)
  try {
    console.log("🔍 Suche Preise in Firestore...");
    let materialCost = 0;
    let masterbatchCost = 0;
    let printerCost = 0;
    
    // Material-Kosten berechnen (falls ausgewählt)
    if (hasMaterial) {
      const materialSnapshot = await window.db.collection("materials").where("name", "==", materialValue).get();
      if (!materialSnapshot.empty) {
        const materialPrice = materialSnapshot.docs[0].data().price;
        materialCost = parseGermanNumber(materialMengeValue) * materialPrice;
        console.log("💰 Material-Kosten:", materialCost);
      }
    }
    
    // Masterbatch-Kosten berechnen (falls ausgewählt)
    if (hasMasterbatch) {
      const masterbatchSnapshot = await window.db.collection("masterbatches").where("name", "==", masterbatchValue).get();
      if (!masterbatchSnapshot.empty) {
        const masterbatchPrice = masterbatchSnapshot.docs[0].data().price;
        masterbatchCost = parseGermanNumber(masterbatchMengeValue) * masterbatchPrice;
        console.log("💰 Masterbatch-Kosten:", masterbatchCost);
      }
    }
    
    // Drucker-Kosten berechnen (falls ausgewählt)
    if (hasPrinterTime) {
      const selectedOption = printer.options[printer.selectedIndex];
      const printerPricePerHour = selectedOption ? parseFloat(selectedOption.dataset.pricePerHour) || 0 : 0;
      const printTimeMinutes = parseInt(printTimeValue) || 0;
      printerCost = (printTimeMinutes / 60) * printerPricePerHour;
      console.log("💰 Drucker-Kosten:", printerCost, "€ (", printTimeMinutes, "min,", printerPricePerHour, "€/h)");
    }
    
    const totalCost = materialCost + masterbatchCost + printerCost;
    
    console.log("🧮 Gesamtberechnung:", {
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      printerCost: printerCost,
      totalCost: totalCost
    });
    
    if (!isNaN(totalCost) && totalCost >= 0) {
      const formattedCost = formatCurrency(totalCost);
      costPreview.textContent = formattedCost;
      console.log("✅ Kostenvorschau aktualisiert:", formattedCost);
    } else {
      costPreview.textContent = '0,00 €';
      console.log("⚠️ Ungültige Berechnung");
    }
  } catch (error) {
    console.error("❌ Fehler bei der Kostenberechnung:", error);
    costPreview.textContent = '0,00 €';
  }
}

// Throttled cost calculation
let costCalculationTimeout = null;
function throttledCalculateCost() {
  clearTimeout(costCalculationTimeout);
  costCalculationTimeout = setTimeout(calculateCostPreview, 500);
}

// ==================== GLOBAL EXPOSURE ====================
// Cost calculator functions global verfügbar machen

window.calculateCostPreview = calculateCostPreview;
window.throttledCalculateCost = throttledCalculateCost;
