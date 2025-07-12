// ==================== MATERIAL LOADING MODULE ====================
// Laden von Materialien und Masterbatches aus Firestore

// Loading state tracking
let materialsLoaded = false;
let masterbatchesLoaded = false;

// Firebase event listeners
document.addEventListener('firebase-ready', () => {
  console.log("📦 Firebase ready - initializing material loading...");
  initializeMaterialLoading();
});

document.addEventListener('firebase-error', () => {
  console.warn("📦 Firebase error - material loading postponed");
  updateLoadingStates(false);
});

// Initialize material loading system
function initializeMaterialLoading() {
  if (materialsLoaded && masterbatchesLoaded) {
    console.log("📦 Materials already loaded, skipping...");
    return;
  }
  
  // Load materials and masterbatches in parallel
  Promise.all([
    loadMaterials(),
    loadMasterbatches()
  ]).then(() => {
    console.log("✅ All materials loaded successfully");
  }).catch(error => {
    console.error("❌ Error loading materials:", error);
  });
}

// Update loading state indicators
function updateLoadingStates(hasError = false) {
  const materialSelect = document.getElementById("material");
  const masterbatchSelect = document.getElementById("masterbatch");
  
  if (hasError) {
    if (materialSelect) {
      materialSelect.innerHTML = '<option value="">Firebase Verbindungsfehler</option>';
    }
    if (masterbatchSelect) {
      masterbatchSelect.innerHTML = '<option value="">Firebase Verbindungsfehler</option>';
    }
  }
}

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

// Info-Panel für Material aktualisieren
function updateMaterialInfoPanel() {
  const infoPanel = document.getElementById("materialInfo");
  if (!infoPanel || !window.availableMaterials) return;
  
  try {
    const materialCount = window.availableMaterials.length;
    const avgPrice = window.availableMaterials.reduce((sum, m) => sum + m.price, 0) / materialCount;
    
    infoPanel.innerHTML = `
      <div class="info-stat">
        <span class="info-label">Verfügbare Materialien:</span>
        <span class="info-value">${materialCount}</span>
      </div>
      <div class="info-stat">
        <span class="info-label">Durchschnittspreis:</span>
        <span class="info-value">${formatCurrency(avgPrice)}/g</span>
      </div>
    `;
  } catch (error) {
    console.warn("Info-Panel update failed:", error);
  }
}

// Info-Panel für Masterbatch aktualisieren  
function updateMasterbatchInfoPanel() {
  const infoPanel = document.getElementById("masterbatchInfo");
  if (!infoPanel || !window.availableMasterbatches) return;
  
  try {
    const masterbatchCount = window.availableMasterbatches.length;
    const avgPrice = window.availableMasterbatches.reduce((sum, m) => sum + m.price, 0) / masterbatchCount;
    
    infoPanel.innerHTML = `
      <div class="info-stat">
        <span class="info-label">Verfügbare Masterbatches:</span>
        <span class="info-value">${masterbatchCount}</span>
      </div>
      <div class="info-stat">
        <span class="info-label">Durchschnittspreis:</span>
        <span class="info-value">${formatCurrency(avgPrice)}/g</span>
      </div>
    `;
  } catch (error) {
    console.warn("Masterbatch Info-Panel update failed:", error);
  }
}

// Reload function for manual retry
function reloadMaterials() {
  console.log("🔄 Manual reload of materials requested");
  materialsLoaded = false;
  masterbatchesLoaded = false;
  
  if (window.db) {
    initializeMaterialLoading();
  } else {
    console.warn("⚠️ Firebase not available for manual reload");
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning("Firebase-Verbindung nicht verfügbar. Bitte warten Sie auf die automatische Wiederverbindung.");
    }
  }
}

