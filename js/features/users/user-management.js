// ==================== USER MANAGEMENT SYSTEM ====================
// Version 1.5 - Replaced all browser dialogs with toast notifications

function showUserManager() {
  if (!window.checkAdminAccess()) return;
  document.getElementById('userManager').style.display = 'flex';
  document.getElementById('userManager').classList.add('active');
  window.prepareDialog?.(document.getElementById('userManager'));
  loadUsersForManagement();
}

function closeUserManager() {
  document.getElementById('userManager').classList.remove('active');
  document.getElementById('userManager').style.display='none';
  window.restoreDialogFocus?.();
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
      // Support both old (kennung) and new (email) systems
      const identifier = userData.email || userData.kennung;
      if (identifier) {
        usersData.set(identifier, {
          docId: doc.id,
          ...userData
        });
      }
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
      // Support both old (kennung) and new (email) systems
      const identifier = entry.email || entry.kennung;
      if (identifier) {
        if (!entriesData.has(identifier)) {
          entriesData.set(identifier, []);
        }
        entriesData.get(identifier).push({
          id: doc.id,
          ...entry
        });
      }
    });

    console.log(`📊 Entries Collection: ${entriesSnapshot.size} Einträge für ${entriesData.size} verschiedene Benutzer gefunden`);

    // 3. Benutzer-Daten zusammenführen - NUR registrierte Benutzer
    const userMap = new Map();

    // Nur registrierte Benutzer aus users-Collection verarbeiten
    usersData.forEach((userData, identifier) => {
      const entries = entriesData.get(identifier) || [];

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

      // Support both old and new user structures
      const userInfo = {
        docId: userData.docId,
        name: userData.name || userData.displayName || 'Unbekannt',
        kennung: userData.kennung || userData.email || identifier,
        email: userData.email || (userData.kennung ? `${userData.kennung}@fh-muenster.de` : ''),
        phone: userData.phone || '',
        isAdmin: userData.isAdmin || false,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        entries: entries, // Add entries array
        totalEntries: entries.length,
        totalCost: totalCost,
        paidAmount: paidAmount,
        unpaidAmount: unpaidAmount,
        firstEntry: firstEntry,
        lastEntry: lastEntry,
        // Support legacy fields
        legacyKennung: userData.legacyKennung,
        linkedWithLegacy: userData.linkedWithLegacy || false
      };

      userMap.set(identifier, userInfo);
    });

    // Convert to array and sort by name
    const usersArray = Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Store in global variable
    window.allUsers = usersArray;

    console.log(`✅ ${usersArray.length} Benutzer erfolgreich geladen`);

    // Render the table
    searchUsers();

  } catch (error) {
    console.error("❌ Fehler beim Laden der Benutzer:", error);
    document.getElementById("usersTable").innerHTML = `
      <div class="error-message">
        <p>Fehler beim Laden der Benutzerdaten:</p>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadUsersForManagement()">Erneut versuchen</button>
      </div>
    `;
  }
}

