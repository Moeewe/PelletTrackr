// ==================== USER MANAGEMENT SYSTEM ====================

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
    
    // 1. Benutzerinformationen aus users-Sammlung laden (Primärquelle)
    const usersSnapshot = await window.db.collection("users").get();
    const usersData = new Map();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersData.set(userData.kennung, {
        docId: doc.id,
        ...userData
      });
    });
    
    // 2. Alle Einträge laden, um Statistiken zu berechnen
    const entriesSnapshot = await window.db.collection("entries").get();
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
    
    // 3. Benutzer-Daten zusammenführen
    const userMap = new Map();
    
    // Alle registrierten Benutzer aus users-Collection
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
        
        const entryDate = entry.timestamp ? entry.timestamp.toDate() : new Date();
        if (!firstEntry || entryDate < firstEntry) firstEntry = entryDate;
        if (!lastEntry || entryDate > lastEntry) lastEntry = entryDate;
      });
      
      userMap.set(kennung, {
        docId: userData.docId,
        name: userData.name,
        kennung: userData.kennung,
        email: userData.email || `${userData.kennung}@fh-muenster.de`,
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
    
    // 4. Benutzer mit Einträgen aber ohne users-Eintrag hinzufügen (Legacy-Daten)
    entriesData.forEach((entries, kennung) => {
      if (!userMap.has(kennung)) {
        console.log(`⚠️ Legacy-User ohne users-Eintrag gefunden: ${kennung}`);
        
        // Ersten Eintrag für Name verwenden
        const firstEntry = entries[0];
        if (firstEntry) {
          let totalCost = 0;
          let paidAmount = 0;
          let unpaidAmount = 0;
          let firstEntryDate = null;
          let lastEntryDate = null;
          
          entries.forEach(entry => {
            totalCost += entry.totalCost || 0;
            if (entry.paid || entry.isPaid) {
              paidAmount += entry.totalCost || 0;
            } else {
              unpaidAmount += entry.totalCost || 0;
            }
            
            const entryDate = entry.timestamp ? entry.timestamp.toDate() : new Date();
            if (!firstEntryDate || entryDate < firstEntryDate) firstEntryDate = entryDate;
            if (!lastEntryDate || entryDate > lastEntryDate) lastEntryDate = entryDate;
          });
          
          userMap.set(kennung, {
            docId: null, // Kein users-Dokument
            name: firstEntry.name,
            kennung: kennung,
            email: `${kennung}@fh-muenster.de`,
            isAdmin: false,
            createdAt: firstEntryDate,
            lastLogin: lastEntryDate,
            entries: entries,
            totalCost: totalCost,
            paidAmount: paidAmount,
            unpaidAmount: unpaidAmount,
            firstEntry: firstEntryDate,
            lastEntry: lastEntryDate,
            isLegacy: true
          });
        }
      }
    });
    
    const users = Array.from(userMap.values());
    
    // Nach letztem Login sortieren (neueste zuerst)
    users.sort((a, b) => {
      const aDate = a.lastLogin || a.lastEntry || a.createdAt || new Date(0);
      const bDate = b.lastLogin || b.lastEntry || b.createdAt || new Date(0);
      return bDate - aDate;
    });
    
    // Global speichern für Suche und Sortierung
    window.allUsers = users;
    
    console.log(`✅ ${users.length} Benutzer geladen`);
    renderUsersTable(users);
    
  } catch (error) {
    console.error("❌ Fehler beim Laden der Benutzer:", error);
    document.getElementById("usersTable").innerHTML = '<p>Fehler beim Laden der Benutzer.</p>';
  }
}

