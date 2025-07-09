// ==================== ADMIN MANAGEMENT MODULE ====================

/**
 * Admin-Statistiken laden
 */
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

/**
 * Alle Drucke für Admin laden
 */
async function loadAllEntries() {
  try {
    const snapshot = await db.collection("entries").get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      const dateA = a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
      const dateB = b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
      return dateB - dateA;
    });
    
    // Global speichern für Suche und Sortierung
    allAdminEntries = entries;
    
    renderAdminEntries(entries);
    
  } catch (error) {
    console.error("Fehler beim Laden der Admin-Drucke:", error);
    document.getElementById("adminEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
  }
}

/**
 * Admin-Drucke rendern
 */
function renderAdminEntries(entries) {
  const tableContainer = document.getElementById("adminEntriesTable");
  
  if (entries.length === 0) {
    tableContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Keine Einträge gefunden</p>';
    return;
  }
  
  let html = `
    <table class="responsive-table">
      <thead>
        <tr>
          <th class="col-date">Datum</th>
          <th class="col-name">Name</th>
          <th class="col-kennung">Kennung</th>
          <th class="col-material">Material</th>
          <th class="col-weight">Gewicht</th>
          <th class="col-masterbatch">Masterbatch</th>
          <th class="col-job">Job</th>
          <th class="col-cost">Kosten</th>
          <th class="col-status">Status</th>
          <th class="col-actions">Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  entries.forEach(entry => {
    const date = entry.date ? 
      (entry.date.seconds ? new Date(entry.date.seconds * 1000).toLocaleDateString('de-DE') : new Date(entry.date).toLocaleDateString('de-DE')) : 
      'Unbekannt';
    
    const statusBadge = entry.paid ? 
      '<span class="status-badge paid">✅ Bezahlt</span>' : 
      '<span class="status-badge unpaid">❌ Offen</span>';
    
    html += `
      <tr class="${entry.paid ? 'paid' : 'unpaid'}">
        <td data-label="Datum" class="col-date">${date}</td>
        <td data-label="Name" class="col-name">${entry.name || 'N/A'}</td>
        <td data-label="Kennung" class="col-kennung">${entry.kennung || 'N/A'}</td>
        <td data-label="Material" class="col-material">${entry.material || 'N/A'}</td>
        <td data-label="Gewicht" class="col-weight">${entry.weight || 0} kg</td>
        <td data-label="Masterbatch" class="col-masterbatch">${entry.masterbatch || 'Keiner'}</td>
        <td data-label="Job" class="col-job">${entry.jobName || 'Kein Name'}</td>
        <td data-label="Kosten" class="col-cost">${formatCurrency(entry.totalCost || 0)}</td>
        <td data-label="Status" class="col-status">${statusBadge}</td>
        <td class="actions col-actions" data-label="Aktionen">
          <button class="btn btn-sm btn-secondary" onclick="viewEntryDetails('${entry.id}')">Details</button>
          <button class="btn btn-sm btn-primary" onclick="editEntry('${entry.id}')">Bearbeiten</button>
          ${!entry.paid ? 
            `<button class="btn btn-sm btn-success" onclick="markEntryAsPaid('${entry.id}')">Bezahlt</button>` : 
            `<button class="btn btn-sm btn-warning" onclick="markEntryAsUnpaid('${entry.id}')">Unbezahlt</button>`
          }
          <button class="btn btn-sm btn-danger" onclick="deleteEntry('${entry.id}')">Löschen</button>
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  tableContainer.innerHTML = html;
}

/**
 * Entry als bezahlt markieren (Admin)
 */
async function markEntryAsPaid(entryId) {
  if (!currentUser.isAdmin) {
    alert('Nur Admins können Zahlungen verwalten!');
    return;
  }
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: true,
      paidDate: new Date(),
      paidBy: currentUser.kennung
    });
    
    alert('✅ Eintrag als bezahlt markiert!');
    loadAllEntries();
    if (document.getElementById('userEntriesTable')) {
      loadUserEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
    alert('❌ Fehler: ' + error.message);
  }
}

/**
 * Entry als unbezahlt markieren (Admin)
 */
async function markEntryAsUnpaid(entryId) {
  if (!currentUser.isAdmin) {
    alert('Nur Admins können Zahlungen verwalten!');
    return;
  }
  
  try {
    await db.collection('entries').doc(entryId).update({
      paid: false,
      paidDate: null,
      paidBy: null
    });
    
    alert('⚠️ Eintrag als unbezahlt markiert!');
    loadAllEntries();
    if (document.getElementById('userEntriesTable')) {
      loadUserEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
    alert('❌ Fehler: ' + error.message);
  }
}

/**
 * Entry löschen (Admin)
 */
async function deleteEntry(entryId) {
  if (!currentUser.isAdmin) {
    alert('Nur Admins können Einträge löschen!');
    return;
  }
  
  if (!confirm('❌ Soll dieser Eintrag wirklich gelöscht werden?\n\nDiese Aktion kann nicht rückgängig gemacht werden!')) {
    return;
  }
  
  try {
    await db.collection('entries').doc(entryId).delete();
    
    alert('🗑️ Eintrag erfolgreich gelöscht!');
    loadAllEntries();
    if (document.getElementById('userEntriesTable')) {
      loadUserEntries();
    }
    
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('❌ Fehler beim Löschen: ' + error.message);
  }
}

/**
 * User-Manager anzeigen
 */
function showUserManager() {
  if (!checkAdminAccess()) return;
  document.getElementById('userManager').classList.add('active');
  loadUsersForManagement();
}

/**
 * User-Manager schließen
 */
function closeUserManager() {
  document.getElementById('userManager').classList.remove('active');
}

/**
 * Placeholder für User-Management-Funktionen
 * Diese würden in der ursprünglichen Datei implementiert werden
 */
async function loadUsersForManagement() {
  console.log("Loading users for management - to be implemented");
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadAdminStats,
    loadAllEntries,
    renderAdminEntries,
    markEntryAsPaid,
    markEntryAsUnpaid,
    deleteEntry,
    showUserManager,
    closeUserManager,
    loadUsersForManagement
  };
}
