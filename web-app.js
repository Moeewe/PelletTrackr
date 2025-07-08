// ==================== PELLETTRACKR WEB-APP ====================

// Globale Variablen
let currentUser = { name: '', kennung: '', isAdmin: false };
const ADMIN_PASSWORD = 'fgf2024admin'; // In production sollte das in einer sicheren Konfiguration stehen

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

function loginAsUser() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  
  if (!name || !kennung) {
    alert('Bitte Name und Kennung eingeben!');
    return;
  }
  
  currentUser = {
    name: name,
    kennung: kennung.toLowerCase(),
    isAdmin: false
  };
  
  // User Dashboard anzeigen
  document.getElementById('userWelcome').textContent = `Willkommen, ${name}!`;
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
  loadMaterials();
  loadMasterbatches();
  setupEventListeners();
  loadUserStats();
  loadUserEntries();
}

function initializeAdminDashboard() {
  loadAdminStats();
  loadAllEntries();
}

// Event Listeners einrichten
function setupEventListeners() {
  // Live-Kostenberechnung
  const materialMenge = document.getElementById("materialMenge");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const material = document.getElementById("material");
  const masterbatch = document.getElementById("masterbatch");
  
  if (materialMenge) materialMenge.addEventListener("input", throttledCalculateCost);
  if (masterbatchMenge) masterbatchMenge.addEventListener("input", throttledCalculateCost);
  if (material) material.addEventListener("change", calculateCostPreview);
  if (masterbatch) masterbatch.addEventListener("change", calculateCostPreview);
  
  // Eingabevalidierung für deutsche Zahlenformate
  if (materialMenge) {
    materialMenge.addEventListener("blur", function() {
      var value = this.value;
      if (value) {
        var parsed = parseGermanNumber(value);
        if (parsed > 0) {
          this.value = parsed.toFixed(2).replace('.', ',');
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
        }
      }
    });
  }
}

// ==================== MATERIAL & MASTERBATCH LOADING ====================

// Materialien laden (direkt aus Firestore)
async function loadMaterials() {
  const select = document.getElementById("material");
  select.innerHTML = '<option value="">Lade Materialien...</option>';
  
  console.log("🔄 Lade Materialien...");
  
  try {
    const snapshot = await db.collection("materials").get();
    console.log("📊 Materialien-Snapshot:", snapshot.size, "Dokumente");
    
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

// Neuen Eintrag hinzufügen
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
    }
    
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    alert("❌ Fehler beim Speichern: " + error.message);
  }
}

