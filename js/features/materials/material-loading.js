// ==================== MATERIAL LOADING MODULE ====================
// Laden von Materialien, Masterbatches und Druckern aus Firestore

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
      option.textContent = `${masterbatch.name} (${masterbatch.price.toFixed(4)} ${(masterbatch.currency || '€')}/g)`;
      select.appendChild(option);
    });
    
    console.log("✅ Masterbatches erfolgreich geladen!");
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Masterbatches:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

// Drucker laden (direkt aus Firestore)
async function loadPrinters() {
  const select = document.getElementById("printer");
  if (!select) {
    console.warn("⚠️ Printer select element nicht gefunden");
    return;
  }
  
  select.innerHTML = '<option value="">Lade Drucker...</option>';
  
  console.log("🔄 Lade Drucker...");
  
  try {
    if (!window.db) {
      console.error("❌ Firebase nicht verfügbar");
      select.innerHTML = '<option value="">Firebase nicht verfügbar</option>';
      return;
    }
    
    const snapshot = await window.db.collection("printers").get();
    console.log("📊 Printers-Snapshot:", snapshot.size, "Dokumente");
    
    select.innerHTML = '<option value="">Drucker auswählen... (optional)</option>';
    
    if (snapshot.empty) {
      console.log("⚠️ Keine Drucker gefunden");
      select.innerHTML = '<option value="">Keine Drucker verfügbar</option>';
      return;
    }
    
    let loadedCount = 0;
    snapshot.forEach(doc => {
      const printer = doc.data();
      console.log("➕ Drucker:", printer.name, "Preis/Stunde:", printer.pricePerHour);
      const option = document.createElement("option");
      option.value = printer.name;
      option.dataset.pricePerHour = printer.pricePerHour || 0;
      option.textContent = `${printer.name}${printer.pricePerHour ? ` (${printer.pricePerHour.toFixed(2)}€/h)` : ''}`;
      select.appendChild(option);
      loadedCount++;
    });
    
    console.log(`✅ ${loadedCount} Drucker erfolgreich geladen!`);
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Drucker:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

// Event Listeners für Formular-Felder
function setupFormEventListeners() {
  // Material selection change
  const materialSelect = document.getElementById("material");
  if (materialSelect) {
    materialSelect.addEventListener("change", function() {
      // Store price in dataset for cost calculation
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption && selectedOption.value) {
        const materialName = selectedOption.value;
        // Find material price from materials collection
        window.db.collection("materials").where("name", "==", materialName).get().then(snapshot => {
          if (!snapshot.empty) {
            const material = snapshot.docs[0].data();
            this.dataset.price = material.price;
          }
        });
      }
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  // Masterbatch selection change
  const masterbatchSelect = document.getElementById("masterbatch");
  if (masterbatchSelect) {
    masterbatchSelect.addEventListener("change", function() {
      // Store price in dataset for cost calculation
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption && selectedOption.value) {
        const masterbatchName = selectedOption.value;
        // Find masterbatch price from masterbatches collection
        window.db.collection("masterbatches").where("name", "==", masterbatchName).get().then(snapshot => {
          if (!snapshot.empty) {
            const masterbatch = snapshot.docs[0].data();
            this.dataset.price = masterbatch.price;
          }
        });
      }
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  // Printer selection change
  const printerSelect = document.getElementById("printer");
  if (printerSelect) {
    printerSelect.addEventListener("change", function() {
      // Store price in dataset for cost calculation
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption && selectedOption.value) {
        const printerName = selectedOption.value;
        // Find printer price from printers collection
        window.db.collection("printers").where("name", "==", printerName).get().then(snapshot => {
          if (!snapshot.empty) {
            const printer = snapshot.docs[0].data();
            this.dataset.pricePerHour = printer.pricePerHour || 0;
          }
        });
      }
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  // Quantity inputs
  const materialMenge = document.getElementById("materialMenge");
  if (materialMenge) {
    materialMenge.addEventListener("input", function() {
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  if (masterbatchMenge) {
    masterbatchMenge.addEventListener("input", function() {
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  const printTime = document.getElementById("printTime");
  if (printTime) {
    printTime.addEventListener("input", function() {
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
  
  // Own material checkbox
  const ownMaterialUsed = document.getElementById("ownMaterialUsed");
  if (ownMaterialUsed) {
    ownMaterialUsed.addEventListener("change", function() {
      if (typeof window.updateCostPreview === 'function') {
        window.updateCostPreview();
      }
    });
  }
}

// Alle Formulardaten laden
async function loadAllFormData() {
  console.log("🔄 Starte loadAllFormData...");
  
  try {
    await Promise.all([
      loadMaterials(),
      loadMasterbatches(),
      loadPrinters()
    ]);
    
    console.log("✅ Alle Daten geladen, setup Event Listeners...");
    
    // Setup event listeners after data is loaded
    setupFormEventListeners();
    
    // Initial cost preview update
    if (typeof window.updateCostPreview === 'function') {
      setTimeout(() => {
        window.updateCostPreview();
      }, 500);
    }
    
    console.log("✅ loadAllFormData abgeschlossen");
    
  } catch (error) {
    console.error("❌ Fehler in loadAllFormData:", error);
    throw error;
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

    // Container mit Tabelle UND Cards erstellen
    let containerHtml = `
      <div class="entries-container">
        <!-- Desktop Tabelle -->
        <div class="data-table">
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

    const materialData = [];

    snapshot.forEach(doc => {
      const material = doc.data();
      
      // Berechne Brutto und VK (falls alte Daten)
      const netPrice = material.netPrice || material.price || 0;
      const taxRate = material.taxRate || 19;
      const markup = material.markup || 30;
      const grossPrice = netPrice * (1 + taxRate / 100);
      const sellingPrice = grossPrice * (1 + markup / 100);
      
      materialData.push({
        id: doc.id,
        name: material.name,
        manufacturer: material.manufacturer || 'Unbekannt',
        netPrice,
        grossPrice,
        markup,
        sellingPrice
      });

      // Tabellen-Zeile für Desktop
      containerHtml += `
        <tr id="material-row-${doc.id}">
          <td><span class="cell-value">${material.name}</span></td>
          <td><span class="cell-value">${material.manufacturer || 'Unbekannt'}</span></td>
          <td><span class="cell-value">${window.formatCurrency(netPrice)}</span></td>
          <td><span class="cell-value">${window.formatCurrency(grossPrice)}</span></td>
          <td><span class="cell-value">${markup}%</span></td>
          <td><span class="cell-value">${window.formatCurrency(sellingPrice)}</span></td>
          <td class="actions">
            <div class="action-group">
              ${ButtonFactory.editMaterial(doc.id)}
              ${ButtonFactory.deleteMaterial(doc.id)}
            </div>
          </td>
        </tr>
      `;
    });

    containerHtml += `
            </tbody>
          </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="entry-cards">
    `;

    // Card-Struktur für Mobile
    materialData.forEach(material => {
      containerHtml += `
        <div class="entry-card">
          <!-- Card Header mit Material-Name -->
          <div class="entry-card-header">
            <h3 class="entry-job-title">${material.name}</h3>
            <span class="entry-detail-value">${material.manufacturer}</span>
          </div>
          
          <!-- Card Body mit Detail-Zeilen -->
          <div class="entry-card-body">
            <div class="entry-detail-row">
              <span class="entry-detail-label">EK Netto</span>
              <span class="entry-detail-value">${window.formatCurrency(material.netPrice)}/kg</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">EK Brutto</span>
              <span class="entry-detail-value">${window.formatCurrency(material.grossPrice)}/kg</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">Gemeinkosten</span>
              <span class="entry-detail-value">${material.markup}%</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">Verkaufspreis</span>
              <span class="entry-detail-value cost-value">${window.formatCurrency(material.sellingPrice)}/kg</span>
            </div>
          </div>
          
          <!-- Card Footer mit Buttons -->
          <div class="entry-card-footer">
            ${ButtonFactory.editMaterial(material.id)}
            ${ButtonFactory.deleteMaterial(material.id)}
          </div>
        </div>
      `;
    });

    containerHtml += `
        </div>
      </div>
    `;
    
    tableDiv.innerHTML = containerHtml;
    
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

    // Container mit Tabelle UND Cards erstellen
    let containerHtml = `
      <div class="entries-container">
        <!-- Desktop Tabelle -->
        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th onclick="sortMasterbatches('name')">Name</th>
                <th onclick="sortMasterbatches('manufacturer')">Hersteller</th>
                <th onclick="sortMasterbatches('netPrice')">EK Netto €/g</th>
                <th onclick="sortMasterbatches('grossPrice')">EK Brutto €/g</th>
                <th onclick="sortMasterbatches('markup')">Gemeinkosten %</th>
                <th onclick="sortMasterbatches('sellingPrice')">VK €/g</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
    `;

    const masterbatchData = [];

    snapshot.forEach(doc => {
      const masterbatch = doc.data();
      
      // Berechne Brutto und VK (falls alte Daten)
      const netPrice = masterbatch.netPrice || masterbatch.price || 0;
      const taxRate = masterbatch.taxRate || 19;
      const markup = masterbatch.markup || 30;
      const grossPrice = netPrice * (1 + taxRate / 100);
      const sellingPrice = grossPrice * (1 + markup / 100);
      
      masterbatchData.push({
        id: doc.id,
        name: masterbatch.name,
        manufacturer: masterbatch.manufacturer || 'Unbekannt',
        netPrice,
        grossPrice,
        markup,
        sellingPrice
      });

      // Tabellen-Zeile für Desktop
      containerHtml += `
        <tr id="masterbatch-row-${doc.id}">
          <td><span class="cell-value">${masterbatch.name}</span></td>
          <td><span class="cell-value">${masterbatch.manufacturer || 'Unbekannt'}</span></td>
          <td><span class="cell-value">${window.formatCurrency(netPrice, 4)}</span></td>
          <td><span class="cell-value">${window.formatCurrency(grossPrice, 4)}</span></td>
          <td><span class="cell-value">${markup}%</span></td>
          <td><span class="cell-value">${window.formatCurrency(sellingPrice, 4)}</span></td>
          <td class="actions">
            <div class="action-group">
              ${ButtonFactory.editMasterbatch(doc.id)}
              ${ButtonFactory.deleteMasterbatch(doc.id)}
            </div>
          </td>
        </tr>
      `;
    });

    containerHtml += `
            </tbody>
          </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="entry-cards">
    `;

    // Card-Struktur für Mobile
    masterbatchData.forEach(masterbatch => {
      containerHtml += `
        <div class="entry-card">
          <!-- Card Header mit Masterbatch-Name -->
          <div class="entry-card-header">
            <h3 class="entry-job-title">${masterbatch.name}</h3>
            <span class="entry-detail-value">${masterbatch.manufacturer}</span>
          </div>
          
          <!-- Card Body mit Detail-Zeilen -->
          <div class="entry-card-body">
            <div class="entry-detail-row">
              <span class="entry-detail-label">EK Netto</span>
              <span class="entry-detail-value">${window.formatCurrency(masterbatch.netPrice, 4)}/g</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">EK Brutto</span>
              <span class="entry-detail-value">${window.formatCurrency(masterbatch.grossPrice, 4)}/g</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">Gemeinkosten</span>
              <span class="entry-detail-value">${masterbatch.markup}%</span>
            </div>
            
            <div class="entry-detail-row">
              <span class="entry-detail-label">Verkaufspreis</span>
              <span class="entry-detail-value cost-value">${window.formatCurrency(masterbatch.sellingPrice, 4)}/g</span>
            </div>
          </div>
          
          <!-- Card Footer mit Buttons -->
          <div class="entry-card-footer">
            ${ButtonFactory.editMasterbatch(masterbatch.id)}
            ${ButtonFactory.deleteMasterbatch(masterbatch.id)}
          </div>
        </div>
      `;
    });

    containerHtml += `
        </div>
      </div>
    `;
    
    tableDiv.innerHTML = containerHtml;
    
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
    showToast('Bitte gültigen Namen und EK-Netto-Preis eingeben!', 'warning');
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
    
    showToast('Material erfolgreich hinzugefügt!', 'success');
    document.getElementById('newMaterialName').value = '';
    document.getElementById('newMaterialManufacturer').value = '';
    document.getElementById('newMaterialNetPrice').value = '';
    document.getElementById('newMaterialTaxRate').value = '19';
    document.getElementById('newMaterialMarkup').value = '30';
    
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    showToast('Fehler beim Hinzufügen: ' + error.message, 'error');
  }
}

async function addMasterbatch() {
  const name = document.getElementById('newMasterbatchName').value.trim();
  const manufacturer = document.getElementById('newMasterbatchManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('newMasterbatchNetPrice').value);
  const taxRate = parseFloat(document.getElementById('newMasterbatchTaxRate').value) || 19;
  const markup = parseFloat(document.getElementById('newMasterbatchMarkup').value) || 30;
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    showToast('Bitte gültigen Namen und EK-Netto-Preis eingeben!', 'warning');
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
    
    showToast('Masterbatch erfolgreich hinzugefügt!', 'success');
    document.getElementById('newMasterbatchName').value = '';
    document.getElementById('newMasterbatchManufacturer').value = '';
    document.getElementById('newMasterbatchNetPrice').value = '';
    document.getElementById('newMasterbatchTaxRate').value = '19';
    document.getElementById('newMasterbatchMarkup').value = '30';
    
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    showToast('Fehler beim Hinzufügen: ' + error.message, 'error');
  }
}

// ==================== DELETE FUNCTIONS ====================

async function deleteMaterial(materialId) {
  if (!confirm('Material wirklich löschen?')) return;
  
  try {
    await window.db.collection('materials').doc(materialId).delete();
    showToast('Material gelöscht!', 'success');
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    showToast('Fehler beim Löschen: ' + error.message, 'error');
  }
}

async function deleteMasterbatch(masterbatchId) {
  if (!confirm('Masterbatch wirklich löschen?')) return;
  
  try {
    await window.db.collection('masterbatches').doc(masterbatchId).delete();
    showToast('Masterbatch gelöscht!', 'success');
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    showToast('Fehler beim Löschen: ' + error.message, 'error');
  }
}

// ==================== EDIT FUNCTIONS ====================

async function editMaterial(materialId) {
  try {
    // Erst das Material-Manager-Modal schließen
    document.getElementById('materialManager').classList.remove('active');
    
    const doc = await window.db.collection('materials').doc(materialId).get();
    if (!doc.exists) {
      showToast('Material nicht gefunden!', 'error');
      return;
    }
    
    const material = doc.data();
    
    // Berechnungen für die Anzeige
    const netPrice = material.netPrice || material.price || 0;
    const taxRate = material.taxRate || 19;
    const markup = material.markup || 30;
    
    showEditMaterialForm(materialId, material);
    
  } catch (error) {
    console.error('Fehler beim Laden des Materials:', error);
    showToast('Fehler beim Laden des Materials: ' + error.message, 'error');
  }
}

async function editMasterbatch(masterbatchId) {
  try {
    // Erst das Masterbatch-Manager-Modal schließen
    document.getElementById('masterbatchManager').classList.remove('active');
    
    const doc = await window.db.collection('masterbatches').doc(masterbatchId).get();
    if (!doc.exists) {
      showToast('Masterbatch nicht gefunden!', 'error');
      return;
    }
    
    const masterbatch = doc.data();
    showEditMasterbatchForm(masterbatchId, masterbatch);
    
  } catch (error) {
    console.error('Fehler beim Laden des Masterbatches:', error);
    showToast('Fehler beim Laden des Masterbatches: ' + error.message, 'error');
  }
}

async function showEditMasterbatchForm(masterbatchId, masterbatch) {
  const netPrice = masterbatch.netPrice || masterbatch.price || 0;
  const taxRate = masterbatch.taxRate || 19;
  const markup = masterbatch.markup || 30;
  const grossPrice = netPrice * (1 + taxRate / 100);
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Masterbatch bearbeiten</h3>
      <button class="close-btn" onclick="closeEditMasterbatchModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-body">
          <form id="editMasterbatchForm">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input type="text" id="editMasterbatchName" class="form-input" value="${masterbatch.name}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hersteller</label>
              <input type="text" id="editMasterbatchManufacturer" class="form-input" value="${masterbatch.manufacturer || ''}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">EK Netto (€/g)</label>
                <input type="number" id="editMasterbatchNetPrice" class="form-input" value="${netPrice}" step="0.0001" required>
              </div>
              <div class="form-group">
                <label class="form-label">MwSt (%)</label>
                <input type="number" id="editMasterbatchTaxRate" class="form-input" value="${taxRate}" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Gemeinkosten (%)</label>
              <input type="number" id="editMasterbatchMarkup" class="form-input" value="${markup}" step="0.01">
            </div>
            <div class="price-preview">
              <p><strong>EK Brutto:</strong> <span id="editMasterbatchGrossPreview">${grossPrice.toFixed(4)} €/g</span></p>
              <p><strong>VK (geschätzt):</strong> <span id="editMasterbatchVkPreview">${(grossPrice * (1 + markup / 100)).toFixed(4)} €/g</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="updateMasterbatch('${masterbatchId}')">Speichern</button>
      <button class="btn btn-secondary" onclick="closeEditMasterbatchModal()">Abbrechen</button>
    </div>
  `;
  
  showModalWithContent(modalHtml);
  
  // Live Preis-Updates
  const netPriceInput = document.getElementById('editMasterbatchNetPrice');
  const taxRateInput = document.getElementById('editMasterbatchTaxRate');
  const markupInput = document.getElementById('editMasterbatchMarkup');
  
  function updatePricePreview() {
    const net = parseFloat(netPriceInput.value) || 0;
    const tax = parseFloat(taxRateInput.value) || 19;
    const markup = parseFloat(markupInput.value) || 30;
    
    const gross = net * (1 + tax / 100);
    const vk = gross * (1 + markup / 100);
    
    document.getElementById('editMasterbatchGrossPreview').textContent = `${gross.toFixed(4)} €/g`;
    document.getElementById('editMasterbatchVkPreview').textContent = `${vk.toFixed(4)} €/g`;
  }
  
  [netPriceInput, taxRateInput, markupInput].forEach(input => {
    input.addEventListener('input', updatePricePreview);
  });
}

async function showEditMaterialForm(materialId, material) {
  const netPrice = material.netPrice || material.price || 0;
  const taxRate = material.taxRate || 19;
  const markup = material.markup || 30;
  const grossPrice = netPrice * (1 + taxRate / 100);
  
  if (!material) {
    showToast('Material nicht gefunden!', 'error');
    return;
  }
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Material bearbeiten</h3>
      <button class="close-btn" onclick="closeEditMaterialModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-body">
          <form id="editMaterialForm">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input type="text" id="editMaterialName" class="form-input" value="${material.name}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hersteller</label>
              <input type="text" id="editMaterialManufacturer" class="form-input" value="${material.manufacturer || ''}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">EK Netto (€/kg)</label>
                <input type="number" id="editMaterialNetPrice" class="form-input" value="${netPrice}" step="0.01" required>
              </div>
              <div class="form-group">
                <label class="form-label">MwSt (%)</label>
                <input type="number" id="editMaterialTaxRate" class="form-input" value="${taxRate}" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Gemeinkosten (%)</label>
              <input type="number" id="editMaterialMarkup" class="form-input" value="${markup}" step="0.01">
            </div>
            <div class="price-preview">
              <p><strong>EK Brutto:</strong> <span id="editMaterialGrossPreview">${grossPrice.toFixed(2)} €/kg</span></p>
              <p><strong>VK (geschätzt):</strong> <span id="editMaterialVkPreview">${(grossPrice * (1 + markup / 100)).toFixed(2)} €/kg</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="updateMaterial('${materialId}')">Speichern</button>
      <button class="btn btn-secondary" onclick="closeEditMaterialModal()">Abbrechen</button>
    </div>
  `;
  
  showModalWithContent(modalHtml);
  
  // Live Preis-Updates
  const netPriceInput = document.getElementById('editMaterialNetPrice');
  const taxRateInput = document.getElementById('editMaterialTaxRate');
  const markupInput = document.getElementById('editMaterialMarkup');
  
  function updatePricePreview() {
    const net = parseFloat(netPriceInput.value) || 0;
    const tax = parseFloat(taxRateInput.value) || 19;
    const markup = parseFloat(markupInput.value) || 30;
    
    const gross = net * (1 + tax / 100);
    const vk = gross * (1 + markup / 100);
    
    document.getElementById('editMaterialGrossPreview').textContent = `${gross.toFixed(2)} €/kg`;
    document.getElementById('editMaterialVkPreview').textContent = `${vk.toFixed(2)} €/kg`;
  }
  
  [netPriceInput, taxRateInput, markupInput].forEach(input => {
    input.addEventListener('input', updatePricePreview);
  });
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
  const taxRate = parseFloat(document.getElementById('editMaterialTaxRate').value) || 19;
  const markup = parseFloat(document.getElementById('editMaterialMarkup').value) || 30;
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    showToast('Bitte gültigen Namen und EK-Netto-Preis eingeben!', 'warning');
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
    
    showToast('Material erfolgreich aktualisiert!', 'success');
    closeEditMaterialModal(); // Verwende die spezielle Close-Funktion
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    showToast('Fehler beim Aktualisieren: ' + error.message, 'error');
  }
}

async function updateMasterbatch(masterbatchId) {
  const name = document.getElementById('editMasterbatchName').value.trim();
  const manufacturer = document.getElementById('editMasterbatchManufacturer').value.trim();
  const netPrice = parseFloat(document.getElementById('editMasterbatchNetPrice').value);
  const taxRate = parseFloat(document.getElementById('editMasterbatchTaxRate').value) || 19;
  const markup = parseFloat(document.getElementById('editMasterbatchMarkup').value) || 30;
  
  if (!name || isNaN(netPrice) || netPrice <= 0) {
    showToast('Bitte gültigen Namen und EK-Netto-Preis eingeben!', 'warning');
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
    
    showToast('Masterbatch erfolgreich aktualisiert!', 'success');
    closeEditMasterbatchModal();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    showToast('Fehler beim Aktualisieren: ' + error.message, 'error');
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

// Neue Formular-Funktionen hinzufügen
window.showEditMaterialForm = showEditMaterialForm;
window.showEditMasterbatchForm = showEditMasterbatchForm;

// ==================== MATERIAL LOADING MODULE ====================

// Loading functions global verfügbar machen
window.loadMaterials = loadMaterials;
window.loadMasterbatches = loadMasterbatches;
window.loadPrinters = loadPrinters;
window.loadAllFormData = loadAllFormData;
window.setupFormEventListeners = setupFormEventListeners;
window.loadMaterialsForManagement = loadMaterialsForManagement;
window.loadMasterbatchesForManagement = loadMasterbatchesForManagement;

// Management functions global verfügbar machen
window.showMaterialManager = showMaterialManager;
window.closeMaterialManager = closeMaterialManager;
window.showMasterbatchManager = showMasterbatchManager;
window.closeMasterbatchManager = closeMasterbatchManager;

// Add functions global verfügbar machen
window.addMaterial = addMaterial;
window.addMasterbatch = addMasterbatch;

// Delete functions global verfügbar machen
window.deleteMaterial = deleteMaterial;
window.deleteMasterbatch = deleteMasterbatch;

console.log("🏭 Material Loading Module geladen");

// Test-Funktion für manuelles Laden der Drucker
window.testLoadPrinters = async function() {
  console.log("🧪 Teste loadPrinters...");
  try {
    await loadPrinters();
    console.log("✅ loadPrinters Test erfolgreich");
  } catch (error) {
    console.error("❌ loadPrinters Test fehlgeschlagen:", error);
  }
};

