// ==================== ENTRY MANAGEMENT MODULE ====================
// CRUD-Operationen für Drucke (Create, Read, Update, Delete)

// Neuen Druck hinzufügen
async function addEntry() {
  // Verwende die aktuellen User-Daten
  const name = window.currentUser.name;
  const kennung = window.currentUser.kennung;
  const material = document.getElementById("material").value.trim();
  const materialMenge = document.getElementById("materialMenge").value.trim();
  const masterbatch = document.getElementById("masterbatch").value.trim();
  const masterbatchMenge = document.getElementById("masterbatchMenge").value.trim();
  const jobName = document.getElementById("jobName").value.trim();
  const jobNotes = document.getElementById("jobNotes").value.trim();

  // Validierung
  if (!material || !materialMenge || !masterbatch || !masterbatchMenge) {
    toast.warning("⚠️ Bitte alle Felder ausfüllen!");
    return;
  }

  // Prüfe ob mindestens ein Material ausgewählt ist
  const hasMaterial = material && materialMenge;
  const hasMasterbatch = masterbatch && masterbatchMenge;
  
  if (!hasMaterial && !hasMasterbatch) {
    toast.warning("⚠️ Bitte wählen Sie mindestens Material oder Masterbatch aus!");
    return;
  }

  // Validierung der ausgewählten Mengen
  const materialMengeNum = hasMaterial ? parseGermanNumber(materialMenge) : 0;
  const masterbatchMengeNum = hasMasterbatch ? parseGermanNumber(masterbatchMenge) : 0;

  if (hasMaterial && (isNaN(materialMengeNum) || materialMengeNum <= 0)) {
    toast.warning("⚠️ Bitte eine gültige Materialmenge eingeben!");
    return;
  }

  if (hasMasterbatch && (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0)) {
    toast.warning("⚠️ Bitte eine gültige Masterbatch-Menge eingeben!");
    return;
  }

  try {
    await withLoading(async () => {
      let materialData = null;
      let masterbatchData = null;
      let materialCost = 0;
      let masterbatchCost = 0;

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
      const totalCost = materialCost + masterbatchCost;

      // Druck in Firestore speichern
      const entry = {
        name: name,
        kennung: kennung,
        material: material || "",
        materialMenge: materialMengeNum,
        materialPrice: materialData ? materialData.price : 0,
        materialCost: materialCost,
        masterbatch: masterbatch || "",
        masterbatchMenge: masterbatchMengeNum,
        masterbatchPrice: masterbatchData ? masterbatchData.price : 0,
        masterbatchCost: masterbatchCost,
        totalCost: totalCost,
        jobName: jobName || "3D-Druck Auftrag", // Default if empty
        jobNotes: jobNotes || "",
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        paid: false
      };

      await window.db.collection("entries").add(entry);

      clearForm();
      
      // Dashboard aktualisieren
      if (!window.currentUser.isAdmin) {
        loadUserStats();
        loadUserEntries();
      } else {
        loadAdminStats();
        loadAllEntries();
      }
    }, 
    'Druck wird gespeichert...', 
    '✅ Druck erfolgreich gespeichert!', 
    'Fehler beim Speichern des Drucks');
    
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    // Error Toast wird bereits von withLoading() gehandhabt
  }
}

// Druck löschen
async function deleteEntry(entryId) {
  if (!checkAdminAccess()) return;
  
  const confirmed = await toast.confirm(
    'Möchtest du diesen Druck wirklich löschen?',
    'Löschen',
    'Abbrechen'
  );
  
  if (!confirmed) return;
  
  try {
    await withLoading(async () => {
      await window.db.collection('entries').doc(entryId).delete();
      loadAdminStats();
      loadAllEntries();
    }, 
    'Druck wird gelöscht...', 
    '✅ Druck gelöscht!', 
    'Fehler beim Löschen');
    
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
  }
}

// Druck als bezahlt markieren
async function markEntryAsPaid(entryId) {
  if (!checkAdminAccess()) return;
  
  try {
    await withLoading(async () => {
      await window.db.collection('entries').doc(entryId).update({ paid: true });
      loadAdminStats();
      loadAllEntries();
    }, 
    'Status wird aktualisiert...', 
    '✅ Als bezahlt markiert!', 
    'Fehler beim Aktualisieren');
    
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
  }
}

// Druck als unbezahlt markieren
async function markEntryAsUnpaid(entryId) {
  if (!checkAdminAccess()) return;
  
  try {
    await withLoading(async () => {
      await window.db.collection('entries').doc(entryId).update({ paid: false });
      loadAdminStats();
      loadAllEntries();
    }, 
    'Status wird aktualisiert...', 
    '✅ Als unbezahlt markiert!', 
    'Fehler beim Aktualisieren');
    
  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
  }
}

// Formular zurücksetzen
function clearForm() {
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const jobName = document.getElementById("jobName");
  const jobNotes = document.getElementById("jobNotes");
  const costPreview = document.getElementById("costPreview");
  
  if (material) material.value = '';
  if (materialMenge) materialMenge.value = '';
  if (masterbatch) masterbatch.value = '';
  if (masterbatchMenge) masterbatchMenge.value = '';
  if (jobName) jobName.value = '';
  if (jobNotes) jobNotes.value = '';
  if (costPreview) costPreview.textContent = '0,00 €';
}
