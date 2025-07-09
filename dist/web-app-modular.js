// ==================== PELLETTRACKR WEB-APP (MODULARIZED) ====================

// Globale Variablen
let currentUser = { name: '', kennung: '', isAdmin: false };
const ADMIN_PASSWORD = 'fgf2024admin'; // In production sollte das in einer sicheren Konfiguration stehen

// Globale Daten für Suche und Sortierung
let allUserEntries = [];
let allAdminEntries = [];

// ==================== MODULE IMPORTS (Simulation) ====================
// In a real ES6 module environment, these would be:
// import { formatCurrency, checkAdminAccess, ... } from './modules/utils.js';
// import { showScreen, showModal, ... } from './modules/ui-components.js';
// etc.

// For now, all modules are loaded via script tags and functions are available globally

// ==================== DASHBOARD INITIALIZATION ====================

/**
 * User Dashboard initialisieren
 */
function initializeUserDashboard() {
  loadMaterials().then(() => {
    loadMasterbatches().then(() => {
      setupEventListeners();
    });
  });
  loadUserStats();
  loadUserEntries();
}

/**
 * Admin Dashboard initialisieren
 */
function initializeAdminDashboard() {
  loadAdminStats();
  loadAllEntries();
}

// ==================== ENTRY MANAGEMENT ====================

/**
 * Neuen Druck hinzufügen
 */
async function addEntry() {
  // Verwende die aktuellen User-Daten
  const name = currentUser.name;
  const kennung = currentUser.kennung;
  const material = document.getElementById("material").value.trim();
  const weight = document.getElementById("weight").value.trim();
  const masterbatch = document.getElementById("masterbatch").value.trim();
  const masterbatchWeight = document.getElementById("masterbatchWeight").value.trim();
  const jobName = document.getElementById("jobName").value.trim();
  const jobNotes = document.getElementById("jobNotes").value.trim();

  // Validierung
  if (!material || !weight) {
    alert("⚠️ Bitte mindestens Material und Gewicht ausfüllen!");
    return;
  }

  // Gewicht validieren
  const weightNum = parseGermanNumber(weight);
  if (isNaN(weightNum) || weightNum <= 0) {
    alert("⚠️ Bitte ein gültiges Gewicht eingeben!");
    return;
  }

  // Masterbatch-Gewicht validieren (falls eingegeben)
  let masterbatchWeightNum = 0;
  if (masterbatchWeight) {
    masterbatchWeightNum = parseGermanNumber(masterbatchWeight);
    if (isNaN(masterbatchWeightNum) || masterbatchWeightNum <= 0) {
      alert("⚠️ Bitte ein gültiges Masterbatch-Gewicht eingeben!");
      return;
    }
  }

  try {
    let materialData = null;
    let masterbatchData = null;
    let materialCost = 0;
    let masterbatchCost = 0;

    // Material-Daten abrufen
    if (material) {
      const materialDoc = await db.collection('materials').doc(material).get();
      if (materialDoc.exists) {
        materialData = materialDoc.data();
        materialCost = weightNum * materialData.price;
      }
    }

    // Masterbatch-Daten abrufen (falls ausgewählt)
    if (masterbatch && masterbatch !== '') {
      const masterbatchDoc = await db.collection('masterbatches').doc(masterbatch).get();
      if (masterbatchDoc.exists) {
        masterbatchData = masterbatchDoc.data();
        masterbatchCost = masterbatchWeightNum * masterbatchData.price;
      }
    }

    const totalCost = materialCost + masterbatchCost;

    // Entry-Objekt erstellen
    const entry = {
      name: name,
      kennung: kennung,
      material: materialData ? materialData.name : '',
      materialId: material,
      weight: weightNum,
      materialCost: materialCost,
      masterbatch: masterbatchData ? masterbatchData.name : '',
      masterbatchId: masterbatch || '',
      masterbatchWeight: masterbatchWeightNum,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      jobName: jobName,
      jobNotes: jobNotes,
      date: new Date(),
      paid: false
    };

    // Entry in Firestore speichern
    const docRef = await db.collection("entries").add(entry);
    console.log("✅ Entry gespeichert mit ID:", docRef.id);

    alert(`✅ Druck erfolgreich hinzugefügt!\n\nGesamtkosten: ${formatCurrency(totalCost)}`);

    // Formular zurücksetzen
    clearForm();

    // Listen aktualisieren
    if (currentUser.isAdmin) {
      loadAdminStats();
      loadAllEntries();
    } else {
      loadUserStats();
      loadUserEntries();
    }

  } catch (error) {
    console.error("❌ Fehler beim Hinzufügen:", error);
    alert("❌ Fehler beim Hinzufügen: " + error.message);
  }
}

