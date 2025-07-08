// ==================== PELLETTRACKR WEB-APP ====================

// Globale Variablen
let currentUser = { name: '', kennung: '', isAdmin: false };
const ADMIN_PASSWORD = 'fgf2024admin'; // In production sollte das in einer sicheren Konfiguration stehen

// Globale Daten für Suche und Sortierung
let allUserEntries = [];
let allAdminEntries = [];

// App initialisieren
function initializeApp() {
  console.log("🚀 PelletTrackr wird initialisiert...");
  
  // Firebase-Verbindung testen
  testFirebaseConnection();
  
  // Login-Screen anzeigen
  showScreen('loginScreen');
  
  console.log("✅ PelletTrackr bereit!");
}

// ==================== LOGIN FUNKTIONEN ====================

async function loginAsUser() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  
  if (!name || !kennung) {
    alert('Bitte Name und Kennung eingeben!');
    return;
  }
  
  // Prüfen ob Kennung bereits von jemand anderem verwendet wird
  const existingUser = await checkExistingKennung(kennung.toLowerCase(), name);
  if (existingUser) {
    const userChoice = confirm(
      `⚠️ FH-Kennung bereits registriert!\n\n` +
      `Die Kennung "${kennung}" ist bereits für "${existingUser.name}" registriert.\n\n` +
      `Möchtest du:\n` +
      `✅ OK = Als "${existingUser.name}" anmelden\n` +
      `❌ Abbrechen = Andere Kennung verwenden`
    );
    
    if (userChoice) {
      // Als existierender User anmelden
      currentUser = {
        name: existingUser.name,
        kennung: kennung.toLowerCase(),
        isAdmin: false
      };
      document.getElementById('userWelcome').textContent = `Willkommen zurück, ${existingUser.name}!`;
    } else {
      alert('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
      return;
    }
  } else {
    // Neue Kombination - normal fortfahren
    currentUser = {
      name: name,
      kennung: kennung.toLowerCase(),
      isAdmin: false
    };
    document.getElementById('userWelcome').textContent = `Willkommen, ${name}!`;
  }
  showScreen('userDashboard');
  
  // User Dashboard initialisieren
  initializeUserDashboard();
}