function renderUsersTable(users) {
  const tableDiv = document.getElementById("usersTable");
  
  if (users.length === 0) {
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
              <th onclick="sortUsersBy('isAdmin')">Admin</th>
              <th onclick="sortUsersBy('lastLogin')">Letzter Login</th>
              <th onclick="sortUsersBy('entries')">Drucke</th>
              <th onclick="sortUsersBy('totalCost')">Gesamtkosten</th>
              <th onclick="sortUsersBy('paidAmount')">Bezahlt</th>
              <th onclick="sortUsersBy('unpaidAmount')">Offen</th>
              <th onclick="sortUsersBy('status')">Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  users.forEach(user => {
    const lastLoginDate = user.lastLogin ? 
      user.lastLogin.toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit' 
      }) : 
      (user.lastEntry ? user.lastEntry.toLocaleDateString('de-DE') : 'Nie');
    
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    
    // Admin Badge
    const adminBadge = user.isAdmin ? 
      '<span class="entry-status-badge status-admin">ADMIN</span>' : 
      '<span class="entry-status-badge status-user">USER</span>';
    
    // Status Badge für Desktop-Tabelle
    const statusBadge = user.unpaidAmount > 0 ? 
      '<span class="entry-status-badge status-unpaid">OFFEN</span>' : 
      '<span class="entry-status-badge status-paid">BEZAHLT</span>';
    
    // Legacy-Indikator
    const legacyIndicator = user.isLegacy ? ' <small>(Legacy)</small>' : '';
    
    // Tabellen-Zeile für Desktop
    containerHtml += `
      <tr>
        <td><span class="cell-value">${user.name}${legacyIndicator}</span></td>
        <td><span class="cell-value">${user.kennung}</span></td>
        <td><span class="cell-value">${email}</span></td>
        <td>${adminBadge}</td>
        <td><span class="cell-value">${lastLoginDate}</span></td>
        <td><span class="cell-value">${user.entries.length}</span></td>
        <td><span class="cell-value"><strong>${window.formatCurrency(user.totalCost)}</strong></span></td>
        <td><span class="cell-value">${window.formatCurrency(user.paidAmount)}</span></td>
        <td><span class="cell-value">${window.formatCurrency(user.unpaidAmount)}</span></td>
        <td>${statusBadge}</td>
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
    const lastLoginDate = user.lastLogin ? 
      user.lastLogin.toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit' 
      }) : 
      (user.lastEntry ? user.lastEntry.toLocaleDateString('de-DE') : 'Nie');
    
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    
    // Status Badge basierend auf offenen Beträgen
    const statusBadgeClass = user.unpaidAmount > 0 ? 'status-unpaid' : 'status-paid';
    const statusBadgeText = user.unpaidAmount > 0 ? 'OFFEN' : 'BEZAHLT';
    
    // Admin Badge für Mobile
    const adminBadge = user.isAdmin ? 
      '<span class="entry-status-badge status-admin">ADMIN</span>' : 
      '<span class="entry-status-badge status-user">USER</span>';
    
    // Legacy-Indikator
    const legacyIndicator = user.isLegacy ? ' <small>(Legacy)</small>' : '';
    
    containerHtml += `
      <div class="entry-card">
        <!-- Card Header mit User-Name und Status -->
        <div class="entry-card-header">
          <h3 class="entry-job-title">${user.name}${legacyIndicator}</h3>
          <div class="entry-status-badges">
            ${adminBadge}
            <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
          </div>
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
            <span class="entry-detail-label">Letzter Login</span>
            <span class="entry-detail-value">${lastLoginDate}</span>
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
        aVal = a.lastEntry.getTime();
        bVal = b.lastEntry.getTime();
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
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    return user.name.toLowerCase().includes(searchTerm) ||
           user.kennung.toLowerCase().includes(searchTerm) ||
           email.toLowerCase().includes(searchTerm);
  });

  renderUsersTable(filteredUsers);
}

// ==================== USER DETAILS & ACTIONS ====================

