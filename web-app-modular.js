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
  const tableBody = document.getElementById('userEntriesTable');
  
  if (entries.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Keine Einträge gefunden</td></tr>';
    return;
  }
  
  let html = '';
  entries.forEach(entry => {
    const date = entry.date ? new Date(entry.date.seconds * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
    const statusBadge = entry.paid ? 
      '<span class="status-badge paid">✅ Bezahlt</span>' : 
      '<span class="status-badge unpaid">❌ Offen</span>';
    
    html += `
      <tr class="${entry.paid ? 'paid' : 'unpaid'}">
        <td data-label="Datum">${date}</td>
        <td data-label="Material">${entry.material || 'N/A'}</td>
        <td data-label="Gewicht">${entry.weight || 0} kg</td>
        <td data-label="Masterbatch">${entry.masterbatch || 'Keiner'}</td>
        <td data-label="Job">${entry.jobName || 'Kein Name'}</td>
        <td data-label="Kosten">${formatCurrency(entry.totalCost || 0)}</td>
        <td data-label="Status">${statusBadge}</td>
        <td class="actions" data-label="Aktionen">
          <button class="btn btn-sm btn-secondary" onclick="viewEntryDetails('${entry.id}')">Details</button>
          ${!entry.paid ? `<button class="btn btn-sm btn-primary" onclick="editUserEntry('${entry.id}')">Bearbeiten</button>` : ''}
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
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
 * Placeholder für Payment Proof (wird in separatem Modul implementiert)
 */
async function showPaymentProof(entryId) {
  alert('📄 Zahlungsnachweis-Funktion wird noch implementiert...');
}

/**
 * Placeholder für Admin Entry Edit (wird in separatem Modul implementiert)
 */
async function editEntry(entryId) {
  alert('⚙️ Admin-Edit-Funktion wird noch implementiert...');
}

/**
 * Placeholder Payment Proof Modal schließen
 */
function closePaymentProofModal() {
  // Implementation in payment module
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});
