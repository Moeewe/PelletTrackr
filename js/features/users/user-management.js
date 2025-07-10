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
    
    // Alle Einträge laden, um Benutzer zu extrahieren
    const snapshot = await window.db.collection("entries").get();
    
    // Benutzerinformationen aus users-Sammlung laden
    const usersSnapshot = await window.db.collection("users").get();
    const usersData = new Map();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersData.set(userData.kennung, userData);
    });
    
    const userMap = new Map();
    
    snapshot.forEach(doc => {
      const entry = doc.data();
      const userKey = `${entry.name}_${entry.kennung}`;
      
      if (!userMap.has(userKey)) {
        const userData = usersData.get(entry.kennung) || {};
        userMap.set(userKey, {
          name: entry.name,
          kennung: entry.kennung,
          email: userData.email, // E-Mail aus users-Sammlung
          entries: [],
          totalCost: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          firstEntry: entry.timestamp ? entry.timestamp.toDate() : new Date(),
          lastEntry: entry.timestamp ? entry.timestamp.toDate() : new Date()
        });
      }
      
      const user = userMap.get(userKey);
      user.entries.push({
        id: doc.id,
        ...entry
      });
      
      user.totalCost += entry.totalCost || 0;
      if (entry.paid || entry.isPaid) {
        user.paidAmount += entry.totalCost || 0;
      } else {
        user.unpaidAmount += entry.totalCost || 0;
      }
      
      // Datum-Updates
      const entryDate = entry.timestamp ? entry.timestamp.toDate() : new Date();
      if (entryDate < user.firstEntry) user.firstEntry = entryDate;
      if (entryDate > user.lastEntry) user.lastEntry = entryDate;
    });
    
    const users = Array.from(userMap.values());
    
    // Global speichern für Suche und Sortierung
    window.allUsers = users;
    
    renderUsersTable(users);
    
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer:", error);
    document.getElementById("usersTable").innerHTML = '<p>Fehler beim Laden der Benutzer.</p>';
  }
}