/**
 * Formular zurücksetzen
 */
function clearForm() {
  document.getElementById("material").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("masterbatch").value = "";
  document.getElementById("masterbatchWeight").value = "";
  document.getElementById("jobName").value = "";
  document.getElementById("jobNotes").value = "";
  
  // Kostenvorschau zurücksetzen
  const previewElement = document.getElementById('costPreview');
  if (previewElement) {
    previewElement.textContent = '';
  }
}

// ==================== USER DASHBOARD FUNCTIONS ====================

/**
 * User-Statistiken laden
 */
async function loadUserStats() {
  try {
    const snapshot = await db.collection('entries')
      .where('kennung', '==', currentUser.kennung)
      .get();
    
    let totalCost = 0;
    let unpaidCost = 0;
    let totalEntries = 0;
    let unpaidEntries = 0;
    
    snapshot.forEach(doc => {
      const entry = doc.data();
      totalCost += entry.totalCost || 0;
      totalEntries++;
      
      if (!entry.paid) {
        unpaidCost += entry.totalCost || 0;
        unpaidEntries++;
      }
    });
    
    // Stats anzeigen
    document.getElementById('userTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('userUnpaidCost').textContent = formatCurrency(unpaidCost);
    document.getElementById('userTotalEntries').textContent = totalEntries;
    document.getElementById('userUnpaidEntries').textContent = unpaidEntries;
    
  } catch (error) {
    console.error('Fehler beim Laden der User-Stats:', error);
  }
}

/**
 * User-Einträge laden
 */
async function loadUserEntries() {
  try {
    const snapshot = await db.collection('entries')
      .where('kennung', '==', currentUser.kennung)
      .orderBy('date', 'desc')
      .get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    allUserEntries = entries;
    renderUserEntries(entries);
    
  } catch (error) {
    console.error('Fehler beim Laden der User-Einträge:', error);
  }
}

/**
 * User-Einträge rendern
 */
function renderUserEntries(entries) {
  const tableContainer = document.getElementById('userEntriesTable');
  
  if (entries.length === 0) {
    tableContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Keine Einträge gefunden</p>';
    return;
  }
  
  let html = `
    <table class="responsive-table">
      <thead>
        <tr>
          <th class="col-date">Datum</th>
          <th class="col-material">Material</th>
          <th class="col-weight">Gewicht</th>
          <th class="col-masterbatch">Masterbatch</th>
          <th class="col-job">Job</th>
          <th class="col-cost">Kosten</th>
          <th class="col-status">Status</th>
          <th class="col-actions">Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  entries.forEach(entry => {
    const date = entry.date ? new Date(entry.date.seconds * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
    const statusBadge = entry.paid ? 
      '<span class="status-badge paid">✅ Bezahlt</span>' : 
      '<span class="status-badge unpaid">❌ Offen</span>';
    
    html += `
      <tr class="${entry.paid ? 'paid' : 'unpaid'}">
        <td data-label="Datum" class="col-date">${date}</td>
        <td data-label="Material" class="col-material">${entry.material || 'N/A'}</td>
        <td data-label="Gewicht" class="col-weight">${entry.weight || 0} kg</td>
        <td data-label="Masterbatch" class="col-masterbatch">${entry.masterbatch || 'Keiner'}</td>
        <td data-label="Job" class="col-job">${entry.jobName || 'Kein Name'}</td>
        <td data-label="Kosten" class="col-cost">${formatCurrency(entry.totalCost || 0)}</td>
        <td data-label="Status" class="col-status">${statusBadge}</td>
        <td class="actions col-actions" data-label="Aktionen">
          <button class="btn btn-sm btn-secondary" onclick="viewEntryDetails('${entry.id}')">Details</button>
          ${!entry.paid ? `<button class="btn btn-sm btn-primary" onclick="editUserEntry('${entry.id}')">Bearbeiten</button>` : ''}
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  tableContainer.innerHTML = html;
}

// ==================== ENTRY DETAILS & PAYMENT FUNCTIONS ====================

/**
 * Entry-Details anzeigen
 */
async function viewEntryDetails(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Eintrag nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    const date = entry.date ? 
      (entry.date.seconds ? new Date(entry.date.seconds * 1000).toLocaleDateString('de-DE') : new Date(entry.date).toLocaleDateString('de-DE')) : 
      'Unbekannt';
    
    const modalContent = `
      <div class="entry-details">
        <h2>📋 Druck-Details</h2>
        
        <div class="details-grid">
          <div class="detail-section">
            <h3>👤 Benutzer-Informationen</h3>
            <p><strong>Name:</strong> ${entry.name || 'N/A'}</p>
            <p><strong>FH-Kennung:</strong> ${entry.kennung || 'N/A'}</p>
            <p><strong>Datum:</strong> ${date}</p>
          </div>
          
          <div class="detail-section">
            <h3>🧱 Material-Informationen</h3>
            <p><strong>Material:</strong> ${entry.material || 'N/A'}</p>
            <p><strong>Gewicht:</strong> ${entry.weight || 0} kg</p>
            <p><strong>Material-Kosten:</strong> ${formatCurrency(entry.materialCost || 0)}</p>
            
            ${entry.masterbatch ? `
              <p><strong>Masterbatch:</strong> ${entry.masterbatch}</p>
              <p><strong>Masterbatch-Gewicht:</strong> ${entry.masterbatchWeight || 0} kg</p>
              <p><strong>Masterbatch-Kosten:</strong> ${formatCurrency(entry.masterbatchCost || 0)}</p>
            ` : '<p><strong>Masterbatch:</strong> Keiner verwendet</p>'}
          </div>
          
          <div class="detail-section">
            <h3>📝 Job-Informationen</h3>
            <p><strong>Job-Name:</strong> ${entry.jobName || 'Kein Name angegeben'}</p>
            <p><strong>Notizen:</strong> ${entry.jobNotes || 'Keine Notizen'}</p>
          </div>
          
          <div class="detail-section">
            <h3>💰 Kosten & Status</h3>
            <p><strong>Gesamtkosten:</strong> ${formatCurrency(entry.totalCost || 0)}</p>
            <p><strong>Status:</strong> ${entry.paid ? '✅ Bezahlt' : '❌ Offen'}</p>
            ${entry.paid && entry.paidDate ? `<p><strong>Bezahlt am:</strong> ${new Date(entry.paidDate.seconds * 1000).toLocaleDateString('de-DE')}</p>` : ''}
          </div>
        </div>
        
        <div class="modal-actions">
          ${!entry.paid && !currentUser.isAdmin ? `
            <button onclick="editUserEntry('${entryId}')" class="btn btn-primary">Bearbeiten</button>
          ` : ''}
          
          ${currentUser.isAdmin ? `
            <button onclick="editEntry('${entryId}')" class="btn btn-primary">Bearbeiten</button>
            ${!entry.paid ? 
              `<button onclick="markEntryAsPaid('${entryId}'); closeModal();" class="btn btn-success">Als bezahlt markieren</button>` : 
              `<button onclick="markEntryAsUnpaid('${entryId}'); closeModal();" class="btn btn-warning">Als unbezahlt markieren</button>`
            }
            <button onclick="deleteEntry('${entryId}'); closeModal();" class="btn btn-danger">Löschen</button>
          ` : ''}
          
          <button onclick="showPaymentProof('${entryId}')" class="btn btn-secondary">Zahlungsnachweis</button>
          <button onclick="closeModal()" class="btn btn-secondary">Schließen</button>
        </div>
      </div>
    `;
    
    showModal(modalContent);
    
  } catch (error) {
    console.error('Fehler beim Laden der Entry-Details:', error);
    alert('Fehler beim Laden der Details: ' + error.message);
  }
}

