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

function showAdminLogin() {
  const passwordGroup = document.getElementById('passwordGroup');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
    // Passwort-Feld anzeigen
    passwordGroup.style.display = 'block';
    adminBtn.textContent = 'Admin Login';
    adminBtn.onclick = loginAsAdmin;
  } else {
    // Passwort-Feld verstecken
    passwordGroup.style.display = 'none';
    adminBtn.textContent = 'Als Admin anmelden';
    adminBtn.onclick = showAdminLogin;
  }
}

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

// ==================== USER MANAGEMENT DETAIL FUNKTIONEN ====================

// User-Details anzeigen
function showUserDetails(kennung) {
  if (!checkAdminAccess()) return;
  
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    alert('Benutzer nicht gefunden!');
    return;
  }
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const firstEntryDate = user.firstEntry.toLocaleDateString('de-DE');
  const lastEntryDate = user.lastEntry.toLocaleDateString('de-DE');
  
  // Neueste 5 Einträge
  const recentEntries = user.entries
    .sort((a, b) => (b.timestamp ? b.timestamp.toDate() : new Date(0)) - (a.timestamp ? a.timestamp.toDate() : new Date(0)))
    .slice(0, 5);
  
  let recentEntriesHtml = '';
  if (recentEntries.length > 0) {
    recentEntriesHtml = `
      <h4>Letzte Drucke</h4>
      <table class="data-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Job</th>
            <th>Material</th>
            <th>Kosten</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    recentEntries.forEach(entry => {
      const entryDate = entry.timestamp ? entry.timestamp.toDate().toLocaleDateString('de-DE') : 'Unbekannt';
      const isPaid = entry.paid || entry.isPaid;
      const status = isPaid ? '<span class="status-paid">Bezahlt</span>' : '<span class="status-unpaid">Offen</span>';
      
      recentEntriesHtml += `
        <tr>
          <td>${entryDate}</td>
          <td>${entry.jobName || '3D-Druck Auftrag'}</td>
          <td>${entry.material}</td>
          <td>${formatCurrency(entry.totalCost)}</td>
          <td>${status}</td>
        </tr>
      `;
    });
    
    recentEntriesHtml += `
        </tbody>
      </table>
    `;
  } else {
    recentEntriesHtml = '<p>Keine Drucke vorhanden.</p>';
  }
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Benutzer-Details: ${user.name}</h3>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="user-details">
        <div class="detail-section">
          <h4>Benutzerinformationen</h4>
          <div class="detail-item">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${user.name}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">FH-Kennung:</span>
            <span class="detail-value">${user.kennung}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">E-Mail:</span>
            <span class="detail-value">${email}</span>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>Aktivitätsstatistiken</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${user.entries.length}</div>
              <div class="stat-label">Drucke gesamt</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(user.totalCost)}</div>
              <div class="stat-label">Gesamtkosten</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(user.paidAmount)}</div>
              <div class="stat-label">Bezahlt</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(user.unpaidAmount)}</div>
              <div class="stat-label">Ausstehend</div>
            </div>
          </div>
          <div class="detail-item">
            <span class="detail-label">Erster Druck:</span>
            <span class="detail-value">${firstEntryDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Letzter Druck:</span>
            <span class="detail-value">${lastEntryDate}</span>
          </div>
        </div>
        
        <div class="detail-section">
          ${recentEntriesHtml}
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        <button class="btn btn-primary" onclick="editUser('${kennung}')">Benutzer bearbeiten</button>
        ${user.unpaidAmount > 0 ? 
          `<button class="btn btn-warning" onclick="sendPaymentReminder('${kennung}')">Zahlungserinnerung senden</button>` : 
          ''
        }
      </div>
    </div>
  `;
  
  showModal(modalHtml);
}

// Zahlungserinnerung senden
function sendPaymentReminder(kennung) {
  if (!checkAdminAccess()) return;
  
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    alert('Benutzer nicht gefunden!');
    return;
  }
  
  if (user.unpaidAmount <= 0) {
    alert('Dieser Benutzer hat keine offenen Zahlungen.');
    return;
  }
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const unpaidEntries = user.entries.filter(entry => !(entry.paid || entry.isPaid));
  
  // E-Mail-Inhalt erstellen
  const subject = encodeURIComponent(`PelletTrackr - Zahlungserinnerung für offene 3D-Drucke`);
  
  let entryList = '';
  unpaidEntries.forEach((entry, index) => {
    const date = entry.timestamp ? entry.timestamp.toDate().toLocaleDateString('de-DE') : 'Unbekannt';
    entryList += `${index + 1}. ${entry.jobName || '3D-Druck Auftrag'} vom ${date} - ${formatCurrency(entry.totalCost)}\n`;
  });
  
  const body = encodeURIComponent(`Hallo ${user.name},

dies ist eine freundliche Erinnerung, dass noch Zahlungen für Ihre 3D-Drucke ausstehen.

OFFENE DRUCKE:
${entryList}

GESAMTBETRAG: ${formatCurrency(user.unpaidAmount)}

Bitte begleichen Sie die offenen Beträge zeitnah.

Bei Fragen wenden Sie sich gerne an das FGF 3D-Druck Team.

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team

---
Diese E-Mail wurde automatisch von PelletTrackr generiert am ${new Date().toLocaleDateString('de-DE')}.`);
  
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  
  // E-Mail-Programm öffnen
  window.open(mailtoLink, '_blank');
  
  // Bestätigung
  alert(`Zahlungserinnerung für ${user.name} wurde in Ihrem E-Mail-Programm geöffnet.`);
}

// User-Sortierung aus Dropdown
function sortUsers() {
  if (!window.allUsers) return;
  
  const sortValue = document.getElementById('userManagerSortSelect').value;
  const [field, direction] = sortValue.split('-');
  
  const sortedUsers = [...window.allUsers].sort((a, b) => {
    let aVal, bVal;
    
    switch(field) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'kennung':
        aVal = a.kennung.toLowerCase();
        bVal = b.kennung.toLowerCase();
        break;
      case 'entries':
        aVal = a.entries.length;
        bVal = b.entries.length;
        break;
      case 'revenue':
        aVal = a.totalCost;
        bVal = b.totalCost;
        break;
      default:
        return 0;
    }
    
    if (direction === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
  
  renderUsersTable(sortedUsers);
}

// ==================== MODAL FUNKTIONEN ====================

// Helper-Funktion für Modal
function showModal(htmlContent) {
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  modalContent.innerHTML = htmlContent;
  modal.classList.add('active');
}

// Alias für showModalWithContent
function showModalWithContent(htmlContent) {
  showModal(htmlContent);
}

// Modal schließen
function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('active');
}

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
    
    showModal(modalHtml);
    
  } catch (error) {
    console.error("Fehler beim Laden der Druck-Details:", error);
    alert("Fehler beim Laden der Details!");
  }
}

// ==================== ENTRY EDIT SAVE FUNKTIONEN ====================

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