function loginAsAdmin() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  const password = document.getElementById('adminPassword').value;
  
  if (!name || !kennung) {
    alert('Bitte Name und Kennung eingeben!');
    return;
  }
  
  if (password !== ADMIN_PASSWORD) {
    alert('Falsches Admin-Passwort!');
    return;
  }
  
  currentUser = {
    name: name,
    kennung: kennung.toLowerCase(),
    isAdmin: true
  };
  
  // Admin Dashboard anzeigen
  document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${name}`;
  showScreen('adminDashboard');
  
  // Admin Dashboard initialisieren
  initializeAdminDashboard();
}

function logout() {
  currentUser = { name: '', kennung: '', isAdmin: false };
  showScreen('loginScreen');
  
  // Felder zurücksetzen
  document.getElementById('loginName').value = '';
  document.getElementById('loginKennung').value = '';
  document.getElementById('adminPassword').value = '';
}

// ==================== USER VALIDATION ====================

async function checkExistingKennung(kennung, currentName) {
  try {
    // Alle Einträge mit dieser Kennung abrufen
    const snapshot = await db.collection('entries').where('kennung', '==', kennung).get();
    
    if (!snapshot.empty) {
      // Erste Einträge prüfen um zu sehen ob ein anderer Name verwendet wird
      const existingNames = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase() !== currentName.toLowerCase()) {
          existingNames.add(data.name);
        }
      });
      
      if (existingNames.size > 0) {
        // Ersten anderen Namen zurückgeben
        return {
          name: Array.from(existingNames)[0]
        };
      }
    }
    
    return null; // Keine Konflikte gefunden
  } catch (error) {
    console.error('Fehler beim Prüfen der FH-Kennung:', error);
    return null;
  }
}

// ==================== SCREEN MANAGEMENT ====================

function showScreen(screenId) {
  // Alle Screens ausblenden
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Gewünschten Screen anzeigen
  document.getElementById(screenId).classList.add('active');
}

// ==================== DASHBOARD INITIALISIERUNG ====================

function initializeUserDashboard() {
  loadMaterials().then(() => {
    loadMasterbatches().then(() => {
      setupEventListeners();
    });
  });
  loadUserStats();
  loadUserEntries();
}

function initializeAdminDashboard() {
  loadAdminStats();
  loadAllEntries();
}

// Event Listeners einrichten
function setupEventListeners() {
  console.log("🔧 Event Listeners werden eingerichtet...");
  
  // Live-Kostenberechnung
  const materialMenge = document.getElementById("materialMenge");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const material = document.getElementById("material");
  const masterbatch = document.getElementById("masterbatch");
  
  console.log("📊 Elemente gefunden:", {
    materialMenge: !!materialMenge,
    masterbatchMenge: !!masterbatchMenge,
    material: !!material,
    masterbatch: !!masterbatch
  });
  
  if (materialMenge) {
    materialMenge.addEventListener("input", throttledCalculateCost);
    materialMenge.addEventListener("keyup", throttledCalculateCost);
    console.log("✅ Material Menge Event Listeners gesetzt");
  }
  if (masterbatchMenge) {
    masterbatchMenge.addEventListener("input", throttledCalculateCost);
    masterbatchMenge.addEventListener("keyup", throttledCalculateCost);
    console.log("✅ Masterbatch Menge Event Listeners gesetzt");
  }
  if (material) {
    material.addEventListener("change", calculateCostPreview);
    console.log("✅ Material Change Event Listener gesetzt");
  }
  if (masterbatch) {
    masterbatch.addEventListener("change", calculateCostPreview);
    console.log("✅ Masterbatch Change Event Listener gesetzt");
  }
  
  // Eingabevalidierung für deutsche Zahlenformate
  if (materialMenge) {
    materialMenge.addEventListener("blur", function() {
      var value = this.value;
      if (value) {
        var parsed = parseGermanNumber(value);
        if (parsed > 0) {
          this.value = parsed.toFixed(2).replace('.', ',');
          calculateCostPreview(); // Preisberechnung nach Formatierung
        }
      }
    });
  }
  
  if (masterbatchMenge) {
    masterbatchMenge.addEventListener("blur", function() {
      var value = this.value;
      if (value) {
        var parsed = parseGermanNumber(value);
        if (parsed > 0) {
          this.value = parsed.toFixed(2).replace('.', ',');
          calculateCostPreview(); // Preisberechnung nach Formatierung
        }
      }
    });
  }
  
  // Initialer Aufruf um sicherzustellen, dass alles funktioniert
  setTimeout(() => {
    calculateCostPreview();
  }, 1000);
}

// ==================== MATERIAL & MASTERBATCH LOADING ====================

// Materialien laden (direkt aus Firestore)
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

// ==================== ENTRY MANAGEMENT ====================

// Neuen Eintrag hinzufügen
async function addEntry() {
  // Verwende die aktuellen User-Daten
  const name = currentUser.name;
  const kennung = currentUser.kennung;
  const material = document.getElementById("material").value.trim();
  const materialMenge = document.getElementById("materialMenge").value.trim();
  const masterbatch = document.getElementById("masterbatch").value.trim();
  const masterbatchMenge = document.getElementById("masterbatchMenge").value.trim();

  // Validierung
  if (!material || !materialMenge || !masterbatch || !masterbatchMenge) {
    alert("⚠️ Bitte alle Felder ausfüllen!");
    return;
  }

  const materialMengeNum = parseGermanNumber(materialMenge);
  const masterbatchMengeNum = parseGermanNumber(masterbatchMenge);

  if (isNaN(materialMengeNum) || materialMengeNum <= 0) {
    alert("⚠️ Bitte eine gültige Materialmenge eingeben!");
    return;
  }

  if (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0) {
    alert("⚠️ Bitte eine gültige Masterbatch-Menge eingeben!");
    return;
  }

  try {
    // Preise aus Firestore abrufen
    const materialSnapshot = await db.collection("materials").where("name", "==", material).get();
    const masterbatchSnapshot = await db.collection("masterbatches").where("name", "==", masterbatch).get();

    if (materialSnapshot.empty) {
      throw new Error("Material nicht gefunden");
    }
    if (masterbatchSnapshot.empty) {
      throw new Error("Masterbatch nicht gefunden");
    }

    const materialData = materialSnapshot.docs[0].data();
    const masterbatchData = masterbatchSnapshot.docs[0].data();

    // Kosten berechnen
    const materialCost = materialMengeNum * materialData.price;
    const masterbatchCost = masterbatchMengeNum * masterbatchData.price;
    const totalCost = materialCost + masterbatchCost;

    // Eintrag in Firestore speichern
    const entry = {
      name: name,
      kennung: kennung,
      material: material,
      materialMenge: materialMengeNum,
      materialPrice: materialData.price,
      materialCost: materialCost,
      masterbatch: masterbatch,
      masterbatchMenge: masterbatchMengeNum,
      masterbatchPrice: masterbatchData.price,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      paid: false
    };

    await db.collection("entries").add(entry);

    alert("✅ Eintrag erfolgreich gespeichert!");
    clearForm();
    
    // Dashboard aktualisieren
    if (!currentUser.isAdmin) {
      loadUserStats();
      loadUserEntries();
    } else {
      loadAdminStats();
      loadAllEntries();
    }
    
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    alert("❌ Fehler beim Speichern: " + error.message);
  }
}

// Formular zurücksetzen
function clearForm() {
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const costPreview = document.getElementById("costPreview");
  
  if (material) material.value = '';
  if (materialMenge) materialMenge.value = '';
  if (masterbatch) masterbatch.value = '';
  if (masterbatchMenge) masterbatchMenge.value = '';
  if (costPreview) costPreview.textContent = '0,00 €';
}

// ==================== USER DASHBOARD FUNKTIONEN ====================

// User-Statistiken laden
async function loadUserStats() {
  try {
    const snapshot = await db.collection("entries")
      .where("name", "==", currentUser.name)
      .where("kennung", "==", currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    const totalEntries = entries.length;
    const totalCost = entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const paidEntries = entries.filter(entry => entry.paid || entry.isPaid);
    const paidAmount = paidEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const unpaidAmount = totalCost - paidAmount;

    // Stats anzeigen
    document.getElementById('userTotalEntries').textContent = totalEntries;
    document.getElementById('userTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('userPaidAmount').textContent = formatCurrency(paidAmount);
    document.getElementById('userUnpaidAmount').textContent = formatCurrency(unpaidAmount);

  } catch (error) {
    console.error('Fehler beim Laden der User-Stats:', error);
  }
}

// User-Einträge laden
async function loadUserEntries() {
  try {
    const snapshot = await db.collection("entries")
      .where("name", "==", currentUser.name)
      .where("kennung", "==", currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });

    // Global speichern für Suche
    allUserEntries = entries;
    
    renderUserEntries(entries);
    
  } catch (error) {
    console.error("Fehler beim Laden der User-Einträge:", error);
    document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Einträge.</p>';
  }
}

// User-Einträge rendern
function renderUserEntries(entries) {
  const tableDiv = document.getElementById("userEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Einträge vorhanden. Füge deinen ersten 3D-Druck hinzu!</p>';
    tableDiv.innerHTML = message;
    return;
  }

  // Tabelle erstellen
  let tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th onclick="sortUserEntries('date')">Datum ↕</th>
          <th onclick="sortUserEntries('material')">Material ↕</th>
          <th onclick="sortUserEntries('materialMenge')">Menge ↕</th>
          <th onclick="sortUserEntries('masterbatch')">Masterbatch ↕</th>
          <th onclick="sortUserEntries('masterbatchMenge')">Menge ↕</th>
          <th onclick="sortUserEntries('cost')">Kosten ↕</th>
          <th onclick="sortUserEntries('status')">Status ↕</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Cards HTML
  let cardsHtml = '';

  entries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const status = entry.paid || entry.isPaid ? 
      '<span class="status-paid">✅ Bezahlt</span>' : 
      '<span class="status-unpaid">⏳ Offen</span>';
    
    // Responsive Tabellen-Zeile mit data-label Attributen
    tableHtml += `
      <tr>
        <td data-label="Datum">${date}</td>
        <td data-label="Material">${entry.material}</td>
        <td data-label="Menge">${entry.materialMenge.toFixed(2)} kg</td>
        <td data-label="Masterbatch">${entry.masterbatch}</td>
        <td data-label="MB Menge">${entry.masterbatchMenge.toFixed(2)} kg</td>
        <td data-label="Kosten"><strong>${formatCurrency(entry.totalCost)}</strong></td>
        <td data-label="Status">${status}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;
  
  tableDiv.innerHTML = tableHtml;
}