// Overview stays compact; contact, billing details and destructive actions expand on demand.
let visibleManagedUsers = [];
const userEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function managedUserAction(index, action, checked) {
  const user = visibleManagedUsers[index];
  if (!window.checkAdminAccess() || !user) return;
  if (!user.kennung || window.allUsers.filter(u => u.kennung === user.kennung).length !== 1) {
    window.toast.warning('Dieses Profil benötigt zuerst eine eindeutige Kontozuordnung. Es werden keine Änderungen vorgenommen.');
    return;
  }
  const actions = {edit:editUser, remove:deleteUser, reminder:sendPaymentReminder, urgent:sendUrgentReminder, admin:toggleAdminStatus};
  if (actions[action]) actions[action](user.kennung, checked);
}
function renderUsersTable(users) {
  const tableDiv = document.getElementById('usersTable');
  visibleManagedUsers = users || window.allUsers || [];
  const money = value => window.formatCurrency ? window.formatCurrency(Number(value)||0) : (Number(value)||0).toFixed(2)+' €';
  if (!visibleManagedUsers.length) {
    tableDiv.innerHTML='<div class="entry-empty-state"><h3>Keine Personen gefunden</h3><p>Bitte die Suche anpassen oder eine Person hinzufügen.</p></div>';
    return;
  }
  tableDiv.innerHTML='<p class="user-list-count">'+visibleManagedUsers.length+' Personen</p><div class="managed-user-list">'+visibleManagedUsers.map((u,i)=>{
    const count=u.entries?.length||0;
    const button=(label,action,kind='secondary')=>'<button type="button" class="btn btn-'+kind+'" onclick="managedUserAction('+i+',\''+action+'\')">'+label+'</button>';
    return '<article class="managed-user"><div class="managed-user-overview"><div class="managed-user-identity"><h3>'+userEscape(u.name||'Name nicht hinterlegt')+'</h3><p>'+userEscape(u.email||u.kennung||'Kontaktdaten fehlen')+'</p><span class="user-role">'+(u.isAdmin?'Administrator':'Nutzer')+'</span></div>'+
      '<div class="managed-user-balance"><span>'+count+' Aufträge</span><strong>'+money(u.unpaidAmount)+' offen</strong></div>'+
      '<div>'+button('Bearbeiten','edit')+'</div></div>'+
      '<details class="managed-user-details"><summary>Kontaktdaten, Abrechnung & Aktionen</summary><dl>'+
      '<div><dt>FH-Kennung</dt><dd>'+userEscape(u.kennung||'Nicht zugeordnet')+'</dd></div>'+
      '<div><dt>E-Mail</dt><dd>'+userEscape(u.email||'Nicht hinterlegt')+'</dd></div>'+
      '<div><dt>Telefon</dt><dd>'+userEscape(u.phone||'Nicht hinterlegt')+'</dd></div>'+
      '<div><dt>Gesamtkosten</dt><dd>'+money(u.totalCost)+'</dd></div>'+
      '<div><dt>Bezahlt</dt><dd>'+money(u.paidAmount)+'</dd></div>'+
      '<div><dt>Letzter Druck</dt><dd>'+userEscape(u.lastEntry?.toLocaleDateString('de-DE')||'Noch kein Druck')+'</dd></div></dl>'+
      '<label class="managed-user-admin"><input type="checkbox" '+(u.isAdmin?'checked':'')+' onchange="managedUserAction('+i+',\'admin\',this.checked)"> Administratorrechte</label>'+
      '<div class="safety-actions">'+(u.unpaidAmount>0?button('Zahlungserinnerung','reminder')+button('Dringende Erinnerung','urgent'):'')+button('Nutzer löschen','remove','danger')+'</div></details></article>';
  }).join('')+'</div>';
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
        aVal = (a.entries || []).length;
        bVal = (b.entries || []).length;
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

  const [sort,direction] = (document.getElementById('userManagerSortSelect')?.value || 'name-asc').split('-');
  const field = {revenue:'totalCost',entries:'entries'}[sort] || sort;
  filteredUsers.sort((a,b)=>{
    const av=field==='entries'?(a.entries||[]).length:a[field]??'';
    const bv=field==='entries'?(b.entries||[]).length:b[field]??'';
    return (typeof av==='number' ? av-bv : String(av).localeCompare(String(bv),'de'))*(direction==='desc'?-1:1);
  });
  renderUsersTable(filteredUsers);
}
function sortUsers() { searchUsers(); }

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
            <span class="detail-label">ERSTER AUFTRAG</span>
            <span class="detail-value">${user.firstEntry.toLocaleDateString('de-DE')}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">LETZTER AUFTRAG</span>
            <span class="detail-value">${user.lastEntry ? user.lastEntry.toLocaleDateString('de-DE') : 'Keine Aufträge'}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">ANZAHL AUFTRÄGE</span>
            <span class="detail-value">${(user.entries || []).length}</span>
          </div>

          <div class="detail-row highlight-total">
            <span class="detail-label">GESAMTKOSTEN:</span>
            <span class="detail-value">${window.formatCurrency ? window.formatCurrency(user.totalCost) : (user.totalCost || 0).toFixed(2)}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">BEZAHLT</span>
            <span class="detail-value">${window.formatCurrency ? window.formatCurrency(user.paidAmount) : (user.paidAmount || 0).toFixed(2)}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">OFFEN</span>
            <span class="detail-value">${window.formatCurrency ? window.formatCurrency(user.unpaidAmount) : (user.unpaidAmount || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="button-group">
            ${ButtonFactory.closeModal ? ButtonFactory.closeModal() : '<button class="btn btn-secondary" onclick="closeUserManager()">Schließen</button>'}
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
  const openEntries = (user.entries || []).filter(e => !(e.paid || e.isPaid));
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
   Betrag: ${window.formatCurrency ? window.formatCurrency(entry.totalCost) : (entry.totalCost || 0).toFixed(2)}`;
}).join('\n\n')}

─────────────────────────────────────────────────────────
ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Anzahl offener Aufträge: ${openEntries.length}
Bereits bezahlt: ${window.formatCurrency ? window.formatCurrency(user.paidAmount) : (user.paidAmount || 0).toFixed(2)}

GESAMTBETRAG OFFEN: ${window.formatCurrency ? window.formatCurrency(user.unpaidAmount) : (user.unpaidAmount || 0).toFixed(2)}

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
  const openEntries = (user.entries || []).filter(e => !(e.paid || e.isPaid));
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
   Betrag: ${window.formatCurrency ? window.formatCurrency(entry.totalCost) : (entry.totalCost || 0).toFixed(2)}`;
}).join('\n\n')}

─────────────────────────────────────────────────────────
FINANZIELLE ZUSAMMENFASSUNG
─────────────────────────────────────────────────────────

Bereits bezahlt: ${window.formatCurrency ? window.formatCurrency(user.paidAmount) : (user.paidAmount || 0).toFixed(2)}
Anzahl offener Aufträge: ${openEntries.length}