function showUserDetails(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Benutzer nicht gefunden!');
    } else {
      alert('Benutzer nicht gefunden!');
    }
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
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Benutzer nicht gefunden!');
    } else {
      alert('Benutzer nicht gefunden!');
    }
    return;
  }
  
  if (user.unpaidAmount <= 0) {
    if (window.toast && typeof window.toast.info === 'function') {
      window.toast.info('Dieser Benutzer hat keine offenen Beträge.');
    } else {
      alert('Dieser Benutzer hat keine offenen Beträge.');
    }
    return;
  }
  
  const subject = encodeURIComponent(`🔔 Zahlungserinnerung - FGF 3D-Druck Service | ${user.name}`);
  const openEntries = user.entries.filter(e => !(e.paid || e.isPaid));
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  // Professionelle E-Mail Vorlage im Zahlungsnachweis-Stil
  const body = encodeURIComponent(`Sehr geehrte/r ${user.name},

═════════════════════════════════════════════════════════
               🟨 PelletTrackr - ZAHLUNGSERINNERUNG 🟨
═════════════════════════════════════════════════════════

Datum: ${currentDate}
FH-Kennung: ${user.kennung}
E-Mail: ${user.email || `${user.kennung}@fh-muenster.de`}

─────────────────────────────────────────────────────────
📋 OFFENE DRUCKAUFTRÄGE
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
💰 ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Anzahl offener Drucke: ${openEntries.length}
Bereits bezahlt: ${window.formatCurrency(user.paidAmount)}

🟨 GESAMTBETRAG OFFEN: ${window.formatCurrency(user.unpaidAmount)} 🟨

═════════════════════════════════════════════════════════
📞 KONTAKT & INFORMATION
═════════════════════════════════════════════════════════

Bitte überweisen Sie den offenen Betrag zeitnah oder melden 
Sie sich bei Fragen an das FGF Team.

💡 Zahlungshinweis:
Nach erfolgter Zahlung erhalten Sie automatisch einen 
Zahlungsnachweis über das PelletTrackr System.

─────────────────────────────────────────────────────────
🏢 Mit freundlichen Grüßen
FGF 3D-Druck Service Team
Fachhochschule Münster

🤖 Diese E-Mail wurde automatisch generiert von PelletTrackr
   Generiert am: ${currentDate}
═════════════════════════════════════════════════════════`);
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

