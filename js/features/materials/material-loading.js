// ==================== MATERIAL LOADING MODULE ====================
// Laden von Materialien und Masterbatches aus Firestore

// Materialien laden (direkt aus Firestore)
async function loadMaterials() {
  const select = document.getElementById("material");
  if (!select) return;
  
  select.innerHTML = '<option value="">Lade Materialien...</option>';
  
  console.log("🔄 Lade Materialien...");
  
  try {
    const snapshot = await window.db.collection("materials").get();
    console.log("📊 Materials-Snapshot:", snapshot.size, "Dokumente");
    
    select.innerHTML = '<option value="">Material auswählen... (optional)</option>';
    
    if (snapshot.empty) {
      console.log("⚠️ Keine Materialien gefunden");
      select.innerHTML = '<option value="">Keine Materialien verfügbar</option>';
      return;
    }
    
    snapshot.forEach(doc => {
      const material = doc.data();
      console.log("➕ Material:", material.name, "Preis:", material.price);
      const option = document.createElement("option");
      option.value = material.name;
      option.textContent = `${material.name} (${material.price.toFixed(2)} ${(material.currency || '€')}/kg)`;
      select.appendChild(option);
    });
    
    console.log("✅ Materialien erfolgreich geladen!");
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Materialien:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

// Masterbatches laden (direkt aus Firestore)
async function loadMasterbatches() {
  const select = document.getElementById("masterbatch");
  if (!select) return;
  
  select.innerHTML = '<option value="">Lade Masterbatches...</option>';
  
  console.log("🔄 Lade Masterbatches...");
  
  try {
    const snapshot = await window.db.collection("masterbatches").get();
    console.log("📊 Masterbatches-Snapshot:", snapshot.size, "Dokumente");
    
    select.innerHTML = '<option value="">Masterbatch auswählen... (optional)</option>';
    
    if (snapshot.empty) {
      console.log("⚠️ Keine Masterbatches gefunden");
      select.innerHTML = '<option value="">Keine Masterbatches verfügbar</option>';
      return;
    }
    
    snapshot.forEach(doc => {
      const masterbatch = doc.data();
      console.log("➕ Masterbatch:", masterbatch.name, "Preis:", masterbatch.price);
      const option = document.createElement("option");
      option.value = masterbatch.name;
      option.textContent = `${masterbatch.name} (${masterbatch.price.toFixed(2)} ${(masterbatch.currency || '€')}/kg)`;
      select.appendChild(option);
    });
    
    console.log("✅ Masterbatches erfolgreich geladen!");
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Masterbatches:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

// ==================== MATERIAL MANAGEMENT UI ====================

function showMaterialManager() {
  if (!window.checkAdminAccess()) return;
  document.getElementById('materialManager').classList.add('active');
  loadMaterialsForManagement();
}

function closeMaterialManager() {
  document.getElementById('materialManager').classList.remove('active');
}

function showMasterbatchManager() {
  if (!window.checkAdminAccess()) return;
  document.getElementById('masterbatchManager').classList.add('active');
  loadMasterbatchesForManagement();
}

function closeMasterbatchManager() {
  document.getElementById('masterbatchManager').classList.remove('active');
}

// ==================== LOAD FOR MANAGEMENT ====================

async function loadMaterialsForManagement() {
  try {
    const snapshot = await window.db.collection("materials").get();
    
    const tableDiv = document.getElementById("materialsTable");
    
    if (snapshot.empty) {
      const message = '<p>Keine Materialien vorhanden.</p>';
      tableDiv.innerHTML = message;
      return;
    }

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th onclick="sortMaterials('name')">Name</th>
            <th onclick="sortMaterials('manufacturer')">Hersteller</th>
            <th onclick="sortMaterials('netPrice')">EK Netto €/kg</th>
            <th onclick="sortMaterials('grossPrice')">EK Brutto €/kg</th>
            <th onclick="sortMaterials('markup')">Gemeinkosten %</th>
            <th onclick="sortMaterials('sellingPrice')">VK €/kg</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    snapshot.forEach(doc => {
      const material = doc.data();
      
      // Berechne Brutto und VK (falls alte Daten)
      const netPrice = material.netPrice || material.price || 0;
      const taxRate = material.taxRate || 19;
      const markup = material.markup || 30;
      const grossPrice = netPrice * (1 + taxRate / 100);
      const sellingPrice = grossPrice * (1 + markup / 100);
      
      // Responsive Tabellen-Zeile mit data-label Attributen
      tableHtml += `
        <tr id="material-row-${doc.id}">
          <td data-label="Name" id="material-name-${doc.id}"><span class="cell-value">${material.name}</span></td>
          <td data-label="Hersteller" id="material-manufacturer-${doc.id}"><span class="cell-value">${material.manufacturer || 'Unbekannt'}</span></td>
          <td data-label="EK Netto €/kg" id="material-netprice-${doc.id}"><span class="cell-value">${window.formatCurrency(netPrice)}</span></td>
          <td data-label="EK Brutto €/kg" id="material-grossprice-${doc.id}"><span class="cell-value">${window.formatCurrency(grossPrice)}</span></td>
          <td data-label="Gemeinkosten %" id="material-markup-${doc.id}"><span class="cell-value">${markup}%</span></td>
          <td data-label="VK €/kg" id="material-price-${doc.id}"><span class="cell-value">${window.formatCurrency(sellingPrice)}</span></td>
          <td class="actions" data-label="Aktionen">
            <div class="action-group">
              ${ButtonFactory.editMaterial(doc.id)}
              ${ButtonFactory.deleteMaterial(doc.id)}
            </div>
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;
    
    tableDiv.innerHTML = tableHtml;
    
  } catch (error) {
    console.error("Fehler beim Laden der Materialien:", error);
  }
}

async function loadMasterbatchesForManagement() {
  try {
    const snapshot = await window.db.collection("masterbatches").get();
    
    const tableDiv = document.getElementById("masterbatchesTable");
    
    if (snapshot.empty) {
      const message = '<p>Keine Masterbatches vorhanden.</p>';
      tableDiv.innerHTML = message;
      return;
    }

    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th onclick="sortMasterbatches('name')">Name</th>
            <th onclick="sortMasterbatches('manufacturer')">Hersteller</th>
            <th onclick="sortMasterbatches('netPrice')">EK Netto €/kg</th>
            <th onclick="sortMasterbatches('grossPrice')">EK Brutto €/kg</th>
            <th onclick="sortMasterbatches('markup')">Gemeinkosten %</th>
            <th onclick="sortMasterbatches('sellingPrice')">VK €/kg</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    snapshot.forEach(doc => {
      const masterbatch = doc.data();
      
      // Berechne Brutto und VK (falls alte Daten)
      const netPrice = masterbatch.netPrice || masterbatch.price || 0;
      const taxRate = masterbatch.taxRate || 19;
      const markup = masterbatch.markup || 30;
      const grossPrice = netPrice * (1 + taxRate / 100);
      const sellingPrice = grossPrice * (1 + markup / 100);
      
      // Responsive Tabellen-Zeile mit data-label Attributen
      tableHtml += `
        <tr id="masterbatch-row-${doc.id}">
          <td data-label="Name" id="masterbatch-name-${doc.id}"><span class="cell-value">${masterbatch.name}</span></td>
          <td data-label="Hersteller" id="masterbatch-manufacturer-${doc.id}"><span class="cell-value">${masterbatch.manufacturer || 'Unbekannt'}</span></td>
          <td data-label="EK Netto €/kg" id="masterbatch-netprice-${doc.id}"><span class="cell-value">${window.formatCurrency(netPrice)}</span></td>
          <td data-label="EK Brutto €/kg" id="masterbatch-grossprice-${doc.id}"><span class="cell-value">${window.formatCurrency(grossPrice)}</span></td>
          <td data-label="Gemeinkosten %" id="masterbatch-markup-${doc.id}"><span class="cell-value">${markup}%</span></td>
          <td data-label="VK €/kg" id="masterbatch-price-${doc.id}"><span class="cell-value">${window.formatCurrency(sellingPrice)}</span></td>
          <td class="actions" data-label="Aktionen">
            <div class="action-group">
              ${ButtonFactory.editMasterbatch(doc.id)}
              ${ButtonFactory.deleteMasterbatch(doc.id)}
            </div>
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;
    
    tableDiv.innerHTML = tableHtml;
    
  } catch (error) {
    console.error("Fehler beim Laden der Masterbatches:", error);
  }
}

// ==================== ADD FUNCTIONS ====================

async function addMaterial() {
  const name = document.getElementById('newMaterialName').value.trim();
  const manufacturer = document.getElementById('newMaterialManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('newMaterialNetPrice').value);
  const taxRate = parseFloat(document.getElementById('newMaterialTaxRate').value) || 19;
  const markup = parseFloat(document.getElementById('newMaterialMarkup').value) || 30;
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    alert('Bitte gültigen Namen und EK-Netto-Preis eingeben!');
    return;
  }
  
  const grossPrice = netPrice * (1 + taxRate / 100);
  const sellingPrice = grossPrice * (1 + markup / 100);
  
  try {
    await window.db.collection('materials').add({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      currency: '€'
    });
    
    alert('Material erfolgreich hinzugefügt!');
    document.getElementById('newMaterialName').value = '';
    document.getElementById('newMaterialManufacturer').value = '';
    document.getElementById('newMaterialNetPrice').value = '';
    document.getElementById('newMaterialTaxRate').value = '19';
    document.getElementById('newMaterialMarkup').value = '30';
    
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    alert('Fehler beim Hinzufügen: ' + error.message);
  }
}

async function addMasterbatch() {
  const name = document.getElementById('newMasterbatchName').value.trim();
  const manufacturer = document.getElementById('newMasterbatchManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('newMasterbatchNetPrice').value);
  const taxRate = parseFloat(document.getElementById('newMasterbatchTaxRate').value) || 19;
  const markup = parseFloat(document.getElementById('newMasterbatchMarkup').value) || 30;
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    alert('Bitte gültigen Namen und EK-Netto-Preis eingeben!');
    return;
  }
  
  const grossPrice = netPrice * (1 + taxRate / 100);
  const sellingPrice = grossPrice * (1 + markup / 100);
  
  try {
    await window.db.collection('masterbatches').add({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      currency: '€'
    });
    
    alert('Masterbatch erfolgreich hinzugefügt!');
    document.getElementById('newMasterbatchName').value = '';
    document.getElementById('newMasterbatchManufacturer').value = '';
    document.getElementById('newMasterbatchNetPrice').value = '';
    document.getElementById('newMasterbatchTaxRate').value = '19';
    document.getElementById('newMasterbatchMarkup').value = '30';
    
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    alert('Fehler beim Hinzufügen: ' + error.message);
  }
}

// ==================== DELETE FUNCTIONS ====================

async function deleteMaterial(materialId) {
  if (!confirm('Material wirklich löschen?')) return;
  
  try {
    await window.db.collection('materials').doc(materialId).delete();
    alert('Material gelöscht!');
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

async function deleteMasterbatch(masterbatchId) {
  if (!confirm('Masterbatch wirklich löschen?')) return;
  
  try {
    await window.db.collection('masterbatches').doc(masterbatchId).delete();
    alert('Masterbatch gelöscht!');
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

// ==================== EDIT FUNCTIONS ====================

async function editMaterial(materialId) {
  try {
    // Erst das Material-Manager-Modal schließen
    document.getElementById('materialManager').classList.remove('active');
    
    const doc = await window.db.collection('materials').doc(materialId).get();
    if (!doc.exists) {
      alert('Material nicht gefunden!');
      return;
    }
    
    const material = doc.data();
    
    const modalHtml = `
      <div class="modal-header">
        <h3>Material bearbeiten</h3>
        <button class="close-btn" onclick="closeEditMaterialModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Material Name</label>
          <input type="text" id="editMaterialName" class="form-input" value="${material.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Hersteller</label>
          <input type="text" id="editMaterialManufacturer" class="form-input" value="${material.manufacturer || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">EK Netto €/kg</label>
            <input type="number" id="editMaterialNetPrice" class="form-input" value="${material.netPrice || material.price || 0}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Mehrwertsteuer %</label>
            <input type="number" id="editMaterialTaxRate" class="form-input" value="${material.taxRate || 19}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Gemeinkosten % (Strom, Versand, etc.)</label>
            <input type="number" id="editMaterialMarkup" class="form-input" value="${material.markup || 30}" step="0.01">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${ButtonFactory.cancelMaterialModal()}
        ${ButtonFactory.saveChanges(`updateMaterial('${materialId}')`)}
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Materials:', error);
    alert('Fehler beim Laden des Materials: ' + error.message);
  }
}

async function editMasterbatch(masterbatchId) {
  try {
    // Erst das Masterbatch-Manager-Modal schließen
    document.getElementById('masterbatchManager').classList.remove('active');
    
    const doc = await window.db.collection('masterbatches').doc(masterbatchId).get();
    if (!doc.exists) {
      alert('Masterbatch nicht gefunden!');
      return;
    }
    
    const masterbatch = doc.data();
    
    const modalHtml = `
      <div class="modal-header">
        <h3>Masterbatch bearbeiten</h3>
        <button class="close-btn" onclick="closeEditMasterbatchModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Masterbatch Name</label>
          <input type="text" id="editMasterbatchName" class="form-input" value="${masterbatch.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Hersteller</label>
          <input type="text" id="editMasterbatchManufacturer" class="form-input" value="${masterbatch.manufacturer || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">EK Netto €/kg</label>
            <input type="number" id="editMasterbatchNetPrice" class="form-input" value="${masterbatch.netPrice || masterbatch.price || 0}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Mehrwertsteuer %</label>
            <input type="number" id="editMasterbatchTaxRate" class="form-input" value="${masterbatch.taxRate || 19}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Gemeinkosten % (Strom, Versand, etc.)</label>
            <input type="number" id="editMasterbatchMarkup" class="form-input" value="${masterbatch.markup || 30}" step="0.01">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${ButtonFactory.cancelMasterbatchModal()}
        ${ButtonFactory.saveChanges(`updateMasterbatch('${masterbatchId}')`)}
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Masterbatches:', error);
    alert('Fehler beim Laden des Masterbatches: ' + error.message);
  }
}

// ==================== SPECIAL CLOSE FUNCTIONS ====================

// Close-Funktionen für Edit-Modals, die zurück zum Manager-Modal führen
function closeEditMaterialModal() {
  window.closeModal();
  // Nach dem Schließen des Edit-Modals, Material-Manager wieder öffnen
  setTimeout(() => {
    document.getElementById('materialManager').classList.add('active');
    loadMaterialsForManagement();
  }, 100);
}

function closeEditMasterbatchModal() {
  window.closeModal();
  // Nach dem Schließen des Edit-Modals, Masterbatch-Manager wieder öffnen
  setTimeout(() => {
    document.getElementById('masterbatchManager').classList.add('active');
    loadMasterbatchesForManagement();
  }, 100);
}

// ==================== UPDATE FUNCTIONS ====================

async function updateMaterial(materialId) {
  const name = document.getElementById('editMaterialName').value.trim();
  const manufacturer = document.getElementById('editMaterialManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('editMaterialNetPrice').value);
  const taxRate = parseFloat(document.getElementById('editMaterialTaxRate').value);
  const markup = parseFloat(document.getElementById('editMaterialMarkup').value);
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    alert('Bitte gültigen Namen und EK-Netto-Preis eingeben!');
    return;
  }
  
  const grossPrice = netPrice * (1 + taxRate / 100);
  const sellingPrice = grossPrice * (1 + markup / 100);
  
  try {
    await window.db.collection('materials').doc(materialId).update({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      currency: '€'
    });
    
    alert('Material erfolgreich aktualisiert!');
    closeEditMaterialModal(); // Verwende die spezielle Close-Funktion
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    alert('Fehler beim Aktualisieren: ' + error.message);
  }
}

async function updateMasterbatch(masterbatchId) {
  const name = document.getElementById('editMasterbatchName').value.trim();
  const manufacturer = document.getElementById('editMasterbatchManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('editMasterbatchNetPrice').value);
  const taxRate = parseFloat(document.getElementById('editMasterbatchTaxRate').value);
  const markup = parseFloat(document.getElementById('editMasterbatchMarkup').value);
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    alert('Bitte gültigen Namen und EK-Netto-Preis eingeben!');
    return;
  }
  
  const grossPrice = netPrice * (1 + taxRate / 100);
  const sellingPrice = grossPrice * (1 + markup / 100);
  
  try {
    await window.db.collection('masterbatches').doc(masterbatchId).update({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      currency: '€'
    });
    
    alert('Masterbatch erfolgreich aktualisiert!');
    closeEditMasterbatchModal(); // Verwende die spezielle Close-Funktion
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    alert('Fehler beim Aktualisieren: ' + error.message);
  }
}

// ==================== MATERIAL SORTING ====================

function sortMaterials(column) {
  const materialTable = document.querySelector('#materialTable table tbody');
  if (!materialTable) return;
  
  const rows = Array.from(materialTable.querySelectorAll('tr'));
  
  rows.sort((a, b) => {
    let valueA, valueB;
    
    switch(column) {
      case 'name':
        valueA = a.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
        valueB = b.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
        break;
      case 'manufacturer':
        valueA = a.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        valueB = b.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        break;
      case 'netPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(3)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(3)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      case 'grossPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(4)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(4)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      case 'markup':
        valueA = parseFloat(a.querySelector('td:nth-child(5)')?.textContent.replace('%', '')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(5)')?.textContent.replace('%', '')) || 0;
        break;
      case 'sellingPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(6)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(6)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      default:
        return 0;
    }
    
    if (typeof valueA === 'string') {
      return valueA.localeCompare(valueB);
    } else {
      return valueA - valueB;
    }
  });
  
  // Clear and re-append sorted rows
  materialTable.innerHTML = '';
  rows.forEach(row => materialTable.appendChild(row));
}

function sortMasterbatches(column) {
  const masterbatchTable = document.querySelector('#masterbatchTable table tbody');
  if (!masterbatchTable) return;
  
  const rows = Array.from(masterbatchTable.querySelectorAll('tr'));
  
  rows.sort((a, b) => {
    let valueA, valueB;
    
    switch(column) {
      case 'name':
        valueA = a.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
        valueB = b.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
        break;
      case 'manufacturer':
        valueA = a.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        valueB = b.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        break;
      case 'netPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(3)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(3)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      case 'grossPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(4)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(4)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      case 'markup':
        valueA = parseFloat(a.querySelector('td:nth-child(5)')?.textContent.replace('%', '')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(5)')?.textContent.replace('%', '')) || 0;
        break;
      case 'sellingPrice':
        valueA = parseFloat(a.querySelector('td:nth-child(6)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        valueB = parseFloat(b.querySelector('td:nth-child(6)')?.textContent.replace(/[€,]/g, '').replace(',', '.')) || 0;
        break;
      default:
        return 0;
    }
    
    if (typeof valueA === 'string') {
      return valueA.localeCompare(valueB);
    } else {
      return valueA - valueB;
    }
  });
  
  // Clear and re-append sorted rows
  masterbatchTable.innerHTML = '';
  rows.forEach(row => masterbatchTable.appendChild(row));
}

// ==================== GLOBAL FUNCTION EXPOSURE ====================

// Expose functions globally for event handlers
window.editMaterial = editMaterial;
window.editMasterbatch = editMasterbatch;
window.updateMaterial = updateMaterial;
window.updateMasterbatch = updateMasterbatch;
window.closeEditMaterialModal = closeEditMaterialModal;
window.closeEditMasterbatchModal = closeEditMasterbatchModal;

// Global exposure
window.sortMaterials = sortMaterials;
window.sortMasterbatches = sortMasterbatches;

// ==================== MATERIAL LOADING MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("🏭 Material Loading Module geladen");
