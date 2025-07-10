// ==================== MODAL MODULE ====================
// Modal-Verwaltung und UI-Komponenten

// Modal anzeigen
function showModal(htmlContent) {
  const modal = document.getElementById('modal');
  modal.innerHTML = htmlContent;
  modal.classList.add('active');
}

// Modal mit Content anzeigen
function showModalWithContent(htmlContent) {
  showModal(htmlContent);
}

// Modal schließen
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== ENTRY DETAILS & VIEWING ====================

async function viewEntryDetails(entryId) {
  try {
    const doc = await window.db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Eintrag nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const time = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleTimeString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 'Bezahlt' : 'Offen';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "Keine Notizen";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>Druck Details</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="proof-details">
          <div class="proof-section">
            <h3>Allgemeine Informationen</h3>
            <div class="proof-item">
              <span class="proof-label">Name:</span>
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Datum:</span>
              <span class="proof-value">${date}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Uhrzeit:</span>
              <span class="proof-value">${time}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job-Name:</span>
              <span class="proof-value">${jobName}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Status:</span>
              <span class="proof-value">${status}</span>
            </div>
          </div>
          
          <div class="proof-section">
            <h3>Material & Kosten</h3>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material-Menge:</span>
              <span class="proof-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch-Menge:</span>
              <span class="proof-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span>
            </div>
          </div>
        </div>
        
        <div class="proof-total">
          <div class="proof-total-amount">${window.formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-section">
          <h3>Notizen</h3>
          <p style="padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 0; white-space: pre-wrap;">${jobNotes}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden der Druck-Details:", error);
    alert("Fehler beim Laden der Details!");
  }
}

// ==================== ENTRY EDITING ====================

async function editUserEntry(entryId) {
  try {
    const doc = await window.db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    
    // Prüfen ob User berechtigt ist (nur eigene Drucke bearbeiten)
    if (entry.kennung !== window.currentUser.kennung) {
      alert('Du kannst nur deine eigenen Drucke bearbeiten!');
      return;
    }
    
    // Prüfen ob Eintrag bereits bezahlt wurde
    if (entry.paid || entry.isPaid) {
      alert('Bezahlte Einträge können nicht mehr bearbeitet werden!');
      return;
    }
    
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>Mein Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editUserEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editUserJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editUserJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
          </div>
          
          <p style="margin-top: 20px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            <strong>Hinweis:</strong> Als Benutzer kannst du nur Job-Name und Notizen bearbeiten. Material-Mengen können nur von Admins geändert werden.
          </p>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="saveUserEntryChanges('${entryId}')">Speichern</button>
      </div>
    `;
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden des Eintrags:", error);
    alert("Fehler beim Laden des Eintrags!");
  }
}

async function saveUserEntryChanges(entryId) {
  const jobName = document.getElementById('editUserJobName').value.trim();
  const jobNotes = document.getElementById('editUserJobNotes').value.trim();
  
  if (!jobName) {
    alert('Job-Name darf nicht leer sein!');
    return;
  }
  
  try {
    await window.db.collection('entries').doc(entryId).update({
      jobName: jobName,
      jobNotes: jobNotes,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // User Dashboard aktualisieren
    window.loadUserEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    alert('❌ Fehler beim Speichern: ' + error.message);
  }
}

async function editEntry(entryId) {
  if (!window.checkAdminAccess()) return;
  
  try {
    const doc = await window.db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>Eintrag Bearbeiten (Admin)</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Material-Menge (kg)</label>
              <input type="number" id="editMaterialMenge" class="form-input" value="${(entry.materialMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Masterbatch-Menge (kg)</label>
              <input type="number" id="editMasterbatchMenge" class="form-input" value="${(entry.masterbatchMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
          </div>
          
          <p style="margin-top: 20px; padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; font-size: 14px;">
            <strong>Admin-Berechtigung:</strong> Du kannst alle Felder dieses Eintrags bearbeiten. Kosten werden automatisch neu berechnet.
          </p>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="saveEntryChanges('${entryId}')">Speichern</button>
      </div>
    `;
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden des Eintrags:", error);
    alert("Fehler beim Laden des Eintrags!");
  }
}

async function saveEntryChanges(entryId) {
  const jobName = document.getElementById('editJobName').value.trim();
  const materialMenge = parseFloat(document.getElementById('editMaterialMenge').value);
  const masterbatchMenge = parseFloat(document.getElementById('editMasterbatchMenge').value);
  const jobNotes = document.getElementById('editJobNotes').value.trim();
  
  if (!jobName) {
    alert('Job-Name darf nicht leer sein!');
    return;
  }
  
  if (isNaN(materialMenge) || materialMenge < 0) {
    alert('Bitte gültige Material-Menge eingeben!');
    return;
  }
  
  if (isNaN(masterbatchMenge) || masterbatchMenge < 0) {
    alert('Bitte gültige Masterbatch-Menge eingeben!');
    return;
  }
  
  try {
    // Aktuellen Eintrag laden
    const doc = await window.db.collection('entries').doc(entryId).get();
    const entry = doc.data();
    
    // Neue Kosten berechnen
    let materialCost = 0;
    let masterbatchCost = 0;
    
    // Material-Preis ermitteln
    if (entry.material && materialMenge > 0) {
      const materialSnapshot = await window.db.collection('materials')
        .where('name', '==', entry.material)
        .get();
      
      if (!materialSnapshot.empty) {
        const materialData = materialSnapshot.docs[0].data();
        materialCost = materialMenge * (materialData.price || 0);
      }
    }
    
    // Masterbatch-Preis ermitteln
    if (entry.masterbatch && masterbatchMenge > 0) {
      const masterbatchSnapshot = await window.db.collection('masterbatches')
        .where('name', '==', entry.masterbatch)
        .get();
      
      if (!masterbatchSnapshot.empty) {
        const masterbatchData = masterbatchSnapshot.docs[0].data();
        masterbatchCost = masterbatchMenge * (masterbatchData.price || 0);
      }
    }
    
    const totalCost = materialCost + masterbatchCost;
    
    // Eintrag aktualisieren
    await window.db.collection('entries').doc(entryId).update({
      jobName: jobName,
      jobNotes: jobNotes,
      materialMenge: materialMenge,
      masterbatchMenge: masterbatchMenge,
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // Admin Dashboard aktualisieren
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    alert('❌ Fehler beim Speichern: ' + error.message);
  }
}

async function editNote(entryId, currentNote) {
  const newNote = prompt('Notiz bearbeiten:', currentNote || '');
  
  if (newNote === null) return; // Benutzer hat abgebrochen
  
  try {
    await window.db.collection('entries').doc(entryId).update({
      jobNotes: newNote.trim(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Je nach Kontext Dashboard aktualisieren
    if (window.currentUser.isAdmin) {
      window.loadAllEntries();
    } else {
      window.loadUserEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notiz:', error);
    alert('Fehler beim Speichern der Notiz: ' + error.message);
  }
}

export const Modals = {
  showModal,
  showModalWithContent,
  closeModal,
  viewEntryDetails,
  editUserEntry,
  saveUserEntryChanges,
  editEntry,
  saveEntryChanges,
  editNote
};