// Global reload function
window.reloadMaterials = reloadMaterials;

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
                <th onclick="sortMaterials('price')">Preis €/kg</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
    `;

    const materialData = [];

    snapshot.forEach(doc => {
      const material = doc.data();
      
      // Benutze einfache Preis-Struktur
      const price = material.price || 0;
      
      materialData.push({
        id: doc.id,
        name: material.name,
        manufacturer: material.manufacturer || 'Unbekannt',
        price
      });

      // Tabellen-Zeile für Desktop
      containerHtml += `
        <tr id="material-row-${doc.id}">
          <td><span class="cell-value">${material.name}</span></td>
          <td><span class="cell-value">${material.manufacturer || 'Unbekannt'}</span></td>
          <td><span class="cell-value">${window.formatCurrency(price)}</span></td>
          <td class="actions">
            <div class="action-group">
              <button class="btn btn-primary btn-small" onclick="editMaterial('${doc.id}')">Bearbeiten</button>
              <button class="btn btn-danger btn-small" onclick="deleteMaterial('${doc.id}')">Löschen</button>
            </div>
          </td>
        </tr>
      `;
    });

    containerHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    tableDiv.innerHTML = containerHtml;
    
    console.log("✅ Material management table loaded");
    
  } catch (error) {
    console.error("❌ Fehler beim Laden der Materialien für Management:", error);
    document.getElementById("materialsTable").innerHTML = '<p>Fehler beim Laden der Materialien.</p>';
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
                <th onclick="sortMasterbatches('price')">Preis €/g</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
    `;

    const masterbatchData = [];

    snapshot.forEach(doc => {
      const masterbatch = doc.data();
      
      // Benutze einfache Preis-Struktur
      const price = masterbatch.price || 0;
      
      masterbatchData.push({
        id: doc.id,
        name: masterbatch.name,
        manufacturer: masterbatch.manufacturer || 'Unbekannt',
        price
      });

      // Tabellen-Zeile für Desktop
      containerHtml += `
        <tr id="masterbatch-row-${doc.id}">
          <td><span class="cell-value">${masterbatch.name}</span></td>
          <td><span class="cell-value">${masterbatch.manufacturer || 'Unbekannt'}</span></td>
          <td><span class="cell-value">${price.toFixed(4)} €</span></td>
          <td class="actions">
            <div class="action-group">
              <button class="btn btn-primary btn-small" onclick="editMasterbatch('${doc.id}')">Bearbeiten</button>
              <button class="btn btn-danger btn-small" onclick="deleteMasterbatch('${doc.id}')">Löschen</button>
            </div>
          </td>
        </tr>
      `;
    });

    containerHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    tableDiv.innerHTML = containerHtml;
    
    console.log("✅ Masterbatch management table loaded");
    
  } catch (error) {
    console.error("❌ Fehler beim Laden der Masterbatches für Management:", error);
    document.getElementById("masterbatchesTable").innerHTML = '<p>Fehler beim Laden der Masterbatches.</p>';
  }
}

// ==================== PLACEHOLDER FUNCTIONS ====================
// Diese Funktionen werden in anderen Modulen implementiert

async function addMaterial() {
  console.log("Add material function called");
  // Implementation in anderen Modulen
}

async function addMasterbatch() {
  console.log("Add masterbatch function called");
  // Implementation in anderen Modulen
}

async function deleteMaterial(materialId) {
  console.log("Delete material function called:", materialId);
  // Implementation in anderen Modulen
}

async function deleteMasterbatch(masterbatchId) {
  console.log("Delete masterbatch function called:", masterbatchId);
  // Implementation in anderen Modulen
}

async function editMaterial(materialId) {
  console.log("Edit material function called:", materialId);
  // Implementation in anderen Modulen
}

async function editMasterbatch(masterbatchId) {
  console.log("Edit masterbatch function called:", masterbatchId);
  // Implementation in anderen Modulen
}

function sortMaterials(column) {
  console.log("Sort materials function called:", column);
  // Implementation in anderen Modulen
}

function sortMasterbatches(column) {
  console.log("Sort masterbatches function called:", column);
  // Implementation in anderen Modulen
}

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.loadMaterials = loadMaterials;
window.loadMasterbatches = loadMasterbatches;
window.showMaterialManager = showMaterialManager;
window.closeMaterialManager = closeMaterialManager;
window.showMasterbatchManager = showMasterbatchManager;
window.closeMasterbatchManager = closeMasterbatchManager;
window.loadMaterialsForManagement = loadMaterialsForManagement;
window.loadMasterbatchesForManagement = loadMasterbatchesForManagement;

// ==================== MATERIAL LOADING MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("🏭 Material Loading Module geladen");
