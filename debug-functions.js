// ==================== DEBUG & TEST FUNKTIONEN ====================

// Preise debuggen
function debugPrices() {
  showLoading("overviewTable", "Debug läuft...");
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log("=== DEBUG ERGEBNIS ===");
      console.log(data);
      
      var tableDiv = document.getElementById("overviewTable");
      
      if (data.success) {
        var html = `
          <div style="font-family: monospace; font-size: 12px; text-align: left; white-space: pre-wrap;">
            <strong>Material-Tabelle:</strong>
            ${JSON.stringify(data.materialData, null, 2)}
            
            <strong>Masterbatch-Tabelle:</strong>
            ${JSON.stringify(data.masterbatchData, null, 2)}
            
            <strong>Verarbeitete Materialien:</strong>
            ${JSON.stringify(data.materials, null, 2)}
            
            <strong>Verarbeitete Masterbatches:</strong>
            ${JSON.stringify(data.masterbatches, null, 2)}
          </div>
        `;
        tableDiv.innerHTML = html;
      } else {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div>Debug fehlgeschlagen</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
              ${data.error}
            </div>
          </div>
        `;
      }
    })
    .withFailureHandler(function(error) {
      console.error("Debug fehlgeschlagen:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Debug fehlgeschlagen</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .debugPrices();
}

// Verbindung testen (alte Methode)
function testConnection() {
  showLoading("overviewTable", "Teste Verbindung...");
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log("Test-Daten:", data);
      var tableDiv = document.getElementById("overviewTable");
      
      if (!data) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div>Keine Daten empfangen</div>
          </div>
        `;
        return;
      }
      
      if (data.success) {
        tableDiv.innerHTML = `
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">✅</div>
              <div class="stat-label">Verbindung OK</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${data.rowCount || 0}</div>
              <div class="stat-label">Zeilen</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${data.columnCount || 0}</div>
              <div class="stat-label">Spalten</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${data.sheetName || 'N/A'}</div>
              <div class="stat-label">Tabellenblatt</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px; color: #6c757d; font-size: 14px;">
            ✅ Verbindung zur Datenbank erfolgreich
          </div>
        `;
      } else {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div>Verbindung fehlgeschlagen</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
              ${data.error || "Unbekannter Fehler"}
            </div>
          </div>
        `;
      }
    })
    .withFailureHandler(function(error) {
      console.error("Test fehlgeschlagen:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Systemfehler beim Test</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .testConnection();
}

// Verbindung mit echten Daten testen (bessere Methode)
function testWithUserData() {
  showLoading("overviewTable", "Teste mit echten Daten...");
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log("Test-Daten mit getUserEntries:", data);
      var tableDiv = document.getElementById("overviewTable");
      
      if (!data) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div>Keine Daten empfangen</div>
          </div>
        `;
        return;
      }
      
      if (data.error) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>Fehler: ${data.error}</div>
          </div>
        `;
        return;
      }
      
      // Zeige Debug-Informationen
      var debugInfo = data.debug || {};
      var html = `
        <div style="margin-bottom: 24px; padding: 16px; background: #FFFF00; border: 2px solid #000000;">
          <div style="font-weight: 600; margin-bottom: 8px;">🔍 Verbindungstest mit echten Daten</div>
          <div style="font-size: 14px; color: #666;">
            Test mit mm123289 Kennung
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${debugInfo.totalRows || 0}</div>
            <div class="stat-label">Gesamt Zeilen</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${debugInfo.filteredRows || 0}</div>
            <div class="stat-label">Gefilterte Zeilen</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${data.entries ? data.entries.length : 0}</div>
            <div class="stat-label">Drucke</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${data.headers ? data.headers.length : 0}</div>
            <div class="stat-label">Spalten</div>
          </div>
        </div>
      `;
      
      // Zeige Beispiel-Daten wenn vorhanden
      if (data.entries && data.entries.length > 0) {
        html += `
          <div style="margin-top: 24px;">
            <div style="font-weight: 600; margin-bottom: 12px; color: #333;">📋 Beispiel-Drucke:</div>
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Name</th>
                    <th>FH-Kennung</th>
                    <th>Material</th>
                    <th>Kosten</th>
                  </tr>
                </thead>
                <tbody>
        `;
        
        // Zeige nur die ersten 3 Drucke
        var maxEntries = Math.min(3, data.entries.length);
        for (var i = 0; i < maxEntries; i++) {
          var entry = data.entries[i];
          html += `
            <tr>
              <td>${entry[0] ? new Date(entry[0]).toLocaleDateString('de-DE') : 'N/A'}</td>
              <td>${entry[1] || 'N/A'}</td>
              <td>${entry[2] || 'N/A'}</td>
              <td>${entry[4] || 'N/A'}</td>
              <td>${entry[10] || 'N/A'}</td>
            </tr>
          `;
        }
        
        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      tableDiv.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      console.error("Test fehlgeschlagen:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Systemfehler beim Test</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .getUserEntries("Test", "mm123289");
}
