// ==================== ENTRY RENDERING MODULE ====================
// Basis-Rendering für User/Admin Entry-Tabellen

// User-Drucke rendern (vollständige Version)
function renderUserEntries(entries) {
  const tableDiv = document.getElementById("userEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden. Füge deinen ersten 3D-Druck hinzu!</p>';
    tableDiv.innerHTML = message;
    return;
  }

  // Tabelle erstellen
  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th onclick="sortUserEntries('date')">Datum</th>
          <th onclick="sortUserEntries('jobName')">Job</th>
          <th onclick="sortUserEntries('material')">Material</th>
          <th onclick="sortUserEntries('materialMenge')">Menge</th>
          <th onclick="sortUserEntries('masterbatch')">Masterbatch</th>
          <th onclick="sortUserEntries('masterbatchMenge')">Menge</th>
          <th onclick="sortUserEntries('cost')">Kosten</th>
          <th onclick="sortUserEntries('status')">Status</th>
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
      '<span class="status-paid">Bezahlt</span>' : 
      '<span class="status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 30 ? jobNotes.substring(0, 30) + "..." : jobNotes;
    
    // Aktionen für User (Zahlungsnachweis, Details und Bearbeiten gruppiert)
    const actions = `
      <div class="actions">
        ${ButtonFactory.showNachweis(entry.id, isPaid)}
        ${ButtonFactory.viewDetails(entry.id)}
        ${ButtonFactory.editEntry(entry.id, true)}
      </div>`;
    
    // Responsive Tabellen-Zeile mit Zwei-Zeilen-Layout
    tableHtml += `
      <tr class="entry-row">
        <td data-label="Datum"><span class="cell-value">${date}</span></td>
        <td data-label="Job"><span class="cell-value">${jobName}</span></td>
        <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
        <td data-label="Menge"><span class="cell-value">${entry.materialMenge.toFixed(2)} kg</span></td>
        <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
        <td data-label="MB Menge"><span class="cell-value">${entry.masterbatchMenge.toFixed(2)} kg</span></td>
        <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
        <td data-label="Status" class="status-cell"><span class="cell-value">${status}</span></td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          <span class="cell-value">
            ${truncatedNotes}
            ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
          </span>
        </td>
        <td data-label="Aktionen" class="actions">${actions}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;
  
  tableDiv.innerHTML = tableHtml;
}

// Admin-Drucke rendern (vollständige Version mit allen Admin-Features)
function renderAdminEntries(entries) {
  const tableDiv = document.getElementById("adminEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden.</p>';
    tableDiv.innerHTML = message;
    return;
  }

  // Admin-Tabelle erstellen
  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th onclick="sortAdminEntriesBy('date')">Datum</th>
          <th onclick="sortAdminEntriesBy('name')">Name</th>
          <th onclick="sortAdminEntriesBy('kennung')">Kennung</th>
          <th onclick="sortAdminEntriesBy('jobName')">Job</th>
          <th onclick="sortAdminEntriesBy('material')">Material</th>
          <th onclick="sortAdminEntriesBy('materialMenge')">Mat. Menge</th>
          <th onclick="sortAdminEntriesBy('masterbatch')">Masterbatch</th>
          <th onclick="sortAdminEntriesBy('masterbatchMenge')">MB Menge</th>
          <th onclick="sortAdminEntriesBy('cost')">Kosten</th>
          <th onclick="sortAdminEntriesBy('status')">Status</th>
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
      '<span class="status-paid">Bezahlt</span>' : 
      '<span class="status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 20 ? jobNotes.substring(0, 20) + "..." : jobNotes;
    
    const actions = `
      <div class="actions">
        ${!isPaid ? 
          ButtonFactory.registerPayment(entry.id) :
          `${ButtonFactory.undoPayment(entry.id)}
           ${ButtonFactory.showNachweis(entry.id, true)}`
        }
        ${ButtonFactory.viewDetails(entry.id)}
        ${ButtonFactory.editEntry(entry.id)}
        ${ButtonFactory.deleteEntry(entry.id)}
      </div>
    `;
    
    // Responsive Tabellen-Zeile mit data-label Attributen
    tableHtml += `
      <tr id="entry-${entry.id}">
        <td data-label="Datum"><span class="cell-value">${date}</span></td>
        <td data-label="Name"><span class="cell-value">${entry.name}</span></td>
        <td data-label="Kennung"><span class="cell-value">${entry.kennung}</span></td>
        <td data-label="Job"><span class="cell-value">${jobName}</span></td>
        <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
        <td data-label="Mat. Menge"><span class="cell-value">${(entry.materialMenge || 0).toFixed(2)} kg</span></td>
        <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
        <td data-label="MB Menge"><span class="cell-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span></td>
        <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
        <td data-label="Status"><span class="cell-value">${status}</span></td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          <span class="cell-value">
            ${truncatedNotes}
            ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
          </span>
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
