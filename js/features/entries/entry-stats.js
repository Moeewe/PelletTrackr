// ==================== ENTRY STATS MODULE ====================
// Statistiken für User und Admin Dashboard

// Global state for entries and listeners
let userEntriesListener = null;
let adminEntriesListener = null;
const ENTRY_PAGE_SIZE = 50;
const entryPages = {
  user: { cursor: null, hasMore: true, loading: false, older: new Map() },
  admin: { cursor: null, hasMore: true, loading: false, older: new Map() }
};
function entryDateValue(entry) {
  const value=entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp || 0);
  return Number.isFinite(value.getTime()) ? value.getTime() : 0;
}
function combineEntryPages(kind, recentDocs) {
  const state=entryPages[kind], recent=new Map();
  recentDocs.forEach(doc=>recent.set(doc.id,{id:doc.id,...doc.data()}));
  if(state.older.size===0) {
    state.cursor=recentDocs.length ? recentDocs[recentDocs.length-1] : state.cursor;
    state.hasMore=recentDocs.length===ENTRY_PAGE_SIZE;
  }
  const combined=new Map(state.older);
  recent.forEach((value,id)=>combined.set(id,value));
  return Array.from(combined.values()).sort((a,b)=>entryDateValue(b)-entryDateValue(a));
}
function showEntryPager(kind, loaded) {
  const container=document.getElementById(kind==='user'?'userEntriesTable':'adminEntriesTable');
  if(!container) return;
  container.querySelector('.entry-load-more')?.remove();
  const state=entryPages[kind];
  if(!state.hasMore) return;
  container.insertAdjacentHTML('beforeend',`<div class="entry-load-more" style="display:flex;justify-content:center;gap:12px;padding:20px"><span>${loaded} Aufträge geladen</span><button class="btn btn-secondary" onclick="loadMoreEntries('${kind}')" ${state.loading?'disabled':''}>${state.loading?'Lädt …':'Weitere 50 laden'}</button></div>`);
}
async function loadMoreEntries(kind) {
  const state=entryPages[kind];
  if(state.loading||!state.hasMore||!state.cursor) return;
  state.loading=true; showEntryPager(kind,kind==='user'?window.allUserEntries.length:window.allAdminEntries.length);
  try {
    let query=window.db.collection('entries').orderBy('timestamp','desc').startAfter(state.cursor).limit(ENTRY_PAGE_SIZE);
    if(kind==='user') query=window.db.collection('entries').where('name','==',window.currentUser.name).where('kennung','==',window.currentUser.kennung).orderBy('timestamp','desc').startAfter(state.cursor).limit(ENTRY_PAGE_SIZE);
    const snapshot=await query.get();
    snapshot.docs.forEach(doc=>state.older.set(doc.id,{id:doc.id,...doc.data()}));
    if(snapshot.docs.length) state.cursor=snapshot.docs[snapshot.docs.length-1];
    state.hasMore=snapshot.docs.length===ENTRY_PAGE_SIZE;
    const entries=combineEntryPages(kind,kind==='user'?[]:[]);
    if(kind==='user'){window.allUserEntries=entries;window.currentUserEntries=entries;renderUserEntries(entries);}
    else {window.allAdminEntries=entries;window.currentAdminEntries=entries;if(typeof filterAdminEntries==='function')filterAdminEntries();else renderAdminEntries(entries);}
  } catch(error) { window.toast?.error(error.message||'Weitere Aufträge konnten nicht geladen werden.'); }
  finally {state.loading=false;showEntryPager(kind,kind==='user'?window.allUserEntries.length:window.allAdminEntries.length);}
}

/**
 * Setup real-time listener for user entries
 */
function setupUserEntriesListener() {
  // Clean up existing listener
  if (userEntriesListener) {
    userEntriesListener();
    userEntriesListener = null;
  }
  Object.assign(entryPages.user,{cursor:null,hasMore:true,loading:false,older:new Map()});

  try {
    userEntriesListener = window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .orderBy('timestamp','desc').limit(ENTRY_PAGE_SIZE)
      .onSnapshot((snapshot) => {
        const entries = combineEntryPages('user',snapshot.docs);

        // Global speichern für Suche und Paginierung
        window.allUserEntries = entries;
        window.currentUserEntries = entries;

        renderUserEntries(entries);
        showEntryPager('user',entries.length);

        console.log('Live update: Loaded user entries:', entries.length);
      }, (error) => {
        console.error("Error in user entries listener:", error);
        document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Aufträge.</p>';
      });

    console.log("✅ User entries listener registered");
  } catch (error) {
    console.error("❌ Failed to setup user entries listener:", error);
  }
}

/**
 * Setup real-time listener for all entries (admin view)
 */
function setupAdminEntriesListener() {
  // Clean up existing listener
  if (adminEntriesListener) {
    adminEntriesListener();
    adminEntriesListener = null;
  }
  Object.assign(entryPages.admin,{cursor:null,hasMore:true,loading:false,older:new Map()});

  try {
    adminEntriesListener = window.db.collection('entries').orderBy('timestamp','desc').limit(ENTRY_PAGE_SIZE)
      .onSnapshot((snapshot) => {
        const entries = combineEntryPages('admin',snapshot.docs);

        // Global speichern für Suche und Paginierung
        window.allAdminEntries = entries;
        window.currentAdminEntries = entries;

        if (typeof filterAdminEntries === 'function') filterAdminEntries();
        else renderAdminEntries(entries);
        showEntryPager('admin',entries.length);

        console.log('Live update: Loaded admin entries:', entries.length);
      }, (error) => {
        console.error("Error in admin entries listener:", error);
        document.getElementById("adminEntriesTable").innerHTML = '<p>Fehler beim Laden der Aufträge.</p>';
      });

    console.log("✅ Admin entries listener registered");
  } catch (error) {
    console.error("❌ Failed to setup admin entries listener:", error);
  }
}