function sendUrgentReminder(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Benutzer nicht gefunden!');
    } else {
      alert('Benutzer nicht gefunden!');
    }
    return;
  }
  
  if (user.unpaidAmount <= 0) {
    if (window.toast && typeof window.toast.info === 'function') {
      window.toast.info('Dieser Benutzer hat keine offenen Beträge.');
    } else {
      alert('Dieser Benutzer hat keine offenen Beträge.');
    }
    return;
  }
  
  const subject = encodeURIComponent(`🚨 DRINGENDE MAHNUNG - FGF 3D-Druck Service | ${user.name}`);
  const openEntries = user.entries.filter(e => !(e.paid || e.isPaid));
  const currentDate = new Date().toLocaleDateString('de-DE');
  const oldestEntry = openEntries.reduce((oldest, entry) => {
    const entryDate = entry.timestamp ? entry.timestamp.toDate() : new Date();
    const oldestDate = oldest.timestamp ? oldest.timestamp.toDate() : new Date();
    return entryDate < oldestDate ? entry : oldest;
  }, openEntries[0]);
  
  const daysSinceOldest = oldestEntry ? Math.floor((new Date() - (oldestEntry.timestamp ? oldestEntry.timestamp.toDate() : new Date())) / (1000 * 60 * 60 * 24)) : 0;
  
  // Dringende Mahnung mit stärkerem Ton
  const body = encodeURIComponent(`Sehr geehrte/r ${user.name},

🚨═════════════════════════════════════════════════════════🚨
                   DRINGENDE ZAHLUNGSMAHNUNG
                    FGF 3D-Druck Service
🚨═════════════════════════════════════════════════════════🚨

⚠️  WICHTIGER HINWEIS: ZAHLUNGSRÜCKSTAND  ⚠️

Datum: ${currentDate}
FH-Kennung: ${user.kennung}
E-Mail: ${user.email || `${user.kennung}@fh-muenster.de`}

─────────────────────────────────────────────────────────
⏰ ZAHLUNGSRÜCKSTAND INFORMATION
─────────────────────────────────────────────────────────

Ältester offener Eintrag: ${daysSinceOldest} Tage überfällig
Erste Zahlungserinnerung: Bereits versendet

📋 OFFENE DRUCKAUFTRÄGE (${openEntries.length} Stück):

${openEntries.map((entry, index) => {
  const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
  const jobName = entry.jobName || '3D-Druck Auftrag';
  const material = entry.material || 'Material';
  const amount = entry.materialMenge ? `${entry.materialMenge.toFixed(2)} kg` : 'N/A';
  const daysOld = entry.timestamp ? Math.floor((new Date() - entry.timestamp.toDate()) / (1000 * 60 * 60 * 24)) : 0;
  
  return `${index + 1}. ${jobName} (${daysOld} Tage alt)
   📅 Datum: ${date}
   🧱 Material: ${material} (${amount})
   💰 Betrag: ${window.formatCurrency(entry.totalCost)}`;
}).join('\n\n')}

─────────────────────────────────────────────────────────
💸 FINANZIELLE ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Bereits bezahlt: ${window.formatCurrency(user.paidAmount)}
Anzahl offener Drucke: ${openEntries.length}

🚨 GESAMTBETRAG ÜBERFÄLLIG: ${window.formatCurrency(user.unpaidAmount)} 🚨

═════════════════════════════════════════════════════════
⚡ SOFORTIGE ZAHLUNG ERFORDERLICH ⚡
═════════════════════════════════════════════════════════

Bitte begleichen Sie den überfälligen Betrag UMGEHEND.

🔴 Bei weiterer Zahlungsverzögerung können folgende 
   Maßnahmen eingeleitet werden:
   • Sperrung des 3D-Druck Services
   • Weiterleitung an die Verwaltung
   • Zusätzliche Verwaltungsgebühren

💡 So begleichen Sie Ihre Rechnung:
   1. Sofortige Überweisung des Gesamtbetrags
   2. Bei Fragen: Kontakt mit dem FGF Team
   3. Zahlungsnachweis wird automatisch erstellt

─────────────────────────────────────────────────────────
📞 DRINGENDER KONTAKT
─────────────────────────────────────────────────────────

Bei Zahlungsschwierigkeiten oder Fragen kontaktieren Sie 
SOFORT das FGF Team zur Klärung der Situation.

🏢 FGF 3D-Druck Service Team
   Fachhochschule Münster

🤖 DRINGENDE MAHNUNG - Generiert am: ${currentDate}
🚨═════════════════════════════════════════════════════════🚨`);
  
  const email = user.email || `${user.kennung}@fh-muenster.de`;
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

async function deleteUser(kennung) {
  if (!window.checkAdminAccess()) return;
  if (!confirm("Benutzer wirklich löschen? Alle zugehörigen Daten werden entfernt!")) return;
  
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
    
    if (window.toast && typeof window.toast.success === 'function') {
      window.toast.success('Benutzer und alle zugehörigen Daten wurden gelöscht.');
    } else {
      alert('Benutzer und alle zugehörigen Daten wurden gelöscht.');
    }
    loadUsersForManagement();
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Löschen: ' + error.message);
    } else {
      alert('Fehler beim Löschen: ' + error.message);
    }
  }
}

// ==================== USER EDITING ====================

async function editUser(kennung) {
  if (!window.checkAdminAccess()) return;
  
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Benutzer nicht gefunden!');
    } else {
      alert('Benutzer nicht gefunden!');
    }
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
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Benutzer nicht gefunden!');
    } else {
      alert('Benutzer nicht gefunden!');
    }
    return;
  }
  
  const currentEmail = user.email || `${user.kennung}@fh-muenster.de`;
  
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
  
  if (!newName || !newKennung) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Name und FH-Kennung sind erforderlich!');
    } else {
      alert('Name und FH-Kennung sind erforderlich!');
    }
    return;
  }
  
  // Prüfen ob neue Kennung bereits existiert (außer bei unveränderter Kennung)
  if (newKennung !== oldKennung && window.allUsers && window.allUsers.find(u => u.kennung === newKennung)) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Diese FH-Kennung wird bereits verwendet!');
    } else {
      alert('Diese FH-Kennung wird bereits verwendet!');
    }
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
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      alert('Fehler beim Speichern: ' + error.message);
    }
  }
}