// ==================== ADMIN DASHBOARD FUNKTIONEN ====================

// Admin-Statistiken laden
async function loadAdminStats() {
  try {
    const snapshot = await db.collection("entries").get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Unique users zählen
    const uniqueUsers = new Set();
    entries.forEach(entry => {
      if (entry.name && entry.kennung) {
        uniqueUsers.add(`${entry.name}_${entry.kennung}`);
      }
    });
    
    const totalEntries = entries.length;
    const totalUsers = uniqueUsers.size;
    const totalRevenue = entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const paidEntries = entries.filter(entry => entry.paid || entry.isPaid);
    const paidRevenue = paidEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const pendingAmount = totalRevenue - paidRevenue;
    
    // Stats anzeigen
    document.getElementById('adminTotalEntries').textContent = totalEntries;
    document.getElementById('adminTotalUsers').textContent = totalUsers;
    document.getElementById('adminTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('adminPendingAmount').textContent = formatCurrency(pendingAmount);
    
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Stats:', error);
  }
}

// Alle Einträge für Admin laden
async function loadAllEntries() {
  try {
    const snapshot = await db.collection("entries").get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });
    
    // Global speichern für Suche und Sortierung
    allAdminEntries = entries;
    
    renderAdminEntries(entries);
    
  } catch (error) {
    console.error("Fehler beim Laden der Admin-Einträge:", error);
    document.getElementById("adminEntriesTable").innerHTML = '<p>Fehler beim Laden der Einträge.</p>';
  }
}

