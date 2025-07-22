// ==================== USER MANAGEMENT SYSTEM ====================
// Version 1.5 - Replaced all browser dialogs with toast notifications

function showUserManager() {
  if (!window.checkAdminAccess()) return;
  document.getElementById('userManager').classList.add('active');
  loadUsersForManagement();
}

function closeUserManager() {
  document.getElementById('userManager').classList.remove('active');
}

async function loadUsersForManagement() {
  try {
    console.log("🔄 Lade Benutzer für Verwaltung...");
    
    // Check if Firebase is available
    if (!window.db) {
      console.error("❌ Firebase nicht verfügbar beim Laden der Benutzer");
      document.getElementById("usersTable").innerHTML = '<p>Datenbankverbindung nicht verfügbar. Bitte laden Sie die Seite neu.</p>';
      return;
    }
    
    console.log("✅ Firebase verfügbar, starte Benutzerladevorgang...");
    
    // 1. Benutzerinformationen aus users-Sammlung laden (Primärquelle)
    console.log("🔍 Versuche users-Sammlung zu laden...");
    const usersSnapshot = await window.safeFirebaseOp(
      () => window.db.collection("users").get(),
      3 // Max 3 retry attempts
    );
    const usersData = new Map();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersData.set(userData.kennung, {
        docId: doc.id,
        ...userData
      });
    });
    
    console.log(`📊 Users Collection: ${usersData.size} registrierte Benutzer gefunden`);
    
    // 2. Alle Einträge laden, um Statistiken zu berechnen
    console.log("🔍 Versuche entries-Sammlung zu laden...");
    const entriesSnapshot = await window.safeFirebaseOp(
      () => window.db.collection("entries").get(),
      3 // Max 3 retry attempts
    );
    const entriesData = new Map();
    
    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      if (!entriesData.has(entry.kennung)) {
        entriesData.set(entry.kennung, []);
      }
      entriesData.get(entry.kennung).push({
        id: doc.id,
        ...entry
      });
    });
    
    console.log(`📊 Entries Collection: ${entriesSnapshot.size} Einträge für ${entriesData.size} verschiedene Benutzer gefunden`);
    
    // 3. Benutzer-Daten zusammenführen - NUR registrierte Benutzer
    const userMap = new Map();
    
    // Nur registrierte Benutzer aus users-Collection verarbeiten
    usersData.forEach((userData, kennung) => {
      const entries = entriesData.get(kennung) || [];
      
      // Statistiken berechnen
      let totalCost = 0;
      let paidAmount = 0;
      let unpaidAmount = 0;
      let firstEntry = null;
      let lastEntry = null;
      
      entries.forEach(entry => {
        totalCost += entry.totalCost || 0;
        if (entry.paid || entry.isPaid) {
          paidAmount += entry.totalCost || 0;
        } else {
          unpaidAmount += entry.totalCost || 0;
        }
        
        const entryDate = entry.timestamp ? (entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp)) : new Date();
        if (!firstEntry || entryDate < firstEntry) firstEntry = entryDate;
        if (!lastEntry || entryDate > lastEntry) lastEntry = entryDate;
      });
      
      userMap.set(kennung, {
        docId: userData.docId,
        name: userData.name,
        kennung: userData.kennung,
        email: userData.email || `${userData.kennung}@fh-muenster.de`,
        phone: userData.phone || '',
        isAdmin: userData.isAdmin || false,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        entries: entries,
        totalCost: totalCost,
        paidAmount: paidAmount,
        unpaidAmount: unpaidAmount,
        firstEntry: firstEntry,
        lastEntry: lastEntry
      });
    });
    
    // 4. Warnung für Legacy-Daten anzeigen, aber nicht zu userMap hinzufügen
    const legacyUsers = [];
    entriesData.forEach((entries, kennung) => {
      if (!userMap.has(kennung)) {
        legacyUsers.push({
          kennung: kennung,
          entriesCount: entries.length,
          firstEntryName: entries[0]?.name || 'Unbekannt'
        });
      }
    });
    
    if (legacyUsers.length > 0) {
      console.warn(`⚠️ ${legacyUsers.length} Legacy-Benutzer mit Einträgen aber ohne users-Eintrag gefunden:`);
      legacyUsers.forEach(legacy => {
        console.warn(`  - ${legacy.kennung} (${legacy.entriesCount} Einträge, Name: ${legacy.firstEntryName})`);
      });
    }
    
    const users = Array.from(userMap.values());
    
    // Nach letztem Login sortieren (neueste zuerst)
    users.sort((a, b) => {
      const aDate = a.lastLogin || a.lastEntry || a.createdAt || new Date(0);
      const bDate = b.lastLogin || b.lastEntry || b.createdAt || new Date(0);
      return bDate - aDate;
    });
    
    // Global speichern für Suche und Sortierung
    window.allUsers = users;
    
    console.log(`✅ ${users.length} registrierte Benutzer geladen (${legacyUsers.length} Legacy-Benutzer ignoriert)`);
    console.log('🔍 User Data Sample:', users.slice(0, 2)); // Debug: Show first 2 users
    
    // Debug: Check for phone numbers
    const usersWithPhone = users.filter(user => user.phone && user.phone.trim() !== '');
    console.log(`📱 ${usersWithPhone.length} Benutzer mit Handynummer:`, usersWithPhone.map(u => ({ kennung: u.kennung, phone: u.phone })));
    
    // Debug: Show all users and their phone data
    console.log('🔍 Alle Benutzer mit Telefonnummer-Daten:', users.map(u => ({
      kennung: u.kennung,
      name: u.name,
      phone: u.phone,
      phoneType: typeof u.phone,
      phoneLength: u.phone ? u.phone.length : 0
    })));
    
    renderUsersTable(users);
    
  } catch (error) {
    console.error("❌ Fehler beim Laden der Benutzer:", error);
    let errorMessage = 'Unbekannter Fehler beim Laden der Benutzer.';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'Zugriff auf die Benutzerdaten verweigert. Bitte überprüfen Sie Ihre Berechtigung.';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Datenbankverbindung unterbrochen. Bitte versuchen Sie es später erneut.';
    } else if (error.message.includes('users')) {
      errorMessage = 'Fehler beim Laden der Benutzer-Sammlung. Möglicherweise existiert die Sammlung noch nicht.';
    } else if (error.message.includes('entries')) {
      errorMessage = 'Fehler beim Laden der Einträge-Sammlung.';
    }
    
    document.getElementById("usersTable").innerHTML = `
      <div class="error-message">
        <p><strong>Fehler:</strong> ${errorMessage}</p>
        <p><strong>Details:</strong> ${error.message}</p>
        <button class="btn btn-primary" onclick="retryUserLoad()">Erneut versuchen</button>
      </div>
    `;
  }
}

