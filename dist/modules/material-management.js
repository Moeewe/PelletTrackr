// ==================== MATERIAL MANAGEMENT MODULE ====================

/**
 * Materialien für die Dropdown-Auswahl laden
 */
async function loadMaterials() {
  const select = document.getElementById("material");
  if (!select) return;
  
  select.innerHTML = '<option value="">Lade Materialien...</option>';
  
  console.log("🔄 Lade Materialien...");
  
  try {
    const snapshot = await db.collection("materials").get();
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
      option.value = doc.id; // Verwende Dokument-ID als Wert
      option.textContent = `${material.name} (${material.price.toFixed(2)} ${(material.currency || '€')}/kg)`;
      select.appendChild(option);
    });
    
    console.log("✅ Materialien erfolgreich geladen!");
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Materialien:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

/**
 * Masterbatches für die Dropdown-Auswahl laden
 */
async function loadMasterbatches() {
  const select = document.getElementById("masterbatch");
  if (!select) return;
  
  select.innerHTML = '<option value="">Lade Masterbatches...</option>';
  
  console.log("🔄 Lade Masterbatches...");
  
  try {
    const snapshot = await db.collection("masterbatches").get();
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
      option.value = doc.id; // Verwende Dokument-ID als Wert
      option.textContent = `${masterbatch.name} (${masterbatch.price.toFixed(2)} ${(masterbatch.currency || '€')}/kg)`;
      select.appendChild(option);
    });
    
    console.log("✅ Masterbatches erfolgreich geladen!");
    
  } catch (e) {
    console.error("❌ Fehler beim Laden der Masterbatches:", e);
    select.innerHTML = '<option value="">Fehler beim Laden</option>';
  }
}

/**
 * Material-Manager öffnen
 */
function showMaterialManager() {
  if (!checkAdminAccess()) return;
  document.getElementById('materialManager').classList.add('active');
  loadMaterialsForManagement();
}

/**
 * Material-Manager schließen
 */
function closeMaterialManager() {
  document.getElementById('materialManager').classList.remove('active');
}

/**
 * Masterbatch-Manager öffnen
 */
function showMasterbatchManager() {
  if (!checkAdminAccess()) return;
  document.getElementById('masterbatchManager').classList.add('active');
  loadMasterbatchesForManagement();
}

/**
 * Masterbatch-Manager schließen
 */
function closeMasterbatchManager() {
  document.getElementById('masterbatchManager').classList.remove('active');
}

/**
 * Materialien für das Management-Interface laden
 */
async function loadMaterialsForManagement() {
  try {
    const snapshot = await db.collection("materials").get();
    
    const tableDiv = document.getElementById("materialsTable");
    
    if (snapshot.empty) {
      const message = '<p>Keine Materialien vorhanden.</p>';
      tableDiv.innerHTML = message;
      return;
    }

    let tableHtml = `
      <table class="data-table">
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
          <td data-label="EK Netto €/kg" id="material-netprice-${doc.id}">${formatCurrency(netPrice)}</td>
          <td data-label="EK Brutto €/kg" id="material-grossprice-${doc.id}">${formatCurrency(grossPrice)}</td>
          <td data-label="Gemeinkosten %" id="material-markup-${doc.id}">${markup}%</td>
          <td data-label="VK €/kg" id="material-price-${doc.id}">${formatCurrency(sellingPrice)}</td>
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

/**
 * Masterbatches für das Management-Interface laden
 */
async function loadMasterbatchesForManagement() {
  try {
    const snapshot = await db.collection("masterbatches").get();
    
    const tableDiv = document.getElementById("masterbatchesTable");
    
    if (snapshot.empty) {
      const message = '<p>Keine Masterbatches vorhanden.</p>';
      tableDiv.innerHTML = message;
      return;
    }

    let tableHtml = `
      <table class="data-table">
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
          <td data-label="EK Netto €/kg" id="masterbatch-netprice-${doc.id}">${formatCurrency(netPrice)}</td>
          <td data-label="EK Brutto €/kg" id="masterbatch-grossprice-${doc.id}">${formatCurrency(grossPrice)}</td>
          <td data-label="Gemeinkosten %" id="masterbatch-markup-${doc.id}">${markup}%</td>
          <td data-label="VK €/kg" id="masterbatch-price-${doc.id}">${formatCurrency(sellingPrice)}</td>
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

/**
 * Neues Material hinzufügen
 */
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
    await db.collection('materials').add({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      pricePerKg: sellingPrice, // Für calculateCostPreview
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

/**
 * Neuen Masterbatch hinzufügen
 */
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
    await db.collection('masterbatches').add({
      name: name,
      manufacturer: manufacturer || 'Unbekannt',
      netPrice: netPrice,
      taxRate: taxRate,
      markup: markup,
      grossPrice: grossPrice,
      price: sellingPrice, // VK für Kompatibilität
      pricePerKg: sellingPrice, // Für calculateCostPreview
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

/**
 * Material löschen
 */
async function deleteMaterial(materialId) {
  if (!confirm('Material wirklich löschen?')) return;
  
  try {
    await db.collection('materials').doc(materialId).delete();
    alert('Material gelöscht!');
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

/**
 * Masterbatch löschen
 */
async function deleteMasterbatch(masterbatchId) {
  if (!confirm('Masterbatch wirklich löschen?')) return;
  
  try {
    await db.collection('masterbatches').doc(masterbatchId).delete();
    alert('Masterbatch gelöscht!');
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
    deleteMasterbatch
  };
}
