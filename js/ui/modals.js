// ==================== MODAL MODULE ====================
// Modal-Verwaltung und UI-Komponenten

// Modal anzeigen mit korrekter Struktur
function showModal(htmlContent) {
  const modal = document.getElementById('modal');
  
  // Prüfen ob Content bereits modal-content Wrapper hat
  if (htmlContent.includes('<div class="modal-content">')) {
    modal.innerHTML = htmlContent;
  } else {
    // Content in modal-content Wrapper einbetten
    modal.innerHTML = `<div class="modal-content">${htmlContent}</div>`;
  }
  
  modal.classList.add('active');
  
  // Prevent body scrolling when modal is open
  document.body.style.overflow = 'hidden';
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
    modal.innerHTML = '';
    // Restore body scrolling
    document.body.style.overflow = '';
  }
}

// ESC-Taste Support für Modals
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      if (activeModal.id === 'modal') {
        closeModal();
      } else if (activeModal.id === 'paymentProofModal') {
        window.closePaymentProofModal();
      }
    }
  }
});

// Click outside modal to close
document.addEventListener('click', function(event) {
  const activeModal = document.querySelector('.modal.active');
  if (activeModal && event.target === activeModal) {
    if (activeModal.id === 'modal') {
      closeModal();
    } else if (activeModal.id === 'paymentProofModal') {
      window.closePaymentProofModal();
    }
  }
});

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
        <div class="mobile-detail-layout">
          <div class="detail-name">${entry.name}</div>
          
          <div class="detail-row">
            <span class="detail-label">Datum:</span>
            <span class="detail-value">${date} ${time}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Material:</span>
            <span class="detail-value">${entry.material}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Menge:</span>
            <span class="detail-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Masterbatch:</span>
            <span class="detail-value">${entry.masterbatch}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">MB Menge:</span>
            <span class="detail-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span>
          </div>
          
          <div class="detail-cost-status">
            <div class="cost-section">
              <span class="cost-label">Gesamtkosten:</span>
              <span class="cost-value">${window.formatCurrency(entry.totalCost)}</span>
            </div>
            <div class="status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}">${status}</div>
          </div>
          
          <div class="notes-section">
            <div class="notes-header">Job-Name</div>
            <div class="notes-content">${jobName}</div>
          </div>
          
          <div class="notes-section">
            <div class="notes-header">Notizen</div>
            <div class="notes-content">${jobNotes}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        ${isPaid ? `<button class="btn btn-nachweis" onclick="showPaymentProof('${entry.id}')">Nachweis</button>` : ''}
        <button class="btn btn-primary" onclick="editUserEntry('${entry.id}')">Bearbeiten</button>
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
        <h2>Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editUserEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name *</label>
            <input type="text" id="editUserJobName" class="form-input" value="${jobName}" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen (optional)</label>
            <textarea id="editUserJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
          </div>
          
          <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border: 1px solid #dee2e6; color: #666; font-size: 14px; line-height: 1.5;">
            <strong>Hinweis:</strong> Als Benutzer kannst du nur Job-Name und Notizen bearbeiten. Material-Mengen können nur von Admins geändert werden.
          </div>
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
    
    alert('Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // User Dashboard aktualisieren
    window.loadUserEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    alert('Fehler beim Speichern: ' + error.message);
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
            <label class="form-label">Job-Name *</label>
            <input type="text" id="editJobName" class="form-input" value="${jobName}" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Material-Menge (kg) *</label>
              <input type="number" id="editMaterialMenge" class="form-input" value="${(entry.materialMenge || 0).toFixed(2)}" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">Masterbatch-Menge (kg) *</label>
              <input type="number" id="editMasterbatchMenge" class="form-input" value="${(entry.masterbatchMenge || 0).toFixed(2)}" step="0.01" min="0" required>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen (optional)</label>
            <textarea id="editJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
          </div>
          
          <div style="margin-top: 24px; padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; font-size: 14px; line-height: 1.5;">
            <strong>Admin-Berechtigung:</strong> Du kannst alle Felder dieses Eintrags bearbeiten. Kosten werden automatisch neu berechnet.
          </div>
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
    
    alert('Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // Admin Dashboard aktualisieren
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    alert('Fehler beim Speichern: ' + error.message);
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

// ==================== MODALS MODULE ====================
// Modal-Verwaltung und Entry-Details/Bearbeitung

// Alle Funktionen sind bereits global verfügbar
console.log("📋 Modals Module geladen");