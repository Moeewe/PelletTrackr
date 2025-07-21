// ==================== ENTRY RENDERING MODULE ====================
// Basis-Rendering für User/Admin Entry-Tabellen und Cards

// Paginierung für mobile Cards
let currentUserPage = 1;
let currentAdminPage = 1;
const ENTRIES_PER_PAGE = 5;

// User-Drucke rendern (vollständige Version mit Card + Table)
function renderUserEntries(entries) {
  const tableDiv = document.getElementById("userEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden. Füge deinen ersten 3D-Druck hinzu!</p>';
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
              <th onclick="sortUserEntries('date')">Datum</th>
              <th onclick="sortUserEntries('jobName')">Job</th>
              <th onclick="sortUserEntries('printer')">Drucker</th>
              <th onclick="sortUserEntries('printTime')">Zeit</th>
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

  // Tabellen-Zeilen für Desktop
  entries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
      '<span class="entry-status-badge status-paid">Bezahlt</span>' : 
      '<span class="entry-status-badge status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 30 ? jobNotes.substring(0, 30) + "..." : jobNotes;
    
    // Aktionen für User (Zahlungsnachweis und Bearbeiten)
    const actions = `
      <div class="actions">
        ${ButtonFactory.showNachweis(entry.id, isPaid)}
        ${ButtonFactory.editEntry(entry.id, true, isPaid)}
      </div>`;
    
    // Tabellen-Zeile für Desktop
    containerHtml += `
      <tr class="entry-row">
        <td data-label="Datum"><span class="cell-value">${date}</span></td>
        <td data-label="Job"><span class="cell-value">${jobName}</span></td>
        <td data-label="Drucker"><span class="cell-value">${entry.printer || '-'}</span></td>
        <td data-label="Zeit"><span class="cell-value">${entry.printTime ? entry.printTime + ' min' : '-'}</span></td>
        <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
        <td data-label="Menge"><span class="cell-value">${entry.materialMenge.toFixed(2)} kg</span></td>
        <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
        <td data-label="MB Menge"><span class="cell-value">${entry.masterbatchMenge.toFixed(2)} g</span></td>
        <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
        <td data-label="Status" class="status-cell"><span class="cell-value">${status}</span></td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          <span class="cell-value">
            ${truncatedNotes}
          </span>
        </td>
        <td data-label="Aktionen" class="actions">${actions}</td>
      </tr>
    `;
  });

  containerHtml += `
          </tbody>
        </table>
      </div>
      
      <!-- Mobile Cards mit Paginierung -->
      <div class="entry-cards" id="userEntryCards">
  `;

  // Berechne Paginierung
  const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const startIndex = (currentUserPage - 1) * ENTRIES_PER_PAGE;
  const endIndex = startIndex + ENTRIES_PER_PAGE;
  const currentEntries = entries.slice(startIndex, endIndex);

  // Render nur die aktuellen Einträge
  currentEntries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    // Status Badge
    const statusBadgeClass = isPaid ? 'status-paid' : 'status-unpaid';
    const statusBadgeText = isPaid ? 'BEZAHLT' : 'OFFEN';
    
    // Aktionen für Cards
    const cardActions = `
      ${ButtonFactory.showNachweis(entry.id, isPaid)}
      ${ButtonFactory.editEntry(entry.id, true, isPaid)}
    `;
    
    // Card HTML
    containerHtml += `
      <div class="entry-card">
        <!-- Card Header mit Job-Name und Status -->
        <div class="entry-card-header">
          <h3 class="entry-job-title">${jobName}</h3>
          <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
        </div>
        
        <!-- Card Body mit Detail-Zeilen -->
        <div class="entry-card-body">
          <div class="entry-detail-row">
            <span class="entry-detail-label">Datum</span>
            <span class="entry-detail-value">${date}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Drucker</span>
            <span class="entry-detail-value">${entry.printer || 'Nicht angegeben'}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Zeit</span>
            <span class="entry-detail-value">${entry.printTime ? entry.printTime + ' min' : 'Nicht angegeben'}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Material</span>
            <span class="entry-detail-value">${entry.material}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Menge</span>
            <span class="entry-detail-value">${entry.materialMenge.toFixed(2)} kg</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Masterbatch</span>
            <span class="entry-detail-value">${entry.masterbatch}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">MB Menge</span>
            <span class="entry-detail-value">${entry.masterbatchMenge.toFixed(2)} g</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Kosten</span>
            <span class="entry-detail-value cost-value">${formatCurrency(entry.totalCost)}</span>
          </div>
          
          ${jobNotes ? `
          <div class="entry-detail-row">
            <span class="entry-detail-label">Notizen</span>
            <span class="entry-detail-value notes-value">${jobNotes}</span>
          </div>
          ` : ''}
        </div>
        
        <!-- Card Footer mit Buttons -->
        <div class="entry-card-footer">
          ${cardActions}
        </div>
      </div>
    `;
  });

  // Paginierung Controls
  if (totalPages > 1) {
    containerHtml += `
      <div class="pagination-controls">
        <div class="pagination-info">
          Seite ${currentUserPage} von ${totalPages}
        </div>
        <div class="pagination-buttons">
          ${currentUserPage > 1 ? 
            `<button class="btn btn-secondary" onclick="changeUserPage(${currentUserPage - 1})">Vorherige Seite</button>` : 
            '<button class="btn btn-secondary" disabled>Vorherige Seite</button>'
          }
          ${currentUserPage < totalPages ? 
            `<button class="btn btn-primary" onclick="changeUserPage(${currentUserPage + 1})">Nächste Seite</button>` : 
            '<button class="btn btn-primary" disabled>Nächste Seite</button>'
          }
        </div>
      </div>
    `;
  }

  containerHtml += `
      </div>
    </div>
  `;
  
  tableDiv.innerHTML = containerHtml;
  
  // Check for existing payment requests and update button states
  checkAndUpdatePaymentRequestButtons(entries);
}

