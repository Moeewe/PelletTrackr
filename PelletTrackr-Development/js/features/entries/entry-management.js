// ==================== ENTRY MANAGEMENT MODULE ====================
// CRUD-Operationen für Drucke (Create, Read, Update, Delete)

// Validation helper functions
function validateUserSession() {
  if (!window.currentUser || !window.currentUser.name || !window.currentUser.kennung) {
    console.error("❌ Invalid user session");
    window.toast?.error("Sitzung ungültig. Bitte melden Sie sich erneut an.");
    return false;
  }
  return true;
}

function validateFirebaseConnection() {
  if (!window.db || !window.firebase) {
    console.error("❌ Firebase not available");
    window.toast?.error("Datenbankverbindung nicht verfügbar. Bitte versuchen Sie es später erneut.");
    return false;
  }
  return true;
}

function getFormValue(elementId, defaultValue = '') {
  try {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : defaultValue;
  } catch (error) {
    console.warn(`Could not get value for ${elementId}:`, error);
    return defaultValue;
  }
}

// Neuen Druck hinzufügen
async function addEntry() {
  // Validate session and Firebase connection
  if (!validateUserSession() || !validateFirebaseConnection()) {
    return;
  }

  // Safe form data extraction
  const formData = {
    name: window.currentUser.name,
    kennung: window.currentUser.kennung,
    material: getFormValue("material"),
    materialMenge: getFormValue("materialMenge"),
    masterbatch: getFormValue("masterbatch"),
    masterbatchMenge: getFormValue("masterbatchMenge"),
    jobName: getFormValue("jobName"),
    jobNotes: getFormValue("jobNotes")
  };

  // Validierung - nur Job-Name ist erforderlich
  if (!formData.jobName) {
    window.toast?.warning("Bitte einen Job-Namen eingeben!");
    return;
  }

  // Prüfe ob mindestens ein Material ausgewählt ist
  const hasMaterial = formData.material && formData.materialMenge && 
    formData.material !== "Material auswählen... (optional)" && 
    formData.material !== "Material auswählen..." && 
    formData.material !== "Lade Materialien..." &&
    formData.material !== "Firebase nicht verfügbar" &&
    formData.material !== "Fehler beim Laden";
    
  const hasMasterbatch = formData.masterbatch && formData.masterbatchMenge && 
    formData.masterbatch !== "Masterbatch auswählen... (optional)" && 
    formData.masterbatch !== "Masterbatch auswählen..." && 
    formData.masterbatch !== "Lade Masterbatches..." &&
    formData.masterbatch !== "Firebase nicht verfügbar" &&
    formData.masterbatch !== "Fehler beim Laden";
  
  if (!hasMaterial && !hasMasterbatch) {
    window.toast?.warning("Bitte wählen Sie mindestens Material oder Masterbatch aus!");
    return;
  }

  // Enhanced number validation
  let materialMengeNum = 0;
  let masterbatchMengeNum = 0;

  if (hasMaterial) {
    try {
      materialMengeNum = window.parseGermanNumber(formData.materialMenge);
      if (isNaN(materialMengeNum) || materialMengeNum <= 0 || materialMengeNum > 10000) {
        window.toast?.warning("Bitte eine gültige Materialmenge eingeben (0,1 - 10.000 kg)!");
        return;
      }
    } catch (error) {
      window.toast?.warning("Ungültiges Materialmengenformat. Verwenden Sie z.B. '1,5' für 1,5 kg");
      return;
    }
  }

  if (hasMasterbatch) {
    try {
      masterbatchMengeNum = window.parseGermanNumber(formData.masterbatchMenge);
      if (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0 || masterbatchMengeNum > 10000) {
        window.toast?.warning("Bitte eine gültige Masterbatch-Menge eingeben (0,1 - 10.000 g)!");
        return;
      }
    } catch (error) {
      window.toast?.warning("Ungültiges Masterbatch-Mengenformat. Verwenden Sie z.B. '12,5' für 12,5 g");
      return;
    }
  }

  try {
    let materialData = null;
    let masterbatchData = null;
    let materialCost = 0;
    let masterbatchCost = 0;

    // Material-Daten abrufen (falls ausgewählt)
    if (hasMaterial) {
      try {
        const materialSnapshot = await window.safeFirebaseOp(async () => {
          return await window.db.collection("materials").where("name", "==", formData.material).get();
        });
        
        if (materialSnapshot.empty) {
          throw new Error(`Material "${formData.material}" nicht in der Datenbank gefunden`);
        }
        
        materialData = materialSnapshot.docs[0].data();
        if (!materialData.price || typeof materialData.price !== 'number') {
          throw new Error(`Material "${formData.material}" hat keinen gültigen Preis`);
        }
        
        materialCost = materialMengeNum * materialData.price;
      } catch (error) {
        console.error("Material loading error:", error);
        throw new Error(`Fehler beim Laden der Materialdaten: ${error.message}`);
      }
    }

    // Masterbatch-Daten abrufen (falls ausgewählt)
    if (hasMasterbatch) {
      try {
        const masterbatchSnapshot = await window.safeFirebaseOp(async () => {
          return await window.db.collection("masterbatches").where("name", "==", formData.masterbatch).get();
        });
        
        if (masterbatchSnapshot.empty) {
          throw new Error(`Masterbatch "${formData.masterbatch}" nicht in der Datenbank gefunden`);
        }
        
        masterbatchData = masterbatchSnapshot.docs[0].data();
        if (!masterbatchData.price || typeof masterbatchData.price !== 'number') {
          throw new Error(`Masterbatch "${formData.masterbatch}" hat keinen gültigen Preis`);
        }
        
        masterbatchCost = masterbatchMengeNum * masterbatchData.price;
      } catch (error) {
        console.error("Masterbatch loading error:", error);
        throw new Error(`Fehler beim Laden der Masterbatch-Daten: ${error.message}`);
      }
    }

    // Gesamtkosten berechnen
    const totalCost = materialCost + masterbatchCost;
    
    if (totalCost <= 0 || totalCost > 100000) {
      throw new Error(`Ungültige Gesamtkosten: ${window.formatCurrency(totalCost)}`);
    }

    await withLoading(async () => {
      // Druck in Firestore speichern
      const entry = {
        name: formData.name,
        kennung: formData.kennung,
        material: formData.material || "",
        materialMenge: materialMengeNum,
        materialPrice: materialData ? materialData.price : 0,
        materialCost: materialCost,
        masterbatch: formData.masterbatch || "",
        masterbatchMenge: masterbatchMengeNum,
        masterbatchPrice: masterbatchData ? masterbatchData.price : 0,
        masterbatchCost: masterbatchCost,
        totalCost: totalCost,
        jobName: formData.jobName || "3D-Druck Auftrag",
        jobNotes: formData.jobNotes || "",
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        paid: false,
        createdAt: new Date().toISOString(),
        version: "2.0"
      };

      await window.safeFirebaseOp(async () => {
        return await window.db.collection("entries").add(entry);
      });

      clearForm();
      
      // Dashboard aktualisieren with error handling
      try {
        if (!window.currentUser.isAdmin) {
          if (typeof loadUserStats === 'function') loadUserStats();
          if (typeof loadUserEntries === 'function') loadUserEntries();
        } else {
          if (typeof loadAdminStats === 'function') loadAdminStats();
          if (typeof loadAllEntries === 'function') loadAllEntries();
        }
      } catch (dashboardError) {
        console.warn("Dashboard update failed:", dashboardError);
        // Don't throw - entry was saved successfully
      }
    }, 
    'Druck wird gespeichert...', 
    `✅ 3D-Druck erfolgreich hinzugefügt!\n\nJob: ${formData.jobName || "3D-Druck Auftrag"}\nKosten: ${window.formatCurrency(totalCost)}\n\nDer Druck wurde zu deinen Aufträgen hinzugefügt.`, 
    'Fehler beim Speichern des Drucks');
    
  } catch (error) {
    console.error("Entry creation error:", error);
    window.toast?.error(`Fehler beim Erstellen des Drucks: ${error.message}`);
  }
}

