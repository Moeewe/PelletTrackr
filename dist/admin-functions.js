// ==================== ADMIN-FUNKTIONEN ====================

// Admin-Login prüfen
function checkAdminAccess() {
  const password = prompt("Admin-Passwort eingeben:");
  const adminPassword = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.adminPassword) 
    ? APP_CONFIG.adminPassword 
    : "admin123"; // Fallback
    
  if (password === adminPassword) {
    return true;
  } else {
    alert("Falsches Passwort. Zugang verweigert.");
    return false;
  }
}

// Admin-Ansicht: Alle Einträge anzeigen (mit Passwortschutz)
function showAdminView() {
  // Passwortschutz prüfen
  if (!checkAdminAccess()) {
    return;
  }
  
  showLoading("overviewTable", "Lade alle Einträge...");
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log("Admin-Daten empfangen:", data);
      var tableDiv = document.getElementById("overviewTable");
      
      if (!data) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
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
      
      if (!data.entries || data.entries.length === 0) {
        tableDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <div>Keine Einträge vorhanden</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.7;">
              Noch keine 3D-Drucke erfasst
            </div>
          </div>
        `;
        return;
      }

      // Admin-Tabelle mit allen Einträgen erstellen
      var html = `
        <div style="margin-bottom: 24px; padding: 16px; background: #FFFF00; border: 2px solid #000000;">
          <div style="font-weight: 600; margin-bottom: 8px;">🔧 Admin-Ansicht</div>
          <div style="font-size: 14px; color: #666;">
            Alle Einträge • ${data.entries.length} gesamt
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

      // Alle Einträge durchgehen
      data.entries.forEach(function(row, index) {
        if (row && Array.isArray(row)) {
          try {
            // Daten extrahieren
            var date = row[0] ? new Date(row[0]).toLocaleDateString('de-DE') : 'N/A';
            var name = row[1] || 'N/A';
            var kennung = row[2] || 'N/A';
            var material = row[4] || 'N/A';
            var materialMenge = row[6] ? parseFloat(row[6]).toFixed(2) + ' kg' : '0,00 kg';
            var masterbatch = row[7] || 'N/A';
            var masterbatchMenge = row[9] ? parseFloat(row[9]).toFixed(2) + ' kg' : '0,00 kg';
            var kosten = row[10] || 'N/A';
            var bezahlt = row[11] || 'Nein';
            var bezahltDatum = row[12] ? new Date(row[12]).toLocaleDateString('de-DE') : '';
            
            // Status-Anzeige
            var statusHtml = '';
            if (bezahlt === 'Ja') {
              statusHtml = `
                <div style="color: #28a745; font-weight: 600;">✅ Ja</div>
                <div style="font-size: 12px; color: #666;">${bezahltDatum}</div>
              `;
            } else {
              statusHtml = `<div style="color: #dc3545; font-weight: 600;">❌ Nein</div>`;
            }
            
            // Aktion-Button
            var actionHtml = '';
            if (bezahlt !== 'Ja') {
              actionHtml = `
                <button onclick="markAsPaid(${index}, '${name}', '${kennung}', '${row[0]}')" 
                        style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  Als bezahlt markieren
                </button>
              `;
            } else {
              actionHtml = `<div style="color: #666; font-size: 12px;">Bereits bezahlt</div>`;
            }
            
            html += `
              <tr id="entry-${index}">
                <td>${date}</td>
                <td>${name}</td>
                <td>${kennung}</td>
                <td>${material}</td>
                <td>${materialMenge}</td>
                <td>${masterbatch}</td>
                <td>${masterbatchMenge}</td>
                <td><strong>${kosten}</strong></td>
                <td>${statusHtml}</td>
                <td>${actionHtml}</td>
              </tr>
            `;
          } catch (error) {
            console.error("Fehler beim Verarbeiten von Admin-Zeile", index, ":", error);
          }
        }
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
      
      tableDiv.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Laden der Admin-Daten:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Fehler beim Laden der Admin-Ansicht</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .getAllEntries();
}

// Eintrag als bezahlt markieren
function markAsPaid(rowIndex, name, kennung, timestamp) {
  // Bestätigung
  if (!confirm(`Eintrag von ${name} (${kennung}) als bezahlt markieren?`)) {
    return;
  }
  
  // Button während der Verarbeitung deaktivieren
  var button = document.querySelector(`#entry-${rowIndex} button`);
  if (button) {
    button.disabled = true;
    button.textContent = "Wird gespeichert...";
    button.style.background = "#6c757d";
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result && result.success) {
        showStatusMessage("✅ Eintrag als bezahlt markiert!", "success");
        
        // Zeile visuell aktualisieren
        var row = document.getElementById(`entry-${rowIndex}`);
        if (row) {
          var statusCell = row.cells[8]; // Bezahlt-Spalte
          var actionCell = row.cells[9]; // Aktion-Spalte
          
          statusCell.innerHTML = `
            <div style="color: #28a745; font-weight: 600;">✅ Ja</div>
            <div style="font-size: 12px; color: #666;">${new Date().toLocaleDateString('de-DE')}</div>
          `;
          
          actionCell.innerHTML = `<div style="color: #666; font-size: 12px;">Bereits bezahlt</div>`;
          
          // Zeile kurz hervorheben
          row.style.background = "#d4edda";
          setTimeout(function() {
            row.style.background = "";
          }, 2000);
        }
      } else {
        showStatusMessage(
          "❌ Fehler beim Markieren: " + (result.error || "Unbekannter Fehler"),
          "error"
        );
        
        // Button wieder aktivieren
        if (button) {
          button.disabled = false;
          button.textContent = "Als bezahlt markieren";
          button.style.background = "#28a745";
        }
      }
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Markieren als bezahlt:", error);
      showStatusMessage(
        "❌ Systemfehler: " + error.toString(),
        "error"
      );
      
      // Button wieder aktivieren
      if (button) {
        button.disabled = false;
        button.textContent = "Als bezahlt markieren";
        button.style.background = "#28a745";
      }
    })
    .markAsPaid(name, kennung, timestamp);
}

// Admin-Statistiken anzeigen
function showAdminStatistics() {
  // Passwortschutz prüfen
  if (!checkAdminAccess()) {
    return;
  }
  
  showLoading("overviewTable", "Lade Admin-Statistiken...");
  
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
            <div style="font-weight: 600; margin-bottom: 16px; color: #333;">🏆 Top-Nutzer:</div>
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
        
        stats.topUsers.forEach(function(user, index) {
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
      
      // Material-Aufschlüsselung
      if (stats.materialTypes && Object.keys(stats.materialTypes).length > 0) {
        html += `
          <div style="margin-top: 40px;">
            <div style="font-weight: 600; margin-bottom: 16px; color: #333;">📦 Material-Verbrauch:</div>
        `;
        
        for (var material in stats.materialTypes) {
          var usage = stats.materialTypes[material];
          html += `
            <div style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f0f0f0; background: #f8f8f8;">
              <span style="font-weight: 500;">${material}</span>
              <span style="color: #666;">${usage.toFixed(2)} kg</span>
            </div>
          `;
        }
        
        html += `</div>`;
      }
      
      tableDiv.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      console.error("Fehler beim Abrufen der Admin-Statistiken:", error);
      document.getElementById("overviewTable").innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Fehler beim Laden der Admin-Statistiken</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            ${error.toString()}
          </div>
        </div>
      `;
    })
    .getAdminStatistics();
}
