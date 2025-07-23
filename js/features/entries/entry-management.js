// ==================== ENTRY MANAGEMENT MODULE ====================
// CRUD-Operationen für Drucke (Create, Read, Update, Delete)
// Version: 1.0.1 - Verbesserte Live-Kostenberechnung

// Neuen Druck hinzufügen
async function addEntry() {
  // Get user data from current session
  const name = window.currentUser?.name;
  const kennung = window.currentUser?.kennung;
  const printer = document.getElementById("printer").value;
  const printTime = parseInt(document.getElementById("printTime").value) || 0;
  const material = document.getElementById("material").value;
  const materialMenge = document.getElementById("materialMenge").value;
  const masterbatch = document.getElementById("masterbatch").value;
  const masterbatchMenge = document.getElementById("masterbatchMenge").value;
  const jobName = document.getElementById("jobName").value;
  const jobNotes = document.getElementById("jobNotes").value;
  const ownMaterialUsed = document.getElementById("ownMaterialUsed").checked;

  // Validation
  if (!name || !kennung) {
    window.toast.error("Benutzerdaten nicht verfügbar. Bitte melden Sie sich erneut an.");
    return;
  }

  // Check if at least one material is selected or if own material is used with printer time
  const hasMaterial = material && materialMenge;
  const hasMasterbatch = masterbatch && masterbatchMenge;
  const hasPrinterTime = printer && printTime > 0;

  if (!hasMaterial && !hasMasterbatch && !hasPrinterTime) {
    window.toast.warning("Bitte mindestens Material/Masterbatch auswählen oder Drucker mit Zeit angeben!");
    return;
  }

  if (ownMaterialUsed && !hasPrinterTime) {
    window.toast.warning("Bei eigenem Material muss eine Druckerzeit angegeben werden!");
    return;
  }

  // Parse and validate quantities
  const materialMengeNum = parseFloat(materialMenge) || 0;
  const masterbatchMengeNum = parseFloat(masterbatchMenge) || 0;

  if (hasMaterial && (isNaN(materialMengeNum) || materialMengeNum <= 0)) {
    window.toast.warning("Bitte eine gültige Material-Menge eingeben!");
    return;
  }

  if (hasMasterbatch && (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0)) {
    window.toast.warning("Bitte eine gültige Masterbatch-Menge eingeben!");
    return;
  }

  try {
    let materialData = null;
    let masterbatchData = null;
    let printerData = null;
    let materialCost = 0;
    let masterbatchCost = 0;
    let printerCost = 0;

    // Printer-Daten abrufen (falls ausgewählt)
    if (hasPrinterTime) {
      const printerSnapshot = await window.db.collection("printers").where("name", "==", printer).get();
      if (printerSnapshot.empty) {
        throw new Error("Drucker nicht gefunden");
      }
      printerData = printerSnapshot.docs[0].data();
      printerCost = (printTime / 60) * (printerData.pricePerHour || 0);
    }

    // Material-Daten abrufen (falls ausgewählt)
    if (hasMaterial) {
      const materialSnapshot = await window.db.collection("materials").where("name", "==", material).get();
      if (materialSnapshot.empty) {
        throw new Error("Material nicht gefunden");
      }
      materialData = materialSnapshot.docs[0].data();
      materialCost = materialMengeNum * materialData.price;
    }

    // Masterbatch-Daten abrufen (falls ausgewählt)
    if (hasMasterbatch) {
      const masterbatchSnapshot = await window.db.collection("masterbatches").where("name", "==", masterbatch).get();
      if (masterbatchSnapshot.empty) {
        throw new Error("Masterbatch nicht gefunden");
      }
      masterbatchData = masterbatchSnapshot.docs[0].data();
      masterbatchCost = masterbatchMengeNum * masterbatchData.price;
    }

    // Gesamtkosten berechnen
    // Wenn eigenes Material verwendet wird, nur Druckerkosten
    // Sonst nur Materialkosten (Druckerkosten sind in Material-Preisen enthalten)
    const totalCost = ownMaterialUsed ? printerCost : (materialCost + masterbatchCost);

    // Druck in Firestore speichern
    const entry = {
      name: name,
      kennung: kennung,
      printer: printer || "",
      printTime: printTime,
      printerPricePerHour: printerData ? printerData.pricePerHour : 0,
      printerCost: printerCost,
      material: material || "",
      materialMenge: materialMengeNum,
      materialPrice: materialData ? materialData.price : 0,
      materialCost: materialCost,
      masterbatch: masterbatch || "",
      masterbatchMenge: masterbatchMengeNum,
      masterbatchPrice: masterbatchData ? masterbatchData.price : 0,
      masterbatchCost: masterbatchCost,
      ownMaterialUsed: ownMaterialUsed,
      totalCost: totalCost,
      jobName: jobName || "3D-Druck Auftrag", // Default if empty
      jobNotes: jobNotes || "",
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      paid: false
    };

    await window.db.collection("entries").add(entry);

    clearForm();
    
    // Dashboard aktualisieren - sowohl User als auch Admin
    if (window.loadUserStats) window.loadUserStats();
    if (window.loadUserEntries) window.loadUserEntries();
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    
    window.toast.success("Druck erfolgreich gespeichert!");

  } catch (error) {
    console.error("Error adding entry:", error);
    window.toast.error("Fehler beim Speichern: " + error.message);
  }
}