GESAMTBETRAG ÜBERFÄLLIG: ${window.formatCurrency ? window.formatCurrency(user.unpaidAmount) : (user.unpaidAmount || 0).toFixed(2)}

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

async function deleteUser(userId) {
  if (!window.checkAdminAccess()) return;

  // Show confirmation toast instead of browser dialog
  window.toast.info('Benutzer wird gelöscht...');

  // Small delay to show the info message
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    console.log(`🗑️ Lösche Benutzer mit ID: ${userId}`);
    console.log('🔍 Verfügbare Benutzer:', window.allUsers ? window.allUsers.length : 'undefined');

    // Find user by ID (could be kennung, email, or docId)
    let user = null;

    if (window.allUsers && window.allUsers.length > 0) {
      user = window.allUsers.find(u =>
        u.kennung === userId ||
        u.email === userId ||
        u.docId === userId
      );
    }

    if (!user) {
      console.warn('⚠️ Benutzer nicht in allUsers gefunden, versuche direkte Datenbankabfrage...');

      // Try to find user directly in database
      try {
        const userSnapshot = await window.db.collection('users').where('kennung', '==', userId).get();
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          user = {
            docId: userDoc.id,
            ...userDoc.data()
          };
        } else {
          // Try by email
          const emailSnapshot = await window.db.collection('users').where('email', '==', userId).get();
          if (!emailSnapshot.empty) {
            const userDoc = emailSnapshot.docs[0];
            user = {
              docId: userDoc.id,
              ...userDoc.data()
            };
          }
        }
      } catch (error) {
        console.error('❌ Fehler bei direkter Benutzer-Suche:', error);
      }
    }

    if (!user) {
      window.toast.error('Benutzer nicht gefunden!');
      return;
    }

    // Get user identifier (prefer email, fallback to kennung)
    const userIdentifier = user.email || user.kennung;

    if (!userIdentifier) {
      window.toast.error('Benutzer-ID nicht gefunden!');
      return;
    }

    console.log(`🗑️ Lösche Benutzer: ${userIdentifier} (DocID: ${user.docId})`);

    // Alle Einträge des Benutzers abrufen (support both kennung and email)
    const entriesQuery = await window.db.collection('entries')
      .where('kennung', '==', userIdentifier)
      .get();

    // Also check for entries with email
    const entriesQueryEmail = await window.db.collection('entries')
      .where('email', '==', userIdentifier)
      .get();

    // Combine both query results
    const allEntries = new Set();
    entriesQuery.forEach(doc => allEntries.add(doc));
    entriesQueryEmail.forEach(doc => allEntries.add(doc));

    console.log(`📊 ${allEntries.size} Einträge gefunden für Benutzer ${userIdentifier}`);

    // Batch-Delete für alle Einträge
    const batch = window.db.batch();
    allEntries.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Benutzer-Dokument löschen (support both old and new structure)
    let userDeleted = false;

    // Try to delete by docId first (new system)
    if (user.docId) {
      try {
        const userRef = window.db.collection('users').doc(user.docId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          batch.delete(userRef);
          userDeleted = true;
          console.log(`✅ User deleted by docId: ${user.docId}`);
        }
      } catch (error) {
        console.warn('Could not delete by docId:', error);
      }
    }

    // Fallback: Try to delete by kennung (old system)
    if (!userDeleted) {
      const userSnapshot = await window.db.collection('users').where('kennung', '==', userIdentifier).get();
      if (!userSnapshot.empty) {
        userSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        userDeleted = true;
        console.log(`✅ User deleted by kennung: ${userIdentifier}`);
      }
    }

    // Fallback: Try to delete by email (new system)
    if (!userDeleted) {
      const userSnapshot = await window.db.collection('users').where('email', '==', userIdentifier).get();
      if (!userSnapshot.empty) {
        userSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        userDeleted = true;
        console.log(`✅ User deleted by email: ${userIdentifier}`);
      }
    }

    if (!userDeleted) {
      window.toast.warning('Benutzer-Dokument nicht gefunden, aber Einträge wurden gelöscht.');
    }

    await batch.commit();

    window.toast.success('Benutzer und alle zugehörigen Daten wurden gelöscht.');

    // Reload users list
    await loadUsersForManagement();

    // Refresh admin stats if available
    if (typeof window.loadAdminStats === 'function') {
      window.loadAdminStats();
    }

    // Refresh all entries if available
    if (typeof window.loadAllEntries === 'function') {
      window.loadAllEntries();
    }

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
  // The shared dialog helper records the return path to the user overview.

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
          <div class="button-group">
            ${ButtonFactory.primary ? ButtonFactory.primary('ÄNDERUNGEN SPEICHERN', `updateUser('${kennung}')`) : '<button class="btn btn-primary" onclick="updateUser(\'' + kennung + '\')">ÄNDERUNGEN SPEICHERN</button>'}
            <button class="btn btn-secondary" onclick="closeEditUserModal()">Abbrechen</button>
          </div>
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
          <div class="button-group">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="createNewUser()">Benutzer hinzufügen</button>
          </div>
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
    showUserManager();
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
