// ==================== MODAL MODULE ====================
// Modal-Verwaltung und UI-Komponenten

// Modal anzeigen mit korrekter Struktur
function showModal(htmlContent) {
  // Erst alle anderen Modals schließen
  closeModal();
  
  // Close any other open modals that might conflict
  const existingModals = document.querySelectorAll('.modal.active');
  existingModals.forEach(modal => {
    if (modal.id !== 'modal') {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  });
  
  const modal = document.getElementById('modal');
  
  // Prüfen ob Content bereits modal-content Wrapper hat
  if (htmlContent.includes('<div class="modal-content">')) {
    modal.innerHTML = htmlContent;
  } else {
    // Content in modal-content Wrapper einbetten
    modal.innerHTML = `<div class="modal-content">${htmlContent}</div>`;
  }
  
  // Ensure proper z-index and display
  modal.style.zIndex = '10000';
  modal.style.display = 'flex';
  
  // Kurze Verzögerung für bessere Animation
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
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
    modal.style.display = 'none';
    modal.innerHTML = '';
    // Restore body scrolling
    document.body.style.overflow = '';
  }
  
  // Also close any other potentially open modals
  const otherModals = document.querySelectorAll('.modal.active');
  otherModals.forEach(otherModal => {
    if (otherModal.id !== 'modal') {
      otherModal.classList.remove('active');
      otherModal.style.display = 'none';
    }
  });
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
      if (window.toast && typeof window.toast.error === 'function') {
        window.toast.error('Eintrag nicht gefunden!');
      } else {
        alert('Eintrag nicht gefunden!');
      }
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
        <h2>${jobName}</h2>
        ${isPaid ? 
          '<div class="status-badge paid">BEZAHLT</div>' :
          '<div class="status-badge unpaid">OFFEN</div>'
        }
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="card">
          <div class="card-body">
            <div class="detail-row">
              <span class="detail-label">DATUM</span>
              <span class="detail-value">${date}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">MATERIAL</span>
              <span class="detail-value">${entry.material}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">MENGE</span>
              <span class="detail-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">MASTERBATCH</span>
              <span class="detail-value">${entry.masterbatch}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">MB MENGE</span>
              <span class="detail-value">${(entry.masterbatchMenge || 0).toFixed(2)} g</span>
            </div>
            
            <div class="detail-row highlight-total">
              <span class="detail-label">KOSTEN:</span>
              <span class="detail-value">${window.formatCurrency(entry.totalCost)}</span>
            </div>
            
            ${jobNotes && jobNotes !== "Keine Notizen" ? 
              `<div class="detail-row notes-row">
                <span class="detail-label">♦ NOTIZEN:</span>
                <span class="detail-value">${jobNotes}</span>
              </div>` : ''
            }
          </div>
          <div class="card-footer">
            <div class="button-group">
              ${isPaid ? ButtonFactory.showNachweis(entryId, true) : ''}
              ${ButtonFactory.closeModal()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden der Druck-Details:", error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error("Fehler beim Laden der Details!");
    } else {
      alert("Fehler beim Laden der Details!");
    }
  }
}

// ==================== ENTRY EDITING ====================

async function editUserEntry(entryId) {
  try {
    const doc = await window.db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      if (window.toast && typeof window.toast.error === 'function') {
        window.toast.error('Druck nicht gefunden!');
      } else {
        alert('Druck nicht gefunden!');
      }
      return;
    }
    
    const entry = doc.data();
    
    // Prüfen ob User berechtigt ist (nur eigene Drucke bearbeiten)
    if (entry.kennung !== window.currentUser.kennung) {
      if (window.toast && typeof window.toast.warning === 'function') {
        window.toast.warning('Du kannst nur deine eigenen Drucke bearbeiten!');
      } else {
        alert('Du kannst nur deine eigenen Drucke bearbeiten!');
      }
      return;
    }
    
    // Prüfen ob Eintrag bereits bezahlt wurde
    if (entry.paid || entry.isPaid) {
      if (window.toast && typeof window.toast.warning === 'function') {
        window.toast.warning('Bezahlte Einträge können nicht mehr bearbeitet werden!');
      } else {
        alert('Bezahlte Einträge können nicht mehr bearbeitet werden!');
      }
      return;
    }
    
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>${jobName}</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="card">
          <div class="card-body">
            <form id="editUserEntryForm">
              <div class="form-group">
                <label class="form-label">Job-Name</label>
                <input type="text" id="editUserJobName" class="form-input" value="${jobName}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Notizen (optional)</label>
                <textarea id="editUserJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
              </div>
              
              <div class="detail-row" style="margin-top: 24px; padding: 16px; background: #f8f9fa; border: 1px solid #dee2e6; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Hinweis:</strong> Als Benutzer kannst du nur Job-Name und Notizen bearbeiten. Material-Mengen können nur von Admins geändert werden.
              </div>
            </form>
          </div>
          <div class="card-footer">
            <div class="button-group">
              ${ButtonFactory.saveChanges(`saveUserEntryChanges('${entryId}')`)}
              ${ButtonFactory.cancelModal()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden des Eintrags:", error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Laden des Eintrags!');
    } else {
      alert('Fehler beim Laden des Eintrags!');
    }
  }
}

