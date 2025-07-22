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

// User-Drucke laden (fallback for initial load)
async function loadUserEntries() {
  // Now this sets up the real-time listener instead of manual loading
  setupUserEntriesListener();
}

// User-Statistiken laden
async function loadUserStats() {
  try {
    const snapshot = await window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    const totalEntries = entries.length;
    const totalCost = entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const paidEntries = entries.filter(entry => entry.paid || entry.isPaid);
    const paidAmount = paidEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const unpaidAmount = totalCost - paidAmount;

    // Stats anzeigen
    document.getElementById('userTotalEntries').textContent = totalEntries;
    document.getElementById('userTotalCost').textContent = window.formatCurrency(totalCost);
    document.getElementById('userPaidAmount').textContent = window.formatCurrency(paidAmount);
    document.getElementById('userUnpaidAmount').textContent = window.formatCurrency(unpaidAmount);

    // Drucker-Status aktualisieren
    if (typeof updatePrinterStatusDisplay === 'function') {
      updatePrinterStatusDisplay();
    }

  } catch (error) {
    console.error('Fehler beim Laden der User-Stats:', error);
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
