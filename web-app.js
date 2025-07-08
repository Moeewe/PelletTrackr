// ==================== WEB-APP FUNKTIONEN ====================

// Globale Variablen
let currentUser = { name: '', kennung: '' };

// App initialisieren
document.addEventListener('DOMContentLoaded', function() {
  loadMaterials();
  loadMasterbatches();
  setupEventListeners();
  showStatusMessage("✅ App bereit zur Nutzung!", "success");
});

// Event Listeners einrichten
function setupEventListeners() {
  // Live-Kostenberechnung
  document.getElementById("materialMenge").addEventListener("input", throttledCalculateCost);
  document.getElementById("masterbatchMenge").addEventListener("input", throttledCalculateCost);
  document.getElementById("material").addEventListener("change", calculateCostPreview);
  document.getElementById("masterbatch").addEventListener("change", calculateCostPreview);
  
  // Eingabevalidierung für deutsche Zahlenformate
  document.getElementById("materialMenge").addEventListener("blur", function() {
    var value = this.value;
    if (value) {
      var parsed = parseGermanNumber(value);
      if (parsed > 0) {
        this.value = parsed.toFixed(2).replace('.', ',');
      }
    }
  });
  
  document.getElementById("masterbatchMenge").addEventListener("blur", function() {
    var value = this.value;
    if (value) {
      var parsed = parseGermanNumber(value);
      if (parsed > 0) {
        this.value = parsed.toFixed(2).replace('.', ',');
      }
    }
  });
}

// Materialien laden
function loadMaterials() {
  const result = dataManager.getMaterials();
  if (result.success) {
    const select = document.getElementById("material");
    select.innerHTML = '<option value="">Material auswählen...</option>';
    
    result.materials.forEach(function(material) {
      const option = document.createElement("option");
      option.value = material.name;
      option.textContent = material.name + " (" + material.price.toFixed(2) + " " + material.currency + "/kg)";
      select.appendChild(option);
    });
  }
}

// Masterbatches laden
function loadMasterbatches() {
  const result = dataManager.getMasterbatches();
  if (result.success) {
    const select = document.getElementById("masterbatch");
    select.innerHTML = '<option value="">Masterbatch auswählen...</option>';
    
    result.masterbatches.forEach(function(masterbatch) {
      const option = document.createElement("option");
      option.value = masterbatch.name;
      option.textContent = masterbatch.name + " (" + masterbatch.price.toFixed(2) + " " + masterbatch.currency + "/kg)";
      select.appendChild(option);
    });
  }
}

// Neuen Eintrag hinzufügen
function addEntry() {
  const name = document.getElementById("name").value.trim();
  const kennung = document.getElementById("kennung").value.trim();
  const material = document.getElementById("material").value.trim();
  const materialMenge = document.getElementById("materialMenge").value.trim();
  const masterbatch = document.getElementById("masterbatch").value.trim();
  const masterbatchMenge = document.getElementById("masterbatchMenge").value.trim();

  // Validierung
  if (!name || !kennung || !material || !materialMenge || !masterbatch || !masterbatchMenge) {
    showStatusMessage("⚠️ Bitte alle Felder ausfüllen!", "error");
    return;
  }

  const materialMengeNum = parseGermanNumber(materialMenge);
  const masterbatchMengeNum = parseGermanNumber(masterbatchMenge);

  if (isNaN(materialMengeNum) || materialMengeNum <= 0) {
    showStatusMessage("⚠️ Bitte eine gültige Materialmenge eingeben!", "error");
    return;
  }

  if (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0) {
    showStatusMessage("⚠️ Bitte eine gültige Masterbatch-Menge eingeben!", "error");
    return;
  }

  showStatusMessage("⏳ Speichere Eintrag...", "info");

  // Eintrag hinzufügen
  const result = dataManager.addEntry(name, kennung, material, materialMengeNum, masterbatch, masterbatchMengeNum);
  
  if (result.success) {
    const formattedCost = result.totalCost.toFixed(2).replace('.', ',') + ' €';
    showStatusMessage("✅ Eintrag gespeichert! Gesamtkosten: " + formattedCost, "success");
    
    // Speichere Nutzerdaten
    currentUser.name = name;
    currentUser.kennung = kennung;
    
    // Formular teilweise zurücksetzen
    clearForm();
    
    // Automatisch Übersicht aktualisieren
    setTimeout(showUserOverview, 1000);
  } else {
    showStatusMessage("❌ Fehler beim Speichern: " + result.error, "error");
  }
}