// Load user entries: Live-Listener (50 Einträge + "Weitere laden") statt Vollabfrage.
// Der Listener aktualisiert sich selbst, ein erneuter Aufruf ist dann nicht nötig.
async function loadUserEntries() {
    if (!window.currentUser || !window.currentUser.name || !window.currentUser.kennung) {
        console.error('❌ Kein Benutzer angemeldet');
        return;
    }
    if (userEntriesListener) return;
    setupUserEntriesListener();
}

// Benutzer-Statistik in den Dashboard-Kacheln anzeigen
function updateUserStatsDisplay(stats) {
    const fmt = value => typeof formatCurrency === 'function'
        ? formatCurrency(value)
        : value.toFixed(2).replace('.', ',') + ' €';
    const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    set('userTotalEntries', String(stats.totalEntries));
    set('userTotalCost', fmt(stats.totalCost));
    set('userPaidAmount', fmt(stats.paidCost));
    set('userUnpaidAmount', fmt(stats.unpaidCost));
}

// Load user statistics
async function loadUserStats() {
    try {
        if (!window.currentUser || !window.currentUser.name || !window.currentUser.kennung) {
            console.error('❌ Kein Benutzer angemeldet');
            return;
        }

        console.log('📊 Loading stats for user:', window.currentUser.kennung);

        // Gleiche Felder wie der Listener, damit der vorhandene Index (name, kennung, timestamp) passt.
        const snapshot = await window.db.collection('entries')
            .where("name", "==", window.currentUser.name)
            .where("kennung", "==", window.currentUser.kennung)
            .get();

        let totalCost = 0;
        let totalEntries = 0;
        let paidEntries = 0;
        let unpaidEntries = 0;
        let paidCost = 0;
        let unpaidCost = 0;

        snapshot.forEach(doc => {
            const entry = doc.data();
            const cost = entry.totalCost || 0;
            totalCost += cost;
            totalEntries++;

            if (entry.paid || entry.isPaid) {
                paidEntries++;
                paidCost += cost;
            } else {
                unpaidEntries++;
                unpaidCost += cost;
            }
        });

        // Update stats display
        updateUserStatsDisplay({
            totalEntries,
            totalCost,
            paidEntries,
            unpaidEntries,
            paidCost,
            unpaidCost
        });

        console.log(`✅ User stats updated: ${totalEntries} entries, €${totalCost.toFixed(2)} total`);

    } catch (error) {
        console.error('❌ Error loading user stats:', error);
    }
}

// Admin-Statistiken laden
async function loadAdminStats() {
  try {
    const entriesSnapshot = await window.db.collection('entries').get();
    const usersSnapshot = await window.db.collection('users').get();

    let totalEntries = 0;
    let totalRevenue = 0;
    let pendingAmount = 0;
    const activeUsers = new Set(); // Nutzer mit Einträgen
    let totalRegisteredUsers = 0; // Alle registrierten Nutzer

    // Registrierte Nutzer zählen
    usersSnapshot.forEach(doc => {
      totalRegisteredUsers++;
    });

    // Einträge analysieren
    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      totalEntries++;

      if (entry.kennung) {
        activeUsers.add(entry.kennung); // Nutzer mit tatsächlichen Einträgen
      }

      const cost = entry.totalCost || 0;
      totalRevenue += cost;

      if (!entry.paid && !entry.isPaid) {
        pendingAmount += cost;
      }
    });

    // Stats anzeigen - alle registrierten Nutzer
    document.getElementById('adminTotalEntries').textContent = totalEntries;
    document.getElementById('adminTotalUsers').textContent = totalRegisteredUsers; // Alle registrierten Nutzer
    document.getElementById('adminTotalRevenue').textContent = window.formatCurrency(totalRevenue);
    document.getElementById('adminPendingAmount').textContent = window.formatCurrency(pendingAmount);

    // Drucker-Status aktualisieren
    if (typeof updatePrinterStatusDisplay === 'function') {
      updatePrinterStatusDisplay();
    }

    console.log(`📊 Admin Stats: ${totalRegisteredUsers} registriert, ${activeUsers.size} aktiv, ${totalEntries} Einträge`);

  } catch (error) {
    console.error('Fehler beim Laden der Admin-Stats:', error);
  }
}

// Alle Drucke für Admin laden
async function loadAllEntries() {
  // Now this sets up the real-time listener instead of manual loading
  setupAdminEntriesListener();
}

/**
 * Cleanup entry listeners
 */
function cleanupEntryListeners() {
  if (userEntriesListener) {
    userEntriesListener();
    userEntriesListener = null;
    console.log("🧹 User entries listener cleaned up");
  }

  if (adminEntriesListener) {
    adminEntriesListener();
    adminEntriesListener = null;
    console.log("🧹 Admin entries listener cleaned up");
  }
}

// Export functions to global scope
window.loadUserEntries = loadUserEntries;
window.loadAllEntries = loadAllEntries;
window.loadUserStats = loadUserStats;
window.loadAdminStats = loadAdminStats;
window.setupUserEntriesListener = setupUserEntriesListener;
window.setupAdminEntriesListener = setupAdminEntriesListener;
window.cleanupEntryListeners = cleanupEntryListeners;
window.loadMoreEntries = loadMoreEntries;
