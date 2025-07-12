// ==================== ENTRY STATS MODULE ====================
// Statistiken für User und Admin Dashboard

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
    document.getElementById('userTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('userPaidAmount').textContent = formatCurrency(paidAmount);
    document.getElementById('userUnpaidAmount').textContent = formatCurrency(unpaidAmount);

  } catch (error) {
    console.error('Fehler beim Laden der User-Stats:', error);
  }
}

// User-Drucke laden
async function loadUserEntries() {
  try {
    const snapshot = await window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });

    // Global speichern für Suche
    window.allUserEntries = entries;
    
    renderUserEntries(entries);
    
  } catch (error) {
    console.error("Fehler beim Laden der User-Drucke:", error);
    document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
  }
}

// Admin-Statistiken laden
async function loadAdminStats() {
  try {
    const snapshot = await window.db.collection('entries').get();
    
    let totalEntries = 0;
    let totalRevenue = 0;
    let pendingAmount = 0;
    const users = new Set();
    
    snapshot.forEach(doc => {
      const entry = doc.data();
      totalEntries++;
      
      if (entry.name) {
        users.add(entry.name);
      }
      
      const cost = entry.totalCost || 0;
      totalRevenue += cost;
      
      if (!entry.paid) {
        pendingAmount += cost;
      }
    });
    
    // Stats anzeigen
    document.getElementById('adminTotalEntries').textContent = totalEntries;
    document.getElementById('adminTotalUsers').textContent = users.size;
    document.getElementById('adminTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('adminPendingAmount').textContent = formatCurrency(pendingAmount);
    
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Stats:', error);
  }
}

// Asset-Statistiken laden
async function loadAssetStats() {
  try {
    console.log('🔄 Loading asset statistics...');
    
    // Drucker-Statistiken
    const printersSnapshot = await window.db.collection('printers').get();
    let totalPrinters = 0;
    let activePrinters = 0;
    
    printersSnapshot.forEach(doc => {
      const printer = doc.data();
      totalPrinters++;
      if (printer.status === 'printing' || printer.status === 'available') {
        activePrinters++;
      }
    });
    
    // Reservierungs-Statistiken
    const reservationsSnapshot = await window.db.collection('reservations')
      .where('status', '==', 'pending')
      .get();
    const pendingReservations = reservationsSnapshot.size;
    
    // Equipment-Anfragen-Statistiken
    const requestsSnapshot = await window.db.collection('equipmentRequests')
      .where('status', '==', 'pending')
      .get();
    const pendingRequests = requestsSnapshot.size;
    
    // Stats anzeigen
    const totalPrintersElement = document.getElementById('totalPrinters');
    const activePrintersElement = document.getElementById('activePrinters');
    const pendingReservationsElement = document.getElementById('pendingReservations');
    const pendingRequestsElement = document.getElementById('pendingRequests');
    
    if (totalPrintersElement) totalPrintersElement.textContent = totalPrinters;
    if (activePrintersElement) activePrintersElement.textContent = activePrinters;
    if (pendingReservationsElement) pendingReservationsElement.textContent = pendingReservations;
    if (pendingRequestsElement) pendingRequestsElement.textContent = pendingRequests;
    
    console.log('✅ Asset statistics loaded successfully');
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Asset-Stats:', error);
    
    // Fallback-Werte setzen
    const fallbackElements = ['totalPrinters', 'activePrinters', 'pendingReservations', 'pendingRequests'];
    fallbackElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '0';
    });
  }
}

// User Management Statistiken laden
async function loadUserManagementStats() {
  try {
    console.log('🔄 Loading user management statistics...');
    
    // Alle Einträge laden um Nutzer zu zählen
    const entriesSnapshot = await window.db.collection('entries').get();
    const users = new Set();
    const activeUsers = new Set();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      if (entry.name && entry.kennung) {
        const userKey = `${entry.name}_${entry.kennung}`;
        users.add(userKey);
        
        // Prüfe ob in den letzten 30 Tagen aktiv
        if (entry.timestamp && entry.timestamp.toDate() > thirtyDaysAgo) {
          activeUsers.add(userKey);
        }
      }
    });
    
    // Admin-Benutzer zählen (vereinfacht - nur ein Admin im System)
    const adminUsers = 1;
    
    // Stats anzeigen
    const totalUsersElement = document.getElementById('totalUsers');
    const activeUsersElement = document.getElementById('activeUsers');
    const adminUsersElement = document.getElementById('adminUsers');
    
    if (totalUsersElement) totalUsersElement.textContent = users.size;
    if (activeUsersElement) activeUsersElement.textContent = activeUsers.size;
    if (adminUsersElement) adminUsersElement.textContent = adminUsers;
    
    console.log('✅ User management statistics loaded successfully');
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der User Management Stats:', error);
    
    // Fallback-Werte setzen
    const fallbackElements = ['totalUsers', 'activeUsers', 'adminUsers'];
    fallbackElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '0';
    });
  }
}