function renderUsersTable(users) {
  const tableDiv = document.getElementById("usersTable");
  
  // Use window.allUsers if no users parameter provided
  if (!users && window.allUsers) {
    users = window.allUsers;
  }
  
  if (!users || users.length === 0) {
    tableDiv.innerHTML = '<p>Keine Benutzer gefunden.</p>';
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
              <th onclick="sortUsersBy('name')">Name</th>
              <th onclick="sortUsersBy('kennung')">FH-Kennung</th>
              <th onclick="sortUsersBy('email')">E-Mail</th>
              <th onclick="sortUsersBy('phone')">Handynummer</th>
              <th onclick="sortUsersBy('isAdmin')">Admin</th>
              <th onclick="sortUsersBy('entries')">Drucke</th>
              <th onclick="sortUsersBy('totalCost')">Gesamtkosten</th>
              <th onclick="sortUsersBy('paidAmount')">Bezahlt</th>
              <th onclick="sortUsersBy('unpaidAmount')">Offen</th>
              <th onclick="sortUsersBy('status')">Status</th>
              <th onclick="sortUsersBy('lastEntry')">Letzter Druck</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  users.forEach(user => {
    const lastEntryDate = user.lastEntry ? user.lastEntry.toLocaleDateString('de-DE') : 'Keine Drucke';
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    
    // Admin Checkbox
    const adminCheckbox = `
      <label class="admin-checkbox">
        <input type="checkbox" ${user.isAdmin ? 'checked' : ''} 
               onchange="toggleAdminStatus('${user.kennung}', this.checked)">
      </label>
    `;
    
    // Status Badge für Desktop-Tabelle - Nutzer ohne Drucke als "aktiv" markieren
    let statusBadge;
    if (user.entries.length === 0) {
      statusBadge = '<span class="entry-status-badge status-new">NEU</span>';
    } else if (user.unpaidAmount > 0) {
      statusBadge = '<span class="entry-status-badge status-unpaid">OFFEN</span>';
    } else {
      statusBadge = '<span class="entry-status-badge status-paid">BEZAHLT</span>';
    }
    
    // Tabellen-Zeile für Desktop
    containerHtml += `
      <tr>
        <td><span class="cell-value">${user.name}</span></td>
        <td><span class="cell-value">${user.kennung}</span></td>
        <td><span class="cell-value">${email}</span></td>
        <td><span class="cell-value">${user.phone && user.phone.trim() !== '' ? user.phone : '-'}</span></td>
        <td>${adminCheckbox}</td>
        <td><span class="cell-value">${user.entries.length}</span></td>
        <td><span class="cell-value"><strong>${window.formatCurrency(user.totalCost)}</strong></span></td>
        <td><span class="cell-value">${window.formatCurrency(user.paidAmount)}</span></td>
        <td><span class="cell-value">${window.formatCurrency(user.unpaidAmount)}</span></td>
        <td>${statusBadge}</td>
        <td><span class="cell-value">${lastEntryDate}</span></td>
        <td class="actions">
          <div class="entry-actions">
            ${ButtonFactory.editUser(user.kennung)}
            ${user.unpaidAmount > 0 ? ButtonFactory.sendReminder(user.kennung) : ''}
            ${user.unpaidAmount > 0 ? ButtonFactory.sendUrgentReminder(user.kennung) : ''}
            ${ButtonFactory.deleteUser(user.kennung)}
          </div>
        </td>
      </tr>
    `;
  });
  
  containerHtml += `
          </tbody>
        </table>
      </div>
      
      <!-- Mobile Cards -->
      <div class="entry-cards">
  `;

  // Card-Struktur für Mobile
  users.forEach(user => {
    const lastEntryDate = user.lastEntry ? user.lastEntry.toLocaleDateString('de-DE') : 'Keine Drucke';
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    
    // Admin Checkbox für Mobile
    const adminCheckbox = `
      <label class="admin-checkbox">
        <input type="checkbox" ${user.isAdmin ? 'checked' : ''} 
               onchange="toggleAdminStatus('${user.kennung}', this.checked)">

      </label>
    `;
    
    // Status Badge basierend auf offenen Beträgen und Entry-Status
    let statusBadgeClass, statusBadgeText;
    if (user.entries.length === 0) {
      statusBadgeClass = 'status-new';
      statusBadgeText = 'NEU';
    } else if (user.unpaidAmount > 0) {
      statusBadgeClass = 'status-unpaid';
      statusBadgeText = 'OFFEN';
    } else {
      statusBadgeClass = 'status-paid';
      statusBadgeText = 'BEZAHLT';
    }
    
    containerHtml += `
      <div class="entry-card">
        <!-- Card Header mit User-Name und Status -->
        <div class="entry-card-header">
          <h3 class="entry-job-title">${user.name}</h3>
          <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
        </div>
        
        <!-- Card Body mit Detail-Zeilen -->
        <div class="entry-card-body">
          <div class="entry-detail-row">
            <span class="entry-detail-label">FH-Kennung</span>
            <span class="entry-detail-value">${user.kennung}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">E-Mail</span>
            <span class="entry-detail-value">${email}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Handynummer</span>
            <span class="entry-detail-value">${user.phone && user.phone.trim() !== '' ? user.phone : '-'}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Admin</span>
            <span class="entry-detail-value">${adminCheckbox}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Anzahl Drucke</span>
            <span class="entry-detail-value">${user.entries.length}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Gesamtkosten</span>
            <span class="entry-detail-value cost-value">${window.formatCurrency(user.totalCost)}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Bezahlt</span>
            <span class="entry-detail-value">${window.formatCurrency(user.paidAmount)}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Offen</span>
            <span class="entry-detail-value ${user.unpaidAmount > 0 ? 'cost-value' : ''}">${window.formatCurrency(user.unpaidAmount)}</span>
          </div>
          
          <div class="entry-detail-row">
            <span class="entry-detail-label">Letzter Druck</span>
            <span class="entry-detail-value">${lastEntryDate}</span>
          </div>
        </div>
        
        <!-- Card Footer mit Admin-Buttons -->
        <div class="entry-card-footer">
          ${ButtonFactory.editUser(user.kennung)}
          ${user.unpaidAmount > 0 ? ButtonFactory.sendReminder(user.kennung) : ''}
          ${user.unpaidAmount > 0 ? ButtonFactory.sendUrgentReminder(user.kennung) : ''}
          ${ButtonFactory.deleteUser(user.kennung)}
        </div>
      </div>
    `;
  });
  
  containerHtml += `
      </div>
    </div>
  `;
  
  tableDiv.innerHTML = containerHtml;
}

// ==================== SORTING & SEARCHING ====================

function sortUsersBy(field) {
  if (!window.allUsers) return;
  
  // Toggle sort direction
  if (!window.userSortState) window.userSortState = {};
  const currentDirection = window.userSortState[field] || 'asc';
  const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
  window.userSortState[field] = newDirection;
  
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
      case 'email':
        aVal = (a.email || `${a.kennung}@fh-muenster.de`).toLowerCase();
        bVal = (b.email || `${b.kennung}@fh-muenster.de`).toLowerCase();
        break;
      case 'isAdmin':
        aVal = a.isAdmin ? 1 : 0;
        bVal = b.isAdmin ? 1 : 0;
        break;
      case 'entries':
        aVal = a.entries.length;
        bVal = b.entries.length;
        break;
      case 'totalCost':
        aVal = a.totalCost;
        bVal = b.totalCost;
        break;
      case 'paidAmount':
        aVal = a.paidAmount;
        bVal = b.paidAmount;
        break;
      case 'unpaidAmount':
        aVal = a.unpaidAmount;
        bVal = b.unpaidAmount;
        break;
      case 'lastEntry':
        aVal = a.lastEntry ? a.lastEntry.getTime() : 0; // Nutzer ohne Entries ganz unten
        bVal = b.lastEntry ? b.lastEntry.getTime() : 0;
        break;
      default:
        return 0;
    }
    
    if (newDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
  
  renderUsersTable(sortedUsers);
}

function searchUsers() {
  if (!window.allUsers) return;

  const searchTerm = document.getElementById('userManagerSearchInput').value.toLowerCase();

  const filteredUsers = window.allUsers.filter(user => {
    const email = user.email || `${user.kennung || ''}@fh-muenster.de`;
    const userName = user.name || '';
    const userKennung = user.kennung || '';
    
    return userName.toLowerCase().includes(searchTerm) ||
           userKennung.toLowerCase().includes(searchTerm) ||
           email.toLowerCase().includes(searchTerm);
  });

  renderUsersTable(filteredUsers);
}

// ==================== ADMIN STATUS TOGGLE ====================

/**
 * Toggle admin status for a user
 */
async function toggleAdminStatus(kennung, isAdmin) {
  try {
    const user = window.allUsers.find(u => u.kennung === kennung);
    if (!user) {
      toast.error('Benutzer nicht gefunden');
      return;
    }
    
    // Update in database
    await window.db.collection('users').doc(user.docId).update({
      isAdmin: isAdmin,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update local data
    user.isAdmin = isAdmin;
    
    // Update checkbox label
    const checkboxLabel = document.querySelector(`input[onchange*="'${kennung}'"]`).nextElementSibling;
    if (checkboxLabel) {
      checkboxLabel.textContent = isAdmin ? 'Admin' : 'User';
    }
    
    toast.success(`${user.name} ${isAdmin ? 'als Admin' : 'als User'} markiert`);
    
  } catch (error) {
    console.error('Error toggling admin status:', error);
    toast.error('Fehler beim Aktualisieren des Admin-Status');
    
    // Revert checkbox state on error
    const checkbox = document.querySelector(`input[onchange*="'${kennung}'"]`);
    if (checkbox) {
      checkbox.checked = !isAdmin;
    }
  }
}

// ==================== USER DETAILS & ACTIONS ====================

function showUserDetails(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    window.toast.error('Benutzer nicht gefunden!');
    return;
  }
  
  const modalHtml = `
    <div class="modal-header">
      <h2>${user.name}</h2>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-body">
          <div class="detail-row">
            <span class="detail-label">FH-KENNUNG</span>
            <span class="detail-value">${user.kennung}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">ERSTER DRUCK</span>
            <span class="detail-value">${user.firstEntry.toLocaleDateString('de-DE')}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">LETZTER DRUCK</span>
            <span class="detail-value">${user.lastEntry.toLocaleDateString('de-DE')}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">ANZAHL DRUCKE</span>
            <span class="detail-value">${user.entries.length}</span>
          </div>
          
          <div class="detail-row highlight-total">
            <span class="detail-label">GESAMTKOSTEN:</span>
            <span class="detail-value">${window.formatCurrency(user.totalCost)}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">BEZAHLT</span>
            <span class="detail-value">${window.formatCurrency(user.paidAmount)}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">OFFEN</span>
            <span class="detail-value">${window.formatCurrency(user.unpaidAmount)}</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="button-group">
            ${ButtonFactory.closeModal()}
          </div>
        </div>
      </div>
    </div>
  `;
  
  window.showModalWithContent(modalHtml);
}

function sendPaymentReminder(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    window.toast.error('Benutzer nicht gefunden!');
    return;
  }
  
  if (user.unpaidAmount <= 0) {
    window.toast.info('Dieser Benutzer hat keine offenen Beträge.');
    return;
  }
  
  const subject = encodeURIComponent(`Zahlungserinnerung - FGF 3D-Druck Service | ${user.name}`);
  const openEntries = user.entries.filter(e => !(e.paid || e.isPaid));
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  // Professionelle E-Mail Vorlage im Zahlungsnachweis-Stil
  const body = encodeURIComponent(`Sehr geehrte/r ${user.name},

═════════════════════════════════════════════════════════
               ZAHLUNGSERINNERUNG - FGF 3D-DRUCK SERVICE
═════════════════════════════════════════════════════════

Datum: ${currentDate}
FH-Kennung: ${user.kennung}
E-Mail: ${user.email || `${user.kennung}@fh-muenster.de`}

─────────────────────────────────────────────────────────
OFFENE DRUCKAUFTRÄGE
─────────────────────────────────────────────────────────

${openEntries.map((entry, index) => {
  const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
  const jobName = entry.jobName || '3D-Druck Auftrag';
  const material = entry.material || 'Material';
  const amount = entry.materialMenge ? `${entry.materialMenge.toFixed(2)} kg` : 'N/A';
  
  return `${index + 1}. ${jobName}
   Datum: ${date}
   Material: ${material} (${amount})
   Betrag: ${window.formatCurrency(entry.totalCost)}`;
}).join('\n\n')}

─────────────────────────────────────────────────────────
ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Anzahl offener Drucke: ${openEntries.length}
Bereits bezahlt: ${window.formatCurrency(user.paidAmount)}

GESAMTBETRAG OFFEN: ${window.formatCurrency(user.unpaidAmount)}

═════════════════════════════════════════════════════════
ZAHLUNGSHINWEIS
═════════════════════════════════════════════════════════

Bitte überweisen Sie den offenen Betrag zeitnah. Bei Fragen 
oder Zahlungsschwierigkeiten wenden Sie sich gerne an das 
FGF Team.

Nach erfolgter Zahlung erhalten Sie automatisch einen 
Zahlungsnachweis über das PelletTrackr System.

─────────────────────────────────────────────────────────
Mit freundlichen Grüßen
FGF 3D-Druck Service Team
Fachhochschule Münster

Diese E-Mail wurde automatisch generiert von PelletTrackr
Generiert am: ${currentDate}
═════════════════════════════════════════════════════════`);
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

function sendUrgentReminder(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    window.toast.error('Benutzer nicht gefunden!');
    return;
  }
  
  if (user.unpaidAmount <= 0) {
    window.toast.info('Dieser Benutzer hat keine offenen Beträge.');
    return;
  }
  
  const subject = encodeURIComponent(`DRINGENDE MAHNUNG - FGF 3D-Druck Service | ${user.name}`);
  const openEntries = user.entries.filter(e => !(e.paid || e.isPaid));
  const currentDate = new Date().toLocaleDateString('de-DE');
  const oldestEntry = openEntries.reduce((oldest, entry) => {
    const entryDate = entry.timestamp ? entry.timestamp.toDate() : new Date();
    const oldestDate = oldest.timestamp ? oldest.timestamp.toDate() : new Date();
    return entryDate < oldestDate ? entry : oldest;
  }, openEntries[0]);
  
  const daysSinceOldest = oldestEntry ? Math.floor((new Date() - (oldestEntry.timestamp ? oldestEntry.timestamp.toDate() : new Date())) / (1000 * 60 * 60 * 24)) : 0;
  
  // Dringende Mahnung mit professionellem Ton
  const body = encodeURIComponent(`Sehr geehrte/r ${user.name},

═════════════════════════════════════════════════════════
                   DRINGENDE ZAHLUNGSMAHNUNG
                    FGF 3D-Druck Service
═════════════════════════════════════════════════════════

WICHTIGER HINWEIS: ZAHLUNGSRÜCKSTAND

Datum: ${currentDate}
FH-Kennung: ${user.kennung}
E-Mail: ${user.email || `${user.kennung}@fh-muenster.de`}

─────────────────────────────────────────────────────────
ZAHLUNGSRÜCKSTAND INFORMATION
─────────────────────────────────────────────────────────

Ältester offener Eintrag: ${daysSinceOldest} Tage überfällig
Status: Erste Zahlungserinnerung bereits versendet

OFFENE DRUCKAUFTRÄGE (${openEntries.length} Stück):

${openEntries.map((entry, index) => {
  const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
  const jobName = entry.jobName || '3D-Druck Auftrag';
  const material = entry.material || 'Material';
  const amount = entry.materialMenge ? `${entry.materialMenge.toFixed(2)} kg` : 'N/A';
  const daysOld = entry.timestamp ? Math.floor((new Date() - entry.timestamp.toDate()) / (1000 * 60 * 60 * 24)) : 0;
  
  return `${index + 1}. ${jobName} (${daysOld} Tage alt)
   Datum: ${date}
   Material: ${material} (${amount})
   Betrag: ${window.formatCurrency(entry.totalCost)}`;
}).join('\n\n')}

─────────────────────────────────────────────────────────
FINANZIELLE ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Bereits bezahlt: ${window.formatCurrency(user.paidAmount)}
Anzahl offener Drucke: ${openEntries.length}

GESAMTBETRAG ÜBERFÄLLIG: ${window.formatCurrency(user.unpaidAmount)}

═════════════════════════════════════════════════════════
SOFORTIGE ZAHLUNG ERFORDERLICH
═════════════════════════════════════════════════════════

Bitte begleichen Sie den überfälligen Betrag umgehend.

Bei weiterer Zahlungsverzögerung können folgende 
Maßnahmen eingeleitet werden:
• Sperrung des 3D-Druck Services
• Weiterleitung an die Verwaltung
• Zusätzliche Verwaltungsgebühren

Zahlungshinweis:
1. Überweisung des Gesamtbetrags
2. Bei Fragen: Kontakt mit dem FGF Team
3. Zahlungsnachweis wird automatisch erstellt

─────────────────────────────────────────────────────────
DRINGENDER KONTAKT
─────────────────────────────────────────────────────────

Bei Zahlungsschwierigkeiten oder Fragen kontaktieren Sie 
umgehend das FGF Team zur Klärung der Situation.

FGF 3D-Druck Service Team
Fachhochschule Münster

DRINGENDE MAHNUNG - Generiert am: ${currentDate}
═════════════════════════════════════════════════════════`);
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

async function deleteUser(kennung) {
  if (!window.checkAdminAccess()) return;
  
  // Show confirmation toast instead of browser dialog
  window.toast.info('Benutzer wird gelöscht...');
  
  // Small delay to show the info message
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Alle Einträge des Benutzers abrufen
    const entriesSnapshot = await window.db.collection('entries').where('kennung', '==', kennung).get();
    
    // Batch-Delete für alle Einträge
    const batch = window.db.batch();
    entriesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Benutzer-Dokument löschen
    const userSnapshot = await window.db.collection('users').where('kennung', '==', kennung).get();
    if (!userSnapshot.empty) {
      userSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    
    await batch.commit();
    
    window.toast.success('Benutzer und alle zugehörigen Daten wurden gelöscht.');
    loadUsersForManagement();
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    window.toast.error('Fehler beim Löschen: ' + error.message);
  }
}

// ==================== USER EDITING ====================

async function editUser(kennung) {
  if (!window.checkAdminAccess()) return;
  
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    window.toast.error('Benutzer nicht gefunden!');
    return;
  }
  
  // Erst das User-Manager-Modal schließen (wie bei Material/Masterbatch)
  document.getElementById('userManager').classList.remove('active');
  
  // Direkt das Edit-Modal öffnen
  showEditUserForm(kennung);
}

async function showEditUserForm(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    window.toast.error('Benutzer nicht gefunden!');
    return;
  }
  
  const currentEmail = user.email || `${user.kennung}@fh-muenster.de`;
  const currentPhone = user.phone || '';
  
  const modalHtml = `
    <div class="modal-header">
      <h2>${user.name} - Bearbeiten</h2>
      <button class="close-btn" onclick="closeEditUserModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Vollständiger Name</label>
            <input type="text" id="editUserName" class="form-input" value="${user.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">FH-Kennung</label>
            <input type="text" id="editUserKennung" class="form-input" value="${user.kennung}" required>
            <small>Achtung: Änderung der Kennung aktualisiert alle zugehörigen Einträge!</small>
          </div>
          <div class="form-group">
            <label class="form-label">E-Mail Adresse</label>
            <input type="email" id="editUserEmail" class="form-input" value="${currentEmail}">
          </div>
          <div class="form-group">
            <label class="form-label">Handynummer</label>
            <input type="tel" id="editUserPhone" class="form-input" value="${currentPhone}" placeholder="z.B. 0176 12345678">
            <small>Handynummer wird für Equipment-Ausleihen benötigt</small>
          </div>
        </div>
        <div class="card-footer">
          ${ButtonFactory.primary('ÄNDERUNGEN SPEICHERN', `updateUser('${kennung}')`)}
          <button class="btn btn-secondary" onclick="closeEditUserModal()">Abbrechen</button>
        </div>
      </div>
    </div>
  `;
  
  window.showModal(modalHtml);
}

