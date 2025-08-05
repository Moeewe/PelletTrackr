// ==================== ENTRY STATS MODULE ====================
// Statistiken für User und Admin Dashboard

// Global state for entries and listeners
let userEntriesListener = null;
let adminEntriesListener = null;

/**
 * Setup real-time listener for user entries
 */
function setupUserEntriesListener() {
  // Clean up existing listener
  if (userEntriesListener) {
    userEntriesListener();
    userEntriesListener = null;
  }
  
  try {
    userEntriesListener = window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .onSnapshot((snapshot) => {
        const entries = [];
        snapshot.forEach(doc => {
          entries.push({ id: doc.id, ...doc.data() });
        });

        // Nach Datum sortieren (neueste zuerst)
        entries.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.toDate() - a.timestamp.toDate();
        });

        // Global speichern für Suche und Paginierung
        window.allUserEntries = entries;
        window.currentUserEntries = entries;
        
        renderUserEntries(entries);
        
        console.log('Live update: Loaded user entries:', entries.length);
      }, (error) => {
        console.error("Error in user entries listener:", error);
        document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
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
  
  try {
    adminEntriesListener = window.db.collection('entries')
      .onSnapshot((snapshot) => {
        const entries = [];
        snapshot.forEach(doc => {
          entries.push({ id: doc.id, ...doc.data() });
        });
        
        // Nach Datum sortieren (neueste zuerst)
        entries.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.toDate() - a.timestamp.toDate();
        });
        
        // Global speichern für Suche und Paginierung
        window.allAdminEntries = entries;
        window.currentAdminEntries = entries;
        
        renderAdminEntries(entries);
        
        console.log('Live update: Loaded admin entries:', entries.length);
      }, (error) => {
        console.error("Error in admin entries listener:", error);
        document.getElementById("adminEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
      });
      
    console.log("✅ Admin entries listener registered");
  } catch (error) {
    console.error("❌ Failed to setup admin entries listener:", error);
  }
}

// Load user entries
async function loadUserEntries() {
    try {
        if (!window.currentUser || !window.currentUser.username) {
            console.error('❌ Kein Benutzer angemeldet oder kein Username verfügbar');
            return;
        }

        console.log('📊 Loading entries for user:', window.currentUser.username);
        
        const snapshot = await window.db.collection('entries')
            .where("username", "==", window.currentUser.username)
            .orderBy("timestamp", "desc")
            .get();

        const entries = [];
        snapshot.forEach(doc => {
            entries.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Loaded ${entries.length} entries for user`);
        renderUserEntries(entries);
        
    } catch (error) {
        console.error('❌ Error loading user entries:', error);
        if (window.toast && typeof window.toast.error === 'function') {
            window.toast.error('Fehler beim Laden der Einträge');
        }
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        if (!window.currentUser || !window.currentUser.username) {
            console.error('❌ Kein Benutzer angemeldet oder kein Username verfügbar');
            return;
        }

        console.log('📊 Loading stats for user:', window.currentUser.username);
        
        const snapshot = await window.db.collection('entries')
            .where("username", "==", window.currentUser.username)
            .get();

        let totalCost = 0;
        let totalEntries = 0;
        let paidEntries = 0;
        let unpaidEntries = 0;

        snapshot.forEach(doc => {
            const entry = doc.data();
            totalCost += entry.totalCost || 0;
            totalEntries++;
            
            if (entry.paid || entry.isPaid) {
                paidEntries++;
            } else {
                unpaidEntries++;
            }
        });

        // Update stats display
        updateUserStatsDisplay({
            totalEntries,
            totalCost,
            paidEntries,
            unpaidEntries
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