// Formular zurücksetzen
function clearForm() {
  document.getElementById("material").value = '';
  document.getElementById("materialMenge").value = '';
  document.getElementById("masterbatch").value = '';
  document.getElementById("masterbatchMenge").value = '';
  document.getElementById("costPreview").classList.remove('show');
}

// Nutzer-Übersicht anzeigen
function showUserOverview() {
  const name = document.getElementById("name").value.trim();
  const kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }

  showLoading("overviewTable", "Lade deine Einträge...");

  const result = dataManager.getUserEntries(name, kennung);
  const tableDiv = document.getElementById("overviewTable");
  
  if (!result.success) {
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", result.error);
    return;
  }
  
  if (result.entries.length === 0) {
    tableDiv.innerHTML = createEmptyState("📄", "Noch keine Einträge vorhanden", "Füge deinen ersten 3D-Druck hinzu!");
    return;
  }

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

  result.entries.forEach(function(entry) {
    const date = new Date(entry.timestamp).toLocaleDateString('de-DE');
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
        ✅ ${result.entries.length} Eintrag${result.entries.length !== 1 ? 'e' : ''}
      </div>
    </div>
  `;
  
  tableDiv.innerHTML = html;
}

// Nutzer-Statistiken anzeigen
function showUserStatistics() {
  const name = document.getElementById("name").value.trim();
  const kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }

  showLoading("overviewTable", "Erstelle deine Statistiken...");

  const result = dataManager.getUserStatistics(name, kennung);
  const tableDiv = document.getElementById("overviewTable");
  
  if (!result.success) {
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", result.error);
    return;
  }
  
  const stats = result.statistics;
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
  if (Object.keys(stats.materialTypes).length > 0) {
    html += `<div style="margin-top: 24px;">`;
    html += `<div style="font-weight: 600; margin-bottom: 12px;">Deine Materialien:</div>`;
    for (const material in stats.materialTypes) {
      html += `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          <span>${material}</span>
          <span style="font-weight: 600;">${stats.materialTypes[material].toFixed(2)} kg</span>
        </div>
      `;
    }
    html += `</div>`;
  }
  
  tableDiv.innerHTML = html;
}

// Admin-Ansicht anzeigen
function showAdminView() {
  if (!checkAdminAccess()) return;
  
  showLoading("overviewTable", "Lade alle Einträge...");

  const result = dataManager.getAllEntries();
  const tableDiv = document.getElementById("overviewTable");
  
  if (!result.success) {
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", result.error);
    return;
  }
  
  if (result.entries.length === 0) {
    tableDiv.innerHTML = createEmptyState("📄", "Keine Einträge vorhanden", "Noch keine 3D-Drucke erfasst");
    return;
  }

  // Admin-Tabelle erstellen
  let html = `
    <div style="margin-bottom: 24px; padding: 16px; background: #FFFF00; border: 2px solid #000000;">
      <div style="font-weight: 600; margin-bottom: 8px;">🔧 Admin-Ansicht</div>
      <div style="font-size: 14px; color: #666;">
        Alle Einträge • ${result.entries.length} gesamt
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
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
  `;

  result.entries.forEach(function(entry, index) {
    const date = new Date(entry.timestamp).toLocaleDateString('de-DE');
    const paidDate = entry.paidDate ? new Date(entry.paidDate).toLocaleDateString('de-DE') : '';
    
    let statusHtml = '';
    if (entry.paid) {
      statusHtml = `
        <div style="color: #28a745; font-weight: 600;">✅ Ja</div>
        <div style="font-size: 12px; color: #666;">${paidDate}</div>
      `;
    } else {
      statusHtml = `<div style="color: #dc3545; font-weight: 600;">❌ Nein</div>`;
    }
    
    let actionHtml = '';
    if (!entry.paid) {
      actionHtml = `
        <button onclick="markEntryAsPaid(${entry.id})" 
                style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          Als bezahlt markieren
        </button>
      `;
    } else {
      actionHtml = `<div style="color: #666; font-size: 12px;">Bereits bezahlt</div>`;
    }
    
    html += `
      <tr id="entry-${entry.id}">
        <td>${date}</td>
        <td>${entry.name}</td>
        <td>${entry.kennung}</td>
        <td>${entry.material}</td>
        <td>${entry.materialMenge.toFixed(2)} kg</td>
        <td>${entry.masterbatch}</td>
        <td>${entry.masterbatchMenge.toFixed(2)} kg</td>
        <td><strong>${entry.totalCost.toFixed(2).replace('.', ',')} €</strong></td>
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
}

// Eintrag als bezahlt markieren
function markEntryAsPaid(entryId) {
  if (!confirm("Eintrag als bezahlt markieren?")) return;
  
  const result = dataManager.markAsPaid(entryId);
  
  if (result.success) {
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
      
      actionCell.innerHTML = `<div style="color: #666; font-size: 12px;">Bereits bezahlt</div>`;
      
      // Zeile kurz hervorheben
      row.style.background = "#d4edda";
      setTimeout(() => row.style.background = "", 2000);
    }
  } else {
    showStatusMessage("❌ Fehler beim Markieren: " + result.error, "error");
  }
}