// Paginierung Funktionen
function changeUserPage(newPage) {
  currentUserPage = newPage;
  // Re-render mit aktuellen Einträgen
  if (window.currentUserEntries) {
    renderUserEntries(window.currentUserEntries);
  }
}

function changeAdminPage(newPage) {
  currentAdminPage = newPage;
  // Re-render mit aktuellen Einträgen
  if (window.currentAdminEntries) {
    renderAdminEntries(window.currentAdminEntries);
  }
}

// Admin-Drucke rendern (vollständige Version mit Card + Table für Admin)
function renderAdminEntries(entries) {
  const tableDiv = document.getElementById("adminEntriesTable");
  
  if (entries.length === 0) {
    const message = '<p>Noch keine Drucke vorhanden.</p>';
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
              <th onclick="sortAdminEntriesBy('date')">Datum</th>
              <th onclick="sortAdminEntriesBy('name')">Name</th>
              <th onclick="sortAdminEntriesBy('kennung')">Kennung</th>
              <th onclick="sortAdminEntriesBy('jobName')">Job</th>
              <th onclick="sortAdminEntriesBy('printer')">Drucker</th>
              <th onclick="sortAdminEntriesBy('printTime')">Zeit</th>
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

  // Tabellen-Zeilen für Desktop
  entries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
      '<span class="entry-status-badge status-paid">Bezahlt</span>' : 
      '<span class="entry-status-badge status-unpaid">Offen</span>';
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
        ${ButtonFactory.editEntry(entry.id)}
        ${ButtonFactory.deleteEntry(entry.id)}
      </div>
    `;
    
    // Tabellen-Zeile für Desktop
    containerHtml += `
      <tr id="entry-${entry.id}">
        <td data-label="Datum"><span class="cell-value">${date}</span></td>
        <td data-label="Name"><span class="cell-value">${entry.name}</span></td>
        <td data-label="Kennung"><span class="cell-value">${entry.kennung}</span></td>
        <td data-label="Job"><span class="cell-value">${jobName}</span></td>
        <td data-label="Drucker"><span class="cell-value">${entry.printer || '-'}</span></td>
        <td data-label="Zeit"><span class="cell-value">${entry.printTime ? entry.printTime + ' min' : '-'}</span></td>
        <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
        <td data-label="Mat. Menge"><span class="cell-value">${(entry.materialMenge || 0).toFixed(2)} kg</span></td>
        <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
        <td data-label="MB Menge"><span class="cell-value">${(entry.masterbatchMenge || 0).toFixed(2)} kg</span></td>
        <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
        <td data-label="Status"><span class="cell-value">${status}</span></td>
        <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
          <span class="cell-value">
            ${truncatedNotes}
          </span>
        </td>
        <td class="actions" data-label="Aktionen">${actions}</td>
      </tr>
    `;
  });

  containerHtml += `
          </tbody>
        </table>
      </div>
      
      <!-- Mobile Cards für Admin mit Paginierung -->
      <div class="entry-cards" id="adminEntryCards">
  `;

  // Berechne Paginierung für Admin
  const totalAdminPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const startAdminIndex = (currentAdminPage - 1) * ENTRIES_PER_PAGE;
  const endAdminIndex = startAdminIndex + ENTRIES_PER_PAGE;
  const currentAdminEntries = entries.slice(startAdminIndex, endAdminIndex);

  // Card-Struktur für Mobile (Admin mit mehr Feldern)
  currentAdminEntries.forEach(entry => {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    // Status Badge
    const statusBadgeClass = isPaid ? 'status-paid' : 'status-unpaid';
    const statusBadgeText = isPaid ? 'BEZAHLT' : 'OFFEN';
    
    // Admin-Aktionen für Cards
    const cardActions = `
      ${!isPaid ? 
        ButtonFactory.registerPayment(entry.id) :
        `${ButtonFactory.undoPayment(entry.id)}
         ${ButtonFactory.showNachweis(entry.id, true)}`
      }
      ${ButtonFactory.editEntry(entry.id)}
      ${ButtonFactory.deleteEntry(entry.id)}
    `;
    
    // Admin Card HTML (mit Name und Kennung)
    containerHtml += `
      <div class="entry-card" id="entry-card-${entry.id}">
        <!-- Card Header mit Job-Name und Status -->
        <div class="entry-card-header">
          <h3 class="entry-job-title">${jobName}</h3>
          <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
        </div>
        
        <!-- Card Body mit Detail-Zeilen -->
        <div class="entry-card-body">
          <div class="entry-detail-row">
            <span class="entry-detail-label">Datum</span>
            <span class="entry-detail-value">${date}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Name</span>
            <span class="entry-detail-value">${entry.name}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">FH-Kennung</span>
            <span class="entry-detail-value">${entry.kennung}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Drucker</span>
            <span class="entry-detail-value">${entry.printer || 'Nicht angegeben'}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Zeit</span>
            <span class="entry-detail-value">${entry.printTime ? entry.printTime + ' min' : 'Nicht angegeben'}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Material</span>
            <span class="entry-detail-value">${entry.material}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Mat. Menge</span>
            <span class="entry-detail-value">${(entry.materialMenge || 0).toFixed(2)} kg</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Masterbatch</span>
            <span class="entry-detail-value">${entry.masterbatch}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">MB Menge</span>
            <span class="entry-detail-value">${(entry.masterbatchMenge || 0).toFixed(2)} g</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Kosten</span>
            <span class="entry-detail-value cost-value">${formatCurrency(entry.totalCost)}</span>
          </div>
          
          ${jobNotes ? `
          <div class="entry-detail-row">
            <span class="entry-detail-label">Notizen</span>
            <span class="entry-detail-value notes-value">${jobNotes}</span>
          </div>
          ` : ''}
        </div>
        
        <!-- Card Footer mit Admin-Buttons -->
        <div class="entry-card-footer">
          ${cardActions}
        </div>
      </div>
        `;
  });

  // Paginierung Controls für Admin
  if (totalAdminPages > 1) {
    containerHtml += `
      <div class="pagination-controls">
        <div class="pagination-info">
          Seite ${currentAdminPage} von ${totalAdminPages}
        </div>
        <div class="pagination-buttons">
          ${currentAdminPage > 1 ? 
            `<button class="btn btn-secondary" onclick="changeAdminPage(${currentAdminPage - 1})">Vorherige Seite</button>` : 
            '<button class="btn btn-secondary" disabled>Vorherige Seite</button>'
          }
          ${currentAdminPage < totalAdminPages ? 
            `<button class="btn btn-primary" onclick="changeAdminPage(${currentAdminPage + 1})">Nächste Seite</button>` : 
            '<button class="btn btn-primary" disabled>Nächste Seite</button>'
          }
        </div>
      </div>
    `;
  }

  containerHtml += `
        </div>
      </div>
    `;
  
  tableDiv.innerHTML = containerHtml;
}

/**
 * Check for existing payment requests and update button states
 */
async function checkAndUpdatePaymentRequestButtons(entries) {
  if (!entries || !window.currentUser || window.currentUser.isAdmin) return;
  
  // Only check unpaid entries
  const unpaidEntries = entries.filter(entry => !(entry.paid || entry.isPaid));
  
  for (const entry of unpaidEntries) {
    try {
      const requestExists = await checkPaymentRequestExists(entry.id);
      if (requestExists) {
        updatePaymentRequestButton(entry.id, true);
      }
    } catch (error) {
      console.error('Error checking payment request for entry:', entry.id, error);
    }
  }
}