/**
 * User-Entry bearbeiten (vereinfacht)
 */
async function editUserEntry(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Eintrag nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    
    // Prüfen ob User berechtigt ist
    if (entry.kennung !== currentUser.kennung && !currentUser.isAdmin) {
      alert('Du kannst nur deine eigenen Einträge bearbeiten!');
      return;
    }
    
    // Prüfen ob bereits bezahlt
    if (entry.paid) {
      alert('Bezahlte Einträge können nicht bearbeitet werden!');
      return;
    }
    
    // Simplified edit modal
    const modalContent = `
      <div class="edit-entry">
        <h2>✏️ Eintrag bearbeiten</h2>
        <form onsubmit="return false;">
          <div class="form-group">
            <label>Job-Name:</label>
            <input type="text" id="editJobName" value="${escapeQuotes(entry.jobName || '')}" placeholder="Job-Name">
          </div>
          <div class="form-group">
            <label>Notizen:</label>
            <textarea id="editJobNotes" placeholder="Notizen">${escapeQuotes(entry.jobNotes || '')}</textarea>
          </div>
          <div class="modal-actions">
            <button onclick="saveUserEntryChanges('${entryId}')" class="btn btn-primary">Speichern</button>
            <button onclick="closeModal()" class="btn btn-secondary">Abbrechen</button>
          </div>
        </form>
      </div>
    `;
    
    showModal(modalContent);
    
  } catch (error) {
    console.error('Fehler beim Laden des Eintrags:', error);
    alert('Fehler beim Laden: ' + error.message);
  }
}