// Formular zurücksetzen
function clearForm() {
  document.getElementById("material").value = '';
  document.getElementById("materialMenge").value = '';
  document.getElementById("masterbatch").value = '';
  document.getElementById("masterbatchMenge").value = '';
  
  const costPreview = document.getElementById("costPreview");
  if (costPreview) {
    costPreview.textContent = '0,00 €';
  }
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

    const tableDiv = document.getElementById("userEntriesTable");
    
    if (entries.length === 0) {
      tableDiv.innerHTML = '<p>Noch keine Einträge vorhanden. Füge deinen ersten 3D-Druck hinzu!</p>';
      return;
    }

    // Tabelle erstellen
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Material</th>
            <th>Menge</th>
            <th>Masterbatch</th>
            <th>Menge</th>
            <th>Kosten</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    entries.forEach(entry => {
      const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
      const status = entry.paid || entry.isPaid ? 
        '<span class="status-paid">✅ Bezahlt</span>' : 
        '<span class="status-unpaid">⏳ Offen</span>';
      
      html += `
        <tr>
          <td>${date}</td>
          <td>${entry.material}</td>
          <td>${entry.materialMenge.toFixed(2)} kg</td>
          <td>${entry.masterbatch}</td>
          <td>${entry.masterbatchMenge.toFixed(2)} kg</td>
          <td><strong>${formatCurrency(entry.totalCost)}</strong></td>
          <td>${status}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
    
    tableDiv.innerHTML = html;
    
  } catch (error) {
    console.error("Fehler beim Laden der User-Einträge:", error);
    document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Einträge.</p>';
  }
}

// ==================== ADMIN DASHBOARD FUNKTIONEN ====================

// Admin-Statistiken laden
async function loadAdminStats() {
  try {

  try {
    const snapshot = await db.collection("entries")
      .where("name", "==", name)
      .where("kennung", "==", kennung)
      .get();

    const tableDiv = document.getElementById("overviewTable");
    
    if (snapshot.empty) {
      tableDiv.innerHTML = createEmptyState("📄", "Noch keine Einträge vorhanden", "Füge deinen ersten 3D-Druck hinzu!");
      return;
    }

    const entries = [];
    snapshot.forEach(doc => {
      const entry = doc.data();
      entries.push(entry);
    });

    // Sortiere die Einträge clientseitig nach Timestamp (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });

    // Tabelle erstellen
    let html = `
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Material</th>
              <th>Mat. Menge</th>
              <th>Masterbatch</th>
              <th>MB Menge</th>
              <th>Kosten</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    entries.forEach(function(entry) {
      const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
      const status = entry.paid ? "✅ Bezahlt" : "⏳ Offen";
      
      html += `
        <tr>
          <td>${date}</td>
          <td>${entry.material}</td>
          <td>${entry.materialMenge.toFixed(2)} kg</td>
          <td>${entry.masterbatch}</td>
          <td>${entry.masterbatchMenge.toFixed(2)} kg</td>
          <td><strong>${entry.totalCost.toFixed(2).replace('.', ',')} €</strong></td>
          <td>${status}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div style="text-align: center; margin-top: 24px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0;">
        <div style="font-weight: 600; margin-bottom: 8px;">📊 Zusammenfassung</div>
        <div style="font-size: 14px; color: #666;">
          ✅ ${entries.length} Eintrag${entries.length !== 1 ? 'e' : ''}
        </div>
      </div>
    `;
    
    tableDiv.innerHTML = html;
    
  } catch (error) {
    console.error("Fehler beim Laden der Einträge:", error);
    const tableDiv = document.getElementById("overviewTable");
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", "Konnte Einträge nicht laden: " + error.message);
  }
}

// Alternative Nutzer-Übersicht mit einfacher Abfrage
async function showUserOverviewSimple() {
  const name = document.getElementById("name").value.trim();
  const kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }

  showLoading("overviewTable", "Lade deine Einträge...");

  try {
    // Einfache Abfrage nur nach Name (ohne doppelte WHERE-Klausel)
    const snapshot = await db.collection("entries")
      .where("name", "==", name)
      .get();

    const tableDiv = document.getElementById("overviewTable");
    
    if (snapshot.empty) {
      tableDiv.innerHTML = createEmptyState("📄", "Noch keine Einträge vorhanden", "Füge deinen ersten 3D-Druck hinzu!");
      return;
    }

    const entries = [];
    snapshot.forEach(doc => {
      const entry = doc.data();
      // Filtere clientseitig nach Kennung
      if (entry.kennung === kennung) {
        entries.push(entry);
      }
    });

    if (entries.length === 0) {
      tableDiv.innerHTML = createEmptyState("📄", "Noch keine Einträge vorhanden", "Füge deinen ersten 3D-Druck hinzu!");
      return;
    }

    // Sortiere die Einträge clientseitig nach Timestamp (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });

    // Tabelle erstellen
    let html = `
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Material</th>
              <th>Mat. Menge</th>
              <th>Masterbatch</th>
              <th>MB Menge</th>
              <th>Kosten</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    entries.forEach(function(entry) {
      const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
      const status = entry.paid ? "✅ Bezahlt" : "⏳ Offen";
      
      html += `
        <tr>
          <td>${date}</td>
          <td>${entry.material}</td>
          <td>${entry.materialMenge.toFixed(2)} kg</td>
          <td>${entry.masterbatch}</td>
          <td>${entry.masterbatchMenge.toFixed(2)} kg</td>
          <td><strong>${entry.totalCost.toFixed(2).replace('.', ',')} €</strong></td>
          <td>${status}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div style="text-align: center; margin-top: 24px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0;">
        <div style="font-weight: 600; margin-bottom: 8px;">📊 Zusammenfassung</div>
        <div style="font-size: 14px; color: #666;">
          ✅ ${entries.length} Eintrag${entries.length !== 1 ? 'e' : ''}
        </div>
      </div>
    `;
    
    tableDiv.innerHTML = html;
    
  } catch (error) {
    console.error("Fehler beim Laden der Einträge:", error);
    const tableDiv = document.getElementById("overviewTable");
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", "Konnte Einträge nicht laden: " + error.message);
  }
}

// Nutzer-Statistiken anzeigen
async function showUserStatistics() {
  const name = document.getElementById("name").value.trim();
  const kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }

  showLoading("overviewTable", "Erstelle deine Statistiken...");

  try {
    // Firestore-Abfrage für Nutzer-Statistiken
    const querySnapshot = await db.collection('entries')
      .where('name', '==', name)
      .where('kennung', '==', kennung)
      .get();
    
    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Statistiken berechnen
    const stats = {
      totalEntries: entries.length,
      totalMaterialUsage: entries.reduce((sum, entry) => sum + (entry.materialMenge || 0), 0),
      totalMasterbatchUsage: entries.reduce((sum, entry) => sum + (entry.masterbatchMenge || 0), 0),
      totalCost: entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
      paidEntries: entries.filter(entry => entry.paid || entry.isPaid).length,
      unpaidEntries: entries.filter(entry => !(entry.paid || entry.isPaid)).length,
      unpaidCost: entries.filter(entry => !(entry.paid || entry.isPaid)).reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
      paidCost: entries.filter(entry => entry.paid || entry.isPaid).reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
      averageCost: entries.length > 0 ? entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0) / entries.length : 0,
      materialTypes: [...new Set(entries.map(entry => entry.material).filter(Boolean))]
    };
    
    const tableDiv = document.getElementById("overviewTable");
  let html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${stats.totalEntries}</div>
        <div class="stat-label">Einträge</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalMaterialUsage.toFixed(1)}</div>
        <div class="stat-label">kg Material</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalMasterbatchUsage.toFixed(1)}</div>
        <div class="stat-label">kg Masterbatch</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalCost.toFixed(0)}€</div>
        <div class="stat-label">Gesamtkosten</div>
      </div>
    </div>
  `;
  
  // Material-Aufschlüsselung
  if (stats.materialTypes.length > 0) {
    html += `<div style="margin-top: 24px;">`;
    html += `<div style="font-weight: 600; margin-bottom: 12px;">Deine Materialien:</div>`;
    
    // Materialien gruppieren und zählen
    const materialUsage = {};
    entries.forEach(entry => {
      if (entry.material) {
        materialUsage[entry.material] = (materialUsage[entry.material] || 0) + (entry.materialUsage || 0);
      }
    });
    
    for (const material in materialUsage) {
      html += `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <span>${material}</span>
          <span style="font-weight: 600;">${materialUsage[material].toFixed(2)} kg</span>
        </div>
      `;
    }
    html += `</div>`;
  }
  
  tableDiv.innerHTML = html;
  
  } catch (error) {
    console.error('Fehler beim Laden der Nutzer-Statistiken:', error);
    const tableDiv = document.getElementById("overviewTable");
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", "Fehler beim Laden der Statistiken: " + error.message);
  }
}

// Admin-Ansicht anzeigen
async function showAdminView() {
  if (!checkAdminAccess()) return;
  
  showLoading("overviewTable", "Lade alle Einträge...");

  try {
    // Firestore-Abfrage für alle Einträge (ohne orderBy, um Index-Probleme zu vermeiden)
    const querySnapshot = await db.collection('entries').get();
    
    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Clientseitige Sortierung nach Timestamp (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });
    
    const tableDiv = document.getElementById("overviewTable");
    
    if (entries.length === 0) {
      tableDiv.innerHTML = createEmptyState("📄", "Keine Einträge vorhanden", "Noch keine 3D-Drucke erfasst");
      return;
    }

  // Admin-Tabelle erstellen
  let html = `
    <div style="margin-bottom: 24px; padding: 16px; background: #FFFF00; border: 2px solid #000000;">
      <div style="font-weight: 600; margin-bottom: 8px;">🔧 Admin-Ansicht</div>
      <div style="font-size: 14px; color: #666;" data-admin-counter>
        Alle Einträge • ${entries.length} gesamt
      </div>
    </div>
    
    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th>FH-Kennung</th>
            <th>Material</th>
            <th>Mat. Menge</th>
            <th>Masterbatch</th>
            <th>MB Menge</th>
            <th>Kosten</th>
            <th>Bezahlt</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
  `;

  entries.forEach(function(entry, index) {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const paidDate = entry.paidAt ? new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : '';
    
    let statusHtml = '';
    if (entry.paid || entry.isPaid) {
      statusHtml = `
        <div style="color: #28a745; font-weight: 600;">✅ Ja</div>
        <div style="font-size: 12px; color: #666;">${paidDate}</div>
      `;
    } else {
      statusHtml = `<div style="color: #dc3545; font-weight: 600;">❌ Nein</div>`;
    }
    
    let actionHtml = '';
    if (!entry.paid && !entry.isPaid) {
      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <button onclick="markEntryAsPaid('${entry.id}')" 
                  style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">
            ✅ Als bezahlt markieren
          </button>
          <button onclick="deleteEntry('${entry.id}')" 
                  style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">
            🗑️ Löschen
          </button>
        </div>
      `;
    } else {
      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; color: #666; text-align: center; margin-bottom: 2px;">Bereits bezahlt</div>
          <button onclick="markEntryAsUnpaid('${entry.id}')" 
                  style="background: #ffc107; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;">
            ↩️ Rückgängig
          </button>
          <button onclick="deleteEntry('${entry.id}')" 
                  style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;">
            🗑️ Löschen
          </button>
        </div>
      `;
    }
    
    html += `
      <tr id="entry-${entry.id}">
        <td>${date}</td>
        <td>${entry.name}</td>
        <td>${entry.kennung}</td>
        <td>${entry.material}</td>
        <td>${(entry.materialMenge || 0).toFixed(2)} kg</td>
        <td>${entry.masterbatch}</td>
        <td>${(entry.masterbatchMenge || 0).toFixed(2)} kg</td>
        <td><strong>${(entry.totalCost || 0).toFixed(2).replace('.', ',')} €</strong></td>
        <td>${statusHtml}</td>
        <td>${actionHtml}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  
  tableDiv.innerHTML = html;
  
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Ansicht:', error);
    const tableDiv = document.getElementById("overviewTable");
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", "Fehler beim Laden der Einträge: " + error.message);
  }
}

// Eintrag als bezahlt markieren
async function markEntryAsPaid(entryId) {
  if (!confirm("Eintrag als bezahlt markieren?")) return;
  
  try {
    // Firestore-Update für bezahlt markieren
    await db.collection('entries').doc(entryId).update({
      paid: true,
      isPaid: true,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showStatusMessage("✅ Eintrag als bezahlt markiert!", "success");
    
    // Zeile visuell aktualisieren
    const row = document.getElementById(`entry-${entryId}`);
    if (row) {
      const statusCell = row.cells[8]; // Bezahlt-Spalte
      const actionCell = row.cells[9]; // Aktion-Spalte
      
      statusCell.innerHTML = `
        <div style="color: #28a745; font-weight: 600;">✅ Ja</div>
        <div style="font-size: 12px; color: #666;">${new Date().toLocaleDateString('de-DE')}</div>
      `;
      
      actionCell.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 11px; color: #666; text-align: center; margin-bottom: 2px;">Bereits bezahlt</div>
          <button onclick="markEntryAsUnpaid('${entryId}')" 
                  style="background: #ffc107; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;">
            ↩️ Rückgängig
          </button>
          <button onclick="deleteEntry('${entryId}')" 
                  style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;">
            🗑️ Löschen
          </button>
        </div>
      `;
      
      // Zeile kurz hervorheben
      row.style.background = "#d4edda";
      setTimeout(() => row.style.background = "", 2000);
    }
    
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
    showStatusMessage("❌ Fehler beim Markieren: " + error.message, "error");
  }
}

// Eintrag als unbezahlt markieren (Admin-Funktion)
async function markEntryAsUnpaid(entryId) {
  if (!confirm("Eintrag als unbezahlt markieren? (Zahlung rückgängig machen)")) return;
  
  try {
    // Firestore-Update für unbezahlt markieren
    await db.collection('entries').doc(entryId).update({
      paid: false,
      isPaid: false,
      paidAt: null
    });
    
    showStatusMessage("⚠️ Eintrag als unbezahlt markiert!", "success");
    
    // Zeile visuell aktualisieren
    const row = document.getElementById(`entry-${entryId}`);
    if (row) {
      const statusCell = row.cells[8]; // Bezahlt-Spalte
      const actionCell = row.cells[9]; // Aktion-Spalte
      
      statusCell.innerHTML = `<div style="color: #dc3545; font-weight: 600;">❌ Nein</div>`;
      
      actionCell.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <button onclick="markEntryAsPaid('${entryId}')" 
                  style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">
            ✅ Als bezahlt markieren
          </button>
          <button onclick="deleteEntry('${entryId}')" 
                  style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">
            🗑️ Löschen
          </button>
        </div>
      `;
      
      // Zeile kurz hervorheben
      row.style.background = "#f8d7da";
      setTimeout(() => row.style.background = "", 2000);
    }
    
  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
    showStatusMessage("❌ Fehler beim Markieren: " + error.message, "error");
  }
}

// Eintrag löschen (Admin-Funktion)
async function deleteEntry(entryId) {
  if (!confirm("Eintrag wirklich unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden!")) return;
  
  try {
    // Firestore-Löschung
    await db.collection('entries').doc(entryId).delete();
    
    showStatusMessage("🗑️ Eintrag erfolgreich gelöscht!", "success");
    
    // Zeile aus der Tabelle entfernen
    const row = document.getElementById(`entry-${entryId}`);
    if (row) {
      // Fadeout-Effekt
      row.style.transition = "opacity 0.5s ease";
      row.style.opacity = "0";
      setTimeout(() => {
        row.remove();
        // Aktualisiere die Gesamtanzahl
        updateAdminViewCounter();
      }, 500);
    }
    
  } catch (error) {
    console.error('Fehler beim Löschen des Eintrags:', error);
    showStatusMessage("❌ Fehler beim Löschen: " + error.message, "error");
  }
}

// Hilfsfunktion: Admin-Ansicht Zähler aktualisieren
function updateAdminViewCounter() {
  const rows = document.querySelectorAll('#overviewTable tbody tr');
  const counterElement = document.querySelector('[data-admin-counter]');
  if (counterElement) {
    counterElement.textContent = `Alle Einträge • ${rows.length} gesamt`;
  }
}

// Admin-Statistiken anzeigen
async function showAdminStatistics() {
  if (!checkAdminAccess()) return;
  
  showLoading("overviewTable", "Lade Admin-Statistiken...");

  try {
    // Firestore-Abfrage für Admin-Statistiken
    const querySnapshot = await db.collection('entries').get();
    
    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Statistiken berechnen
    const uniqueUsers = new Set();
    entries.forEach(entry => {
      if (entry.name && entry.kennung) {
        uniqueUsers.add(`${entry.name}_${entry.kennung}`);
      }
    });
    
    const stats = {
      totalEntries: entries.length,
      totalUsers: uniqueUsers.size,
      totalMaterialUsage: entries.reduce((sum, entry) => sum + (entry.materialMenge || 0), 0),
      totalMasterbatchUsage: entries.reduce((sum, entry) => sum + (entry.masterbatchMenge || 0), 0),
      totalRevenue: entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
      totalPaidEntries: entries.filter(entry => entry.paid || entry.isPaid).length,
      totalUnpaidEntries: entries.filter(entry => !(entry.paid || entry.isPaid)).length,
      unpaidRevenue: entries.filter(entry => !(entry.paid || entry.isPaid)).reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
      paidRevenue: entries.filter(entry => entry.paid || entry.isPaid).reduce((sum, entry) => sum + (entry.totalCost || 0), 0)
    };
    
    const tableDiv = document.getElementById("overviewTable");
  let html = `
    <div style="margin-bottom: 24px; padding: 16px; background: #FFFF00; border: 2px solid #000000;">
      <div style="font-weight: 600; margin-bottom: 8px;">📊 Admin-Statistiken</div>
      <div style="font-size: 14px; color: #666;">
        Gesamtübersicht aller Nutzer und Einträge
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${stats.totalEntries}</div>
        <div class="stat-label">Gesamt Einträge</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalUsers}</div>
        <div class="stat-label">Aktive Nutzer</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalPaidEntries}</div>
        <div class="stat-label">Bezahlt</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalUnpaidEntries}</div>
        <div class="stat-label">Offen</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalMaterialUsage.toFixed(1)}</div>
        <div class="stat-label">kg Material</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalMasterbatchUsage.toFixed(1)}</div>
        <div class="stat-label">kg Masterbatch</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalRevenue.toFixed(0)}€</div>
        <div class="stat-label">Gesamtumsatz</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.unpaidRevenue.toFixed(0)}€</div>
        <div class="stat-label">Offene Beträge</div>
      </div>
    </div>
  `;
  
  // Top-Nutzer anzeigen
  if (stats.topUsers && stats.topUsers.length > 0) {
    html += `
      <div style="margin-top: 40px;">
        <div style="font-weight: 600; margin-bottom: 16px;">🏆 Top-Nutzer:</div>
        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>FH-Kennung</th>
                <th>Einträge</th>
                <th>Gesamtkosten</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    stats.topUsers.forEach(function(user) {
      html += `
        <tr>
          <td>${user.name}</td>
          <td>${user.kennung}</td>
          <td>${user.entries}</td>
          <td><strong>${user.totalCost.toFixed(2)} €</strong></td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  tableDiv.innerHTML = html;
  
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Statistiken:', error);
    const tableDiv = document.getElementById("overviewTable");
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", "Fehler beim Laden der Statistiken: " + error.message);
  }
}

// Daten exportieren
async function exportData() {
  try {
    showStatusMessage("⏳ Exportiere Daten...", "info");
    
    // Alle Collections exportieren
    const [materialsSnapshot, masterbatchesSnapshot, entriesSnapshot] = await Promise.all([
      db.collection('materials').get(),
      db.collection('masterbatches').get(),
      db.collection('entries').get()
    ]);
    
    const exportObj = {
      materials: [],
      masterbatches: [],
      entries: [],
      exportDate: new Date().toISOString(),
      version: "2.0"
    };
    
    materialsSnapshot.forEach(doc => {
      exportObj.materials.push({ id: doc.id, ...doc.data() });
    });
    
    masterbatchesSnapshot.forEach(doc => {
      exportObj.masterbatches.push({ id: doc.id, ...doc.data() });
    });
    
    entriesSnapshot.forEach(doc => {
      const data = doc.data();
      // Timestamp zu String konvertieren für JSON
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate().toISOString();
      }
      if (data.paidAt && data.paidAt.toDate) {
        data.paidAt = data.paidAt.toDate().toISOString();
      }
      exportObj.entries.push({ id: doc.id, ...data });
    });
    
    const jsonString = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fgf-3d-druck-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatusMessage("✅ Daten erfolgreich exportiert!", "success");
    
  } catch (error) {
    console.error('Fehler beim Exportieren:', error);
    showStatusMessage("❌ Fehler beim Exportieren: " + error.message, "error");
  }
}

// Daten importieren
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          showStatusMessage("⏳ Importiere Daten...", "info");
          
          const importObj = JSON.parse(e.target.result);
          
          // Validierung der Datenstruktur
          if (!importObj.materials || !importObj.masterbatches || !importObj.entries) {
            throw new Error("Ungültige Datenstruktur");
          }
          
          // Batch-Upload für bessere Performance
          const batch = db.batch();
          
          // Materialien importieren
          for (const material of importObj.materials) {
            const docRef = material.id ? db.collection('materials').doc(material.id) : db.collection('materials').doc();
            const { id, ...data } = material;
            batch.set(docRef, data);
          }
          
          // Masterbatches importieren
          for (const masterbatch of importObj.masterbatches) {
            const docRef = masterbatch.id ? db.collection('masterbatches').doc(masterbatch.id) : db.collection('masterbatches').doc();
            const { id, ...data } = masterbatch;
            batch.set(docRef, data);
          }
          
          // Einträge importieren
          for (const entry of importObj.entries) {
            const docRef = entry.id ? db.collection('entries').doc(entry.id) : db.collection('entries').doc();
            const { id, ...data } = entry;
            
            // Timestamp von String zurück zu Firestore-Timestamp konvertieren
            if (data.timestamp && typeof data.timestamp === 'string') {
              data.timestamp = firebase.firestore.Timestamp.fromDate(new Date(data.timestamp));
            }
            if (data.paidAt && typeof data.paidAt === 'string') {
              data.paidAt = firebase.firestore.Timestamp.fromDate(new Date(data.paidAt));
            }
            
            batch.set(docRef, data);
          }
          
          // Batch commit
          await batch.commit();
          
          showStatusMessage("✅ Daten erfolgreich importiert!", "success");
          loadMaterials();
          loadMasterbatches();
          
        } catch (error) {
          console.error('Fehler beim Importieren:', error);
          showStatusMessage("❌ Fehler beim Importieren: " + error.message, "error");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// Firebase-Verbindung testen
async function testFirebaseConnection() {
  try {
    console.log("🔍 Teste Firebase-Verbindung...");
    
    // Teste Firestore-Verbindung
    const testDoc = await db.collection("test").doc("connection").get();
    console.log("✅ Firestore-Verbindung erfolgreich");
    
    // Teste Material-Collection
    const materialSnapshot = await db.collection("materials").limit(1).get();
    console.log("✅ Material-Collection erreichbar:", materialSnapshot.size, "Dokumente");
    
    // Teste Masterbatch-Collection
    const masterbatchSnapshot = await db.collection("masterbatches").limit(1).get();
    console.log("✅ Masterbatch-Collection erreichbar:", masterbatchSnapshot.size, "Dokumente");
    
    showStatusMessage("✅ Firebase-Verbindung erfolgreich!", "success");
    
  } catch (error) {
    console.error("❌ Firebase-Verbindung fehlgeschlagen:", error);
    showStatusMessage("❌ Firebase-Verbindung fehlgeschlagen: " + error.message, "error");
  }
}

// Debug-Funktion für Materialien und Masterbatches
async function debugMaterialsAndMasterbatches() {
  try {
    console.log("🔍 Lade Materialien...");
    const materialSnapshot = await db.collection("materials").get();
    console.log("📊 Materialien gefunden:", materialSnapshot.size);
    
    materialSnapshot.forEach(doc => {
      const material = doc.data();
      console.log("- Material:", material.name, "Preis:", material.price, material.currency || '€');
    });
    
    console.log("🔍 Lade Masterbatches...");
    const masterbatchSnapshot = await db.collection("masterbatches").get();
    console.log("📊 Masterbatches gefunden:", masterbatchSnapshot.size);
    
    masterbatchSnapshot.forEach(doc => {
      const masterbatch = doc.data();
      console.log("- Masterbatch:", masterbatch.name, "Preis:", masterbatch.price, masterbatch.currency || '€');
    });
    
    showStatusMessage("✅ Debug-Informationen in der Konsole!", "success");
    
  } catch (error) {
    console.error("❌ Debug-Fehler:", error);
    showStatusMessage("❌ Debug-Fehler: " + error.message, "error");
  }
}

// Debug-Funktion um alle Einträge zu prüfen
async function debugAllEntries() {
  try {
    console.log("🔍 Lade alle Einträge...");
    const snapshot = await db.collection("entries").get();
    console.log("📊 Einträge gefunden:", snapshot.size);
    
    if (snapshot.empty) {
      console.log("⚠️ Keine Einträge in der Datenbank gefunden");
      showStatusMessage("⚠️ Keine Einträge in der Datenbank gefunden", "error");
      return;
    }
    
    snapshot.forEach(doc => {
      const entry = doc.data();
      console.log("📝 Eintrag:", {
        id: doc.id,
        name: entry.name,
        kennung: entry.kennung,
        material: entry.material,
        masterbatch: entry.masterbatch,
        totalCost: entry.totalCost,
        timestamp: entry.timestamp
      });
    });
    
    showStatusMessage("✅ Debug-Informationen in der Konsole!", "success");
    
  } catch (error) {
    console.error("❌ Debug-Fehler:", error);
    showStatusMessage("❌ Debug-Fehler: " + error.message, "error");
  }
}

// Testdaten-Funktion hinzufügen für leere Firestore-Datenbank
async function addTestData() {
  try {
    console.log("🔄 Füge Testdaten hinzu...");
    
    // Test-Materialien
    const testMaterials = [
      { name: "PLA", price: 25.00, currency: "€" },
      { name: "ABS", price: 28.00, currency: "€" },
      { name: "PETG", price: 32.00, currency: "€" }
    ];
    
    // Test-Masterbatches
    const testMasterbatches = [
      { name: "Rot", price: 45.00, currency: "€" },
      { name: "Blau", price: 45.00, currency: "€" },
      { name: "Grün", price: 45.00, currency: "€" },
      { name: "Schwarz", price: 40.00, currency: "€" }
    ];
    
    // Materialien hinzufügen
    for (const material of testMaterials) {
      await db.collection("materials").add(material);
      console.log("✅ Material hinzugefügt:", material.name);
    }
    
    // Masterbatches hinzufügen
    for (const masterbatch of testMasterbatches) {
      await db.collection("masterbatches").add(masterbatch);
      console.log("✅ Masterbatch hinzugefügt:", masterbatch.name);
    }
    
    showStatusMessage("✅ Testdaten erfolgreich hinzugefügt!", "success");
    
    // Dropdowns neu laden
    loadMaterials();
    loadMasterbatches();
    
  } catch (error) {
    console.error("❌ Fehler beim Hinzufügen von Testdaten:", error);
    showStatusMessage("❌ Fehler beim Hinzufügen von Testdaten: " + error.message, "error");
  }
}

// ==================== HILFSFUNKTIONEN ====================

// Admin-Zugriff prüfen
function checkAdminAccess() {
  const password = prompt("Admin-Passwort eingeben:");
  const adminPassword = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.adminPassword) 
    ? APP_CONFIG.adminPassword 
    : "admin123";
    
  if (password === adminPassword) {
    return true;
  } else {
    alert("Falsches Passwort. Zugang verweigert.");
    return false;
  }
}

// parseGermanNumber wird in core-functions.js definiert

// throttle wird in core-functions.js definiert

// Kostenvorschau berechnen
async function calculateCostPreview() {
  const material = document.getElementById("material").value;
  const materialMenge = document.getElementById("materialMenge").value;
  const masterbatch = document.getElementById("masterbatch").value;
  const masterbatchMenge = document.getElementById("masterbatchMenge").value;
  const preview = document.getElementById("costPreview");
  
  const matMenge = parseGermanNumber(materialMenge);
  const mbMenge = parseGermanNumber(masterbatchMenge);
  
  if ((material && matMenge > 0) || (masterbatch && mbMenge > 0)) {
    preview.querySelector('.cost-amount').textContent = "Berechne...";
    preview.classList.add('show', 'calculating');
    
    try {
      let totalCost = 0;
      
      // Material-Kosten berechnen
      if (material && matMenge > 0) {
        const materialSnapshot = await db.collection("materials").where("name", "==", material).get();
        if (!materialSnapshot.empty) {
          const materialData = materialSnapshot.docs[0].data();
          totalCost += matMenge * materialData.price;
        }
      }
      
      // Masterbatch-Kosten berechnen
      if (masterbatch && mbMenge > 0) {
        const masterbatchSnapshot = await db.collection("masterbatches").where("name", "==", masterbatch).get();
        if (!masterbatchSnapshot.empty) {
          const masterbatchData = masterbatchSnapshot.docs[0].data();
          totalCost += mbMenge * masterbatchData.price;
        }
      }
      
      preview.classList.remove('calculating');
      const formattedCost = totalCost.toFixed(2).replace('.', ',') + ' €';
      preview.querySelector('.cost-amount').textContent = formattedCost;
      preview.classList.add('show');
      
    } catch (error) {
      console.error("Fehler bei Kostenberechnung:", error);
      preview.classList.remove('calculating');
      preview.querySelector('.cost-amount').textContent = "Fehler";
      preview.classList.add('show');
    }
  } else {
    preview.classList.remove('show', 'calculating');
  }
}

// Throttled Kostenberechnung
const throttledCalculateCost = throttle(calculateCostPreview, 500);

// Status-Nachricht wird in core-functions.js definiert

// Lade-Anzeige wird in core-functions.js definiert

// Empty State erstellen
function createEmptyState(icon, title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div>${title}</div>
      <div style="font-size: 14px; margin-top: 8px; opacity: 0.7;">
        ${message}
      </div>
    </div>
  `;
}
