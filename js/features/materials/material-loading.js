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
    
    select.innerHTML = '<option value="">Material auswählen...</option>';
    
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
    
    select.innerHTML = '<option value="">Masterbatch auswählen...</option>';
    
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
            <th>Name</th>
            <th>Hersteller</th>
            <th>EK Netto €/kg</th>
            <th>EK Brutto €/kg</th>
            <th>Gemeinkosten %</th>
            <th>VK €/kg</th>
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
          <td data-label="Name" id="material-name-${doc.id}">${material.name}</td>
          <td data-label="Hersteller" id="material-manufacturer-${doc.id}">${material.manufacturer || 'Unbekannt'}</td>
          <td data-label="EK Netto €/kg" id="material-netprice-${doc.id}">${window.formatCurrency(netPrice)}</td>
          <td data-label="EK Brutto €/kg" id="material-grossprice-${doc.id}">${window.formatCurrency(grossPrice)}</td>
          <td data-label="Gemeinkosten %" id="material-markup-${doc.id}">${markup}%</td>
          <td data-label="VK €/kg" id="material-price-${doc.id}">${window.formatCurrency(sellingPrice)}</td>
          <td class="actions" data-label="Aktionen">
            <button class="btn btn-secondary" onclick="editMaterial('${doc.id}')">Bearbeiten</button>
            <button class="btn btn-danger" onclick="deleteMaterial('${doc.id}')">Löschen</button>
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
            <th>Name</th>
            <th>Hersteller</th>
            <th>EK Netto €/kg</th>
            <th>EK Brutto €/kg</th>
            <th>Gemeinkosten %</th>
            <th>VK €/kg</th>
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
          <td data-label="Name" id="masterbatch-name-${doc.id}">${masterbatch.name}</td>
          <td data-label="Hersteller" id="masterbatch-manufacturer-${doc.id}">${masterbatch.manufacturer || 'Unbekannt'}</td>
          <td data-label="EK Netto €/kg" id="masterbatch-netprice-${doc.id}">${window.formatCurrency(netPrice)}</td>
          <td data-label="EK Brutto €/kg" id="masterbatch-grossprice-${doc.id}">${window.formatCurrency(grossPrice)}</td>
          <td data-label="Gemeinkosten %" id="masterbatch-markup-${doc.id}">${markup}%</td>
          <td data-label="VK €/kg" id="masterbatch-price-${doc.id}">${window.formatCurrency(sellingPrice)}</td>
          <td class="actions" data-label="Aktionen">
            <button class="btn btn-secondary" onclick="editMasterbatch('${doc.id}')">Bearbeiten</button>
            <button class="btn btn-danger" onclick="deleteMasterbatch('${doc.id}')">Löschen</button>
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
    const doc = await window.db.collection('materials').doc(materialId).get();
    if (!doc.exists) {
      alert('Material nicht gefunden!');
      return;
    }
    
    const material = doc.data();
    
    const modalHtml = `
      <div class="modal-header">
        <h3>Material bearbeiten</h3>
        <button class="close-btn" onclick="closeModal()">&times;</button>
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
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button class="btn btn-primary" onclick="updateMaterial('${materialId}')">Speichern</button>
        </div>
      </div>
    `;
    
    window.showModal(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Materials:', error);
    alert('Fehler beim Laden des Materials: ' + error.message);
  }
}

async function editMasterbatch(masterbatchId) {
  try {
    const doc = await window.db.collection('masterbatches').doc(masterbatchId).get();
    if (!doc.exists) {
      alert('Masterbatch nicht gefunden!');
      return;
    }
    
    const masterbatch = doc.data();
    
    const modalHtml = `
      <div class="modal-header">
        <h3>Masterbatch bearbeiten</h3>
        <button class="close-btn" onclick="closeModal()">&times;</button>
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
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button class="btn btn-primary" onclick="updateMasterbatch('${masterbatchId}')">Speichern</button>
        </div>
      </div>
    `;
    
    window.showModal(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Masterbatch:', error);
    alert('Fehler beim Laden des Masterbatch: ' + error.message);
  }
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
    window.closeModal();
    loadMaterialsForManagement();
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
    window.closeModal();
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    alert('Fehler beim Aktualisieren: ' + error.message);
  }
}

// ==================== EXPORTS ====================

export const MaterialLoading = {
  loadMaterials,
  loadMasterbatches,
  showMaterialManager,
  closeMaterialManager,
  showMasterbatchManager,
  closeMasterbatchManager,
  loadMaterialsForManagement,
  loadMasterbatchesForManagement,
  addMaterial,
  addMasterbatch,
  deleteMaterial,
  deleteMasterbatch,
  editMaterial,
  editMasterbatch,
  updateMaterial,
  updateMasterbatch
};