// Admin-Statistiken anzeigen
function showAdminStatistics() {
  if (!checkAdminAccess()) return;
  
  showLoading("overviewTable", "Lade Admin-Statistiken...");

  const result = dataManager.getAdminStatistics();
  const tableDiv = document.getElementById("overviewTable");
  
  if (!result.success) {
    tableDiv.innerHTML = createEmptyState("⚠️", "Fehler", result.error);
    return;
  }
  
  const stats = result.statistics;
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
}

// Daten exportieren
function exportData() {
  const exportData = dataManager.exportData();
  if (exportData) {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fgf-3d-druck-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatusMessage("✅ Daten erfolgreich exportiert!", "success");
  } else {
    showStatusMessage("❌ Fehler beim Exportieren!", "error");
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
      reader.onload = function(e) {
        const result = dataManager.importData(e.target.result);
        if (result.success) {
          showStatusMessage("✅ Daten erfolgreich importiert!", "success");
          loadMaterials();
          loadMasterbatches();
        } else {
          showStatusMessage("❌ Fehler beim Importieren: " + result.error, "error");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
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

// Deutsche Zahlenformate parsen
function parseGermanNumber(value) {
  if (!value || value === '') return 0;
  const cleaned = value.toString().replace(/[^\d,.-]/g, '');
  const normalizedValue = cleaned.replace(',', '.');
  const parsedValue = parseFloat(normalizedValue);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Throttle-Funktion
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// Kostenvorschau berechnen
function calculateCostPreview() {
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
    
    const result = dataManager.calculateCost(material || "", matMenge, masterbatch || "", mbMenge);
    
    preview.classList.remove('calculating');
    if (result.success) {
      const formattedCost = result.totalCost.toFixed(2).replace('.', ',') + ' €';
      preview.querySelector('.cost-amount').textContent = formattedCost;
      preview.classList.add('show');
    } else {
      preview.querySelector('.cost-amount').textContent = "Fehler";
      preview.classList.add('show');
    }
  } else {
    preview.classList.remove('show', 'calculating');
  }
}

// Throttled Kostenberechnung
const throttledCalculateCost = throttle(calculateCostPreview, 150);

// Status-Nachricht anzeigen
function showStatusMessage(message, type = 'info') {
  const confirmation = document.getElementById("confirmation");
  confirmation.className = `status-message status-${type}`;
  confirmation.innerHTML = message;
  
  setTimeout(() => {
    confirmation.innerHTML = '';
    confirmation.className = '';
  }, 5000);
}

// Lade-Anzeige
function showLoading(elementId, message = 'Laden...') {
  const element = document.getElementById(elementId);
  element.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      ${message}
    </div>
  `;
}

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