// Alle Drucke für Admin laden
async function loadAllEntries() {
  try {
    const snapshot = await window.db.collection('entries').get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });
    
    // Global speichern für Suche
    window.allAdminEntries = entries;
    
    renderAdminEntries(entries);
    
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Drucke:', error);
  }
}

// ==================== ASSET STATISTICS ====================

/**
 * Load and display asset statistics for adminAssets screen
 */
async function loadAssetStats() {
    try {
        if (!window.db) {
            console.warn("❌ Firebase not available for asset stats");
            return;
        }

        // Load printer statistics
        const printersSnapshot = await window.db.collection('printers').get();
        let totalPrinters = 0;
        let activePrinters = 0;
        
        printersSnapshot.forEach((doc) => {
            totalPrinters++;
            const printer = doc.data();
            if (printer.status === 'printing' || printer.status === 'available') {
                activePrinters++;
            }
        });

        // Load reservation statistics
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const reservationsSnapshot = await window.db.collection('reservations')
            .where('startTime', '>=', today)
            .where('startTime', '<', tomorrow)
            .where('status', '==', 'pending')
            .get();
        const pendingReservations = reservationsSnapshot.size;

        // Load pending requests (equipment + material)
        const equipmentRequestsSnapshot = await window.db.collection('equipmentRequests')
            .where('status', '==', 'pending')
            .get();
        const materialRequestsSnapshot = await window.db.collection('materialOrders')
            .where('status', '==', 'pending')
            .get();
        const pendingRequests = equipmentRequestsSnapshot.size + materialRequestsSnapshot.size;

        // Update UI
        updateElementText('totalPrinters', totalPrinters);
        updateElementText('activePrinters', activePrinters);
        updateElementText('pendingReservations', pendingReservations);
        updateElementText('pendingRequests', pendingRequests);

        console.log('✅ Asset statistics loaded');
        
    } catch (error) {
        console.error('❌ Error loading asset statistics:', error);
        showToast('Fehler beim Laden der Asset-Statistiken', 'error');
    }
}

// ==================== USER MANAGEMENT STATISTICS ====================

/**
 * Load and display user management statistics for userManager screen
 */
async function loadUserManagementStats() {
    try {
        if (!window.db) {
            console.warn("❌ Firebase not available for user management stats");
            return;
        }

        // Load user statistics
        const usersSnapshot = await window.db.collection('users').get();
        let totalUsers = 0;
        let adminUsers = 0;
        
        usersSnapshot.forEach((doc) => {
            totalUsers++;
            const user = doc.data();
            if (user.isAdmin) {
                adminUsers++;
            }
        });

        // Calculate active users (users with entries in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const entriesSnapshot = await window.db.collection('entries')
            .where('timestamp', '>=', thirtyDaysAgo)
            .get();
        
        const activeUserSet = new Set();
        entriesSnapshot.forEach((doc) => {
            const entry = doc.data();
            if (entry.kennung) {
                activeUserSet.add(entry.kennung);
            }
        });
        const activeUsers = activeUserSet.size;

        // Update UI
        updateElementText('totalUsers', totalUsers);
        updateElementText('activeUsers', activeUsers);
        updateElementText('adminUsers', adminUsers);

        console.log('✅ User management statistics loaded');
        
    } catch (error) {
        console.error('❌ Error loading user management statistics:', error);
        showToast('Fehler beim Laden der Nutzer-Statistiken', 'error');
    }
}

/**
 * Load users for management interface
 */
async function loadUsersForManagement() {
    try {
        if (!window.db) {
            console.warn("❌ Firebase not available for user management");
            return;
        }

        // This function exists in user-management.js, just call it
        if (typeof loadUsers === 'function') {
            await loadUsers();
            console.log('✅ Users loaded for management');
        } else {
            console.warn("⚠️ loadUsers function not available");
        }
        
    } catch (error) {
        console.error('❌ Error loading users for management:', error);
        showToast('Fehler beim Laden der Nutzer', 'error');
    }
}

/**
 * Helper function to safely update element text content
 */
function updateElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || '0';
    }
}