async function updateUser(oldKennung) {
  const newName = document.getElementById('editUserName').value.trim();
  const newKennung = document.getElementById('editUserKennung').value.trim().toLowerCase();
  const newEmail = document.getElementById('editUserEmail').value.trim();
  const newPhone = document.getElementById('editUserPhone').value.trim();
  
  if (!newName || !newKennung) {
    window.toast.warning('Name und FH-Kennung sind erforderlich!');
    return;
  }
  
  // Prüfen ob neue Kennung bereits existiert (außer bei unveränderter Kennung)
  if (newKennung !== oldKennung && window.allUsers && window.allUsers.find(u => u.kennung === newKennung)) {
    window.toast.warning('Diese FH-Kennung wird bereits verwendet!');
    return;
  }
  
  try {
    const batch = window.db.batch();
    
    // 1. Alle Einträge mit der alten Kennung aktualisieren
    const entriesSnapshot = await window.db.collection('entries').where('kennung', '==', oldKennung).get();
    entriesSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        name: newName,
        kennung: newKennung,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // 2. User-Dokument aktualisieren oder erstellen
    const userSnapshot = await window.db.collection('users').where('kennung', '==', oldKennung).get();
    
    if (!userSnapshot.empty) {
      // Bestehendes User-Dokument aktualisieren
      userSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          name: newName,
          kennung: newKennung,
          email: newEmail,
          phone: newPhone,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    } else {
      // Neues User-Dokument erstellen
      const userRef = window.db.collection('users').doc();
      batch.set(userRef, {
        name: newName,
        kennung: newKennung,
        email: newEmail,
        phone: newPhone,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    
    if (window.toast && typeof window.toast.success === 'function') {
      window.toast.success('Benutzer erfolgreich aktualisiert!');
    } else {
      alert('Benutzer erfolgreich aktualisiert!');
    }
    closeEditUserModal(); // Verwende die spezielle Close-Funktion
    
    // Admin Dashboard aktualisieren falls verfügbar
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    window.toast.error('Fehler beim Speichern: ' + error.message);
  }
}

// ==================== ADD NEW USER ====================

function showAddUserDialog() {
  if (!window.checkAdminAccess()) return;
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Neuen Benutzer hinzufügen</h3>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Vollständiger Name</label>
            <input type="text" id="newUserName" class="form-input" placeholder="Vorname Nachname" required>
          </div>
          <div class="form-group">
            <label class="form-label">FH-Kennung</label>
            <input type="text" id="newUserKennung" class="form-input" placeholder="z.B. mw123456" required>
            <div id="kennungValidation" class="form-hint">Kennung verfügbar</div>
          </div>
          <div class="form-group">
            <label class="form-label">E-Mail Adresse</label>
            <input type="email" id="newUserEmail" class="form-input" placeholder="wird automatisch ausgefüllt">
            <small class="form-hint">Optional - Standard: kennung@fh-muenster.de</small>
          </div>
          <div class="form-group">
            <label class="form-label">Handynummer</label>
            <input type="tel" id="newUserPhone" class="form-input" placeholder="z.B. 0176 12345678">
            <small class="form-hint">Optional - wird für Equipment-Ausleihen benötigt</small>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button class="btn btn-primary" onclick="createNewUser()">Benutzer hinzufügen</button>
        </div>
      </div>
    </div>
  `;
  
  showModalWithContent(modalHtml);
  
  // Email Auto-Generation nach Modal-Rendering aktivieren
  setTimeout(() => {
    const kennungInput = document.getElementById('newUserKennung');
    const emailInput = document.getElementById('newUserEmail');
    const validationDiv = document.getElementById('kennungValidation');
    
    if (kennungInput && emailInput) {
      // Auto-generierung bei Eingabe
      kennungInput.addEventListener('input', function() {
        const kennung = this.value.trim().toLowerCase();
        if (kennung) {
          emailInput.value = `${kennung}@fh-muenster.de`;
          
          // Prüfen ob Kennung bereits existiert
          if (window.allUsers && window.allUsers.find(u => u.kennung === kennung)) {
            validationDiv.style.color = '#ff0000';
            validationDiv.textContent = '❌ Kennung bereits vergeben';
          } else {
            validationDiv.style.color = '#00aa00';
            validationDiv.textContent = '✅ Kennung verfügbar';
          }
        } else {
          emailInput.value = '';
          validationDiv.style.color = '#666';
          validationDiv.textContent = 'Kennung verfügbar';
        }
      });
    }
  }, 100);
}

async function createNewUser() {
  const name = document.getElementById('newUserName').value.trim();
  const kennung = document.getElementById('newUserKennung').value.trim().toLowerCase();
  const email = document.getElementById('newUserEmail').value.trim();
  const phone = document.getElementById('newUserPhone').value.trim();
  
  if (!name || !kennung) {
    window.toast.warning('Name und FH-Kennung sind erforderlich!');
    return;
  }
  
  // Prüfen ob Kennung bereits existiert
  if (window.allUsers && window.allUsers.find(u => u.kennung === kennung)) {
    window.toast.warning('Diese FH-Kennung wird bereits verwendet!');
    return;
  }
  
  try {
    // User-Dokument erstellen
    const userRef = await window.db.collection('users').add({
      name: name,
      kennung: kennung,
      email: email || `${kennung}@fh-muenster.de`,
      phone: phone,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Neuer Benutzer erstellt mit ID:', userRef.id);
    window.toast.success('Benutzer erfolgreich hinzugefügt!');
    window.closeModal();
    
    // Nutzer-Liste neu laden
    loadUsersForManagement();
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    window.toast.error('Fehler beim Erstellen: ' + error.message);
  }
}

// ==================== SPECIAL CLOSE FUNCTIONS ====================

// Close-Funktion für Edit-User-Modal, die zurück zum User-Manager führt
function closeEditUserModal() {
  window.closeModal();
  // Nach dem Schließen des Edit-Modals, User-Manager wieder öffnen
  setTimeout(() => {
    document.getElementById('userManager').classList.add('active');
    loadUsersForManagement();
  }, 100);
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Update user in window.allUsers and refresh table if needed
 */
function updateUserInList(kennung, updates) {
  if (window.allUsers) {
    const userIndex = window.allUsers.findIndex(user => user.kennung === kennung);
    if (userIndex !== -1) {
      // Update existing user
      window.allUsers[userIndex] = { ...window.allUsers[userIndex], ...updates };
    } else {
      // Add new user
      window.allUsers.push(updates);
    }
    
    // Refresh table if user manager is open
    const userManager = document.getElementById('userManager');
    if (userManager && userManager.classList.contains('active')) {
      renderUsersTable(window.allUsers);
    }
  }
}

// ==================== GLOBAL EXPORTS ====================
// Funktionen global verfügbar machen
window.showAddUserDialog = showAddUserDialog;
window.editUser = editUser;
window.showUserDetails = showUserDetails;
window.sendPaymentReminder = sendPaymentReminder;
window.sendUrgentReminder = sendUrgentReminder;
window.deleteUser = deleteUser;
window.createNewUser = createNewUser;
window.showUserManager = showUserManager;
window.closeUserManager = closeUserManager;
window.loadUsersForManagement = loadUsersForManagement;
window.sortUsersBy = sortUsersBy;
window.showEditUserForm = showEditUserForm; // Export the function
window.closeEditUserModal = closeEditUserModal;
window.updateUserInList = updateUserInList;
window.searchUsers = searchUsers;

// ==================== USER MANAGEMENT MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("👥 User Management Module geladen");