async function saveUserEntryChanges(entryId) {
  const jobName = document.getElementById('editUserJobName').value.trim();
  const jobNotes = document.getElementById('editUserJobNotes').value.trim();
  
  if (!jobName) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Job-Name darf nicht leer sein!');
    } else {
      alert('Job-Name darf nicht leer sein!');
    }
    return;
  }
  
  try {
    await window.db.collection('entries').doc(entryId).update({
      jobName: jobName,
      jobNotes: jobNotes,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    if (window.toast && typeof window.toast.success === 'function') {
      window.toast.success('Eintrag erfolgreich aktualisiert!');
    } else {
      alert('Eintrag erfolgreich aktualisiert!');
    }
    closeModal();
    
    // User Dashboard aktualisieren
    window.loadUserEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      alert('Fehler beim Speichern: ' + error.message);
    }
  }
}

async function editEntry(entryId) {
  if (!window.checkAdminAccess()) return;
  
  try {
    const doc = await window.db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      if (window.toast && typeof window.toast.error === 'function') {
        window.toast.error('Druck nicht gefunden!');
      } else {
        alert('Druck nicht gefunden!');
      }
      return;
    }
    
    const entry = doc.data();
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>${jobName} (Admin)</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="card">
          <div class="card-body">
            <form id="editEntryForm">
              <div class="form-group">
                <label class="form-label">Job-Name</label>
                <input type="text" id="editJobName" class="form-input" value="${jobName}" required>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Material-Menge (kg)</label>
                  <input type="number" id="editMaterialMenge" class="form-input" value="${(entry.materialMenge || 0).toFixed(2)}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Masterbatch-Menge (g)</label>
                  <input type="number" id="editMasterbatchMenge" class="form-input" value="${(entry.masterbatchMenge || 0).toFixed(2)}" step="0.01" min="0" required>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Notizen (optional)</label>
                <textarea id="editJobNotes" class="form-textarea" rows="4" placeholder="Optionale Notizen zu diesem Druck...">${jobNotes}</textarea>
              </div>
              
              <div class="detail-row highlight-yellow" style="margin-top: 24px;">
                <strong>Admin-Berechtigung:</strong> Du kannst alle Felder dieses Eintrags bearbeiten. Kosten werden automatisch neu berechnet.
              </div>
            </form>
          </div>
          <div class="card-footer">
            <div class="button-group">
              ${ButtonFactory.saveChanges(`saveEntryChanges('${entryId}')`)}
              ${ButtonFactory.cancelModal()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden des Eintrags:", error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Laden des Eintrags!');
    } else {
      alert('Fehler beim Laden des Eintrags!');
    }
  }
}

async function saveEntryChanges(entryId) {
  const jobName = document.getElementById('editJobName').value.trim();
  const materialMenge = parseFloat(document.getElementById('editMaterialMenge').value);
  const masterbatchMenge = parseFloat(document.getElementById('editMasterbatchMenge').value);
  const jobNotes = document.getElementById('editJobNotes').value.trim();
  
  if (!jobName) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Job-Name darf nicht leer sein!');
    } else {
      alert('Job-Name darf nicht leer sein!');
    }
    return;
  }
  
  if (isNaN(materialMenge) || materialMenge < 0) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Bitte gültige Material-Menge eingeben!');
    } else {
      alert('Bitte gültige Material-Menge eingeben!');
    }
    return;
  }
  
  if (isNaN(masterbatchMenge) || masterbatchMenge < 0) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Bitte gültige Masterbatch-Menge eingeben!');
    } else {
      alert('Bitte gültige Masterbatch-Menge eingeben!');
    }
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
    
    if (window.toast && typeof window.toast.success === 'function') {
      window.toast.success('Eintrag erfolgreich aktualisiert!');
    } else {
      alert('Eintrag erfolgreich aktualisiert!');
    }
    closeModal();
    
    // Admin Dashboard aktualisieren
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Eintrags:', error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      alert('Fehler beim Speichern: ' + error.message);
    }
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
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Speichern der Notiz: ' + error.message);
    } else {
      alert('Fehler beim Speichern der Notiz: ' + error.message);
    }
  }
}

// ==================== GLOBAL EXPORTS ====================
// Modal-Funktionen global verfügbar machen
window.showModal = showModal;
window.showModalWithContent = showModalWithContent;
window.closeModal = closeModal;
window.showDetails = showDetails;
window.editUserEntry = editUserEntry;
window.editEntry = editEntry;
window.editNote = editNote;

// ==================== MODALS MODULE ====================
// Modal-Verwaltung und Entry-Details/Bearbeitung

// Alle Funktionen sind bereits global verfügbar
console.log("📋 Modals Module geladen");