/**
 * User-Entry-Änderungen speichern
 */
async function saveUserEntryChanges(entryId) {
  try {
    const jobName = document.getElementById('editJobName').value.trim();
    const jobNotes = document.getElementById('editJobNotes').value.trim();
    
    await db.collection('entries').doc(entryId).update({
      jobName: jobName,
      jobNotes: jobNotes,
      updatedAt: new Date()
    });
    
    alert('✅ Änderungen gespeichert!');
    closeModal();
    loadUserEntries();
    if (currentUser.isAdmin) {
      loadAllEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    alert('❌ Fehler beim Speichern: ' + error.message);
  }
}

/**
 * Zahlungsnachweis anzeigen
 */
async function showPaymentProof(entryId) {
  try {
    const entryDoc = await db.collection('entries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = { id: entryDoc.id, ...entryDoc.data() };
    
    // Prüfen ob bezahlt
    if (!entry.paid) {
      alert('Für diesen Druck wurde noch keine Zahlung registriert!');
      return;
    }
    
    const date = entry.date ? 
      (entry.date.seconds ? new Date(entry.date.seconds * 1000).toLocaleDateString('de-DE') : new Date(entry.date).toLocaleDateString('de-DE')) : 
      'Unbekannt';
    
    const paidDate = entry.paidDate ? 
      new Date(entry.paidDate.seconds * 1000).toLocaleDateString('de-DE') : 
      new Date().toLocaleDateString('de-DE');
    
    const proofContent = `
      <div class="payment-proof">
        <div class="proof-header">
          <div class="proof-title">
            <span class="highlight">Pellet</span>Trackr
          </div>
          <div class="proof-subtitle">Zahlungsnachweis</div>
        </div>
        
        <div class="proof-details">
          <div class="proof-section">
            <h3>Rechnungsdetails</h3>
            <div class="proof-item">
              <span class="proof-label">Datum:</span>
              <span class="proof-value">${date}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job:</span>
              <span class="proof-value">${entry.jobName || '3D-Druck Auftrag'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material || 'N/A'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Gewicht:</span>
              <span class="proof-value">${entry.weight || 0} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material-Kosten:</span>
              <span class="proof-value">${formatCurrency(entry.materialCost || 0)}</span>
            </div>
            ${entry.masterbatch ? `
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch-Gewicht:</span>
              <span class="proof-value">${entry.masterbatchWeight || 0} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch-Kosten:</span>
              <span class="proof-value">${formatCurrency(entry.masterbatchCost || 0)}</span>
            </div>
            ` : ''}
            ${entry.jobNotes ? `
            <div class="proof-item">
              <span class="proof-label">Notizen:</span>
              <span class="proof-value">${entry.jobNotes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="proof-section">
            <h3>Zahlungsinformationen</h3>
            <div class="proof-item">
              <span class="proof-label">Name:</span>
              <span class="proof-value">${entry.name || 'N/A'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung || 'N/A'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Bezahlt am:</span>
              <span class="proof-value">${paidDate}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Status:</span>
              <span class="proof-value" style="color: #28a745; font-weight: 700;">✅ Bezahlt</span>
            </div>
          </div>
        </div>
        
        <div class="proof-total">
          <div style="font-size: 16px; margin-bottom: 8px;">Gesamtbetrag</div>
          <div class="proof-total-amount">${formatCurrency(entry.totalCost || 0)}</div>
        </div>
        
        <div class="proof-footer">
          <p>Dieser Zahlungsnachweis wurde automatisch generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.</p>
          <p>FGF 3D-Druck Verwaltung - PelletTrackr System</p>
        </div>
        
        <div class="modal-actions">
          <button onclick="printPaymentProof()" class="btn btn-primary">🖨️ Drucken</button>
          <button onclick="emailPaymentProof('${entry.kennung}@fh-muenster.de')" class="btn btn-secondary">📧 Per E-Mail senden</button>
          <button onclick="closePaymentProofModal()" class="btn btn-secondary">Schließen</button>
        </div>
      </div>
    `;
    
    // Modal anzeigen
    const modalContent = `
      <div class="modal-header">
        <h2>📄 Zahlungsnachweis</h2>
        <button class="btn btn-link" onclick="closePaymentProofModal()">×</button>
      </div>
      <div class="modal-body">
        ${proofContent}
      </div>
    `;
    
    showModal(modalContent);
    
    // Store entry data for print/email
    window.currentProofEntry = entry;
    
  } catch (error) {
    console.error('Fehler beim Laden des Zahlungsnachweises:', error);
    alert('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
  }
}

/**
 * Admin Entry bearbeiten (vollständige Bearbeitung)
 */
async function editEntry(entryId) {
  if (!currentUser.isAdmin) {
    alert('Nur Admins können Einträge vollständig bearbeiten!');
    return;
  }
  
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Eintrag nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    
    // Materialien und Masterbatches laden für Dropdowns
    const materialsSnapshot = await db.collection('materials').get();
    const masterbatchesSnapshot = await db.collection('masterbatches').get();
    
    let materialOptions = '<option value="">Wähle Material...</option>';
    materialsSnapshot.forEach(doc => {
      const material = doc.data();
      const selected = doc.id === entry.materialId ? 'selected' : '';
      materialOptions += `<option value="${doc.id}" ${selected}>${material.name} - ${formatCurrency(material.price)}/kg</option>`;
    });
    
    let masterbatchOptions = '<option value="">Kein Masterbatch</option>';
    masterbatchesSnapshot.forEach(doc => {
      const masterbatch = doc.data();
      const selected = doc.id === entry.masterbatchId ? 'selected' : '';
      masterbatchOptions += `<option value="${doc.id}" ${selected}>${masterbatch.name} - ${formatCurrency(masterbatch.price)}/kg</option>`;
    });
    
    const modalContent = `
      <div class="edit-entry-admin">
        <h2>⚙️ Eintrag bearbeiten (Admin)</h2>
        <form onsubmit="return false;">
          <div class="form-section">
            <h3>Benutzer-Informationen</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Name:</label>
                <input type="text" id="editName" value="${escapeQuotes(entry.name || '')}" class="form-input">
              </div>
              <div class="form-group">
                <label>FH-Kennung:</label>
                <input type="text" id="editKennung" value="${escapeQuotes(entry.kennung || '')}" class="form-input">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Material-Informationen</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Material:</label>
                <select id="editMaterial" class="form-select" onchange="updateEditCosts()">
                  ${materialOptions}
                </select>
              </div>
              <div class="form-group">
                <label>Gewicht (kg):</label>
                <input type="number" id="editWeight" value="${entry.weight || 0}" step="0.01" min="0" class="form-input" onchange="updateEditCosts()">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Masterbatch:</label>
                <select id="editMasterbatch" class="form-select" onchange="updateEditCosts()">
                  ${masterbatchOptions}
                </select>
              </div>
              <div class="form-group">
                <label>Masterbatch-Gewicht (kg):</label>
                <input type="number" id="editMasterbatchWeight" value="${entry.masterbatchWeight || 0}" step="0.01" min="0" class="form-input" onchange="updateEditCosts()">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Job-Informationen</h3>
            <div class="form-group">
              <label>Job-Name:</label>
              <input type="text" id="editJobName" value="${escapeQuotes(entry.jobName || '')}" class="form-input">
            </div>
            <div class="form-group">
              <label>Notizen:</label>
              <textarea id="editJobNotes" class="form-textarea" rows="4">${escapeQuotes(entry.jobNotes || '')}</textarea>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Kosten-Übersicht</h3>
            <div class="cost-preview">
              <div class="cost-item">
                <span>Material-Kosten:</span>
                <span id="editMaterialCostPreview">${formatCurrency(entry.materialCost || 0)}</span>
              </div>
              <div class="cost-item">
                <span>Masterbatch-Kosten:</span>
                <span id="editMasterbatchCostPreview">${formatCurrency(entry.masterbatchCost || 0)}</span>
              </div>
              <div class="cost-item total">
                <span>Gesamtkosten:</span>
                <span id="editTotalCostPreview">${formatCurrency(entry.totalCost || 0)}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button onclick="saveAdminEntryChanges('${entryId}')" class="btn btn-primary">Speichern</button>
            <button onclick="closeModal()" class="btn btn-secondary">Abbrechen</button>
          </div>
        </form>
      </div>
    `;
    
    showModal(modalContent);
    
  } catch (error) {
    console.error('Fehler beim Laden des Eintrags:', error);
    alert('Fehler beim Laden: ' + error.message);
  }
}

/**
 * Kosten in Admin-Edit aktualisieren
 */
async function updateEditCosts() {
  try {
    const materialId = document.getElementById('editMaterial').value;
    const weight = parseFloat(document.getElementById('editWeight').value) || 0;
    const masterbatchId = document.getElementById('editMasterbatch').value;
    const masterbatchWeight = parseFloat(document.getElementById('editMasterbatchWeight').value) || 0;
    
    let materialCost = 0;
    let masterbatchCost = 0;
    
    // Material-Kosten berechnen
    if (materialId && weight > 0) {
      const materialDoc = await db.collection('materials').doc(materialId).get();
      if (materialDoc.exists) {
        const materialData = materialDoc.data();
        materialCost = weight * materialData.price;
      }
    }
    
    // Masterbatch-Kosten berechnen
    if (masterbatchId && masterbatchWeight > 0) {
      const masterbatchDoc = await db.collection('masterbatches').doc(masterbatchId).get();
      if (masterbatchDoc.exists) {
        const masterbatchData = masterbatchDoc.data();
        masterbatchCost = masterbatchWeight * masterbatchData.price;
      }
    }
    
    const totalCost = materialCost + masterbatchCost;
    
    // Preview aktualisieren
    document.getElementById('editMaterialCostPreview').textContent = formatCurrency(materialCost);
    document.getElementById('editMasterbatchCostPreview').textContent = formatCurrency(masterbatchCost);
    document.getElementById('editTotalCostPreview').textContent = formatCurrency(totalCost);
    
  } catch (error) {
    console.error('Fehler beim Berechnen der Kosten:', error);
  }
}

/**
 * Admin Entry-Änderungen speichern
 */
async function saveAdminEntryChanges(entryId) {
  try {
    const name = document.getElementById('editName').value.trim();
    const kennung = document.getElementById('editKennung').value.trim();
    const materialId = document.getElementById('editMaterial').value;
    const weight = parseFloat(document.getElementById('editWeight').value) || 0;
    const masterbatchId = document.getElementById('editMasterbatch').value;
    const masterbatchWeight = parseFloat(document.getElementById('editMasterbatchWeight').value) || 0;
    const jobName = document.getElementById('editJobName').value.trim();
    const jobNotes = document.getElementById('editJobNotes').value.trim();
    
    // Validierung
    if (!name || !kennung || !materialId || weight <= 0) {
      alert('Bitte fülle alle erforderlichen Felder aus!');
      return;
    }
    
    // Material- und Masterbatch-Daten abrufen
    let materialData = null;
    let masterbatchData = null;
    let materialCost = 0;
    let masterbatchCost = 0;
    
    if (materialId) {
      const materialDoc = await db.collection('materials').doc(materialId).get();
      if (materialDoc.exists) {
        materialData = materialDoc.data();
        materialCost = weight * materialData.price;
      }
    }
    
    if (masterbatchId) {
      const masterbatchDoc = await db.collection('masterbatches').doc(masterbatchId).get();
      if (masterbatchDoc.exists) {
        masterbatchData = masterbatchDoc.data();
        masterbatchCost = masterbatchWeight * masterbatchData.price;
      }
    }
    
    const totalCost = materialCost + masterbatchCost;
    
    // Update-Objekt erstellen
    const updateData = {
      name: name,
      kennung: kennung,
      material: materialData ? materialData.name : '',
      materialId: materialId,
      weight: weight,
      materialCost: materialCost,
      masterbatch: masterbatchData ? masterbatchData.name : '',
      masterbatchId: masterbatchId || '',
      masterbatchWeight: masterbatchWeight,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      jobName: jobName,
      jobNotes: jobNotes,
      updatedAt: new Date(),
      updatedBy: currentUser.kennung
    };
    
    // In Firestore speichern
    await db.collection('entries').doc(entryId).update(updateData);
    
    alert('✅ Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // Listen aktualisieren
    loadUserEntries();
    if (currentUser.isAdmin) {
      loadAllEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    alert('❌ Fehler beim Speichern: ' + error.message);
  }
}

/**
 * Payment Proof drucken
 */
function printPaymentProof() {
  const originalTitle = document.title;
  document.title = 'Zahlungsnachweis - PelletTrackr';
  
  // Erstelle ein neues Fenster nur mit dem Payment Proof Inhalt
  const printWindow = window.open('', '_blank');
  const proofElement = document.querySelector('.payment-proof');
  
  if (proofElement && printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zahlungsnachweis - PelletTrackr</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .payment-proof { max-width: 600px; margin: 0 auto; }
          .proof-header { background: #FFEB00; padding: 24px; text-align: center; border: 2px solid #000; }
          .proof-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
          .proof-subtitle { font-size: 16px; font-weight: 600; }
          .proof-details { padding: 24px 0; }
          .proof-section { margin-bottom: 24px; }
          .proof-section h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; border-bottom: 2px solid #FFEB00; padding-bottom: 8px; }
          .proof-item { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
          .proof-label { font-weight: 600; }
          .proof-value { font-weight: 700; }
          .proof-total { background: #FFEB00; padding: 20px; text-align: center; border: 2px solid #000; margin: 20px 0; }
          .proof-total-amount { font-size: 32px; font-weight: 900; margin-top: 8px; }
          .proof-footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .modal-actions { display: none; }
        </style>
      </head>
      <body>
        ${proofElement.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
  
  document.title = originalTitle;
}

/**
 * Payment Proof per E-Mail senden
 */
function emailPaymentProof(email) {
  if (!window.currentProofEntry) {
    alert('Fehler: Eintragsdaten nicht verfügbar');
    return;
  }
  
  const entry = window.currentProofEntry;
  const subject = `Zahlungsnachweis - PelletTrackr (${entry.jobName || '3D-Druck'})`;
  const body = `Hallo ${entry.name},

anbei findest du deinen Zahlungsnachweis für den 3D-Druck:

Job: ${entry.jobName || '3D-Druck Auftrag'}
Material: ${entry.material || 'N/A'}
Gewicht: ${entry.weight || 0} kg
Gesamtkosten: ${formatCurrency(entry.totalCost || 0)}
Status: ✅ Bezahlt

Dieser Nachweis wurde automatisch vom PelletTrackr System generiert.

Mit freundlichen Grüßen
FGF 3D-Druck Team`;

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoLink);
}

/**
 * Payment Proof Modal schließen
 */
function closePaymentProofModal() {
  closeModal();
  window.currentProofEntry = null;
}

/**
 * Hilfsfunktionen für Admin-Operationen
 */

/**
 * Admin-Berechtigung prüfen
 */
function checkAdminAccess() {
  if (!currentUser.isAdmin) {
    alert('❌ Zugriff verweigert!\n\nDiese Funktion ist nur für Administratoren verfügbar.');
    return false;
  }
  return true;
}

/**
 * Entry-Existenz und Berechtigung prüfen
 */
async function validateEntryAccess(entryId, requireAdmin = false) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    
    if (!doc.exists) {
      alert('❌ Eintrag nicht gefunden!\n\nDer gewählte Eintrag existiert nicht mehr.');
      return null;
    }
    
    const entry = doc.data();
    
    if (requireAdmin && !currentUser.isAdmin) {
      alert('❌ Admin-Berechtigung erforderlich!');
      return null;
    }
    
    // Für normale User: nur eigene Einträge
    if (!currentUser.isAdmin && entry.kennung !== currentUser.kennung) {
      alert('❌ Zugriff verweigert!\n\nDu kannst nur deine eigenen Einträge bearbeiten.');
      return null;
    }
    
    return { id: entryId, ...entry };
    
  } catch (error) {
    console.error('Fehler bei Entry-Validierung:', error);
    alert('❌ Fehler beim Laden des Eintrags: ' + error.message);
    return null;
  }
}

/**
 * Sichere Entry-Update-Funktion
 */
async function safeUpdateEntry(entryId, updateData, successMessage = 'Erfolgreich aktualisiert!') {
  try {
    await db.collection('entries').doc(entryId).update({
      ...updateData,
      updatedAt: new Date(),
      updatedBy: currentUser.kennung
    });
    
    alert('✅ ' + successMessage);
    
    // Listen automatisch aktualisieren
    if (typeof loadUserEntries === 'function') {
      loadUserEntries();
    }
    if (typeof loadAllEntries === 'function' && currentUser.isAdmin) {
      loadAllEntries();
    }
    
    return true;
    
  } catch (error) {
    console.error('Fehler beim Update:', error);
    alert('❌ Fehler beim Speichern: ' + error.message);
    return false;
  }
}

/**
 * Bestätigungsdialog für kritische Aktionen
 */
function confirmCriticalAction(message, actionName = 'diese Aktion') {
  return confirm(`⚠️ ${message}\n\n❌ ${actionName.toUpperCase()} kann nicht rückgängig gemacht werden!\n\nMöchtest du wirklich fortfahren?`);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});