// Enhanced form clearing with error handling
function clearForm() {
  const fieldsToReset = [
    { id: "material", value: "" },
    { id: "materialMenge", value: "" },
    { id: "masterbatch", value: "" },
    { id: "masterbatchMenge", value: "" },
    { id: "jobName", value: "" },
    { id: "jobNotes", value: "" },
    { id: "costPreview", value: "0,00 €", property: "textContent" }
  ];
  
  fieldsToReset.forEach(({ id, value, property = "value" }) => {
    try {
      const element = document.getElementById(id);
      if (element) {
        element[property] = value;
      }
    } catch (error) {
      console.warn(`Could not reset field ${id}:`, error);
    }
  });
}

// Druck löschen with enhanced validation
async function deleteEntry(entryId) {
  if (!checkAdminAccess() || !validateFirebaseConnection()) return;
  
  if (!entryId || typeof entryId !== 'string') {
    window.toast?.error("Ungültige Entry-ID");
    return;
  }
  
  const confirmed = await window.toast?.confirm(
    'Möchtest du diesen Druck wirklich löschen?',
    'Löschen',
    'Abbrechen'
  );
  
  if (!confirmed) return;
  
  try {
    await withLoading(async () => {
      await window.safeFirebaseOp(async () => {
        return await window.db.collection('entries').doc(entryId).delete();
      });
      
      // Safe dashboard refresh
      try {
        if (typeof loadAdminStats === 'function') loadAdminStats();
        if (typeof loadAllEntries === 'function') loadAllEntries();
      } catch (refreshError) {
        console.warn("Dashboard refresh failed:", refreshError);
      }
    }, 
    'Druck wird gelöscht...', 
    'Druck gelöscht!', 
    'Fehler beim Löschen');
    
  } catch (error) {
    console.error('Delete entry error:', error);
    window.toast?.error(`Fehler beim Löschen: ${error.message}`);
  }
}

// Enhanced payment status updates
async function markEntryAsPaid(entryId) {
  return updatePaymentStatus(entryId, true, 'Als bezahlt markiert!');
}

async function markEntryAsUnpaid(entryId) {
  return updatePaymentStatus(entryId, false, 'Als unbezahlt markiert!');
}

async function updatePaymentStatus(entryId, paidStatus, successMessage) {
  if (!checkAdminAccess() || !validateFirebaseConnection()) return;
  
  if (!entryId || typeof entryId !== 'string') {
    window.toast?.error("Ungültige Entry-ID");
    return;
  }
  
  try {
    await withLoading(async () => {
      await window.safeFirebaseOp(async () => {
        return await window.db.collection('entries').doc(entryId).update({ 
          paid: paidStatus,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      // Safe dashboard refresh
      try {
        if (typeof loadAdminStats === 'function') loadAdminStats();
        if (typeof loadAllEntries === 'function') loadAllEntries();
      } catch (refreshError) {
        console.warn("Dashboard refresh failed:", refreshError);
      }
    }, 
    'Status wird aktualisiert...', 
    successMessage, 
    'Fehler beim Aktualisieren');
    
  } catch (error) {
    console.error('Payment status update error:', error);
    window.toast?.error(`Fehler beim Aktualisieren: ${error.message}`);
  }
}

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.markEntryAsPaid = markEntryAsPaid;
window.markEntryAsUnpaid = markEntryAsUnpaid;
