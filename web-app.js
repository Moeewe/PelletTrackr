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
    alert('Bitte Name und FH-Kennung eingeben!');
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
    // Neue Kombination - User in Firestore speichern
    currentUser = {
      name: name,
      kennung: kennung.toLowerCase(),
      isAdmin: false
    };
    
    try {
      // User-Dokument in Firestore erstellen
      await db.collection('users').add({
        name: name,
        kennung: kennung.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Neuer User in Firestore erstellt:', kennung.toLowerCase());
    } catch (error) {
      console.warn('Fehler beim Erstellen des User-Dokuments:', error);
      // Trotzdem fortfahren - nicht kritisch für User-Login
    }
    
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
    alert('Bitte Name und FH-Kennung eingeben!');
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
    // Alle Drucke mit dieser Kennung abrufen
    const snapshot = await db.collection('entries').where('kennung', '==', kennung).get();
    
    if (!snapshot.empty) {
      // Erste Drucke prüfen um zu sehen ob ein anderer Name verwendet wird
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

// Neuen Druck hinzufügen
async function addEntry() {
  // Verwende die aktuellen User-Daten
  const name = currentUser.name;
  const kennung = currentUser.kennung;
  const material = document.getElementById("material").value.trim();
  const materialMenge = document.getElementById("materialMenge").value.trim();
  const masterbatch = document.getElementById("masterbatch").value.trim();
  const masterbatchMenge = document.getElementById("masterbatchMenge").value.trim();
  const jobName = document.getElementById("jobName").value.trim();
  const jobNotes = document.getElementById("jobNotes").value.trim();

  // Validierung
  if (!material || !materialMenge || !masterbatch || !masterbatchMenge) {
    alert("⚠️ Bitte alle Felder ausfüllen!");
    return;
  }

  // Prüfe ob mindestens ein Material ausgewählt ist
  const hasMaterial = material && materialMenge;
  const hasMasterbatch = masterbatch && masterbatchMenge;
  
  if (!hasMaterial && !hasMasterbatch) {
    alert("⚠️ Bitte wählen Sie mindestens Material oder Masterbatch aus!");
    return;
  }

  // Validierung der ausgewählten Mengen
  const materialMengeNum = hasMaterial ? parseGermanNumber(materialMenge) : 0;
  const masterbatchMengeNum = hasMasterbatch ? parseGermanNumber(masterbatchMenge) : 0;

  if (hasMaterial && (isNaN(materialMengeNum) || materialMengeNum <= 0)) {
    alert("⚠️ Bitte eine gültige Materialmenge eingeben!");
    return;
  }

  if (hasMasterbatch && (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0)) {
    alert("⚠️ Bitte eine gültige Masterbatch-Menge eingeben!");
    return;
  }

  try {
    let materialData = null;
    let masterbatchData = null;
    let materialCost = 0;
    let masterbatchCost = 0;

    // Material-Daten abrufen (falls ausgewählt)
    if (hasMaterial) {
      const materialSnapshot = await db.collection("materials").where("name", "==", material).get();
      if (materialSnapshot.empty) {
        throw new Error("Material nicht gefunden");
      }
      materialData = materialSnapshot.docs[0].data();
      materialCost = materialMengeNum * materialData.price;
    }

    // Masterbatch-Daten abrufen (falls ausgewählt)
    if (hasMasterbatch) {
      const masterbatchSnapshot = await db.collection("masterbatches").where("name", "==", masterbatch).get();
      if (masterbatchSnapshot.empty) {
        throw new Error("Masterbatch nicht gefunden");
      }
      masterbatchData = masterbatchSnapshot.docs[0].data();
      masterbatchCost = masterbatchMengeNum * masterbatchData.price;
    }

    // Gesamtkosten berechnen
    const totalCost = materialCost + masterbatchCost;

    // Druck in Firestore speichern
    const entry = {
      name: name,
      kennung: kennung,
      material: material || "",
      materialMenge: materialMengeNum,
      materialPrice: materialData ? materialData.price : 0,
      materialCost: materialCost,
      masterbatch: masterbatch || "",
      masterbatchMenge: masterbatchMengeNum,
      masterbatchPrice: masterbatchData ? masterbatchData.price : 0,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      jobName: jobName || "3D-Druck Auftrag", // Default if empty
      jobNotes: jobNotes || "",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      paid: false
    };

    await db.collection("entries").add(entry);

    alert("✅ Druck erfolgreich gespeichert!");
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
  const jobName = document.getElementById("jobName");
  const jobNotes = document.getElementById("jobNotes");
  const costPreview = document.getElementById("costPreview");
  
  if (material) material.value = '';
  if (materialMenge) materialMenge.value = '';
  if (masterbatch) masterbatch.value = '';
  if (masterbatchMenge) masterbatchMenge.value = '';
  if (jobName) jobName.value = '';
  if (jobNotes) jobNotes.value = '';
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

// User-Drucke laden
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
    console.error("Fehler beim Laden der User-Drucke:", error);
    document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
  }
}

// User-Drucke rendern
function renderUserEntries(entries) {
  const tableDiv = document.getElementById("userEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden. Füge deinen ersten 3D-Druck hinzu!</p>';
    tableDiv.innerHTML = message;
    return;
  }

  // Tabelle erstellen
  let tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th onclick="sortUserEntries('date')">Datum ↕</th>
          <th onclick="sortUserEntries('jobName')">Job ↕</th>
          <th onclick="sortUserEntries('material')">Material ↕</th>
          <th onclick="sortUserEntries('materialMenge')">Menge ↕</th>
          <th onclick="sortUserEntries('masterbatch')">Masterbatch ↕</th>
          <th onclick="sortUserEntries('masterbatchMenge')">Menge ↕</th>
          <th onclick="sortUserEntries('cost')">Kosten ↕</th>
          <th onclick="sortUserEntries('status')">Status ↕</th>
          <th>Notizen</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Cards HTML
  let cardsHtml = '';

  entries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
      '<span class="status-paid">Bezahlt</span>' : 
      '<span class="status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 30 ? jobNotes.substring(0, 30) + "..." : jobNotes;
    
    // Aktionen für User (Zahlungsnachweis, Details und Bearbeiten gruppiert)
    const nachweisBtnClass = isPaid ? 'btn-nachweis' : 'btn-nachweis disabled';
    const nachweisBtn = isPaid ? 
      `<button class="${nachweisBtnClass}" onclick="showPaymentProof('${entry.id}')">Nachweis</button>` :
      `<button class="${nachweisBtnClass}" disabled title="Nachweis nach Zahlung verfügbar">Nachweis</button>`;
      
    const actions = `
      <div class="action-group">
        <div class="payment-actions">
          ${nachweisBtn}
        </div>
        <div class="entry-actions">
          <button class="btn btn-tertiary" onclick="viewEntryDetails('${entry.id}')">Details</button>
          <button class="btn btn-secondary" onclick="editUserEntry('${entry.id}')">Bearbeiten</button>
        </div>
      </div>`;
    
    // Responsive Tabellen-Zeile mit Zwei-Zeilen-Layout
    tableHtml += `
      <tr class="entry-row">
        <td data-label="Datum">${date}</td>
        <td data-label="Job">${jobName}</td>
        <td data-label="Material">${entry.material}</td>
        <td data-label="Menge">${entry.materialMenge.toFixed(2)} kg</td>
        <td data-label="Masterbatch">${entry.masterbatch}</td>
        <td data-label="MB Menge">${entry.masterbatchMenge.toFixed(2)} kg</td>
        <td data-label="Kosten"><strong>${formatCurrency(entry.totalCost)}</strong></td>
        <td data-label="Status" class="status-cell">${status}</td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          ${truncatedNotes}
          ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
        </td>
        <td data-label="Aktionen" class="actions-cell">${actions}</td>
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

// Alle Drucke für Admin laden
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
    console.error("Fehler beim Laden der Admin-Drucke:", error);
    document.getElementById("adminEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
  }
}

// Admin-Drucke rendern
function renderAdminEntries(entries) {
  const tableDiv = document.getElementById("adminEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden.</p>';
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
          <th onclick="sortAdminEntriesBy('jobName')">Job ↕</th>
          <th onclick="sortAdminEntriesBy('material')">Material ↕</th>
          <th onclick="sortAdminEntriesBy('materialMenge')">Mat. Menge ↕</th>
          <th onclick="sortAdminEntriesBy('masterbatch')">Masterbatch ↕</th>
          <th onclick="sortAdminEntriesBy('masterbatchMenge')">MB Menge ↕</th>
          <th onclick="sortAdminEntriesBy('cost')">Kosten ↕</th>
          <th onclick="sortAdminEntriesBy('status')">Status ↕</th>
          <th>Notizen</th>
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
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 20 ? jobNotes.substring(0, 20) + "..." : jobNotes;
    
    const actions = `
      <div class="actions">
        ${!isPaid ? 
          `<button class="btn btn-primary" onclick="markEntryAsPaid('${entry.id}')">Zahlung registrieren</button>` :
          `<button class="btn btn-secondary" onclick="markEntryAsUnpaid('${entry.id}')">Rückgängig</button>
           <button class="btn btn-success" onclick="showPaymentProof('${entry.id}')">Nachweis</button>`
        }
        <button class="btn btn-tertiary" onclick="viewEntryDetails('${entry.id}')">Details</button>
        <button class="btn btn-secondary" onclick="editEntry('${entry.id}')">Bearbeiten</button>
        <button class="btn btn-danger" onclick="deleteEntry('${entry.id}')">Löschen</button>
      </div>
    `;
    
    // Responsive Tabellen-Zeile mit data-label Attributen
    tableHtml += `
      <tr id="entry-${entry.id}">
        <td data-label="Datum">${date}</td>
        <td data-label="Name">${entry.name}</td>
        <td data-label="Kennung">${entry.kennung}</td>
        <td data-label="Job">${jobName}</td>
        <td data-label="Material">${entry.material}</td>
        <td data-label="Mat. Menge">${(entry.materialMenge || 0).toFixed(2)} kg</td>
        <td data-label="Masterbatch">${entry.masterbatch}</td>
        <td data-label="MB Menge">${(entry.masterbatchMenge || 0).toFixed(2)} kg</td>
        <td data-label="Kosten"><strong>${formatCurrency(entry.totalCost)}</strong></td>
        <td data-label="Status">${status}</td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          ${truncatedNotes}
          ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
        </td>
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

// Zahlung registrieren
async function markEntryAsPaid(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Zahlung für diesen Druck registrieren?")) return;
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: true,
      isPaid: true,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert("✅ Zahlung wurde registriert!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Registrieren der Zahlung:', error);
    alert("❌ Fehler beim Markieren: " + error.message);
  }
}

// Zahlung rückgängig machen
async function markEntryAsUnpaid(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Zahlung rückgängig machen?")) return;
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: false,
      isPaid: false,
      paidAt: null
    });
    
    alert("⚠️ Zahlung wurde rückgängig gemacht!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Rückgängigmachen der Zahlung:', error);
    alert("❌ Fehler beim Markieren: " + error.message);
  }
}

// Druck löschen
async function deleteEntry(entryId) {
  if (!checkAdminAccess()) return;
  if (!confirm("Druck wirklich unwiderruflich löschen?")) return;
  
  try {
    await db.collection('entries').doc(entryId).delete();
    alert("🗑️ Druck erfolgreich gelöscht!");
    loadAdminStats();
    loadAllEntries(); // Lädt alle Daten neu und wendet aktuelle Filter an
    
  } catch (error) {
    console.error('Fehler beim Löschen des Drucks:', error);
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

    let cardsHtml = '';

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
    await db.collection('masterbatches').add({
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

async function editMaterial(materialId) {
  try {
    const doc = await db.collection('materials').doc(materialId).get();
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
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Materials:', error);
    alert('Fehler beim Laden des Materials: ' + error.message);
  }
}

async function editMasterbatch(masterbatchId) {
  try {
    const doc = await db.collection('masterbatches').doc(masterbatchId).get();
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
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error('Fehler beim Laden des Masterbatch:', error);
    alert('Fehler beim Laden des Masterbatch: ' + error.message);
  }
}

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
    await db.collection('materials').doc(materialId).update({
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
    closeModal();
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
    await db.collection('masterbatches').doc(masterbatchId).update({
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
    closeModal();
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
  
  // Prüfe ob mindestens ein Material ausgewählt ist
  const hasMaterial = materialValue && materialMengeValue;
  const hasMasterbatch = masterbatchValue && masterbatchMengeValue;
  
  if (!hasMaterial && !hasMasterbatch) {
    console.log("⚠️ Weder Material noch Masterbatch ausgefüllt");
    costPreview.textContent = '0,00 €';
    return;
  }
  
  try {
    console.log("🔍 Suche Preise in Firestore...");
    let materialCost = 0;
    let masterbatchCost = 0;
    
    // Material-Kosten berechnen (falls ausgewählt)
    if (hasMaterial) {
      const materialSnapshot = await db.collection("materials").where("name", "==", materialValue).get();
      if (!materialSnapshot.empty) {
        const materialPrice = materialSnapshot.docs[0].data().price;
        materialCost = parseGermanNumber(materialMengeValue) * materialPrice;
        console.log("💰 Material-Kosten:", materialCost);
      }
    }
    
    // Masterbatch-Kosten berechnen (falls ausgewählt)
    if (hasMasterbatch) {
      const masterbatchSnapshot = await db.collection("masterbatches").where("name", "==", masterbatchValue).get();
      if (!masterbatchSnapshot.empty) {
        const masterbatchPrice = masterbatchSnapshot.docs[0].data().price;
        masterbatchCost = parseGermanNumber(masterbatchMengeValue) * masterbatchPrice;
        console.log("💰 Masterbatch-Kosten:", masterbatchCost);
      }
    }
    
    const totalCost = materialCost + masterbatchCost;
    
    console.log("🧮 Gesamtberechnung:", {
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost
    });
    
    if (!isNaN(totalCost) && totalCost >= 0) {
      const formattedCost = formatCurrency(totalCost);
      costPreview.textContent = formattedCost;
      console.log("✅ Kostenvorschau aktualisiert:", formattedCost);
    } else {
      costPreview.textContent = '0,00 €';
      console.log("⚠️ Ungültige Berechnung");
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
    
async function showPaymentProof(entryId) {
  try {
    const entryDoc = await db.collection('entries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = { id: entryDoc.id, ...entryDoc.data() };
    
    // Prüfen ob bezahlt
    if (!(entry.paid || entry.isPaid)) {
      alert('Für diesen Druck wurde noch keine Zahlung registriert!');
      return;
    }
    
    const paidDate = entry.paidAt ? 
      new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
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
              <span class="proof-value">${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job:</span>
              <span class="proof-value">${entry.jobName || '3D-Druck Auftrag'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Menge:</span>
              <span class="proof-value">${entry.materialMenge.toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Menge:</span>
              <span class="proof-value">${entry.masterbatchMenge.toFixed(2)} kg</span>
            </div>
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
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung}</span>
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
          <div class="proof-total-amount">${formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-footer">
          <p>Dieser Zahlungsnachweis wurde automatisch generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.</p>
          <p>FGF 3D-Druck Verwaltung - PelletTrackr System</p>
        </div>
      </div>
    `;
    
    document.getElementById('paymentProofContent').innerHTML = proofContent;
    document.getElementById('paymentProofModal').classList.add('active');
    
    // Store entry data for email/print
    window.currentProofEntry = entry;
    
  } catch (error) {
    console.error('Fehler beim Laden des Zahlungsnachweises:', error);
    alert('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
  }
}

// Modal schließen
function closePaymentProofModal() {
  document.getElementById('paymentProofModal').classList.remove('active');
  window.currentProofEntry = null;
}

// Zahlungsnachweis drucken
function printPaymentProof() {
  window.print();
}

// Zahlungsnachweis per E-Mail
function emailPaymentProof() {
  if (!window.currentProofEntry) {
    alert('Fehler: Kein Druck geladen!');
    return;
  }
  
  const entry = window.currentProofEntry;
  const paidDate = entry.paidAt ? 
    new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
    new Date().toLocaleDateString('de-DE');
  
  const subject = encodeURIComponent(`PelletTrackr - Zahlungsnachweis für ${entry.name}`);
  const body = encodeURIComponent(`Hallo ${entry.name},

hiermit bestätigen wir den Eingang Ihrer Zahlung für den 3D-Druck Auftrag.

RECHNUNGSDETAILS:
- Datum: ${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}
- Job: ${entry.jobName || '3D-Druck Auftrag'}
- Material: ${entry.material} (${entry.materialMenge.toFixed(2)} kg)
- Masterbatch: ${entry.masterbatch} (${entry.masterbatchMenge.toFixed(2)} kg)
${entry.jobNotes ? `- Notizen: ${entry.jobNotes}` : ''}

ZAHLUNGSINFORMATIONEN:
- Name: ${entry.name}
- FH-Kennung: ${entry.kennung}
- Bezahlt am: ${paidDate}
- Gesamtbetrag: ${formatCurrency(entry.totalCost)}
- Status: ✅ BEZAHLT

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team

---
Diese E-Mail wurde automatisch von PelletTrackr generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.`);
  
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

// Modal beim Klick außerhalb schließen
document.addEventListener('click', function(event) {
  const modal = document.getElementById('paymentProofModal');
  if (event.target === modal) {
    closePaymentProofModal();
  }
});

// ==================== ENTRY DETAILS & EDIT FUNKTIONEN ====================

// Druck-Details anzeigen
async function viewEntryDetails(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
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
        <div class="proof-details">
          <div class="proof-section">
            <h3>Allgemeine Informationen</h3>
            <div class="proof-item">
              <span class="proof-label">Name:</span>
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Datum:</span>
              <span class="proof-value">${date}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Uhrzeit:</span>
              <span class="proof-value">${time}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job-Name:</span>
              <span class="proof-value">${jobName}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Status:</span>
              <span class="proof-value">${status}</span>
            </div>
          </div>
          
          <div class="proof-section">
            <h3>Material & Kosten</h3>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material-Menge:</span>
              <span class="proof-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch-Menge:</span>
              <span class="proof-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span>
            </div>
          </div>
        </div>
        
        <div class="proof-total">
          <div class="proof-total-amount">${formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-section">
          <h3>Notizen</h3>
          <p style="padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 0; white-space: pre-wrap;">${jobNotes}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden der Druck-Details:", error);
    alert("Fehler beim Laden der Details!");
  }
}

// Eintrag bearbeiten (Admin)
async function editEntry(entryId) {
  if (!checkAdminAccess()) return;
  
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Material-Menge (kg)</label>
              <input type="number" id="editMaterialMenge" class="form-input" value="${(entry.materialMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Masterbatch-Menge (kg)</label>
              <input type="number" id="editMasterbatchMenge" class="form-input" value="${(entry.masterbatchMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editJobNotes" class="form-textarea" rows="4">${jobNotes}</textarea>
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

// User-Druck bearbeiten (limitiert)
async function editUserEntry(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    
    // Prüfen ob User berechtigt ist (nur eigene Drucke bearbeiten)
    if (entry.kennung !== currentUser.kennung) {
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
        <h2>Mein Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editUserEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editUserJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editUserJobNotes" class="form-textarea" rows="4">${jobNotes}</textarea>
          </div>
          
          <p style="margin-top: 20px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            <strong>Hinweis:</strong> Als User kannst du nur Job-Name und Notizen bearbeiten. Material-Mengen können nur von Admins geändert werden.
          </p>
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

// Änderungen speichern (Admin)
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
    // Neue Kosten berechnen
    const materialsSnapshot = await db.collection('materials').get();
    const masterbatchesSnapshot = await db.collection('masterbatches').get();
    
    let materialPrice = 0;
    let masterbatchPrice = 0;
    
    const doc = await db.collection('entries').doc(entryId).get();
    const entry = doc.data();
    
    // Material-Preis finden
    materialsSnapshot.forEach(materialDoc => {
      const material = materialDoc.data();
      if (material.name === entry.material) {
}

// Nutzer löschen (alle Einträge des Nutzers)
async function deleteUser(kennung) {
  if (!checkAdminAccess()) return;
  
  const user = allUsers.find(u => u.kennung === kennung);
  if (!user) return;
  
  const confirmMessage = `⚠️ ACHTUNG: Alle ${user.entries.length} Einträge von "${user.name}" (${kennung}) werden unwiderruflich gelöscht!
  
Gesamtumsatz: ${formatCurrency(user.totalRevenue)}

Möchten Sie wirklich fortfahren?`;
  
  if (!confirm(confirmMessage)) return;
  
  try {
    console.log(`🗑️ Lösche alle Einträge von Nutzer: ${user.name} (${kennung})`);
    
    // Alle Einträge des Nutzers löschen
    const batch = db.batch();
    user.entries.forEach(entry => {
      const entryRef = db.collection("entries").doc(entry.id);
      batch.delete(entryRef);
    });
    
    await batch.commit();
    
    console.log(`✅ ${user.entries.length} Einträge von ${user.name} gelöscht`);
    alert(`✅ Nutzer "${user.name}" und alle ${user.entries.length} Einträge wurden gelöscht.`);
    
    // Listen neu laden
    loadUsersForManagement();
    loadAdminEntries();
    loadAdminStats();
    
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Nutzers:", error);
    alert("❌ Fehler beim Löschen des Nutzers. Bitte versuchen Sie es erneut.");
  }
}

// Nutzer nach Feld sortieren
function sortUsersBy(field) {
  const currentSort = document.getElementById("userManagerSortSelect").value;
  const [currentField, currentDirection] = currentSort.split('-');
  
  let newDirection = 'asc';
  if (currentField === field && currentDirection === 'asc') {
    newDirection = 'desc';
  }
  
  document.getElementById("userManagerSortSelect").value = `${field}-${newDirection}`;
  sortUsers();
}

// ==================== NOTIZ-BEARBEITUNG ====================

// Notiz bearbeiten
function editNote(entryId, currentNote) {
  const newNote = prompt('Notiz bearbeiten:', currentNote);
  if (newNote === null) return; // User cancelled
  
  updateEntryNote(entryId, newNote.trim());
}

// Notiz in Firestore aktualisieren
async function updateEntryNote(entryId, newNote) {
  try {
    await db.collection('entries').doc(entryId).update({
      jobNotes: newNote
    });
    
    console.log(`✅ Notiz für Druck ${entryId} aktualisiert`);
    
    // Tabellen aktualisieren
    if (currentUser.isAdmin) {
      loadAllEntries();
    } else {
      loadUserEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notiz:', error);
    alert('Fehler beim Speichern der Notiz: ' + error.message);
  }
}

// Anführungszeichen escapen für HTML-Attribute
function escapeQuotes(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ==================== LOGIN FUNKTIONEN ====================

// Admin Login anzeigen
function showAdminLogin() {
  const passwordGroup = document.getElementById('passwordGroup');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (passwordGroup.style.display === 'none') {
    passwordGroup.style.display = 'block';
    adminBtn.textContent = 'Admin Login';
    adminBtn.onclick = loginAsAdmin;
  } else {
    passwordGroup.style.display = 'none';
    adminBtn.textContent = 'Als Admin anmelden';
    adminBtn.onclick = showAdminLogin;
  }
}

// ==================== ZAHLUNGSNACHWEIS ====================

// Zahlungsnachweis anzeigen
async function showPaymentProof(entryId) {
  try {
    const entryDoc = await db.collection('entries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = { id: entryDoc.id, ...entryDoc.data() };
    
    // Prüfen ob bezahlt
    if (!(entry.paid || entry.isPaid)) {
      alert('Für diesen Druck wurde noch keine Zahlung registriert!');
      return;
    }
    
    const paidDate = entry.paidAt ? 
      new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
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
              <span class="proof-value">${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job:</span>
              <span class="proof-value">${entry.jobName || '3D-Druck Auftrag'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Menge:</span>
              <span class="proof-value">${entry.materialMenge.toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Menge:</span>
              <span class="proof-value">${entry.masterbatchMenge.toFixed(2)} kg</span>
            </div>
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
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung}</span>
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
          <div class="proof-total-amount">${formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-footer">
          <p>Dieser Zahlungsnachweis wurde automatisch generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.</p>
          <p>FGF 3D-Druck Verwaltung - PelletTrackr System</p>
        </div>
      </div>
    `;
    
    document.getElementById('paymentProofContent').innerHTML = proofContent;
    document.getElementById('paymentProofModal').classList.add('active');
    
    // Store entry data for email/print
    window.currentProofEntry = entry;
    
  } catch (error) {
    console.error('Fehler beim Laden des Zahlungsnachweises:', error);
    alert('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
  }
}

// Modal schließen
function closePaymentProofModal() {
  document.getElementById('paymentProofModal').classList.remove('active');
  window.currentProofEntry = null;
}

// Zahlungsnachweis drucken
function printPaymentProof() {
  window.print();
}

// Zahlungsnachweis per E-Mail
function emailPaymentProof() {
  if (!window.currentProofEntry) {
    alert('Fehler: Kein Druck geladen!');
    return;
  }
  
  const entry = window.currentProofEntry;
  const paidDate = entry.paidAt ? 
    new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
    new Date().toLocaleDateString('de-DE');
  
  const subject = encodeURIComponent(`PelletTrackr - Zahlungsnachweis für ${entry.name}`);
  const body = encodeURIComponent(`Hallo ${entry.name},

hiermit bestätigen wir den Eingang Ihrer Zahlung für den 3D-Druck Auftrag.

RECHNUNGSDETAILS:
- Datum: ${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}
- Job: ${entry.jobName || '3D-Druck Auftrag'}
- Material: ${entry.material} (${entry.materialMenge.toFixed(2)} kg)
- Masterbatch: ${entry.masterbatch} (${entry.masterbatchMenge.toFixed(2)} kg)
${entry.jobNotes ? `- Notizen: ${entry.jobNotes}` : ''}

ZAHLUNGSINFORMATIONEN:
- Name: ${entry.name}
- FH-Kennung: ${entry.kennung}
- Bezahlt am: ${paidDate}
- Gesamtbetrag: ${formatCurrency(entry.totalCost)}
- Status: ✅ BEZAHLT

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team

---
Diese E-Mail wurde automatisch von PelletTrackr generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.`);
  
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

// Modal beim Klick außerhalb schließen
document.addEventListener('click', function(event) {
  const modal = document.getElementById('paymentProofModal');
  if (event.target === modal) {
    closePaymentProofModal();
  }
});

// ==================== ENTRY DETAILS & EDIT FUNKTIONEN ====================

// Druck-Details anzeigen
async function viewEntryDetails(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
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
        <div class="proof-details">
          <div class="proof-section">
            <h3>Allgemeine Informationen</h3>
            <div class="proof-item">
              <span class="proof-label">Name:</span>
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung:</span>
              <span class="proof-value">${entry.kennung}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Datum:</span>
              <span class="proof-value">${date}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Uhrzeit:</span>
              <span class="proof-value">${time}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job-Name:</span>
              <span class="proof-value">${jobName}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Status:</span>
              <span class="proof-value">${status}</span>
            </div>
          </div>
          
          <div class="proof-section">
            <h3>Material & Kosten</h3>
            <div class="proof-item">
              <span class="proof-label">Material:</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material-Menge:</span>
              <span class="proof-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch:</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch-Menge:</span>
              <span class="proof-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span>
            </div>
          </div>
        </div>
        
        <div class="proof-total">
          <div class="proof-total-amount">${formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-section">
          <h3>Notizen</h3>
          <p style="padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 0; white-space: pre-wrap;">${jobNotes}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
      </div>
    `;
    
    showModalWithContent(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden der Druck-Details:", error);
    alert("Fehler beim Laden der Details!");
  }
}

// Eintrag bearbeiten (Admin)
async function editEntry(entryId) {
  if (!checkAdminAccess()) return;
  
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const modalHtml = `
      <div class="modal-header">
        <h2>Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Material-Menge (kg)</label>
              <input type="number" id="editMaterialMenge" class="form-input" value="${(entry.materialMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">Masterbatch-Menge (kg)</label>
              <input type="number" id="editMasterbatchMenge" class="form-input" value="${(entry.masterbatchMenge || 0).toFixed(2)}" step="0.01" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editJobNotes" class="form-textarea" rows="4">${jobNotes}</textarea>
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

// User-Druck bearbeiten (limitiert)
async function editUserEntry(entryId) {
  try {
    const doc = await db.collection('entries').doc(entryId).get();
    if (!doc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = doc.data();
    
    // Prüfen ob User berechtigt ist (nur eigene Drucke bearbeiten)
    if (entry.kennung !== currentUser.kennung) {
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
        <h2>Mein Eintrag Bearbeiten</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editUserEntryForm">
          <div class="form-group">
            <label class="form-label">Job-Name</label>
            <input type="text" id="editUserJobName" class="form-input" value="${jobName}">
          </div>
          
          <div class="form-group">
            <label class="form-label">Notizen</label>
            <textarea id="editUserJobNotes" class="form-textarea" rows="4">${jobNotes}</textarea>
          </div>
          
          <p style="margin-top: 20px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            <strong>Hinweis:</strong> Als User kannst du nur Job-Name und Notizen bearbeiten. Material-Mengen können nur von Admins geändert werden.
          </p>
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

// Änderungen speichern (Admin)
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
    // Neue Kosten berechnen
    const materialsSnapshot = await db.collection('materials').get();
    const masterbatchesSnapshot = await db.collection('masterbatches').get();
    
    let materialPrice = 0;
    let masterbatchPrice = 0;
    
    const doc = await db.collection('entries').doc(entryId).get();
    const entry = doc.data();
    
    // Material-Preis finden
    materialsSnapshot.forEach(materialDoc => {
      const material = materialDoc.data();
      if (material.name === entry.material) {
        materialPrice = material.price;
      }
    });
    
    // Masterbatch-Preis finden
    masterbatchesSnapshot.forEach(masterbatchDoc => {
      const masterbatch = masterbatchDoc.data();
      if (masterbatch.name === entry.masterbatch) {
        masterbatchPrice = masterbatch.price;
      }
    });
    
    const totalCost = (materialMenge * materialPrice) + (masterbatchMenge * masterbatchPrice);
    
    await db.collection('entries').doc(entryId).update({
      jobName: jobName,
      materialMenge: materialMenge,
      masterbatchMenge: masterbatchMenge,
      jobNotes: jobNotes,
      totalCost: totalCost,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // Dashboard neu laden
    if (currentUser.isAdmin) {
      initializeAdminDashboard();
    } else {
      initializeUserDashboard();
    }
    
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Fehler beim Speichern der Änderungen!");
  }
}

// User-Änderungen speichern (limitiert)
async function saveUserEntryChanges(entryId) {
  const jobName = document.getElementById('editUserJobName').value.trim();
  const jobNotes = document.getElementById('editUserJobNotes').value.trim();
  
  if (!jobName) {
    alert('Job-Name darf nicht leer sein!');
    return;
  }
  
  try {
    await db.collection('entries').doc(entryId).update({
      jobName: jobName,
      jobNotes: jobNotes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('Eintrag erfolgreich aktualisiert!');
    closeModal();
    
    // User Dashboard neu laden
    initializeUserDashboard();
    
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Fehler beim Speichern der Änderungen!");
  }
}

// Helper-Funktion für Modal
function showModal(htmlContent) {
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  modalContent.innerHTML = htmlContent;
  modal.classList.add('active');
}

function showModalWithContent(htmlContent) {
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  modalContent.innerHTML = htmlContent;
  modal.classList.add('active');
}

// Modal schließen
function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('active');
}