// Admin-Einträge rendern
function renderAdminEntries(entries) {
  const tableDiv = document.getElementById("adminEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Einträge vorhanden.</p>';
    tableDiv.innerHTML = message;
    return;
  }

  // Admin-Tabelle erstellen
  let tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th onclick="sortAdminEntriesBy('date')">Datum ↕</th>
          <th onclick="sortAdminEntriesBy('name')">Name ↕</th>
          <th onclick="sortAdminEntriesBy('kennung')">Kennung ↕</th>
          <th onclick="sortAdminEntriesBy('material')">Material ↕</th>
          <th onclick="sortAdminEntriesBy('materialMenge')">Mat. Menge ↕</th>
          <th onclick="sortAdminEntriesBy('masterbatch')">Masterbatch ↕</th>
          <th onclick="sortAdminEntriesBy('masterbatchMenge')">MB Menge ↕</th>
          <th onclick="sortAdminEntriesBy('cost')">Kosten ↕</th>
          <th onclick="sortAdminEntriesBy('status')">Status ↕</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;

  entries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
      '<span class="status-paid">✅ Bezahlt</span>' : 
      '<span class="status-unpaid">❌ Offen</span>';
    
    const actions = `
      <div class="actions">
        ${!isPaid ? 
          `<button class="btn btn-primary" onclick="markEntryAsPaid('${entry.id}')">Als bezahlt</button>` :
          `<button class="btn btn-secondary" onclick="markEntryAsUnpaid('${entry.id}')">Rückgängig</button>`
        }
        <button class="btn btn-danger" onclick="deleteEntry('${entry.id}')">Löschen</button>
      </div>
    `;
    
    // Responsive Tabellen-Zeile mit data-label Attributen
    tableHtml += `
      <tr id="entry-${entry.id}">
        <td data-label="Datum">${date}</td>
        <td data-label="Name">${entry.name}</td>
        <td data-label="Kennung">${entry.kennung}</td>
        <td data-label="Material">${entry.material}</td>
        <td data-label="Mat. Menge">${(entry.materialMenge || 0).toFixed(2)} kg</td>
        <td data-label="Masterbatch">${entry.masterbatch}</td>
        <td data-label="MB Menge">${(entry.masterbatchMenge || 0).toFixed(2)} kg</td>
        <td data-label="Kosten"><strong>${formatCurrency(entry.totalCost)}</strong></td>
        <td data-label="Status">${status}</td>
        <td class="actions" data-label="Aktionen">${actions}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;
  
  tableDiv.innerHTML = tableHtml;
}

// Eintrag als bezahlt markieren
async function markEntryAsPaid(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Eintrag als bezahlt markieren?")) return;
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: true,
      isPaid: true,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert("✅ Eintrag als bezahlt markiert!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
    alert("❌ Fehler beim Markieren: " + error.message);
  }
}

// Eintrag als unbezahlt markieren
async function markEntryAsUnpaid(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Eintrag als unbezahlt markieren?")) return;
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: false,
      isPaid: false,
      paidAt: null
    });
    
    alert("⚠️ Eintrag als unbezahlt markiert!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
    alert("❌ Fehler beim Markieren: " + error.message);
  }
}

// Eintrag löschen
async function deleteEntry(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Eintrag wirklich unwiderruflich löschen?")) return;
  
  try {
    await db.collection('entries').doc(entryId).delete();
    alert("🗑️ Eintrag erfolgreich gelöscht!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Löschen des Eintrags:', error);
    alert("❌ Fehler beim Löschen: " + error.message);
  }
}

// ==================== MATERIAL MANAGEMENT ====================

function showMaterialManager() {
  if (!checkAdminAccess()) return;
  document.getElementById('materialManager').classList.add('active');
  loadMaterialsForManagement();
}

function closeMaterialManager() {
  document.getElementById('materialManager').classList.remove('active');
}

function showMasterbatchManager() {
  if (!checkAdminAccess()) return;
  document.getElementById('masterbatchManager').classList.add('active');
  loadMasterbatchesForManagement();
}

function closeMasterbatchManager() {
  document.getElementById('masterbatchManager').classList.remove('active');
}

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
            <th>Preis pro kg</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    snapshot.forEach(doc => {
      const material = doc.data();
      
      // Responsive Tabellen-Zeile mit data-label Attributen
      tableHtml += `
        <tr id="material-row-${doc.id}">
          <td data-label="Name" id="material-name-${doc.id}">${material.name}</td>
          <td data-label="Preis pro kg" id="material-price-${doc.id}">${formatCurrency(material.price)}</td>
          <td class="actions" data-label="Aktionen">
            <button class="btn btn-secondary" onclick="editMaterial('${doc.id}', '${material.name}', ${material.price})">Bearbeiten</button>
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
    const snapshot = await db.collection("masterbatches").get();
    
    const tableDiv = document.getElementById("masterbatchesTable");
    const cardsDiv = document.getElementById("masterbatchesCards");
    
    if (snapshot.empty) {
      const message = '<p>Keine Masterbatches vorhanden.</p>';
      tableDiv.innerHTML = message;
      cardsDiv.innerHTML = message;
      return;
    }

    let tableHtml = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Preis pro kg</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    let cardsHtml = '';

    snapshot.forEach(doc => {
      const masterbatch = doc.data();
      
      // Responsive Tabellen-Zeile mit data-label Attributen
      tableHtml += `
        <tr id="masterbatch-row-${doc.id}">
          <td data-label="Name" id="masterbatch-name-${doc.id}">${masterbatch.name}</td>
          <td data-label="Preis pro kg" id="masterbatch-price-${doc.id}">${formatCurrency(masterbatch.price)}</td>
          <td class="actions" data-label="Aktionen">
            <button class="btn btn-secondary" onclick="editMasterbatch('${doc.id}', '${masterbatch.name}', ${masterbatch.price})">Bearbeiten</button>
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

async function addMaterial() {
  const name = document.getElementById('newMaterialName').value.trim();
  const price = parseFloat(document.getElementById('newMaterialPrice').value);
  
  if (!name || isNaN(price) || price <= 0) {
    alert('Bitte gültigen Namen und Preis eingeben!');
    return;
  }
  
  try {
    await db.collection('materials').add({
      name: name,
      price: price,
      currency: '€'
    });
    
    alert('Material erfolgreich hinzugefügt!');
    document.getElementById('newMaterialName').value = '';
    document.getElementById('newMaterialPrice').value = '';
    
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    alert('Fehler beim Hinzufügen: ' + error.message);
  }
}

async function addMasterbatch() {
  const name = document.getElementById('newMasterbatchName').value.trim();
  const price = parseFloat(document.getElementById('newMasterbatchPrice').value);
  
  if (!name || isNaN(price) || price <= 0) {
    alert('Bitte gültigen Namen und Preis eingeben!');
    return;
  }
  
  try {
    await db.collection('masterbatches').add({
      name: name,
      price: price,
      currency: '€'
    });
    
    alert('Masterbatch erfolgreich hinzugefügt!');
    document.getElementById('newMasterbatchName').value = '';
    document.getElementById('newMasterbatchPrice').value = '';
    
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    alert('Fehler beim Hinzufügen: ' + error.message);
  }
}

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

// ==================== EDIT FUNKTIONEN ====================

function editMaterial(materialId, currentName, currentPrice) {
  const newName = prompt('Neuer Material-Name:', currentName);
  if (newName === null) return; // User cancelled
  
  const newPriceStr = prompt('Neuer Preis pro kg (€):', currentPrice.toFixed(2));
  if (newPriceStr === null) return; // User cancelled
  
  const newPrice = parseFloat(newPriceStr);
  
  if (!newName.trim() || isNaN(newPrice) || newPrice <= 0) {
    alert('Bitte gültigen Namen und Preis eingeben!');
    return;
  }
  
  updateMaterial(materialId, newName.trim(), newPrice);
}

function editMasterbatch(masterbatchId, currentName, currentPrice) {
  const newName = prompt('Neuer Masterbatch-Name:', currentName);
  if (newName === null) return; // User cancelled
  
  const newPriceStr = prompt('Neuer Preis pro kg (€):', currentPrice.toFixed(2));
  if (newPriceStr === null) return; // User cancelled
  
  const newPrice = parseFloat(newPriceStr);
  
  if (!newName.trim() || isNaN(newPrice) || newPrice <= 0) {
    alert('Bitte gültigen Namen und Preis eingeben!');
    return;
  }
  
  updateMasterbatch(masterbatchId, newName.trim(), newPrice);
}

async function updateMaterial(materialId, newName, newPrice) {
  try {
    await db.collection('materials').doc(materialId).update({
      name: newName,
      price: newPrice,
      currency: '€'
    });
    
    alert('Material erfolgreich aktualisiert!');
    
    // Tabelle aktualisieren
    loadMaterialsForManagement();
    loadMaterials(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    alert('Fehler beim Aktualisieren: ' + error.message);
  }
}

async function updateMasterbatch(masterbatchId, newName, newPrice) {
  try {
    await db.collection('masterbatches').doc(masterbatchId).update({
      name: newName,
      price: newPrice,
      currency: '€'
    });
    
    alert('Masterbatch erfolgreich aktualisiert!');
    
    // Tabelle aktualisieren
    loadMasterbatchesForManagement();
    loadMasterbatches(); // Dropdown aktualisieren
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    alert('Fehler beim Aktualisieren: ' + error.message);
  }
}

// ==================== HILFSFUNKTIONEN ====================

// Währung formatieren
function formatCurrency(amount) {
  return (amount || 0).toFixed(2).replace('.', ',') + ' €';
}

// Admin-Zugriff prüfen
function checkAdminAccess() {
  if (!currentUser.isAdmin) {
    alert('Nur für Administratoren!');
    return false;
  }
  return true;
}

// Deutsche Zahlenformate parsen
function parseGermanNumber(str) {
  if (typeof str !== 'string') return parseFloat(str) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

// Kostenvorschau berechnen
async function calculateCostPreview() {
  console.log("💰 Kostenvorschau wird berechnet...");
  
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const costPreview = document.getElementById("costPreview");
  
  if (!material || !materialMenge || !masterbatch || !masterbatchMenge || !costPreview) {
    console.log("❌ Nicht alle Elemente gefunden");
    return;
  }
  
  const materialValue = material.value.trim();
  const materialMengeValue = materialMenge.value.trim();
  const masterbatchValue = masterbatch.value.trim();
  const masterbatchMengeValue = masterbatchMenge.value.trim();
  
  console.log("📊 Eingabewerte:", {
    material: materialValue,
    materialMenge: materialMengeValue,
    masterbatch: masterbatchValue,
    masterbatchMenge: masterbatchMengeValue
  });
  
  if (!materialValue || !materialMengeValue || !masterbatchValue || !masterbatchMengeValue) {
    console.log("⚠️ Nicht alle Felder ausgefüllt");
    costPreview.textContent = '0,00 €';
    return;
  }
  
  try {
    console.log("🔍 Suche Preise in Firestore...");
    const materialSnapshot = await db.collection("materials").where("name", "==", materialValue).get();
    const masterbatchSnapshot = await db.collection("masterbatches").where("name", "==", masterbatchValue).get();
    
    if (!materialSnapshot.empty && !masterbatchSnapshot.empty) {
      const materialPrice = materialSnapshot.docs[0].data().price;
      const masterbatchPrice = masterbatchSnapshot.docs[0].data().price;
      
      console.log("💰 Preise gefunden:", {
        materialPrice: materialPrice,
        masterbatchPrice: masterbatchPrice
      });
      
      const materialCost = parseGermanNumber(materialMengeValue) * materialPrice;
      const masterbatchCost = parseGermanNumber(masterbatchMengeValue) * masterbatchPrice;
      const totalCost = materialCost + masterbatchCost;
      
      console.log("🧮 Berechnung:", {
        materialCost: materialCost,
        masterbatchCost: masterbatchCost,
        totalCost: totalCost
      });
      
      if (!isNaN(totalCost) && totalCost > 0) {
        const formattedCost = formatCurrency(totalCost);
        costPreview.textContent = formattedCost;
        console.log("✅ Kostenvorschau aktualisiert:", formattedCost);
      } else {
        costPreview.textContent = '0,00 €';
        console.log("⚠️ Ungültige Berechnung");
      }
    } else {
      costPreview.textContent = '0,00 €';
      console.log("❌ Material oder Masterbatch nicht gefunden");
    }
  } catch (error) {
    console.error("❌ Fehler bei der Kostenberechnung:", error);
    costPreview.textContent = '0,00 €';
  }
}

// Throttled cost calculation
let costCalculationTimeout = null;
function throttledCalculateCost() {
  clearTimeout(costCalculationTimeout);
  costCalculationTimeout = setTimeout(calculateCostPreview, 500);
}

// Firebase-Verbindung testen
async function testFirebaseConnection() {
  try {
    console.log("🧪 Teste Firebase-Verbindung...");
    
    // Einfache Abfrage um Verbindung zu testen
    const testQuery = await db.collection('materials').limit(1).get();
    
    console.log("✅ Firebase-Verbindung erfolgreich!");
    console.log("📊 Test-Query Size:", testQuery.size);
    
    return true;
  } catch (error) {
    console.error("❌ Firebase-Verbindungsfehler:", error);
    alert("⚠️ Verbindung zur Datenbank fehlgeschlagen: " + error.message);
    return false;
  }
}

// ==================== SUCH- UND SORTIERFUNKTIONEN ====================

// User-Einträge suchen
function searchUserEntries() {
  const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
  
  if (!searchTerm) {
    renderUserEntries(allUserEntries);
    return;
  }
  
  const filteredEntries = allUserEntries.filter(entry => {
    return entry.material.toLowerCase().includes(searchTerm) ||
           entry.masterbatch.toLowerCase().includes(searchTerm) ||
           (entry.timestamp && new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE').includes(searchTerm));
  });
  
  renderUserEntries(filteredEntries);
}

// Admin-Einträge suchen
function searchAdminEntries() {
  const searchTerm = document.getElementById('adminSearchInput').value.toLowerCase();
  
  if (!searchTerm) {
    applyAdminFiltersAndSort();
    return;
  }
  
  const filteredEntries = allAdminEntries.filter(entry => {
    return entry.name.toLowerCase().includes(searchTerm) ||
           entry.kennung.toLowerCase().includes(searchTerm) ||
           entry.material.toLowerCase().includes(searchTerm) ||
           entry.masterbatch.toLowerCase().includes(searchTerm) ||
           (entry.timestamp && new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE').includes(searchTerm));
  });
  
  renderAdminEntries(filteredEntries);
}

// User-Einträge sortieren
let userSortDirection = {};
function sortUserEntries(column) {
  // Toggle sort direction
  userSortDirection[column] = userSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = userSortDirection[column];
  
  let sortedEntries = [...allUserEntries];
  
  sortedEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch(column) {
      case 'date':
        valueA = a.timestamp ? a.timestamp.toDate() : new Date(0);
        valueB = b.timestamp ? b.timestamp.toDate() : new Date(0);
        break;
      case 'material':
        valueA = a.material.toLowerCase();
        valueB = b.material.toLowerCase();
        break;
      case 'materialMenge':
        valueA = a.materialMenge || 0;
        valueB = b.materialMenge || 0;
        break;
      case 'masterbatch':
        valueA = a.masterbatch.toLowerCase();
        valueB = b.masterbatch.toLowerCase();
        break;
      case 'masterbatchMenge':
        valueA = a.masterbatchMenge || 0;
        valueB = b.masterbatchMenge || 0;
        break;
      case 'cost':
        valueA = a.totalCost || 0;
        valueB = b.totalCost || 0;
        break;
      case 'status':
        valueA = (a.paid || a.isPaid) ? 1 : 0;
        valueB = (b.paid || b.isPaid) ? 1 : 0;
        break;
      default:
        return 0;
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderUserEntries(sortedEntries);
}

// Admin-Einträge sortieren (Header-Klicks)
let adminSortDirection = {};
function sortAdminEntriesBy(column) {
  // Toggle sort direction
  adminSortDirection[column] = adminSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = adminSortDirection[column];
  
  let sortedEntries = [...allAdminEntries];
  
  sortedEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch(column) {
      case 'date':
        valueA = a.timestamp ? a.timestamp.toDate() : new Date(0);
        valueB = b.timestamp ? b.timestamp.toDate() : new Date(0);
        break;
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'kennung':
        valueA = a.kennung.toLowerCase();
        valueB = b.kennung.toLowerCase();
        break;
      case 'material':
        valueA = a.material.toLowerCase();
        valueB = b.material.toLowerCase();
        break;
      case 'materialMenge':
        valueA = a.materialMenge || 0;
        valueB = b.materialMenge || 0;
        break;
      case 'masterbatch':
        valueA = a.masterbatch.toLowerCase();
        valueB = b.masterbatch.toLowerCase();
        break;
      case 'masterbatchMenge':
        valueA = a.masterbatchMenge || 0;
        valueB = b.masterbatchMenge || 0;
        break;
      case 'cost':
        valueA = a.totalCost || 0;
        valueB = b.totalCost || 0;
        break;
      case 'status':
        valueA = (a.paid || a.isPaid) ? 1 : 0;
        valueB = (b.paid || b.isPaid) ? 1 : 0;
        break;
      default:
        return 0;
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderAdminEntries(sortedEntries);
}

// Admin-Einträge sortieren (Dropdown)
function sortAdminEntries() {
  applyAdminFiltersAndSort();
}

// Admin-Filter und Sortierung anwenden
function applyAdminFiltersAndSort() {
  const sortSelect = document.getElementById('adminSortSelect');
  const sortValue = sortSelect.value;
  
  let filteredEntries = [...allAdminEntries];
  
  // Filter anwenden
  switch(sortValue) {
    case 'status-paid':
      filteredEntries = filteredEntries.filter(entry => entry.paid || entry.isPaid);
      break;
    case 'status-unpaid':
      filteredEntries = filteredEntries.filter(entry => !(entry.paid || entry.isPaid));
      break;
  }
  
  // Sortierung anwenden
  filteredEntries.sort((a, b) => {
    switch(sortValue) {
      case 'date-desc':
        return (b.timestamp ? b.timestamp.toDate() : new Date(0)) - (a.timestamp ? a.timestamp.toDate() : new Date(0));
      case 'date-asc':
        return (a.timestamp ? a.timestamp.toDate() : new Date(0)) - (b.timestamp ? b.timestamp.toDate() : new Date(0));
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'cost-desc':
        return (b.totalCost || 0) - (a.totalCost || 0);
      case 'cost-asc':
        return (a.totalCost || 0) - (b.totalCost || 0);
      default:
        return 0;
    }
  });
  
  renderAdminEntries(filteredEntries);
}
