// ==================== COST CALCULATOR MODULE ====================
// Kostenberechnung für Drucke

// Kostenvorschau berechnen
async function calculateCostPreview() {
  console.log("💰 Kostenvorschau wird berechnet...");
  
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const costPreview = document.getElementById("costPreview");
  
  if (!material || !materialMenge || !masterbatch || !masterbatchMenge || !costPreview) {
    console.log("❌ Nicht alle Elemente gefunden");
    return;
  }
  
  const materialValue = material.value.trim();
  const materialMengeValue = materialMenge.value.trim();
  const masterbatchValue = masterbatch.value.trim();
  const masterbatchMengeValue = masterbatchMenge.value.trim();
  
  console.log("📊 Eingabewerte:", {
    material: materialValue,
    materialMenge: materialMengeValue,
    masterbatch: masterbatchValue,
    masterbatchMenge: masterbatchMengeValue
  });
  
  // Prüfe ob mindestens ein Material ausgewählt ist
  const hasMaterial = materialValue && materialMengeValue && 
    materialValue !== "Material auswählen... (optional)" && 
    materialValue !== "Material auswählen..." && 
    materialValue !== "Lade Materialien...";
  const hasMasterbatch = masterbatchValue && masterbatchMengeValue && 
    masterbatchValue !== "Masterbatch auswählen... (optional)" && 
    masterbatchValue !== "Masterbatch auswählen..." && 
    masterbatchValue !== "Lade Masterbatches...";
  
  if (!hasMaterial && !hasMasterbatch) {
    console.log("⚠️ Weder Material noch Masterbatch ausgefüllt");
    costPreview.textContent = '0,00 €';
    return;
  }
  
  try {
    console.log("🔍 Suche Preise in Firestore...");
    let materialCost = 0;
    let masterbatchCost = 0;
    
    // Material-Kosten berechnen (falls ausgewählt)
    if (hasMaterial) {
      const materialSnapshot = await window.db.collection("materials").where("name", "==", materialValue).get();
      if (!materialSnapshot.empty) {
        const materialData = materialSnapshot.docs[0].data();
        
        // Verwende Verkaufspreis (oder berechne ihn falls nicht vorhanden)
        let materialPrice = materialData.sellingPrice;
        if (!materialPrice) {
          const netPrice = materialData.netPrice || materialData.price || 0;
          const taxRate = materialData.taxRate || 19;
          const markup = materialData.markup || 30;
          const grossPrice = netPrice * (1 + taxRate / 100);
          materialPrice = grossPrice * (1 + markup / 100);
        }
        
        materialCost = parseGermanNumber(materialMengeValue) * materialPrice;
        console.log("💰 Material-Kosten:", materialCost, "€/kg");
      }
    }
    
    // Masterbatch-Kosten berechnen (falls ausgewählt)
    if (hasMasterbatch) {
      const masterbatchSnapshot = await window.db.collection("masterbatches").where("name", "==", masterbatchValue).get();
      if (!masterbatchSnapshot.empty) {
        const masterbatchData = masterbatchSnapshot.docs[0].data();
        
        // Verwende Verkaufspreis (oder berechne ihn falls nicht vorhanden)
        let masterbatchPrice = masterbatchData.sellingPrice;
        if (!masterbatchPrice) {
          const netPrice = masterbatchData.netPrice || masterbatchData.price || 0;
          const taxRate = masterbatchData.taxRate || 19;
          const markup = masterbatchData.markup || 30;
          const grossPrice = netPrice * (1 + taxRate / 100);
          masterbatchPrice = grossPrice * (1 + markup / 100);
        }
        
        // Masterbatch wird in Gramm eingegeben, Preis ist pro Gramm
        masterbatchCost = parseGermanNumber(masterbatchMengeValue) * masterbatchPrice;
        console.log("💰 Masterbatch-Kosten:", masterbatchCost, "€/g");
      }
    }
    
    const totalCost = materialCost + masterbatchCost;
    
    console.log("🧮 Gesamtberechnung:", {
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
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