// ==================== ADD NEW USER ====================

function showAddUserDialog() {
  if (!window.checkAdminAccess()) return;
  
  // WICHTIG: Erst userManager Modal schließen
  closeUserManager();
  
  // Kurze Verzögerung damit das erste Modal geschlossen wird
  setTimeout(() => {
    const modalHtml = `
      <div class="modal-header">
        <h2>Neuen Benutzer Hinzufügen</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="card">
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Vollständiger Name</label>
              <input type="text" id="newUserName" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">FH-Kennung</label>
              <input type="text" id="newUserKennung" class="form-input" required>
              <div id="kennungCheck" style="margin-top: 8px;"></div>
            </div>
            <div class="form-group">
              <label class="form-label">E-Mail Adresse</label>
              <input type="email" id="newUserEmail" class="form-input">
              <small>Optional - Standard: kennung@fh-muenster.de</small>
            </div>
          </div>
          <div class="card-footer">
            ${ButtonFactory.primary('BENUTZER HINZUFÜGEN', 'createNewUser()')}
            ${ButtonFactory.cancelModal()}
          </div>
        </div>
      </div>
    `;
    
    window.showModal(modalHtml);
    
    // Event Listener für Kennung-Validierung und Auto-Email-Generierung
    document.getElementById('newUserKennung').addEventListener('input', function() {
      const kennung = this.value.trim().toLowerCase();
      const checkDiv = document.getElementById('kennungCheck');
      const emailField = document.getElementById('newUserEmail');
      
      // Auto-generate email when kennung changes
      if (kennung && !emailField.value) {
        emailField.value = `${kennung}@fh-muenster.de`;
      }
      
      if (kennung && window.allUsers && window.allUsers.find(u => u.kennung === kennung)) {
        checkDiv.innerHTML = '<span style="color: #dc3545;">Diese Kennung existiert bereits!</span>';
      } else if (kennung) {
        checkDiv.innerHTML = '<span style="color: #28a745;">✅ Kennung verfügbar</span>';
      } else {
        checkDiv.innerHTML = '';
      }
    });
  }, 100);
}

async function createNewUser() {
  const name = document.getElementById('newUserName').value.trim();
  const kennung = document.getElementById('newUserKennung').value.trim().toLowerCase();
  const email = document.getElementById('newUserEmail').value.trim();
  
  if (!name || !kennung) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Name und FH-Kennung sind erforderlich!');
    } else {
      alert('Name und FH-Kennung sind erforderlich!');
    }
    return;
  }
  
  // Prüfen ob Kennung bereits existiert
  if (window.allUsers && window.allUsers.find(u => u.kennung === kennung)) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Diese FH-Kennung wird bereits verwendet!');
    } else {
      alert('Diese FH-Kennung wird bereits verwendet!');
    }
    return;
  }
  
  try {
    // User-Dokument erstellen
    const userRef = await window.db.collection('users').add({
      name: name,
      kennung: kennung,
      email: email || `${kennung}@fh-muenster.de`,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Neuer Benutzer erstellt mit ID:', userRef.id);
    if (window.toast && typeof window.toast.success === 'function') {
      window.toast.success('Benutzer erfolgreich hinzugefügt!');
    } else {
      alert('Benutzer erfolgreich hinzugefügt!');
    }
    window.closeModal();
    
    // User-Manager wieder öffnen und Daten neu laden
    setTimeout(() => {
      document.getElementById('userManager').classList.add('active');
      loadUsersForManagement();
    }, 100);
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Erstellen: ' + error.message);
    } else {
      alert('Fehler beim Erstellen: ' + error.message);
    }
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

// ==================== USER MANAGEMENT MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("👥 User Management Module geladen");