function renderUsersTable(users) {
  const tableDiv = document.getElementById("usersTable");
  
  if (users.length === 0) {
    tableDiv.innerHTML = '<p>Keine Benutzer gefunden.</p>';
    return;
  }
  
  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th onclick="sortUsersBy('name')">Name</th>
          <th onclick="sortUsersBy('kennung')">FH-Kennung</th>
          <th onclick="sortUsersBy('email')">E-Mail</th>
          <th onclick="sortUsersBy('entries')">Drucke</th>
          <th onclick="sortUsersBy('totalCost')">Gesamtkosten</th>
          <th onclick="sortUsersBy('paidAmount')">Bezahlt</th>
          <th onclick="sortUsersBy('unpaidAmount')">Offen</th>
          <th onclick="sortUsersBy('lastEntry')">Letzter Druck</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  users.forEach(user => {
    const lastEntryDate = user.lastEntry.toLocaleDateString('de-DE');
    const statusClass = user.unpaidAmount > 0 ? 'status-unpaid' : 'status-paid';
    const email = user.email || `${user.kennung}@fh-muenster.de`;
    
    tableHtml += `
      <tr>
        <td data-label="Name"><span class="cell-value">${user.name}</span></td>
        <td data-label="FH-Kennung"><span class="cell-value">${user.kennung}</span></td>
        <td data-label="E-Mail"><span class="cell-value">${email}</span></td>
        <td data-label="Drucke"><span class="cell-value">${user.entries.length}</span></td>
        <td data-label="Gesamtkosten"><span class="cell-value"><strong>${window.formatCurrency(user.totalCost)}</strong></span></td>
        <td data-label="Bezahlt"><span class="cell-value">${window.formatCurrency(user.paidAmount)}</span></td>
        <td data-label="Offen" class="${statusClass}"><span class="cell-value">${window.formatCurrency(user.unpaidAmount)}</span></td>
        <td data-label="Letzter Druck"><span class="cell-value">${lastEntryDate}</span></td>
        <td data-label="Aktionen" class="actions">
          <div class="action-group">
            ${ButtonFactory.editUser(user.kennung)}
            ${ButtonFactory.userDetails(user.kennung)}
            ${ButtonFactory.sendReminder(user.kennung)}
            ${ButtonFactory.deleteUser(user.kennung)}
          </div>
        </td>
      </tr>
    `;
  });
  
  tableHtml += `
      </tbody>
    </table>
  `;
  
  tableDiv.innerHTML = tableHtml;
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
  if (!user) return;
  
  const modalHtml = `
    <div class="modal-header">
      <h2>Benutzer Details: ${user.name}</h2>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="user-details">
        <div class="detail-section">
          <h3>Basisinformationen</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>FH-Kennung:</strong> ${user.kennung}</p>
          <p><strong>Erster Druck:</strong> ${user.firstEntry.toLocaleDateString('de-DE')}</p>
          <p><strong>Letzter Druck:</strong> ${user.lastEntry.toLocaleDateString('de-DE')}</p>
        </div>
        
        <div class="detail-section">
          <h3>Statistiken</h3>
          <p><strong>Anzahl Drucke:</strong> ${user.entries.length}</p>
          <p><strong>Gesamtkosten:</strong> ${window.formatCurrency(user.totalCost)}</p>
          <p><strong>Bezahlt:</strong> ${window.formatCurrency(user.paidAmount)}</p>
          <p><strong>Offen:</strong> ${window.formatCurrency(user.unpaidAmount)}</p>
        </div>
        
        <div class="detail-section">
          <h3>Letzte Drucke</h3>
          <div class="recent-entries">
            ${user.entries.slice(0, 5).map(entry => `
              <div class="entry-item">
                <span>${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</span>
                <span>${entry.jobName || '3D-Druck'}</span>
                <span>${window.formatCurrency(entry.totalCost)}</span>
                <span class="${entry.paid || entry.isPaid ? 'status-paid' : 'status-unpaid'}">
                  ${entry.paid || entry.isPaid ? 'Bezahlt' : 'Offen'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${ButtonFactory.closeModal()}
    </div>
  `;
  
  window.showModalWithContent(modalHtml);
}

function sendPaymentReminder(kennung) {
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) return;
  
  if (user.unpaidAmount <= 0) {
    alert('Dieser Benutzer hat keine offenen Beträge.');
    return;
  }
  
  const subject = encodeURIComponent(`Zahlungserinnerung FGF 3D-Druck - ${user.name}`);
  const openEntries = user.entries.filter(e => !(e.paid || e.isPaid));
  
  const body = encodeURIComponent(`Hallo ${user.name},

hiermit möchten wir Sie freundlich an die offenen Beträge für Ihre 3D-Drucke erinnern:

OFFENE DRUCKE:
${openEntries.map(entry => 
  `- ${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}: ${entry.jobName || '3D-Druck'} - ${window.formatCurrency(entry.totalCost)}`
).join('\n')}

GESAMTBETRAG: ${window.formatCurrency(user.unpaidAmount)}

Bitte überweisen Sie den Betrag zeitnah oder melden Sie sich bei Fragen.

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team

---
Diese E-Mail wurde automatisch generiert von PelletTrackr.`);
  
  const mailtoLink = `mailto:${user.kennung}@fh-muenster.de?subject=${subject}&body=${body}`;
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
    
    alert('Benutzer und alle zugehörigen Daten wurden gelöscht.');
    loadUsersForManagement();
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

// ==================== USER EDITING ====================

async function editUser(kennung) {
  if (!window.checkAdminAccess()) return;
  
  const user = window.allUsers.find(u => u.kennung === kennung);
  if (!user) {
    alert('Benutzer nicht gefunden!');
    return;
  }
  
  const currentEmail = user.email || `${user.kennung}@fh-muenster.de`;
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Benutzer bearbeiten</h3>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" id="editUserName" class="form-input" value="${user.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">FH-Kennung</label>
        <input type="text" id="editUserKennung" class="form-input" value="${user.kennung}" required>
        <small>Achtung: Änderung der Kennung aktualisiert alle verknüpften Einträge!</small>
      </div>
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" id="editUserEmail" class="form-input" value="${currentEmail}">
      </div>
    </div>
    <div class="modal-footer">
      <div class="button-group">
        ${ButtonFactory.cancelModal()}
        ${ButtonFactory.saveChanges(`updateUser('${kennung}')`)}
      </div>
    </div>
  `;
  
  showModalWithContent(modalHtml);
}

async function updateUser(oldKennung) {
  const newName = document.getElementById('editUserName').value.trim();
  const newKennung = document.getElementById('editUserKennung').value.trim().toLowerCase();
  const newEmail = document.getElementById('editUserEmail').value.trim();
  
  if (!newName || !newKennung) {
    alert('Name und FH-Kennung sind erforderlich!');
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
    
    alert('Benutzer erfolgreich aktualisiert!');
    window.closeModal();
    loadUsersForManagement();
    window.loadAdminStats();
    window.loadAllEntries();
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    alert('Fehler beim Speichern: ' + error.message);
  }
}

// ==================== ADD NEW USER ====================

function showAddUserDialog() {
  if (!window.checkAdminAccess()) return;
  
  const modalHtml = `
    <div class="modal-header">
      <h3>Neuen Benutzer Hinzufügen</h3>
      <button class="close-btn" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Benutzer Registrierung</h3>
        </div>
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
  
  showModal(modalHtml);
  
  // Event Listener für Kennung-Validierung und Auto-Email-Generierung
  document.getElementById('newUserKennung').addEventListener('input', function() {
    const kennung = this.value.trim().toLowerCase();
    const checkDiv = document.getElementById('kennungCheck');
    const emailField = document.getElementById('newUserEmail');
    
    // Auto-generate email when kennung changes
    if (kennung && !emailField.value) {
      emailField.value = `${kennung}@fh-muenster.de`;
    }
    
    if (kennung && window.allUsers.find(u => u.kennung === kennung)) {
      checkDiv.innerHTML = '<span style="color: #dc3545;">Diese Kennung existiert bereits!</span>';
    } else if (kennung) {
      checkDiv.innerHTML = '<span style="color: #28a745;">✅ Kennung verfügbar</span>';
    } else {
      checkDiv.innerHTML = '';
    }
  });
}

async function createNewUser() {
  const name = document.getElementById('newUserName').value.trim();
  const kennung = document.getElementById('newUserKennung').value.trim().toLowerCase();
  const email = document.getElementById('newUserEmail').value.trim();
  
  if (!name || !kennung) {
    alert('Name und FH-Kennung sind erforderlich!');
    return;
  }
  
  // Prüfen ob Kennung bereits existiert
  if (window.allUsers.find(u => u.kennung === kennung)) {
    alert('Diese FH-Kennung wird bereits verwendet!');
    return;
  }
  
  try {
    // User-Dokument erstellen
    await window.db.collection('users').add({
      name: name,
      kennung: kennung,
      email: email || `${kennung}@fh-muenster.de`,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('Benutzer erfolgreich hinzugefügt!');
    window.closeModal();
    loadUsersForManagement();
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    alert('Fehler beim Erstellen: ' + error.message);
  }
}

// ==================== GLOBAL EXPORTS ====================
// Funktionen global verfügbar machen
window.showAddUserDialog = showAddUserDialog;
window.editUser = editUser;
window.showUserDetails = showUserDetails;
window.sendPaymentReminder = sendPaymentReminder;
window.deleteUser = deleteUser;
window.createNewUser = createNewUser;
window.showUserManager = showUserManager;
window.closeUserManager = closeUserManager;
window.loadUsersForManagement = loadUsersForManagement;
window.sortUsersBy = sortUsersBy;

// ==================== USER MANAGEMENT MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("👥 User Management Module geladen");
