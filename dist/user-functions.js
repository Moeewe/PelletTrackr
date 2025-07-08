// ==================== NUTZER-FUNKTIONEN ====================

// Nutzer-Übersicht anzeigen
function showOverview() {
  var name = document.getElementById("name").value.trim();
  var kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    alert("Bitte Name und FH Kennung eingeben!");
    return;
  }

  // Lade-Anzeige
  showLoading("overviewTable", "Lade deine Einträge...");

  console.log("Rufe getUserEntries auf mit:", name, kennung);
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log("Empfangene Daten:", data);
      var tableDiv = document.getElementById("overviewTable");
      
      // Robuste Null-Prüfung
      if (!data) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div>Keine Daten empfangen</div>
          </div>
        `;
        return;
      }
      
      // Fehlerbehandlung
      if (data.error) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>Fehler: ${data.error}</div>
          </div>
        `;
        return;
      }
      
      // Debug-Informationen in Konsole
      if (data.debug) {
        console.log("Debug Info:", data.debug);
      }
      
      // Prüfe ob Einträge vorhanden sind
      if (!data.entries || data.entries.length === 0) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <div>Noch keine Einträge vorhanden</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.7;">
              Füge deinen ersten 3D-Druck hinzu!
            </div>
          </div>
        `;
        return;
      }

      // Vollständige Tabelle erstellen mit allen relevanten Spalten
      var html = `
        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Material</th>
                <th>Material Menge</th>
                <th>Masterbatch</th>
                <th>MB Menge</th>
                <th>Gesamtkosten</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Datenzeilen hinzufügen
      data.entries.forEach(function(row, index) {
        if (row && Array.isArray(row)) {
          try {
            // Datum formatieren
            var date = row[0] ? new Date(row[0]).toLocaleDateString('de-DE') : 'N/A';
            
            // Daten extrahieren (basierend auf der Spaltenstruktur)
            var material = row[4] || 'N/A';
            var materialMenge = row[6] ? parseFloat(row[6]).toFixed(2) + ' kg' : '0,00 kg';
            var masterbatch = row[7] || 'N/A';
            var masterbatchMenge = row[9] ? parseFloat(row[9]).toFixed(2) + ' kg' : '0,00 kg';
            var kosten = row[10] || 'N/A';
            
            html += `
              <tr>
                <td>${date}</td>
                <td>${material}</td>
                <td>${materialMenge}</td>
                <td>${masterbatch}</td>
                <td>${masterbatchMenge}</td>
                <td><strong>${kosten}</strong></td>
              </tr>
            `;
          } catch (error) {
            console.error("Fehler beim Verarbeiten von Zeile", index, ":", error);
            html += `
              <tr>
                <td colspan="6" style="color: #999; font-style: italic;">
                  Fehler beim Laden der Zeile ${index + 1}
                </td>
              </tr>
            `;
          }
        }
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
      
      // Zusammenfassung hinzufügen
      html += `
        <div style="text-align: center; margin-top: 24px; padding: 16px; background: #f8f8f8; border: 1px solid #e0e0e0;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
            📊 Zusammenfassung
          </div>
          <div style="font-size: 14px; color: #666;">
            ✅ ${data.entries.length} Eintrag${data.entries.length !== 1 ? 'e' : ''} gefunden
          </div>
        </div>
      `;
      
      tableDiv.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Abrufen der Daten:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Fehler beim Laden</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .getUserEntries(name, kennung);
}

// Nutzer-Statistiken anzeigen
function showStatistics() {
  var name = document.getElementById("name").value.trim();
  var kennung = document.getElementById("kennung").value.trim();

  if (!name || !kennung) {
    alert("Bitte Name und FH Kennung eingeben!");
    return;
  }

  showLoading("overviewTable", "Erstelle deine Statistiken...");

  google.script.run
    .withSuccessHandler(function(result) {
      var tableDiv = document.getElementById("overviewTable");
      
      if (!result.success) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>Fehler: ${result.error}</div>
          </div>
        `;
        return;
      }
      
      var stats = result.statistics;
      var html = `
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
        html += `<div style="font-weight: 600; margin-bottom: 12px; color: #333;">Deine Materialien:</div>`;
        for (var material in stats.materialTypes) {
          html += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
              <span style="color: #666;">${material}</span>
              <span style="font-weight: 600;">${stats.materialTypes[material].toFixed(2)} kg</span>
            </div>
          `;
        }
        html += `</div>`;
      }
      
      tableDiv.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Abrufen der Statistiken:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Fehler beim Laden der Statistiken</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .getUserStatistics(name, kennung);
}

// Wrapper-Funktionen für die Buttons
function showUserOverview() {
  var name = document.getElementById("name").value.trim();
  var kennung = document.getElementById("kennung").value.trim();
  
  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }
  
  showOverview();
}

function showUserStatistics() {
  var name = document.getElementById("name").value.trim();
  var kennung = document.getElementById("kennung").value.trim();
  
  if (!name || !kennung) {
    showStatusMessage("⚠️ Bitte erst Name und FH-Kennung eingeben!", "error");
    return;
  }
  
  showStatistics();
}