// Druck löschen
async function deleteEntry(id) {
  if (!window.checkAdminAccess()) return;
  
  if (!window.toast?.confirm) {
    if (!confirm("Eintrag wirklich löschen?")) return;
  } else {
    const confirmed = await window.toast.confirm(
      "Möchten Sie diesen Eintrag wirklich löschen?", 
      'Löschen', 
      'Abbrechen'
    );
    if (!confirmed) return;
  }

  try {
    await window.db.collection("entries").doc(id).delete();
    
    // Dashboard aktualisieren
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    
    window.toast.success("Eintrag erfolgreich gelöscht!");

  } catch (error) {
    console.error("Error deleting entry:", error);
    window.toast.error("Fehler beim Löschen: " + error.message);
  }
}

// Druck als bezahlt markieren - Enhanced with payment request coupling
async function markEntryAsPaid(entryId) {
  if (!window.checkAdminAccess()) return;
  
  try {
    const updateData = { 
      paid: true,
      paidAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      paymentMethod: 'admin_direct',
      processedByAdmin: window.currentUser?.name || 'Admin',
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection('entries').doc(entryId).update(updateData);
    
    // Clean up related payment requests when marking as paid
    await cleanupRelatedPaymentRequests(entryId);
    
    // EXPLICIT button update for admin interface
    updateAdminPaymentButton(entryId, true);
    
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    window.toast.success("Als bezahlt markiert!");

  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
    window.toast.error("Fehler beim Markieren als bezahlt: " + error.message);
  }
}

// Druck als unbezahlt markieren - Enhanced with payment request coupling
async function markEntryAsUnpaid(entryId) {
  if (!window.checkAdminAccess()) return;
  
  try {
    const updateData = { 
      paid: false,
      paidAt: null,
      paymentMethod: null,
      processedByAdmin: null,
      requestId: null,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection('entries').doc(entryId).update(updateData);
    
    // EXPLICIT button update for admin interface
    updateAdminPaymentButton(entryId, false);
    
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    window.toast.success("Als unbezahlt markiert!");

  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
    window.toast.error("Fehler beim Markieren als unbezahlt: " + error.message);
  }
}

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.markEntryAsPaid = markEntryAsPaid;
window.markEntryAsUnpaid = markEntryAsUnpaid;

/**
 * Update admin payment button state immediately
 */
function updateAdminPaymentButton(entryId, isPaid) {
    // Find the entry row
    const entryRow = document.querySelector(`#entry-${entryId}`);
    if (!entryRow) return;
    
    // Find the actions cell
    const actionsCell = entryRow.querySelector('.actions');
    if (!actionsCell) return;
    
    // Update the button HTML based on payment status
    const newButtonsHtml = isPaid ? 
        `${window.ButtonFactory.undoPayment(entryId)}
         ${window.ButtonFactory.showNachweis(entryId, true)}` :
        `${window.ButtonFactory.registerPayment(entryId)}`;
    
    // Update the buttons (preserve edit and delete buttons)
    const editButton = actionsCell.querySelector(`[onclick*="editEntry('${entryId}')"]`);
    const deleteButton = actionsCell.querySelector(`[onclick*="deleteEntry('${entryId}')"]`);
    
    // Get the existing non-payment buttons
    const editButtonHtml = editButton ? editButton.outerHTML : '';
    const deleteButtonHtml = deleteButton ? deleteButton.outerHTML : '';
    
    // Update the actions cell with new payment buttons + existing buttons
    actionsCell.innerHTML = `
        ${newButtonsHtml}
        ${editButtonHtml}
        ${deleteButtonHtml}
    `;
    
    // Also update the status badge
    const statusBadge = entryRow.querySelector('.entry-status-badge');
    if (statusBadge) {
        if (isPaid) {
            statusBadge.className = 'entry-status-badge status-paid';
            statusBadge.textContent = 'Bezahlt';
        } else {
            statusBadge.className = 'entry-status-badge status-unpaid';
            statusBadge.textContent = 'Offen';
        }
    }
    
    // Update mobile cards as well
    const entryCard = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (entryCard) {
        const cardActions = entryCard.querySelector('.card-actions');
        if (cardActions) {
            const cardEditButton = cardActions.querySelector(`[onclick*="editEntry('${entryId}')"]`);
            const cardDeleteButton = cardActions.querySelector(`[onclick*="deleteEntry('${entryId}')"]`);
            
            const cardEditButtonHtml = cardEditButton ? cardEditButton.outerHTML : '';
            const cardDeleteButtonHtml = cardDeleteButton ? cardDeleteButton.outerHTML : '';
            
            cardActions.innerHTML = `
                ${newButtonsHtml}
                ${cardEditButtonHtml}
                ${cardDeleteButtonHtml}
            `;
        }
        
        // Update mobile card status badge
        const cardStatusBadge = entryCard.querySelector('.status-badge');
        if (cardStatusBadge) {
            if (isPaid) {
                cardStatusBadge.className = 'status-badge status-paid';
                cardStatusBadge.textContent = 'BEZAHLT';
            } else {
                cardStatusBadge.className = 'status-badge status-unpaid';
                cardStatusBadge.textContent = 'OFFEN';
            }
        }
    }
}

/**
 * Clean up related payment requests when entry is marked as paid directly
 */
async function cleanupRelatedPaymentRequests(entryId) {
  try {
    const pendingRequests = await window.db.collection('paymentRequests')
      .where('entryId', '==', entryId)
      .where('status', '==', 'pending')
      .get();
      
    if (!pendingRequests.empty) {
      const batch = window.db.batch();
      
      pendingRequests.forEach(doc => {
        batch.update(doc.ref, {
          status: 'resolved',
          resolvedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          resolvedBy: 'admin_direct_payment',
          adminNotes: 'Zahlung wurde direkt vom Admin registriert'
        });
      });
      
      await batch.commit();
      console.log(`Cleaned up ${pendingRequests.size} payment requests for entry ${entryId} after direct payment`);
    }
  } catch (error) {
    console.error('Error cleaning up payment requests:', error);
  }
}

// Formular zurücksetzen
function clearForm() {
  const printer = document.getElementById("printer");
  const printTime = document.getElementById("printTime");
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const jobName = document.getElementById("jobName");
  const jobNotes = document.getElementById("jobNotes");
  const ownMaterialUsed = document.getElementById("ownMaterialUsed");
  const costPreview = document.getElementById("costPreview");
  
  if (printer) printer.value = '';
  if (printTime) printTime.value = '';
  if (material) material.value = '';
  if (materialMenge) materialMenge.value = '';
  if (masterbatch) masterbatch.value = '';
  if (masterbatchMenge) masterbatchMenge.value = '';
  if (jobName) jobName.value = '';
  if (jobNotes) jobNotes.value = '';
  if (ownMaterialUsed) ownMaterialUsed.checked = false;
  if (costPreview) costPreview.textContent = '0,00 €';
}



// ==================== COST CALCULATION ====================
// Update cost preview when form values change
async function updateCostPreview() {
  console.log("💰 updateCostPreview wird ausgeführt...");
  
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
  
  // Normale Berechnung (Material + Masterbatch)
  try {
    console.log("🔍 Suche Preise in Firestore...");
    let materialCost = 0;
    let masterbatchCost = 0;
    
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
    
    const totalCost = materialCost + masterbatchCost;
    
    console.log("🧮 Gesamtberechnung:", {
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost
    });
    
    if (!isNaN(totalCost) && totalCost >= 0) {
      costPreview.textContent = totalCost.toFixed(2) + ' €';
      console.log("✅ Kostenvorschau aktualisiert:", totalCost.toFixed(2) + ' €');
    } else {
      costPreview.textContent = '0,00 €';
      console.log("⚠️ Ungültige Berechnung");
    }
  } catch (error) {
    console.error("❌ Fehler bei der Kostenberechnung:", error);
    costPreview.textContent = '0,00 €';
  }
}

// ==================== GLOBAL EXPOSURE ====================
// Funktionen global verfügbar machen

window.addEntry = addEntry;
window.deleteEntry = deleteEntry;
window.markEntryAsPaid = markEntryAsPaid;
window.markEntryAsUnpaid = markEntryAsUnpaid;
window.clearForm = clearForm;
window.updateCostPreview = updateCostPreview;
